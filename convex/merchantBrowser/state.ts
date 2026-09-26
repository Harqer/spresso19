import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

type StateCtx = GenericMutationCtx<DataModel>;

/**
 * Durable state transitions for merchant browser sessions. All functions here
 * are internal: public surfaces live in index.ts (owner-scoped queries) and
 * tools.ts (agent tools). Status transitions follow the harness contract in
 * docs/merchant-browser-automation.md:
 *
 * STARTING → ACTIVE → (PAUSED ↔ RESUMING → ACTIVE) → READY_FOR_PURCHASE_AUTHORIZATION
 *                    ↘ WAITING_USER_INPUT / WAITING_SECURE_INPUT          → SUBMITTING_PURCHASE → COMPLETED
 *                    ↘ HANDOFF_REQUIRED → HUMAN_CONTROL → RESUMING
 * Any state → FAILED / EXPIRED (terminal)
 *
 * Exactly-one control owner: every status maps to exactly one of
 * AGENT | USER | CREDENTIAL_BROKER | NONE (below). Every transition writes
 * controlOwner together with status, so the pair can never disagree.
 */

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "EXPIRED"]);

const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  STARTING: new Set(["ACTIVE", "FAILED", "EXPIRED"]),
  ACTIVE: new Set(["PAUSED", "WAITING_USER_INPUT", "WAITING_SECURE_INPUT", "HANDOFF_REQUIRED", "READY_FOR_PURCHASE_AUTHORIZATION", "COMPLETED", "FAILED", "EXPIRED"]),
  PAUSED: new Set(["RESUMING", "FAILED", "EXPIRED"]),
  WAITING_USER_INPUT: new Set(["ACTIVE", "RESUMING", "HANDOFF_REQUIRED", "FAILED", "EXPIRED"]),
  WAITING_SECURE_INPUT: new Set(["ACTIVE", "RESUMING", "HANDOFF_REQUIRED", "FAILED", "EXPIRED"]),
  HANDOFF_REQUIRED: new Set(["HUMAN_CONTROL", "FAILED", "EXPIRED"]),
  HUMAN_CONTROL: new Set(["RESUMING", "FAILED", "EXPIRED"]),
  RESUMING: new Set(["ACTIVE", "FAILED", "EXPIRED"]),
  READY_FOR_PURCHASE_AUTHORIZATION: new Set(["ACTIVE", "SUBMITTING_PURCHASE", "HANDOFF_REQUIRED", "FAILED", "EXPIRED"]),
  SUBMITTING_PURCHASE: new Set(["COMPLETED", "FAILED", "EXPIRED"]),
  COMPLETED: new Set(),
  FAILED: new Set(),
  EXPIRED: new Set(),
};

/**
 * Exactly-one control owner per status. Canonical map lives in
 * merchantBrowser/contracts.ts (STATUS_CONTROL_OWNER); imported here for the
 * mutation handlers that write the field atomically with status.
 */
import { STATUS_CONTROL_OWNER } from "./contracts";
export { STATUS_CONTROL_OWNER };
export type { MerchantSessionStatus, ControlOwner } from "./contracts";

