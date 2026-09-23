import { action, env, type ActionCtx, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireFirebaseIdentity } from "../lib/identity";

/**
 * Public, owner-scoped surfaces for merchant browser sessions. The KMP client
 * uses these through the HTTP bridge (see http.ts); they never accept
 * client-supplied identity and never expose provider internals.
 */

export const getMySession = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("merchantBrowserSessions")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .collect();
    const now = Date.now();
    const active = rows
      .filter((row) => !TERMINAL.has(row.status) && row.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!active) return null;
    return {
      sessionId: active._id,
      merchantHost: active.merchantHost,
      engine: active.engine,
      status: active.status,
      currentStep: active.currentStep,
      pageTitle: active.pageTitle,
      currentUrl: active.currentUrl,
      handoffReason: active.handoffReason,
      lastEventSeq: active.lastEventSeq,
    };
  },
});

const TERMINAL = new Set<string>(["COMPLETED", "FAILED", "EXPIRED"]);

/** Engine per docs/merchant-browser-automation.md; stateless start uses Kitesurf. */
function selectEngine(requiresPersistence: boolean): "KITESURF" | "CHROMIUM" {
  return requiresPersistence ? "CHROMIUM" : "KITESURF";
}

/** Typed internal session snapshot shared by the handlers below. */
type InternalSession = {
  tokenIdentifier: string;
  merchantHost: string;
  status: string;
} | null;

/** Current active session snapshot for the signed-in owner (or null). */
export const mySession = action({
  args: {},
  returns: v.any(),
  handler: async (ctx: ActionCtx): Promise<unknown> => {
    const identity = await requireFirebaseIdentity(ctx);
    return ctx.runQuery(internal.merchantBrowser.index.getMySession, {
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

/** Bounded recent events (newest last) for the owner's session. */
export const mySessionEvents = action({
  args: { sessionId: v.id("merchantBrowserSessions"), afterSeq: v.number(), limit: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const session = (await ctx.runQuery(internal.merchantBrowser.state.getSessionInternal, {
      sessionId: args.sessionId,
    })) as InternalSession;
    if (!session || session.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Forbidden: session ownership check failed.");
    }
    const rows = (await ctx.runQuery(internal.merchantBrowser.events.eventsAfterInternal, {
      sessionId: args.sessionId,
      afterSeq: args.afterSeq,
      limit: Math.min(Math.max(args.limit, 1), 50),
    })) as Array<{ eventId: string; sequence: number; eventType: string; summary: string; createdAt: number }>;
    return rows;
  },
});

/** Owner-triggered pause/take-over/resume/complete transitions. */
export const controlSession = action({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    control: v.union(v.literal("PAUSE"), v.literal("TAKE_OVER"), v.literal("RESUME"), v.literal("COMPLETE")),
  },
  returns: v.null(),
  handler: async (ctx: ActionCtx, args: { sessionId: Id<"merchantBrowserSessions">; control: "PAUSE" | "TAKE_OVER" | "RESUME" | "COMPLETE" }) => {
    const identity = await requireFirebaseIdentity(ctx);
    const session = (await ctx.runQuery(internal.merchantBrowser.state.getSessionInternal, {
      sessionId: args.sessionId,
    })) as InternalSession;
    if (!session || session.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Forbidden: session ownership check failed.");
    }
    const target =
      args.control === "PAUSE"
        ? "PAUSED"
        : args.control === "TAKE_OVER"
          ? "HUMAN_CONTROL"
          : args.control === "RESUME"
            ? "RESUMING"
            : "COMPLETED";
    await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
      sessionId: args.sessionId,
      status: target,
      reason: args.control === "TAKE_OVER" ? "User took over the browser." : undefined,
    });
    return null;
  },
});

/** Start a merchant automation session for the caller on an allowed host. */
export const beginSession = action({
  args: { merchantUrl: v.string() },
  returns: v.object({ sessionId: v.id("merchantBrowserSessions") }),
  handler: async (ctx: ActionCtx, args: { merchantUrl: string }): Promise<{ sessionId: Id<"merchantBrowserSessions"> }> => {
    const identity = await requireFirebaseIdentity(ctx);
    const allowed = (env.KITESURF_ALLOWED_DOMAINS ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    let host: string;
    let parsed: URL;
    try {
      parsed = new URL(args.merchantUrl);
    } catch {
      throw new Error("Merchant URL must be an absolute HTTPS URL.");
    }
    if (parsed.protocol !== "https:") throw new Error("Merchant browsing is restricted to HTTPS.");
    host = parsed.host.toLowerCase();
    if (!allowed.includes(host)) throw new Error("This merchant is not enabled for browser automation.");
    const existing = (await ctx.runQuery(internal.merchantBrowser.state.getActiveSessionInternal, {
      tokenIdentifier: identity.tokenIdentifier,
      merchantHost: host,
    })) as { _id: Id<"merchantBrowserSessions"> } | null;
    if (existing) return { sessionId: existing._id };

    const engine = selectEngine(false);
    const sessionId = (await ctx.runMutation(internal.merchantBrowser.state.createSessionInternal, {
      tokenIdentifier: identity.tokenIdentifier,
      merchantHost: host,
      engine,
      merchantUrl: args.merchantUrl,
    })) as Id<"merchantBrowserSessions">;
    await ctx.scheduler.runAfter(0, internal.merchantBrowser.provider.startBrowserSession, {
      sessionId,
      merchantUrl: args.merchantUrl,
    });
    return { sessionId };
  },
});
