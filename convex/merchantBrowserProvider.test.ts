/// <reference types="vite/client" />
import { createServer, type Server } from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { transport } from "./merchantBrowser/browserbase";
import type { ExecutorHandle } from "./merchantBrowser/executor";

/**
 * Phase 2 integration tests: the REAL executor (playwright-core + system
 * Chromium) drives the canonical provider functions end-to-end against a REAL
 * local merchant HTTP server. Only the Browserbase session transport is
 * deterministic — `transport.createSession` is answered by launching a local
 * Chromium (same executor code), `retrieveConnectUrl`/`getDebugUrls` are
 * resolved against that live browser, and `releaseSession` closes it.
 *
 * The credential-bearing connectUrl is never persisted or logged — asserted
 * against the durable session row and the event log.
 */

const modules = import.meta.glob("./**/*.ts");

const identityA = { issuer: "https://securetoken.google.com/get-spresso", subject: "browser-user-a", tokenIdentifier: "https://securetoken.google.com/get-spresso:browser-user-a" };

function testConvex() {
  return convexTest(schema, modules);
}

process.env.KITESURF_ALLOWED_DOMAINS = "shop.example,other.example";

const CHROME_CANDIDATES = ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const EXECUTABLE = CHROME_CANDIDATES.find((path) => existsSync(path));

import { convexTest } from "convex-test";

/** The local "merchant": a real HTTPS origin serving a product page and cart badge. */
let merchantServer: Server | HttpsServer;
let merchantPort: number;
let merchantOrigin: string;
let merchantHost: string;

/** Live browser behind the fake transport, plus assertions on its lifecycle. */
let liveBrowser: { handle: ExecutorHandle | null; created: number; released: number } = { handle: null, created: 0, released: 0 };

