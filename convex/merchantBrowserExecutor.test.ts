/// <reference types="vite/client" />
import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { afterEach, expect, test } from "vitest";
import type { Page } from "playwright-core";
import type { BrowserExecutionResult } from "./merchantBrowser/contracts";
import { disconnectExecutor, runBatch, startLocalExecutor, type ExecutorHandle } from "./merchantBrowser/executor";

/**
 * Executor tests against a REAL system Chromium (no Browserbase credentials,
 * no downloaded browsers). These exercise the exact production executor code
 * path: semantic locators, assertion postconditions, AGENT/broker authority
 * separation for `cdp`, and timeout -> OUTCOME_UNKNOWN mapping.
 */

const CHROME_CANDIDATES = ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const EXECUTABLE = CHROME_CANDIDATES.find((path) => existsSync(path));

const handles: ExecutorHandle[] = [];

afterEach(async () => {
  await Promise.all(handles.splice(0).map((handle) => disconnectExecutor(handle)));
});

async function open(pageSetup: (page: Page) => Promise<void>): Promise<ExecutorHandle> {
  if (!EXECUTABLE) throw new Error("No system Chromium available for executor tests.");
  const handle = await startLocalExecutor(EXECUTABLE, true);
  handles.push(handle);
  await pageSetup(handle.page);
  return handle;
}

function request(overrides: Partial<Parameters<typeof runBatch>[1]> & { merchantHost?: string } = {}): Parameters<typeof runBatch>[1] {
  return {
    executionId: "exec-test",
    sessionId: "session-test",
    providerSessionId: "provider-test",
    merchantHost: "localhost",
    authority: "AGENT",
    operations: [],
    ...overrides,
  } as Parameters<typeof runBatch>[1];
}

test.skipIf(!EXECUTABLE)("click postcondition is verified against the live page", async () => {
  const handle = await open(async (page) => {
    await page.setContent('<button id="b">add</button><span id="n">0</span><script>let n=0;document.getElementById("b").onclick=()=>{n++;document.getElementById("n").textContent=n;}</script>');
  });
  const result = await runBatch(handle, request({
    operations: [{ op: "click", target: { kind: "css", selector: "#b" } }],
    assertions: [{ type: "evaluateEquals", expression: "document.getElementById('n').textContent", expected: "1" }],
  }));
  expect(result.outcome).toBe("OK");
  expect(result.verified).toBe(true);
  expect(result.operations[0].outcome).toBe("OK");
});

test.skipIf(!EXECUTABLE)("semantic role locator drives a real button", async () => {
  const handle = await open(async (page) => {
    await page.setContent('<button name="add">Add to cart</button><span id="n">0</span><script>let n=0;document.querySelector("button").onclick=()=>{n++;document.getElementById("n").textContent=n;}</script>');
  });
  const result = await runBatch(handle, request({
    operations: [{ op: "click", target: { kind: "role", role: "button", name: "Add to cart" } }],
    assertions: [{ type: "elementTextEquals", target: { kind: "css", selector: "#n" }, expected: "1" }],
  }));
  expect(result.verified).toBe(true);
});

test.skipIf(!EXECUTABLE)("unmet postcondition FAILS the batch — no synthetic success", async () => {
  const handle = await open(async (page) => {
    await page.setContent('<button id="b">decoy</button><span id="n">0</span>');
  });
  const result = await runBatch(handle, request({
    operations: [{ op: "click", target: { kind: "css", selector: "#b" } }],
    assertions: [{ type: "evaluateEquals", expression: "document.getElementById('n').textContent", expected: "5" }],
  }));
  expect(result.outcome).toBe("FAILED");
  expect(result.verified).toBe(false);
  expect(result.failure?.code).toBe("ASSERTION_FAILED");
});

test.skipIf(!EXECUTABLE)("AGENT-authority batches reject cdp operations", async () => {
  const handle = await open(async () => undefined);
  const result = await runBatch(handle, request({
    authority: "AGENT",
    operations: [{ op: "cdp", method: "Browser.getVersion" }],
  }));
  expect(result.outcome).toBe("FAILED");
  expect(result.failure?.code).toBe("OPERATION_FAILED");
  expect(result.operations[0].error).toMatch(/credential broker/i);
});

test.skipIf(!EXECUTABLE)("broker-authority cdp works but administrative methods stay forbidden", async () => {
  const handle = await open(async () => undefined);
  const ok = await runBatch(handle, request({
    authority: "CREDENTIAL_BROKER",
    operations: [{ op: "cdp", method: "Browser.getVersion" }],
  }));
  expect(ok.outcome).toBe("OK");

  const blocked = await runBatch(handle, request({
    authority: "CREDENTIAL_BROKER",
    operations: [{ op: "cdp", method: "Browser.close" }],
  }));
  expect(blocked.outcome).toBe("FAILED");
  expect(blocked.operations[0].error).toMatch(/forbidden/i);
});

test.skipIf(!EXECUTABLE)("navigation off the approved merchant host is a REDIRECT_ESCAPE", async () => {
  // A real local page on 127.0.0.1 while the approved host is `localhost`:
  // the page loads, then the host guard must classify the escape.
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><body>other-host</body></html>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const handle = await open(async () => undefined);
    const result = await runBatch(handle, request({
      merchantHost: "localhost",
      operations: [{ op: "navigate", url: `http://127.0.0.1:${port}/`, waitUntil: "domcontentloaded" }],
    }));
    expect(result.failure?.code).toBe("REDIRECT_ESCAPE");
    expect(result.verified).toBe(false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test.skipIf(!EXECUTABLE)("timed-out state-changing operation yields OUTCOME_UNKNOWN, read-only yields FAILED", async () => {
  const handle = await open(async (page) => {
    await page.setContent('<button id="missing-target">x</button>');
  });
  // A click on a nonexistent control never dispatches: hard failure.
  const clickTimeout = await runBatch(handle, request({
    operations: [{ op: "click", target: { kind: "css", selector: "#does-not-exist" }, timeoutMs: 250 }],
  }));
  expect(clickTimeout.outcome).toBe("FAILED");

  // A slow state-changing evaluate that DOES dispatch but cannot confirm in
  // time is OUTCOME_UNKNOWN: the page may have applied the write.
  const slowWrite = await runBatch(handle, request({
    operations: [{ op: "evaluate", expression: "(async () => { await new Promise(r => setTimeout(r, 5000)); return 1; })()", timeoutMs: 250 }],
  }));
  expect(slowWrite.outcome).toBe("OUTCOME_UNKNOWN");
  expect(slowWrite.failure?.code).toBe("OUTCOME_UNKNOWN");
});

test.skipIf(!EXECUTABLE)("evaluate returns bounded values for postcondition math", async () => {
  const handle = await open(async (page) => {
    await page.setContent('<span id="n">7</span>');
  });
  const result = await runBatch(handle, request({
    operations: [{ op: "evaluate", expression: "parseInt(document.getElementById('n').textContent, 10)" }],
  }));
  expect(result.verified).toBe(true);
  expect(result.operations[0].value).toBe(7);
});

test.skipIf(!EXECUTABLE)("results never contain provider transport values", async () => {
  const handle = await open(async (page) => {
    await page.setContent("<main>ok</main>");
  });
  const result = await runBatch(handle, request({
    operations: [{ op: "evaluate", expression: "document.title" }],
    assertions: [{ type: "evaluateTruthy", expression: "true" }],
  }));
  const serialized = JSON.stringify(result);
  expect(serialized).not.toMatch(/connectUrl/i);
  expect(serialized).not.toMatch(/wss?:\/\//);
  expect(serialized).not.toMatch(/devtools/i);
});
