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
      // Wire compatibility: the KMP client types this field `engine` (Phase 3
      // migrates the client to `provider`). The value is the execution
      // provider that actually runs the session; pre-Phase-1 rows predate the
      // field and were Cloudflare-only, so the fallback is truthful.
      engine: active.provider ?? "CLOUDFLARE",
      controlOwner: active.controlOwner ?? "NONE",
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

/** Release the remote provider session at workflow end (best-effort). */
async function releaseProviderSession(ctx: ActionCtx, sessionId: Id<"merchantBrowserSessions">): Promise<void> {
  await ctx.runAction(internal.merchantBrowser.provider.releaseSession, { sessionId }).catch(() => undefined);
}

/**
 * Execution provider selection. Interactive merchant workflows always get a
 * persistent full-Chromium runtime driven by playwright-core. Production is
 * BROWSERBASE. SPRESSO_LOCAL_BROWSER_EXECUTOR=1 opts a deployment into the
 * truthful LOCAL mode: a system Chromium driven by the same executor code for
 * controlled integration tests without provider credentials.
 */
function selectProvider(): "BROWSERBASE" | "LOCAL" {
  return (env.SPRESSO_LOCAL_BROWSER_EXECUTOR ?? "") === "1" ? "LOCAL" : "BROWSERBASE";
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
  returns: v.object({ ok: v.boolean(), liveViewUrl: v.optional(v.string()) }),
  handler: async (
    ctx: ActionCtx,
    args: { sessionId: Id<"merchantBrowserSessions">; control: "PAUSE" | "TAKE_OVER" | "RESUME" | "COMPLETE" },
  ): Promise<{ ok: boolean; liveViewUrl?: string }> => {
    const identity = await requireFirebaseIdentity(ctx);
    const session = (await ctx.runQuery(internal.merchantBrowser.state.getSessionInternal, {
      sessionId: args.sessionId,
    })) as InternalSession;
    if (!session || session.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Forbidden: session ownership check failed.");
    }
    if (args.control === "PAUSE") {
      await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
        sessionId: args.sessionId,
        status: "PAUSED",
      });
      return { ok: true };
    }
    if (args.control === "TAKE_OVER") {
      // HITL takeover (docs/merchant-browser-automation.md "Human-in-the-Loop"):
      // the same provider browser session is surfaced to its owner through a
      // short-lived Live View; the user returns control to the SAME session.
      // The machine reaches HUMAN_CONTROL only through HANDOFF_REQUIRED.
      if (session.status !== "HANDOFF_REQUIRED") {
        await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
          sessionId: args.sessionId,
          status: "HANDOFF_REQUIRED",
          reason: "You asked to take over the browser.",
        });
      }
      // Resolve the live view BEFORE claiming HUMAN_CONTROL: if the provider
      // browser is gone, the takeover fails without leaving a state that
      // promises a view that cannot exist.
      const liveView = (await ctx.runAction(internal.merchantBrowser.provider.getLiveView, {
        sessionId: args.sessionId,
      })) as { liveViewUrl: string };
      await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
        sessionId: args.sessionId,
        status: "HUMAN_CONTROL",
      });
      await ctx.runMutation(internal.merchantBrowser.state.markLiveViewIssued, {
        sessionId: args.sessionId,
      });
      return { ok: true, liveViewUrl: liveView.liveViewUrl };
    }
    if (args.control === "RESUME") {
      await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
        sessionId: args.sessionId,
        status: "RESUMING",
      });
      // Re-observe the provider browser, then land back on ACTIVE (or fail
      // the session cleanly if its browser is gone).
      await ctx.runAction(internal.merchantBrowser.state.reobserveAfterResume, {
        sessionId: args.sessionId,
      });
      return { ok: true };
    }
    await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
      sessionId: args.sessionId,
      status: "COMPLETED",
    });
    // Workflow end: explicitly release the remote browser (architecture
    // contract). The transition also schedules a release for belt-and-braces;
    // this direct call surfaces owner-visible errors early.
    await releaseProviderSession(ctx, args.sessionId);
    return { ok: true };
  },
});

/**
 * Owner-scoped, short-lived Live View for HITL takeover. Returns the live view
 * of the SAME provider browser session; provider credentials never leave the
 * server and the URL is never persisted or logged.
 */
export const myLiveView = action({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.object({ liveViewUrl: v.string(), expiresInSeconds: v.number() }),
  handler: async (ctx: ActionCtx, args: { sessionId: Id<"merchantBrowserSessions"> }) => {
    const identity = await requireFirebaseIdentity(ctx);
    const session = (await ctx.runQuery(internal.merchantBrowser.state.getSessionInternal, {
      sessionId: args.sessionId,
    })) as InternalSession;
    if (!session || session.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Forbidden: session ownership check failed.");
    }
    if (session.status !== "HUMAN_CONTROL") {
      throw new Error("Take over the session before opening its live view.");
    }
    const liveView = (await ctx.runAction(internal.merchantBrowser.provider.getLiveView, {
      sessionId: args.sessionId,
    })) as { liveViewUrl: string; expiresInSeconds: number };
    await ctx.runMutation(internal.merchantBrowser.state.markLiveViewIssued, {
      sessionId: args.sessionId,
    });
    return liveView;
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

    const provider = selectProvider();
    const sessionId = (await ctx.runMutation(internal.merchantBrowser.state.createSessionInternal, {
      tokenIdentifier: identity.tokenIdentifier,
      merchantHost: host,
      provider,
      merchantUrl: args.merchantUrl,
    })) as Id<"merchantBrowserSessions">;
    await ctx.scheduler.runAfter(0, internal.merchantBrowser.provider.startBrowserSession, {
      sessionId,
      merchantUrl: args.merchantUrl,
    });
    return { sessionId };
  },
});