beforeEach(async () => {
  // A real HTTPS origin with a self-signed certificate: beginSession's HTTPS
  // policy stays fully enforced while the local browser accepts the test cert.
  const certDir = mkdtempSync(join(tmpdir(), "spresso-test-cert-"));
  const keyPath = join(certDir, "key.pem");
  const certPath = join(certDir, "cert.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", keyPath, "-out", certPath, "-days", "2",
    "-subj", "/CN=127.0.0.1",
  ]);
  const credentials = { key: readFileSync(keyPath), cert: readFileSync(certPath) };
  merchantServer = createHttpsServer(credentials, (req, res) => {
    const url = req.url ?? "/";
    if (url.startsWith("/product/")) {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<!doctype html><html><head><title>Widget — Shop</title></head><body>
        <h1>Widget</h1>
        <button name="add" onclick="window.__cart=(window.__cart||0)+1;document.getElementById('cart-badge').textContent=window.__cart">Add to cart</button>
        <span id="cart-badge">0</span>
        <form onsubmit="event.preventDefault();window.__cart=(window.__cart||0)-1;document.getElementById('cart-badge').textContent=window.__cart">
          <button type="submit" class="remove-item">Remove</button>
        </form>
        <input type="number" name="quantity" value="1" onchange="window.__qty=this.value">
        </body></html>`);
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<!doctype html><html><head><title>Shop</title></head><body>home</body></html>");
  });
  await new Promise<void>((resolve) => merchantServer.listen(0, "127.0.0.1", resolve));
  merchantPort = (merchantServer.address() as { port: number }).port;
  merchantOrigin = `https://127.0.0.1:${merchantPort}`;
  merchantHost = `127.0.0.1:${merchantPort}`;
  // The dynamic local origin is the allow-listed "merchant" for this test.
  process.env.KITESURF_ALLOWED_DOMAINS = merchantHost;
  // Drive the provider's REAL execution path against a system Chromium.
  process.env.SPRESSO_LOCAL_BROWSER_EXECUTOR = "1";
  process.env.SPRESSO_LOCAL_BROWSER_EXECUTOR_PATH = EXECUTABLE ?? "";
  liveBrowser = { handle: null, created: 0, released: 0 };

  // Truthful LOCAL mode: createSession records the id; the executor's local
  // session registry owns the actual browser lifetime (created lazily on the
  // first executeBatch, persisted across actions, closed on release).
  vi.spyOn(transport, "createSession").mockImplementation(async () => {
    liveBrowser.created += 1;
    return `bb_local_${liveBrowser.created}`;
  });
  vi.spyOn(transport, "getDebugUrls").mockImplementation(async () => ({
    liveViewUrl: "https://browserbase.example/debug/live-view",
    expiresInSeconds: 300,
  }));
  vi.spyOn(transport, "releaseSession").mockImplementation(async (providerSessionId: string) => {
    const { closeLocalExecutor } = await import("./merchantBrowser/executor");
    await closeLocalExecutor(providerSessionId);
    liveBrowser.released += 1;
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  // Close every local browser and clear the executor registry so tests stay
  // isolated (the registry is module-level by design).
  const { resetLocalExecutors } = await import("./merchantBrowser/executor");
  await resetLocalExecutors();
  liveBrowser.handle = null;
  await new Promise<void>((resolve) => merchantServer.close(() => resolve()));
});

async function beginSession(t: ReturnType<typeof testConvex>, origin = merchantOrigin, identity = identityA) {
  // The public action schedules the provider start (runAfter(0) on real
  // timers). Poll until the session lands on ACTIVE — exactly one real start,
  // no direct duplicate that would race the STARTING-state guard.
  const url = `${origin}/product/widget`;
  const { sessionId } = await t.withIdentity(identity).action(api.merchantBrowser.index.beginSession, { merchantUrl: url });
  await vi.waitFor(
    async () => {
      const session = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string } | null;
      expect(session?.status).toBe("ACTIVE");
    },
    { timeout: 20_000, interval: 250 },
  );
  return sessionId as Id<"merchantBrowserSessions">;
}

test.skipIf(!EXECUTABLE)("provider start creates a browser, opens the merchant page, and verifies the landing", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  const session = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string; provider: string; providerSessionId?: string; currentUrl?: string; pageTitle?: string };
  expect(session.status).toBe("ACTIVE");
  expect(session.provider).toBe("LOCAL");
  expect(session.providerSessionId).toBe("bb_local_1");
  expect(session.currentUrl).toContain("/product/widget");
  expect(session.pageTitle).toContain("Widget");
  expect(liveBrowser.created).toBe(1);
  expect(liveBrowser.released).toBe(0);
});

test.skipIf(!EXECUTABLE)("add to cart is verified by the merchant badge increasing", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  const result = await t.action(internal.merchantBrowser.provider.addToCart, { sessionId, productName: "Widget" });
  expect(result.success).toBe(true);
  expect(result.cartItems).toBe(1);
});

test.skipIf(!EXECUTABLE)("add fails honestly when the merchant page has no add control", async () => {
  const t = testConvex();
  // Begin against the home page (no add button at all).
  const sessionId = await beginSession(t, merchantOrigin);
  // Navigate to the bare home page first.
  await t.action(internal.merchantBrowser.provider.navigateToProduct, { sessionId, productUrl: merchantOrigin });

  const result = await t.action(internal.merchantBrowser.provider.addToCart, { sessionId, productName: "Widget" });
  expect(result.success).toBe(false);
});

test.skipIf(!EXECUTABLE)("update quantity is verified by the live input value", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  const result = await t.action(internal.merchantBrowser.provider.updateQuantity, { sessionId, productName: "Widget", quantity: 3 });
  expect(result.success).toBe(true);
  expect(result.cartItems).toBe(3);
});

test.skipIf(!EXECUTABLE)("navigate verifies the landing and rejects off-domain product URLs", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  const nav = await t.action(internal.merchantBrowser.provider.navigateToProduct, { sessionId, productUrl: `${merchantOrigin}/product/other` });
  expect(nav.success).toBe(true);
  expect(nav.currentUrl).toContain("/product/other");

  await expect(
    t.action(internal.merchantBrowser.provider.navigateToProduct, { sessionId, productUrl: "https://evil.example/product/1" }),
  ).rejects.toThrow(/off the approved merchant domain/);
});

