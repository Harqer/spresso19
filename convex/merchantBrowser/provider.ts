import { internalAction, env } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

/**
 * Merchant browser automation — Cloudflare Browser Run execution layer.
 *
 * Convex owns all durable workflow state (merchantBrowserSessions /
 * merchantBrowserEvents). Cloudflare is only an execution provider: Browser
 * Sessions (POST /devtools/browser, PUT /devtools/browser/{id}/json/new,
 * GET /devtools/browser/{id}/json/list, DELETE /devtools/browser/{id}) per
 * https://developers.cloudflare.com/browser-run/cdp/session-management/.
 *
 * This module is the ONLY place that talks to Cloudflare. It reads provider
 * credentials from deployment env only, never logs tokens or Live View URLs,
 * and normalizes every provider response into serializable, owner-safe state
 * before anything reaches a client.
 */

const BROWSER_RUN_BASE = "https://api.cloudflare.com/client/v4/accounts";
const SESSION_TTL_MS = 20 * 60 * 1000;
const KEEP_ALIVE_MS = 25 * 60 * 1000; // provider keep-alive outlives our expiry

function normalizeHost(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Merchant URL must be an absolute HTTPS URL.");
  }
  if (parsed.protocol !== "https:") throw new Error("Merchant browsing is restricted to HTTPS.");
  return parsed.host.toLowerCase();
}

function cloudflareEnv(): { accountId: string; token: string } {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("Merchant browser automation is not configured in the Convex deployment.");
  return { accountId, token };
}

type CloudflareSession = { sessionId?: string };
type CloudflareTarget = { id?: string; type?: string; url?: string; title?: string };

type RunCtx = GenericActionCtx<DataModel>;

async function cloudflareFetch(ctx: RunCtx, path: string, init: { method: string; body?: string }): Promise<unknown> {
  const { accountId, token } = cloudflareEnv();
  const response = await fetch(`${BROWSER_RUN_BASE}/${encodeURIComponent(accountId)}/browser-rendering/${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: init.body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Browser Run request failed (${response.status}).`);
  const data = (await response.json()) as { result?: unknown } | unknown[];
  // /devtools endpoints return payloads directly; tolerate a wrapper envelope too.
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "result" in data && (data as { result?: unknown }).result !== undefined) {
    return (data as { result: unknown }).result;
  }
  return data;
}

async function closeProviderSession(ctx: RunCtx, providerSessionId: string): Promise<void> {
  await cloudflareFetch(ctx, `devtools/browser/${encodeURIComponent(providerSessionId)}`, {
    method: "DELETE",
  }).catch(() => undefined);
}

/**
 * Start a Browser Session and open the merchant page. The provider's
 * devtoolsFrontendUrl (Live View) is short-lived by provider policy and is
 * NEVER persisted, logged, or returned — only normalized page facts are kept.
 */
export const startBrowserSession = internalAction({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    merchantUrl: v.string(),
  },
  returns: v.object({ pageTitle: v.string(), currentUrl: v.string() }),
  handler: async (ctx, args) => {
    const created = (await cloudflareFetch(ctx, "devtools/browser", {
      method: "POST",
      body: JSON.stringify({ keepAlive: KEEP_ALIVE_MS }),
    })) as CloudflareSession | undefined;
    if (!created?.sessionId) throw new Error("Browser Run did not return a session id.");

    let target: CloudflareTarget | undefined;
    try {
      const targets = (await cloudflareFetch(
        ctx,
        `devtools/browser/${encodeURIComponent(created.sessionId)}/json/new?url=${encodeURIComponent(args.merchantUrl)}`,
        { method: "PUT" },
      )) as CloudflareTarget | CloudflareTarget[] | undefined;
      const page = Array.isArray(targets) ? targets.find((t) => t.type === "page") : targets;
      if (!page?.id) throw new Error("Browser Run did not open the merchant page.");
      target = page;
    } catch (cause) {
      await closeProviderSession(ctx, created.sessionId);
      throw cause;
    }

    // Redirect-escape guardrail: the final page must still be on the
    // approved merchant host before any state is recorded.
    const finalUrl = target.url ?? args.merchantUrl;
    const finalHost = normalizeHost(finalUrl);
    const started = (await ctx.runQuery(internal.merchantBrowser.state.getSessionInternal, {
      sessionId: args.sessionId,
    })) as { merchantHost: string } | null;
    if (!started) throw new Error("Merchant session vanished during start.");
    if (finalHost !== started.merchantHost) {
      await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
        sessionId: args.sessionId,
        status: "FAILED",
        errorCode: "REDIRECT_ESCAPE",
      });
      await closeProviderSession(ctx, created.sessionId);
      throw new Error("Merchant page redirected off the approved domain; session closed.");
    }

    await ctx.runMutation(internal.merchantBrowser.state.recordProviderStart, {
      sessionId: args.sessionId,
      providerSessionId: created.sessionId,
      currentUrl: finalUrl,
      pageTitle: (target.title ?? "").slice(0, 200),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return { pageTitle: (target.title ?? "").slice(0, 200), currentUrl: finalUrl };
  },
});

/**
 * Observe live page state (URL/title) via the provider target list and
 * refresh normalized session facts. Read-only; consumes no action budget.
 */
export const observeBrowserSession = internalAction({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.object({ currentUrl: v.string(), pageTitle: v.string() }),
  handler: async (ctx, args) => {
    const session = (await ctx.runQuery(internal.merchantBrowser.state.getSessionInternal, {
      sessionId: args.sessionId,
    })) as { providerSessionId?: string; merchantHost: string } | null;
    if (!session?.providerSessionId) throw new Error("Merchant session has no live browser.");
    const targets = (await cloudflareFetch(
      ctx,
      `devtools/browser/${encodeURIComponent(session.providerSessionId)}/json/list`,
      { method: "GET" },
    )) as CloudflareTarget[];
    const page = Array.isArray(targets) ? targets.find((t) => t.type === "page") : undefined;
    const currentUrl = page?.url ?? "";
    if (currentUrl && normalizeHost(currentUrl) !== session.merchantHost) {
      await ctx.runMutation(internal.merchantBrowser.state.transitionInternal, {
        sessionId: args.sessionId,
        status: "FAILED",
        errorCode: "REDIRECT_ESCAPE",
      });
      await closeProviderSession(ctx, session.providerSessionId);
      throw new Error("Merchant page navigated off the approved domain; session closed.");
    }
    await ctx.runMutation(internal.merchantBrowser.state.recordObservation, {
      sessionId: args.sessionId,
      currentUrl,
      pageTitle: (page?.title ?? "").slice(0, 200),
    });
    return { currentUrl, pageTitle: (page?.title ?? "").slice(0, 200) };
  },
});
