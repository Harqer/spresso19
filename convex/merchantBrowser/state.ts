import { internalMutation, internalQuery } from "../_generated/server";
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
 * STARTING → ACTIVE → (PAUSED ↔ RESUMING → ACTIVE) → COMPLETED
 *                    ↘ HANDOFF_REQUIRED → HUMAN_CONTROL → RESUMING
 * Any state → FAILED / EXPIRED (terminal)
 */

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "EXPIRED"]);

const ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  STARTING: new Set(["ACTIVE", "FAILED", "EXPIRED"]),
  ACTIVE: new Set(["PAUSED", "HANDOFF_REQUIRED", "COMPLETED", "FAILED", "EXPIRED"]),
  PAUSED: new Set(["RESUMING", "FAILED", "EXPIRED"]),
  HANDOFF_REQUIRED: new Set(["HUMAN_CONTROL", "FAILED", "EXPIRED"]),
  HUMAN_CONTROL: new Set(["RESUMING", "FAILED", "EXPIRED"]),
  RESUMING: new Set(["ACTIVE", "FAILED", "EXPIRED"]),
  COMPLETED: new Set(),
  FAILED: new Set(),
  EXPIRED: new Set(),
};

type SessionDoc = {
  _id: string;
  tokenIdentifier: string;
  merchantHost: string;
  engine: "KITESURF" | "CHROMIUM";
  status: string;
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
    engine: v.union(v.literal("KITESURF"), v.literal("CHROMIUM")),
    merchantUrl: v.string(),
  },
  returns: v.id("merchantBrowserSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("merchantBrowserSessions", {
      tokenIdentifier: args.tokenIdentifier,
      merchantHost: args.merchantHost,
      engine: args.engine,
      status: "STARTING",
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
      currentStep: "observing",
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      currentUrl: args.currentUrl || undefined,
      pageTitle: args.pageTitle || undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Canonical state transition. Enforces the machine above, stamps terminal
 * time, and records a customer-safe event. reason/errorCode are sanitized
 * short strings; provider details never enter the log.
 */
export const transitionInternal = internalMutation({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    status: v.union(
      v.literal("STARTING"),
      v.literal("ACTIVE"),
      v.literal("PAUSED"),
      v.literal("HANDOFF_REQUIRED"),
      v.literal("HUMAN_CONTROL"),
      v.literal("RESUMING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("EXPIRED"),
    ),
    reason: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    currentStep: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = (await ctx.db.get(args.sessionId)) as SessionDoc | null;
    if (!session) throw new Error("Merchant session not found.");
    const allowed = ALLOWED_TRANSITIONS[session.status];
    if (!allowed || (!allowed.has(args.status) && session.status !== args.status)) {
      throw new Error(`Invalid merchant session transition ${session.status} -> ${args.status}.`);
    }
    await ctx.db.patch(args.sessionId, {
      status: args.status,
      currentStep: args.currentStep ?? session.currentStep,
      handoffReason: args.status === "HANDOFF_REQUIRED" ? args.reason?.slice(0, 160) : undefined,
      updatedAt: Date.now(),
      expiresAt: TERMINAL_STATUSES.has(args.status) ? Math.min(session.expiresAt, Date.now()) : session.expiresAt,
    });
    const summary =
      args.status === "FAILED"
        ? `Automation failed${args.errorCode ? `: ${args.errorCode}` : "."}`
        : args.status === "HANDOFF_REQUIRED"
          ? `Needs your help: ${args.reason ?? "merchant verification"}.`
          : STATUS_SUMMARY[args.status] ?? args.status;
    await appendEvent(ctx, args.sessionId, session.tokenIdentifier, session.lastEventSeq + 1, `STATUS_${args.status}`, summary);
    return null;
  },
});

const STATUS_SUMMARY: Record<string, string> = {
  STARTING: "Browser session starting.",
  ACTIVE: "Automation running.",
  PAUSED: "Automation paused.",
  HANDOFF_REQUIRED: "Needs your help.",
  HUMAN_CONTROL: "You have control of the browser.",
  RESUMING: "Resuming automation.",
  COMPLETED: "Automation completed.",
  FAILED: "Automation failed.",
  EXPIRED: "Automation session expired.",
};

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