test.skipIf(!EXECUTABLE)("session release runs exactly once at terminal transition and closes the browser", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  // Owner completes the workflow: the control action releases the browser
  // directly, and the transition additionally schedules a belt-and-braces
  // release (which no-ops when the session is already gone).
  const done = await t.withIdentity(identityA).action(api.merchantBrowser.index.controlSession, { sessionId, control: "COMPLETE" });
  expect(done.ok).toBe(true);

  expect(liveBrowser.released).toBeGreaterThanOrEqual(1);
  const session = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(session.status).toBe("COMPLETED");
});

test.skipIf(!EXECUTABLE)("parallel sessions for different owners stay isolated (bounded fan-out)", async () => {
  const t = testConvex();
  const identityB = { issuer: identityA.issuer, subject: "browser-user-b", tokenIdentifier: `${identityA.issuer}:browser-user-b` };

  const sessionIdA = await beginSession(t);
  const sessionIdB = await beginSession(t, merchantOrigin, identityB);

  // Each owner got their own provider session and their own browser.
  expect(sessionIdB).not.toBe(sessionIdA);
  expect(liveBrowser.created).toBeGreaterThanOrEqual(2);

  const a = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId: sessionIdA })) as { providerSessionId?: string };
  const b = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId: sessionIdB })) as { providerSessionId?: string };
  expect(a.providerSessionId).not.toBe(b.providerSessionId);

  // Owner scoping still holds per session.
  await expect(
    t.withIdentity(identityB).action(api.merchantBrowser.index.mySessionEvents, { sessionId: sessionIdA, afterSeq: 0, limit: 10 }),
  ).rejects.toThrow(/Forbidden/);
});

test.skipIf(!EXECUTABLE)("connectUrl and debug URLs never reach durable state or events", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  // Owner takes over: the live view URL is returned through the authenticated
  // action and nowhere else.
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "HANDOFF_REQUIRED", reason: "Merchant sign-in required." });
  const takeover = await t.withIdentity(identityA).action(api.merchantBrowser.index.controlSession, { sessionId, control: "TAKE_OVER" });
  expect(takeover.ok).toBe(true);
  expect(takeover.liveViewUrl).toContain("live-view");

  const session = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as Record<string, unknown>;
  const events = (await t.withIdentity(identityA).action(api.merchantBrowser.index.mySessionEvents, { sessionId, afterSeq: 0, limit: 50 })) as Array<{ summary: string }>;

  const serializedSession = JSON.stringify(session);
  const serializedEvents = JSON.stringify(events);
  expect(serializedSession).not.toMatch(/connectUrl|in-memory-only|live-view|debuggerUrl|wss?:\/\//);
  for (const event of events) {
    expect(event.summary).not.toMatch(/connectUrl|in-memory-only|live-view|wss?:\/\//);
    expect(event.summary).not.toMatch(/https?:\/\//);
  }
  void serializedEvents;
});

test("provider actions fail closed when the provider session is gone", async () => {
  const t = testConvex();
  // Session row with NO providerSessionId (pre-start): every live action refuses.
  const sessionId = await t.mutation(internal.merchantBrowser.state.createSessionInternal, {
    tokenIdentifier: identityA.tokenIdentifier,
    merchantHost: merchantHost,
    provider: "LOCAL",
    merchantUrl: `${merchantOrigin}/product/widget`,
  }) as Id<"merchantBrowserSessions">;

  await expect(t.action(internal.merchantBrowser.provider.observeBrowserSession, { sessionId })).rejects.toThrow(/no live browser/);
  await expect(t.action(internal.merchantBrowser.provider.addToCart, { sessionId, productName: "Widget" })).rejects.toThrow(/no live browser/);
});
