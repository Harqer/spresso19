/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach, beforeAll } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

import { existsSync } from "node:fs";
import { transport } from "./merchantBrowser/browserbase";

const CHROME_CANDIDATES = ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const EXECUTABLE = CHROME_CANDIDATES.find((path) => existsSync(path));

// Hermetic Convex-level suite: the Browserbase transport is always answered
// locally so no scheduled provider start ever touches the network, and the
// executor runs in truthful LOCAL mode (real system Chromium, same code path)
// for flows that must observe a live browser (HITL resume re-observation).
beforeAll(() => {
  vi.spyOn(transport, "createSession").mockResolvedValue("bb_local_herm_1");
  vi.spyOn(transport, "getDebugUrls").mockResolvedValue({
    liveViewUrl: "https://browserbase.example/debug/live-view",
    expiresInSeconds: 300,
  });
  vi.spyOn(transport, "releaseSession").mockResolvedValue(undefined);
  if (EXECUTABLE) {
    process.env.SPRESSO_LOCAL_BROWSER_EXECUTOR = "1";
    process.env.SPRESSO_LOCAL_BROWSER_EXECUTOR_PATH = EXECUTABLE;
  }
});

const identityA = { issuer: "https://securetoken.google.com/get-spresso", subject: "browser-user-a", tokenIdentifier: "https://securetoken.google.com/get-spresso:browser-user-a" };
const identityB = { issuer: "https://securetoken.google.com/get-spresso", subject: "browser-user-b", tokenIdentifier: "https://securetoken.google.com/get-spresso:browser-user-b" };

function testConvex() {
  return convexTest(schema, modules);
}

process.env.CLOUDFLARE_ACCOUNT_ID = "acct-test";
process.env.CLOUDFLARE_API_TOKEN = "token-test";

afterEach(() => {
  vi.unstubAllGlobals();
});

const MERCHANT_URL = "https://shop.example/product/1";

import type { Id } from "./_generated/dataModel";

async function beginSession(t: ReturnType<typeof testConvex>, merchantUrl: string = MERCHANT_URL) {
  // beginSession schedules startBrowserSession via ctx.scheduler; convex-test
  // runs scheduled work with t.finishAll() (awaited implicitly on finish).
  const { sessionId } = await t.withIdentity(identityA).action(api.merchantBrowser.index.beginSession, { merchantUrl });
  return sessionId as Id<"merchantBrowserSessions">;
}

test("beginSession rejects non-allow-listed merchants", async () => {
  const t = testConvex();
  await expect(
    t.withIdentity(identityA).action(api.merchantBrowser.index.beginSession, { merchantUrl: "https://evil.example/item" }),
  ).rejects.toThrow(/not enabled/);
});

test("beginSession rejects non-HTTPS and malformed URLs", async () => {
  const t = testConvex();
  process.env.KITESURF_ALLOWED_DOMAINS = "shop.example";
  await expect(
    t.withIdentity(identityA).action(api.merchantBrowser.index.beginSession, { merchantUrl: "http://shop.example/item" }),
  ).rejects.toThrow();
  await expect(
    t.withIdentity(identityA).action(api.merchantBrowser.index.beginSession, { merchantUrl: "not-a-url" }),
  ).rejects.toThrow();
});

test("session is owner-scoped: another user cannot read or control it", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  await expect(
    t.withIdentity(identityB).action(api.merchantBrowser.index.mySessionEvents, { sessionId, afterSeq: 0, limit: 10 }),
  ).rejects.toThrow(/Forbidden/);
  await expect(
    t.withIdentity(identityB).action(api.merchantBrowser.index.controlSession, { sessionId, control: "PAUSE" }),
  ).rejects.toThrow(/Forbidden/);

  const mine = await t.withIdentity(identityA).action(api.merchantBrowser.index.mySession, {});
  expect(mine).toMatchObject({ sessionId, merchantHost: "shop.example" });
  // mySession only ever returns the caller's session.
  const theirs = await t.withIdentity(identityB).action(api.merchantBrowser.index.mySession, {});
  expect(theirs).toBeNull();
});

