/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import {
  STATUS_CONTROL_OWNER,
  isOutcomeUnknown,
  isVerifiedSuccess,
  type BrowserExecutionRequest,
  type BrowserExecutionResult,
  type BrowserOperation,
} from "./merchantBrowser/contracts";

const modules = import.meta.glob("./**/*.ts");

const identityA = { issuer: "https://securetoken.google.com/get-spresso", subject: "browser-user-a", tokenIdentifier: "https://securetoken.google.com/get-spresso:browser-user-a" };
const identityB = { issuer: "https://securetoken.google.com/get-spresso", subject: "browser-user-b", tokenIdentifier: "https://securetoken.google.com/get-spresso:browser-user-b" };

function testConvex() {
  return convexTest(schema, modules);
}

process.env.CLOUDFLARE_ACCOUNT_ID = "acct-test";
process.env.CLOUDFLARE_API_TOKEN = "token-test";
process.env.KITESURF_ALLOWED_DOMAINS = "shop.example";
// Provider rows are created as BROWSERBASE (production default); the
// scheduled provider start is never drained in this suite.
process.env.BROWSERBASE_API_KEY = "bb-test-key";

const MERCHANT_URL = "https://shop.example/product/1";

async function beginSession(t: ReturnType<typeof testConvex>) {
  const { sessionId } = await t.withIdentity(identityA).action(api.merchantBrowser.index.beginSession, { merchantUrl: MERCHANT_URL });
  return sessionId as Id<"merchantBrowserSessions">;
}

/** Land a session on ACTIVE through the legal STARTING -> ACTIVE path. */
async function activate(t: ReturnType<typeof testConvex>, sessionId: Id<"merchantBrowserSessions">) {
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });
}

// ---------------------------------------------------------------------------
// Exactly-one control owner
// ---------------------------------------------------------------------------

test("every status maps to exactly one control owner and statuses stay in lockstep with the transition map", () => {
  const statuses = Object.keys(STATUS_CONTROL_OWNER);
  expect(statuses.sort()).toEqual(
    [
      "STARTING", "ACTIVE", "PAUSED", "WAITING_USER_INPUT", "WAITING_SECURE_INPUT",
      "HANDOFF_REQUIRED", "HUMAN_CONTROL", "RESUMING",
      "READY_FOR_PURCHASE_AUTHORIZATION", "SUBMITTING_PURCHASE",
      "COMPLETED", "FAILED", "EXPIRED",
    ].sort(),
  );
  for (const status of statuses) {
    expect(STATUS_CONTROL_OWNER[status]).toMatch(/^(AGENT|USER|CREDENTIAL_BROKER|NONE)$/);
  }
  // User-intent states belong to USER; secure-input state belongs to the
  // credential broker; agent runs belong to AGENT; quiescent states to NONE.
  expect(STATUS_CONTROL_OWNER.ACTIVE).toBe("AGENT");
  expect(STATUS_CONTROL_OWNER.WAITING_USER_INPUT).toBe("USER");
  expect(STATUS_CONTROL_OWNER.WAITING_SECURE_INPUT).toBe("CREDENTIAL_BROKER");
  expect(STATUS_CONTROL_OWNER.HUMAN_CONTROL).toBe("USER");
  expect(STATUS_CONTROL_OWNER.COMPLETED).toBe("NONE");
});

test("control owner is written atomically with every status transition", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);

  const at = async () =>
    (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as {
      status: string;
      controlOwner: string;
    };

  expect(await at()).toMatchObject({ status: "STARTING", controlOwner: "NONE" });
  await activate(t, sessionId);
  expect(await at()).toMatchObject({ status: "ACTIVE", controlOwner: "AGENT" });

  await t.mutation(internal.merchantBrowser.state.transitionInternal, {
    sessionId,
    status: "WAITING_SECURE_INPUT",
    reason: "card entry required",
  });
  expect(await at()).toMatchObject({ status: "WAITING_SECURE_INPUT", controlOwner: "CREDENTIAL_BROKER" });

  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });
  await t.mutation(internal.merchantBrowser.state.transitionInternal, {
    sessionId,
    status: "WAITING_USER_INPUT",
    reason: "delivery form needs the user",
  });
  expect(await at()).toMatchObject({ status: "WAITING_USER_INPUT", controlOwner: "USER" });
});

// ---------------------------------------------------------------------------
// New statuses: legal and illegal transitions
// ---------------------------------------------------------------------------

test("purchase authorization path is legal: ACTIVE -> READY_FOR_PURCHASE_AUTHORIZATION -> SUBMITTING_PURCHASE -> COMPLETED", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);

  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "READY_FOR_PURCHASE_AUTHORIZATION" });
  const ready = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(ready.status).toBe("READY_FOR_PURCHASE_AUTHORIZATION");

  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "SUBMITTING_PURCHASE" });
  const submitting = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(submitting.status).toBe("SUBMITTING_PURCHASE");

  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "COMPLETED" });
  const done = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(done.status).toBe("COMPLETED");
});