type SessionDoc = {
  _id: string;
  tokenIdentifier: string;
  merchantHost: string;
  taskId?: string;
  provider?: "CLOUDFLARE" | "BROWSERBASE" | "LOCAL";
  status: string;
  controlOwner?: "AGENT" | "USER" | "CREDENTIAL_BROKER" | "NONE";
  providerSessionId?: string;
  currentUrl?: string;
  pageTitle?: string;
  currentStep?: string;
  lastEventSeq: number;
  actionBudgetUsed: number;
  handoffReason?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export const getSessionInternal = internalQuery({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.any(),
  handler: async (ctx, args): Promise<SessionDoc | null> => {
    return (await ctx.db.get(args.sessionId)) as SessionDoc | null;
  },
});

export const getActiveSessionInternal = internalQuery({
  args: { tokenIdentifier: v.string(), merchantHost: v.string() },
  returns: v.any(),
  handler: async (ctx, args): Promise<SessionDoc | null> => {
    const rows = await ctx.db
      .query("merchantBrowserSessions")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .collect();
    const now = Date.now();
    return (
      rows
        .filter(
          (row) =>
            row.merchantHost === args.merchantHost &&
            !TERMINAL_STATUSES.has(row.status) &&
            row.expiresAt > now,
        )
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
    );
  },
});

export const createSessionInternal = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    merchantHost: v.string(),
    provider: v.union(v.literal("CLOUDFLARE"), v.literal("BROWSERBASE"), v.literal("LOCAL")),
    merchantUrl: v.string(),
    taskId: v.optional(v.string()),
  },
  returns: v.id("merchantBrowserSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("merchantBrowserSessions", {
      tokenIdentifier: args.tokenIdentifier,
      merchantHost: args.merchantHost,
      taskId: args.taskId,
      provider: args.provider,
      status: "STARTING",
      controlOwner: STATUS_CONTROL_OWNER.STARTING,
      currentUrl: args.merchantUrl,
      // Sequences start at 1: the owner-facing events query is strictly
      // greater-than `afterSeq`, and both the client and the API default
      // afterSeq to 0 — a seq-0 event would be permanently unreachable.
      lastEventSeq: 1,
      actionBudgetUsed: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 20 * 60 * 1000,
    });
    await appendEvent(ctx, sessionId, args.tokenIdentifier, 1, "SESSION_CREATED", `Browser session starting at ${args.merchantHost}.`);
    return sessionId;
  },
});

export const recordProviderStart = internalMutation({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    providerSessionId: v.string(),
    currentUrl: v.string(),
    pageTitle: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = (await ctx.db.get(args.sessionId)) as SessionDoc | null;
    if (!session) throw new Error("Merchant session not found.");
    // The scheduled provider start can race a terminal transition (owner
    // closed the session, expiry swept it). Landing ACTIVE on a terminal
    // session would resurrect it with a live provider browser and no
    // cleanup path — refuse instead.
    if (TERMINAL_STATUSES.has(session.status) || session.expiresAt <= Date.now()) {
      throw new Error("Merchant session already ended; provider start skipped.");
    }
    // The provider start is also the STARTING -> ACTIVE landing; bump the
    // event sequence here so PAGE_OPENED occupies a unique sequence number
    // (otherwise the next STATUS_* event would reuse this one).
    await ctx.db.patch(args.sessionId, {
      providerSessionId: args.providerSessionId,
      currentUrl: args.currentUrl,
      pageTitle: args.pageTitle,
      expiresAt: args.expiresAt,
      status: "ACTIVE",
      controlOwner: STATUS_CONTROL_OWNER.ACTIVE,
      currentStep: "OPENING_MERCHANT",
      lastEventSeq: session.lastEventSeq + 1,
      updatedAt: Date.now(),
    });
    await appendEvent(ctx, args.sessionId, session.tokenIdentifier, session.lastEventSeq + 1, "PAGE_OPENED", `Opened ${args.pageTitle || "merchant page"}.`);
    return null;
  },
});