test("state machine rejects illegal transitions and terminal states are final", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  // STARTING -> COMPLETED is not allowed.
  await expect(
    t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "COMPLETED" }),
  ).rejects.toThrow(/Invalid merchant session transition/);

  // STARTING -> ACTIVE -> COMPLETED is the legal happy path.
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "COMPLETED" });
  // COMPLETED is terminal.
  await expect(
    t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" }),
  ).rejects.toThrow(/Invalid merchant session transition/);
});

test("action budget is enforced and exhaustion is recorded", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });

  let result = { ok: true, sequence: 0 };
  for (let i = 0; i < 40; i += 1) {
    result = await t.mutation(internal.merchantBrowser.state.consumeActionBudget, {
      sessionId,
      actionType: "TOOL_ADD_TO_CART",
      summary: `Adding item ${i}.`,
    });
    expect(result.ok).toBe(true);
  }
  // The 41st action is refused and a budget event is appended.
  const exhausted = await t.mutation(internal.merchantBrowser.state.consumeActionBudget, {
    sessionId,
    actionType: "TOOL_ADD_TO_CART",
    summary: "One too many.",
  });
  expect(exhausted.ok).toBe(false);
  void result;
});

test("events are monotonic, owner-scoped, and bounded", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });
  await t.mutation(internal.merchantBrowser.state.consumeActionBudget, { sessionId, actionType: "TOOL_OBSERVE", summary: "Observed page." });
  await t.mutation(internal.merchantBrowser.state.consumeActionBudget, { sessionId, actionType: "TOOL_ADD_TO_CART", summary: "Added item." });

  const events = (await t.withIdentity(identityA).action(api.merchantBrowser.index.mySessionEvents, {
    sessionId,
    afterSeq: 0,
    limit: 10,
  })) as Array<{ sequence: number; summary: string }>;
  expect(events.length).toBeGreaterThanOrEqual(3);
  const sequences = events.map((event) => event.sequence);
  expect([...sequences].sort((a, b) => a - b)).toEqual(sequences);
  // Summaries never contain provider URLs or tokens.
  for (const event of events) {
    expect(event.summary).not.toMatch(/https?:\/\//);
    expect(event.summary).not.toMatch(/token|cookie|bearer/i);
  }
});

test.skipIf(!EXECUTABLE)("handoff flow: request pauses automation, owner take-over and resume are legal", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });

  // Agent requests handoff (as the tool would).
  await t.mutation(internal.merchantBrowser.state.transitionInternal, {
    sessionId,
    status: "HANDOFF_REQUIRED",
    reason: "Merchant sign-in required.",
  });
  const session = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string; handoffReason?: string };
  expect(session.status).toBe("HANDOFF_REQUIRED");
  expect(session.handoffReason).toContain("sign-in");

  // A live provider browser must exist for a takeover to surface a view.
  // providerSessionId prefixed bb_local_ so the real transport stub stays off
  // the network and resolves the view from the local registry spy.
  await t.mutation(internal.merchantBrowser.state.recordProviderStart, {
    sessionId,
    providerSessionId: "bb_local_hitl_1",
    currentUrl: MERCHANT_URL,
    pageTitle: "Widget — Shop Example",
    expiresAt: Date.now() + 20 * 60 * 1000,
  });
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({ result: [{ id: "page-1", type: "page", url: MERCHANT_URL, devtoolsFrontendUrl: "https://live.cloudflare.dev/devtools/inspector.html?ws=cf-hitl-1" }] }), { status: 200, headers: { "content-type": "application/json" } }),
  ));

  // Owner takes over (same provider session), then hands control back by resuming.
  const takeover = await t.withIdentity(identityA).action(api.merchantBrowser.index.controlSession, { sessionId, control: "TAKE_OVER" });
  expect(takeover.ok).toBe(true);
  expect(takeover.liveViewUrl).toContain("live-view");
  const controlled = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(controlled.status).toBe("HUMAN_CONTROL");

  const resumed = await t.withIdentity(identityA).action(api.merchantBrowser.index.controlSession, { sessionId, control: "RESUME" });
  expect(resumed.ok).toBe(true);
  const afterResume = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(afterResume.status).toBe("ACTIVE");
});