test("purchase submission cannot start without authorization, and authorization cannot follow submission", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);

  await expect(
    t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "SUBMITTING_PURCHASE" }),
  ).rejects.toThrow(/Invalid merchant session transition/);

  const second = await beginSession(t);
  await activate(t, second);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId: second, status: "READY_FOR_PURCHASE_AUTHORIZATION" });
  // A purchase must never be submitted straight from authorization without
  // the explicit SUBMITTING_PURCHASE gate either.
  await expect(
    t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId: second, status: "COMPLETED" }),
  ).rejects.toThrow(/Invalid merchant session transition/);
});

test("waiting states return to ACTIVE but cannot skip to completion or submission", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "WAITING_USER_INPUT" });

  await expect(
    t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "COMPLETED" }),
  ).rejects.toThrow(/Invalid merchant session transition/);
  await expect(
    t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "SUBMITTING_PURCHASE" }),
  ).rejects.toThrow(/Invalid merchant session transition/);

  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });
  const back = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string; controlOwner: string };
  expect(back.status).toBe("ACTIVE");
  expect(back.controlOwner).toBe("AGENT");
});

// ---------------------------------------------------------------------------
// Owner scoping
// ---------------------------------------------------------------------------

test("new statuses never leak sessions across owners", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "WAITING_SECURE_INPUT" });

  const theirs = await t.withIdentity(identityB).action(api.merchantBrowser.index.mySession, {});
  expect(theirs).toBeNull();
  const mine = await t.withIdentity(identityA).action(api.merchantBrowser.index.mySession, {});
  expect(mine).toMatchObject({ sessionId, controlOwner: "CREDENTIAL_BROKER", status: "WAITING_SECURE_INPUT" });
});

// ---------------------------------------------------------------------------
// Monotonic events + stale expected sequence
// ---------------------------------------------------------------------------

test("event sequence stays strictly monotonic across new-status transitions", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "WAITING_USER_INPUT" });
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "ACTIVE" });
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "READY_FOR_PURCHASE_AUTHORIZATION" });

  const events = (await t.withIdentity(identityA).action(api.merchantBrowser.index.mySessionEvents, {
    sessionId,
    afterSeq: 0,
    limit: 50,
  })) as Array<{ sequence: number; eventType: string }>;
  const sequences = events.map((event) => event.sequence);
  expect([...sequences].sort((a, b) => a - b)).toEqual(sequences);
  expect(new Set(sequences).size).toBe(sequences.length);
  expect(events.map((event) => event.eventType)).toContain("STATUS_READY_FOR_PURCHASE_AUTHORIZATION");
});

test("stale expected sequence is rejected without mutating the session", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  const before = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { lastEventSeq: number };

  // Caller's view is stale: the session already advanced past expectedSeq.
  await expect(
    t.mutation(internal.merchantBrowser.state.transitionInternal, {
      sessionId,
      status: "ACTIVE",
      expectedSeq: 0,
    }),
  ).rejects.toThrow(/Stale session view/);
  const after = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { lastEventSeq: number; status: string };
  expect(after.status).toBe("STARTING");
  expect(after.lastEventSeq).toBe(before.lastEventSeq);

  // A current expectedSeq passes and the transition applies.
  await t.mutation(internal.merchantBrowser.state.transitionInternal, {
    sessionId,
    status: "ACTIVE",
    expectedSeq: before.lastEventSeq,
  });
  const active = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string };
  expect(active.status).toBe("ACTIVE");
});

// ---------------------------------------------------------------------------
// Terminal immutability
// ---------------------------------------------------------------------------

test("terminal states are final even for the new statuses and reject stale views", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "READY_FOR_PURCHASE_AUTHORIZATION" });
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "SUBMITTING_PURCHASE" });
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "FAILED", errorCode: "MERCHANT_REJECTED" });

  for (const status of ["ACTIVE", "READY_FOR_PURCHASE_AUTHORIZATION", "SUBMITTING_PURCHASE", "COMPLETED", "EXPIRED"] as const) {
    await expect(
      t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status, expectedSeq: 9999 }),
    ).rejects.toThrow();
  }
  const failed = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { status: string; controlOwner: string };
  expect(failed.status).toBe("FAILED");
  expect(failed.controlOwner).toBe("NONE");
});

// ---------------------------------------------------------------------------
// Budget retained: still enforced alongside the new statuses
// ---------------------------------------------------------------------------