export const recordObservation = internalMutation({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    currentUrl: v.string(),
    pageTitle: v.string(),
    currentStep: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      currentUrl: args.currentUrl || undefined,
      pageTitle: args.pageTitle || undefined,
      ...(args.currentStep ? { currentStep: args.currentStep } : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Advance the customer-facing semantic step without a page observation. */
export const recordStep = internalMutation({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    currentStep: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      currentStep: args.currentStep,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Canonical state transition. Enforces the machine above, stamps terminal
 * time, writes the control owner implied by the new status, and records a
 * customer-safe event. reason/errorCode are sanitized short strings; provider
 * details never enter the log.
 *
 * Optimistic concurrency: pass expectedSeq to assert the caller's view of the
 * session is current. A stale expectedSeq (lastEventSeq already advanced past
 * it) is rejected without mutating anything — this is the OUTCOME_UNKNOWN
 * guard: two racing writers must not both apply a transition after either one
 * observed an ambiguous result.
 */
export const transitionInternal = internalMutation({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    status: v.union(
      v.literal("STARTING"),
      v.literal("ACTIVE"),
      v.literal("PAUSED"),
      v.literal("WAITING_USER_INPUT"),
      v.literal("WAITING_SECURE_INPUT"),
      v.literal("HANDOFF_REQUIRED"),
      v.literal("HUMAN_CONTROL"),
      v.literal("RESUMING"),
      v.literal("READY_FOR_PURCHASE_AUTHORIZATION"),
      v.literal("SUBMITTING_PURCHASE"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("EXPIRED"),
    ),
    reason: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    currentStep: v.optional(v.string()),
    expectedSeq: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = (await ctx.db.get(args.sessionId)) as SessionDoc | null;
    if (!session) throw new Error("Merchant session not found.");
    if (args.expectedSeq !== undefined && session.lastEventSeq !== args.expectedSeq) {
      throw new Error(
        `Stale session view: expected event sequence ${args.expectedSeq}, session is at ${session.lastEventSeq}.`,
      );
    }
    const allowed = ALLOWED_TRANSITIONS[session.status];
    if (!allowed || (!allowed.has(args.status) && session.status !== args.status)) {
      throw new Error(`Invalid merchant session transition ${session.status} -> ${args.status}.`);
    }
    // Exactly-one control owner: written atomically with the status change,
    // derived from the same table, so status/controlOwner can never disagree.
    // lastEventSeq advances with the appended event: without this, two
    // consecutive transitions would both write lastEventSeq + 1 and collide
    // on the same sequence number, breaking the append-only log.
    const controlOwner = STATUS_CONTROL_OWNER[args.status];
    await ctx.db.patch(args.sessionId, {
      status: args.status,
      controlOwner,
      currentStep: args.currentStep ?? session.currentStep,
      handoffReason: args.status === "HANDOFF_REQUIRED" ? args.reason?.slice(0, 160) : undefined,
      updatedAt: Date.now(),
      lastEventSeq: session.lastEventSeq + 1,
      expiresAt: TERMINAL_STATUSES.has(args.status) ? Math.min(session.expiresAt, Date.now()) : session.expiresAt,
    });
    const summary =
      args.status === "FAILED"
        ? `Automation failed${args.errorCode ? `: ${args.errorCode}` : "."}`
        : args.status === "HANDOFF_REQUIRED"
          ? `Needs your help: ${args.reason ?? "merchant verification"}.`
          : STATUS_SUMMARY[args.status] ?? args.status;
    await appendEvent(ctx, args.sessionId, session.tokenIdentifier, session.lastEventSeq + 1, `STATUS_${args.status}`, summary);
    // Release the remote browser when the workflow reaches a terminal state:
    // no provider session may outlive its workflow (architecture contract).
    // Scheduled so the terminal transition itself never blocks on the provider.
    if (TERMINAL_STATUSES.has(args.status) && session.providerSessionId) {
      await ctx.scheduler.runAfter(0, internal.merchantBrowser.provider.releaseSession, {
        sessionId: args.sessionId,
      });
    }
    return null;
  },
});

const STATUS_SUMMARY: Record<string, string> = {
  STARTING: "Browser session starting.",
  ACTIVE: "Automation running.",
  PAUSED: "Automation paused.",
  WAITING_USER_INPUT: "Waiting for your input on the page.",
  WAITING_SECURE_INPUT: "Waiting for secure payment details to be entered.",
  HANDOFF_REQUIRED: "Needs your help.",
  HUMAN_CONTROL: "You have control of the browser.",
  RESUMING: "Resuming automation.",
  READY_FOR_PURCHASE_AUTHORIZATION: "Cart is ready — your approval is needed before any purchase.",
  SUBMITTING_PURCHASE: "Submitting the purchase with your authorization.",
  COMPLETED: "Automation completed.",
  FAILED: "Automation failed.",
  EXPIRED: "Automation session expired.",
};

/**
 * Resume completion: after the provider browser is re-observed, RESUMING
 * lands back on ACTIVE. Called by internal.merchantBrowser.state.reobserveAfterResume.
 */
export const reobserveAfterResume = internalAction({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.object({ currentUrl: v.string(), pageTitle: v.string() }),
  handler: async (ctx, args) => {
    const session = (await ctx.runQuery(internal.merchantBrowser.state.getSessionInternal, {
      sessionId: args.sessionId,
    })) as { providerSessionId?: string; merchantHost: string; status: string } | null;
    if (!session) throw new Error("Merchant session not found.");
    if (session.status !== "RESUMING") throw new Error(`Merchant session is ${session.status}; expected RESUMING.`);
    if (!session.providerSessionId) {
      // The provider browser is gone (expired/closed mid-session): fail the
      // session cleanly instead of stranding it in RESUMING.
      await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
        sessionId: args.sessionId,
        status: "FAILED",
        errorCode: "PROVIDER_BROWSER_GONE",
      });
      throw new Error("The merchant browser is no longer available; this session ended.");
    }
    const observed = (await ctx.runAction(internal.merchantBrowser.provider.observeBrowserSession, {
      sessionId: args.sessionId,
    })) as { currentUrl: string; pageTitle: string };
    await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
      sessionId: args.sessionId,
      status: "ACTIVE",
    });
    return observed;
  },
});

/** Audit stamp when a short-lived Live View was issued for HITL takeover. */
export const markLiveViewIssued = internalMutation({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = (await ctx.db.get(args.sessionId)) as SessionDoc | null;
    if (!session) throw new Error("Merchant session not found.");
    await appendEvent(ctx, args.sessionId, session.tokenIdentifier, session.lastEventSeq + 1, "LIVE_VIEW_ISSUED", "A secure view of the live browser was opened for you.");
    await ctx.db.patch(args.sessionId, {
      lastEventSeq: session.lastEventSeq + 1,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const consumeActionBudget = internalMutation({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    actionType: v.string(),
    summary: v.string(),
  },
  returns: v.object({ ok: v.boolean(), sequence: v.number() }),
  handler: async (ctx, args) => {
    const session = (await ctx.db.get(args.sessionId)) as SessionDoc | null;
    if (!session) throw new Error("Merchant session not found.");
    if (session.actionBudgetUsed >= 40) {
      // Record exhaustion exactly once: every rejected call appending an
      // event would both spam the timeline and collide sequences (the
      // session's lastEventSeq is not advanced here).
      const events = await ctx.db
        .query("merchantBrowserEvents")
        .withIndex("by_session_and_sequence", (q) => q.eq("sessionId", args.sessionId).gt("sequence", 0))
        .filter((q) => q.eq(q.field("eventType"), "BUDGET_EXHAUSTED"))
        .first();
      if (!events) {
        await appendEvent(ctx, args.sessionId, session.tokenIdentifier, session.lastEventSeq + 1, "BUDGET_EXHAUSTED", "Automation reached its action limit for this session.");
      }
      return { ok: false, sequence: session.lastEventSeq };
    }
    const sequence = session.lastEventSeq + 1;
    await ctx.db.patch(args.sessionId, {
      actionBudgetUsed: session.actionBudgetUsed + 1,
      lastEventSeq: sequence,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("merchantBrowserEvents", {
      sessionId: args.sessionId,
      tokenIdentifier: session.tokenIdentifier,
      sequence,
      eventType: args.actionType,
      summary: args.summary.slice(0, 240),
      createdAt: Date.now(),
    });
    return { ok: true, sequence };
  },
});

async function appendEvent(
  ctx: StateCtx,
  sessionId: Id<"merchantBrowserSessions">,
  tokenIdentifier: string,
  sequence: number,
  eventType: string,
  summary: string,
): Promise<void> {
  await ctx.db.insert("merchantBrowserEvents", {
    sessionId,
    tokenIdentifier,
    sequence,
    eventType,
    summary: summary.slice(0, 240),
    createdAt: Date.now(),
  });
}