test("redirect escape guardrail fails the session and records the failure", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  // Simulate the provider observing a navigation off the approved host.
  const session = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { merchantHost: string };
  expect(session.merchantHost).toBe("shop.example");
  await t.mutation(internal.merchantBrowser.state.transitionInternal, {
    sessionId,
    status: "FAILED",
    errorCode: "REDIRECT_ESCAPE",
  });
  const failed = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(failed.status).toBe("FAILED");
  // Terminal sessions are not returned as active to the owner.
  const active = await t.withIdentity(identityA).action(api.merchantBrowser.index.mySession, {});
  expect(active).toBeNull();
});

test("duplicate begin for the same merchant reuses the live session", async () => {
  const t = testConvex();
  const first = await beginSession(t);
  const second = await beginSession(t);
  expect(second).toBe(first);
});

test("recordProviderStart occupies a unique sequence and the session reflects it", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  const before = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { lastEventSeq: number };
  expect(before.lastEventSeq).toBe(1);
  await t.mutation(internal.merchantBrowser.state.recordProviderStart, {
    sessionId,
    providerSessionId: "cf-session-1",
    currentUrl: MERCHANT_URL,
    pageTitle: "Widget — Shop Example",
    expiresAt: Date.now() + 20 * 60 * 1000,
  });
  const after = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { lastEventSeq: number; status: string };
  expect(after.lastEventSeq).toBe(2);
  expect(after.status).toBe("ACTIVE");
  // The next transition must continue from 2, not collide on 1.
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "PAUSED" });
  const events = (await t.withIdentity(identityA).action(api.merchantBrowser.index.mySessionEvents, {
    sessionId,
    afterSeq: 0,
    limit: 10,
  })) as Array<{ sequence: number; eventType: string }>;
  const sequences = events.map((event) => event.sequence);
  expect(new Set(sequences).size).toBe(sequences.length);
  expect(events.map((event) => event.eventType)).toEqual(["SESSION_CREATED", "PAGE_OPENED", "STATUS_PAUSED"]);
});

test("budget exhaustion records exactly one BUDGET_EXHAUSTED event", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });
  for (let i = 0; i < 40; i += 1) {
    await t.mutation(internal.merchantBrowser.state.consumeActionBudget, { sessionId, actionType: "TOOL_OBSERVE", summary: `Action ${i}.` });
  }
  for (let i = 0; i < 5; i += 1) {
    const rejected = await t.mutation(internal.merchantBrowser.state.consumeActionBudget, { sessionId, actionType: "TOOL_OBSERVE", summary: `Over ${i}.` });
    expect(rejected.ok).toBe(false);
  }
  const events = (await t.withIdentity(identityA).action(api.merchantBrowser.index.mySessionEvents, {
    sessionId,
    afterSeq: 0,
    limit: 50,
  })) as Array<{ eventType: string }>;
  const exhausted = events.filter((event) => event.eventType === "BUDGET_EXHAUSTED");
  expect(exhausted.length).toBe(1);
});

test("provider start refuses to resurrect a terminal session", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  // Owner closes the session while the scheduled provider start is in flight.
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "EXPIRED" });
  await expect(
    t.mutation(internal.merchantBrowser.state.recordProviderStart, {
      sessionId,
      providerSessionId: "cf-late-1",
      currentUrl: MERCHANT_URL,
      pageTitle: "Late page",
      expiresAt: Date.now() + 20 * 60 * 1000,
    }),
  ).rejects.toThrow(/already ended/);
  const session = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string; providerSessionId?: string };
  expect(session.status).toBe("EXPIRED");
  expect(session.providerSessionId).toBeUndefined();
});