test("action budget still gates purchases after the new statuses exist", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);
  for (let i = 0; i < 40; i += 1) {
    const result = await t.mutation(internal.merchantBrowser.state.consumeActionBudget, {
      sessionId,
      actionType: "TOOL_OBSERVE",
      summary: `Action ${i}.`,
    });
    expect(result.ok).toBe(true);
  }
  const rejected = await t.mutation(internal.merchantBrowser.state.consumeActionBudget, {
    sessionId,
    actionType: "TOOL_ADD_TO_CART",
    summary: "Over budget purchase prep.",
  });
  expect(rejected.ok).toBe(false);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "READY_FOR_PURCHASE_AUTHORIZATION" });
  const ready = (await t.query(internal.merchantBrowser.state.getSessionInternal, { sessionId })) as { actionBudgetUsed: number };
  expect(ready.actionBudgetUsed).toBe(40);
});

// ---------------------------------------------------------------------------
// OUTCOME_UNKNOWN representation + verified-success semantics
// ---------------------------------------------------------------------------

test("OUTCOME_UNKNOWN is distinct from failure and blocks verified success", () => {
  expect(isOutcomeUnknown("OUTCOME_UNKNOWN")).toBe(true);
  expect(isOutcomeUnknown("OK")).toBe(false);
  expect(isOutcomeUnknown("FAILED")).toBe(false);
  expect(isOutcomeUnknown("SKIPPED")).toBe(false);

  const verified: BrowserExecutionResult = {
    executionId: "e1",
    outcome: "OK",
    verified: true,
    operations: [{ index: 0, op: "click", outcome: "OK" }],
  };
  expect(isVerifiedSuccess(verified)).toBe(true);

  // OK without passing assertions is NOT success.
  expect(isVerifiedSuccess({ ...verified, verified: false })).toBe(false);
  // A timed-out write is never success, whatever verified claims.
  expect(isVerifiedSuccess({ ...verified, outcome: "OUTCOME_UNKNOWN" })).toBe(false);
});

test("execution contract request carries no credential-bearing transport values", () => {
  const request: BrowserExecutionRequest = {
    executionId: "exec-1",
    sessionId: "session-1",
    providerSessionId: "bb_session_123",
    merchantHost: "shop.example",
    authority: "AGENT",
    operations: [
      { op: "navigate", url: MERCHANT_URL },
      { op: "click", target: { kind: "role", role: "button", name: "Add to cart" } } satisfies BrowserOperation,
    ],
    assertions: [{ type: "urlHostEquals", host: "shop.example" }],
  };
  const serialized = JSON.stringify(request);
  expect(serialized).not.toMatch(/connectUrl/i);
  expect(serialized).not.toMatch(/debugUrl/i);
  expect(serialized).not.toMatch(/liveView/i);
});

test("compact execution results never embed provider transport values or full DOM", () => {
  const result: BrowserExecutionResult = {
    executionId: "exec-1",
    outcome: "FAILED",
    verified: false,
    operations: [{ index: 0, op: "navigate", outcome: "OUTCOME_UNKNOWN", error: "timed out after 20000ms" }],
    observation: { currentUrl: "https://shop.example/product/1", pageTitle: "Widget" },
    failure: { code: "NAVIGATION_TIMEOUT", message: "Navigation did not settle.", recoverable: true },
  };
  const serialized = JSON.stringify(result);
  expect(serialized).not.toMatch(/connectUrl/i);
  expect(serialized).not.toMatch(/devtools/i);
  expect(serialized).not.toMatch(/wss?:\/\//);
});

// ---------------------------------------------------------------------------
// No credential fields in public/session/event payloads
// ---------------------------------------------------------------------------

test("public session payload exposes engine alias and control owner but never provider transport values", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);

  const session = (await t.withIdentity(identityA).action(api.merchantBrowser.index.mySession, {})) as Record<string, unknown>;
  expect(session.engine).toBe("BROWSERBASE");
  expect(session.controlOwner).toBe("AGENT");
  expect(session).not.toHaveProperty("providerSessionId");
  expect(JSON.stringify(session)).not.toMatch(/connectUrl|devtools|debugUrl|wss?:\/\//);
});

test("owner-scoped events never contain provider transport values", async () => {
  const t = testConvex();
  const sessionId = await beginSession(t);
  await activate(t, sessionId);
  await t.mutation(internal.merchantBrowser.state.transitionInternal, { sessionId, status: "WAITING_SECURE_INPUT" });

  const events = (await t.withIdentity(identityA).action(api.merchantBrowser.index.mySessionEvents, {
    sessionId,
    afterSeq: 0,
    limit: 50,
  })) as Array<{ summary: string }>;
  for (const event of events) {
    expect(event.summary).not.toMatch(/https?:\/\//);
    expect(event.summary).not.toMatch(/token|cookie|bearer|connect/i);
  }
});
