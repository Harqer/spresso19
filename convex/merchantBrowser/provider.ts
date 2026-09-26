"use node";
import { env, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { FunctionReference } from "convex/server";
import type {
  BrowserAssertion,
  BrowserExecutionRequest,
  BrowserExecutionResult,
  BrowserLocatorTarget,
  BrowserOperation,
} from "./contracts";
import { disconnectExecutor, getOrCreateLocalExecutor, runBatch, startRemoteExecutor } from "./executor";
import { transport } from "./browserbase";

type InternalQueryReference = FunctionReference<"query", "internal", Record<string, unknown>, unknown>;
type InternalMutationReference = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;

/** Local-executor mode: deterministic deployments/tests drive a system Chromium. */
function useLocalExecutor(): boolean {
  return (env.SPRESSO_LOCAL_BROWSER_EXECUTOR ?? "") === "1";
}

function localExecutablePath(): string {
  const path = env.SPRESSO_LOCAL_BROWSER_EXECUTOR_PATH;
  if (!path) throw new Error("SPRESSO_LOCAL_BROWSER_EXECUTOR_PATH is required when SPRESSO_LOCAL_BROWSER_EXECUTOR=1.");
  return path;
}

type RunCtx = {
  runQuery: (ref: InternalQueryReference, args: Record<string, unknown>) => Promise<unknown>;
  runMutation: (ref: InternalMutationReference, args: Record<string, unknown>) => Promise<unknown>;
};

async function runQuery<T>(ctx: RunCtx, ref: InternalQueryReference, args: Record<string, unknown>): Promise<T> {
  return (await ctx.runQuery(ref, args)) as T;
}

async function runMutation<T>(ctx: RunCtx, ref: InternalMutationReference, args: Record<string, unknown>): Promise<T> {
  return (await ctx.runMutation(ref, args)) as T;
}

/**
 * Merchant browser automation — Browserbase + Playwright execution layer.
 *
 * Convex owns all durable workflow state (merchantBrowserSessions /
 * merchantBrowserEvents). Browserbase owns one ephemeral full-Chromium
 * session per merchant workflow, driven by playwright-core over CDP
 * (merchantBrowser/executor.ts) through the typed Phase 1 contracts
 * (merchantBrowser/contracts.ts).
 *
 * Credential discipline: the providerSessionId is the ONLY provider value
 * persisted. The credential-bearing connectUrl is resolved per action by
 * merchantBrowser/browserbase.ts, lives only inside the action invocation,
 * and is never stored, logged, or embedded in events.
 *
 * Every mutating flow follows the contract ordering:
 *   authorize → execute (typed batch) → verify postcondition assertions →
 *   record → return verified result. Success is only ever the executor's
 *   verified evidence; a timed-out state-changing operation yields
 *   OUTCOME_UNKNOWN and must be re-observed before any retry.
 */

const SESSION_TTL_MS = 20 * 60 * 1000;
const BATCH_TIMEOUT_MS = 25_000;

/** Required postconditions attached to every merchant tool batch. */
export type PostconditionKind = "productLanded" | "cartIncreased" | "cartQuantity" | "cartDecreased";

/** Build the typed click/fill/observe batch for one semantic merchant action. */
function cartBadgeExpression(): string {
  return `(function() {
    var selectors = ['.cart-count', '#cart-count', '.cart-item-count', '[data-cart-count]', '.cart-badge', '#cart-badge', '[class*="cartCount"]'];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.offsetParent !== null) {
        var count = parseInt((el.textContent || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(count)) return count;
      }
    }
    return 0;
  })()`;
}

/**
 * One generic click across an ordered list of merchant-selector candidates,
 * returning which selector (if any) was clicked. Merchant structure varies;
 * this is targeting, not verification — assertions decide success.
 */
function clickAnyExpression(selectors: string[]): string {
  return `(function() {
    var selectors = ${JSON.stringify(selectors)};
    for (var i = 0; i < selectors.length; i++) {
      var nodes = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        if (node.offsetParent !== null && !node.disabled) { node.click(); return selectors[i]; }
      }
    }
    return null;
  })()`;
}

/** Cart-badge read/observe/click target sets (read-only page targeting). */
const ADD_SELECTORS = ['button[name="add"]', '[data-action="add-to-cart"]', '.add-to-cart', '#add-to-cart', '.product-form__submit', 'button.add', '[class*="addToCart"]'];
const REMOVE_SELECTORS = ['a[href*="remove"]', '[data-action="remove"]', '.cart-remove', '.remove-item', 'button[name*="remove"]', '[class*="removeItem"]'];
const QTY_INPUT_EXPRESSION = `(function() {
  var inputs = document.querySelectorAll('input[type="number"], input.qty, input[name*="quantity"], input[name*="updates"]');
  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].offsetParent !== null) return true;
  }
  return false;
})()`;

/**
 * Postcondition assertions for a semantic merchant action. These are checked
 * by the executor against the LIVE page after the operations — the only
 * success evidence. Cart assertions compare badge counts captured before and
 * after the mutation (bounded evaluate values).
 */
function postconditionAssertions(kind: PostconditionKind, args: { quantity?: number }, beforeSequence: number): BrowserAssertion[] {
  switch (kind) {
    case "productLanded":
      return [{ type: "urlHostEquals", host: "__MERCHANT_HOST__" }];
    case "cartIncreased":
      return [{
        type: "evaluateTruthy",
        expression: `(function(){ var after = ${cartBadgeExpression()}; var before = __BEFORE__; return after > before; })()`.replace("__BEFORE__", String(beforeSequence)),
      }];
    case "cartQuantity":
      return [{
        type: "evaluateEquals",
        expression: `(function(){ var wanted = ${Math.trunc(args.quantity ?? 0)}; var selectors = ['input[type="number"]', 'input.qty', 'input[name*="quantity"]', 'input[name*="updates"]']; for (var i = 0; i < selectors.length; i++) { var el = document.querySelector(selectors[i]); if (el && el.offsetParent !== null) { var n = parseInt(el.value, 10); if (!isNaN(n)) return n; } } return -1; })()`,
        expected: Math.trunc(args.quantity ?? 0),
      }];
    case "cartDecreased":
      return [{
        type: "evaluateTruthy",
        expression: `(function(){ var after = ${cartBadgeExpression()}; var before = __BEFORE__; return after < before; })()`.replace("__BEFORE__", String(beforeSequence)),
      }];
  }
}

/** Fill in the merchant host in host-dependent assertions. */
function bindHost(assertions: BrowserAssertion[], merchantHost: string): BrowserAssertion[] {
  return assertions.map((assertion) =>
    assertion.type === "urlHostEquals" && assertion.host === "__MERCHANT_HOST__"
      ? { ...assertion, host: merchantHost }
      : assertion,
  );
}

/** Load the durable session facts any provider action needs. */
async function getSession(
  ctx: RunCtx,
  sessionId: string,
): Promise<{ providerSessionId?: string; merchantHost: string; status: string; controlOwner?: string; tokenIdentifier: string; taskId?: string; expiresAt: number }> {
  const session = await runQuery<{ providerSessionId?: string; merchantHost: string; status: string; controlOwner?: string; tokenIdentifier: string; taskId?: string; expiresAt: number } | null>(
    ctx,
    internal.merchantBrowser.state.getSessionInternal as unknown as InternalQueryReference,
    { sessionId },
  );
  if (!session) throw new Error("Merchant session not found.");
  return session;
}

/**
 * Execute a typed batch against the session's live browser. Handles both the
 * production path (Browserbase connectUrl per action) and the deterministic
 * test path (local Chromium). Returns the executor's structured result and
 * ALWAYS disconnects the local Playwright client.
 */
async function executeBatch(
  ctx: RunCtx,
  args: {
    sessionId: string;
    /** Required when the session row has no providerSessionId yet (start). */
    providerSessionId?: string;
    operations: BrowserOperation[];
    assertions?: BrowserAssertion[];
    step?: string;
  },
): Promise<BrowserExecutionResult> {
  const session = await getSession(ctx, args.sessionId);
  const providerSessionId = args.providerSessionId ?? session.providerSessionId;
  if (!providerSessionId) throw new Error("Merchant session has no live browser.");

  // Production: resolve the credential-bearing connectUrl per action (memory
  // only) and connect over CDP. Local-executor deployments (SPRESSO_LOCAL_BROWSER_EXECUTOR=1
  // with SPRESSO_LOCAL_BROWSER_EXECUTOR_PATH): drive a system Chromium with
  // the SAME executor code so integration tests exercise real browser
  // behavior without provider credentials. The local browser persists across
  // actions per providerSessionId, mirroring the remote session lifetime.
  const local = useLocalExecutor();
  const handle = local
    ? await getOrCreateLocalExecutor(providerSessionId, localExecutablePath())
    : await startRemoteExecutor(await transport.retrieveConnectUrl(providerSessionId));

  const request: BrowserExecutionRequest = {
    executionId: `${args.sessionId}:${Date.now()}`,
    sessionId: args.sessionId,
    providerSessionId,
    merchantHost: session.merchantHost,
    authority: "AGENT",
    operations: args.operations,
    assertions: args.assertions ? bindHost(args.assertions, session.merchantHost) : undefined,
    timeoutMs: BATCH_TIMEOUT_MS,
    step: args.step,
  };

  try {
    return await runBatch(handle, request);
  } finally {
    // Remote: detach our client, keep the provider session. Local: the
    // browser IS the session — it stays until releaseSession closes it.
    if (!local) {
      await disconnectExecutor(handle);
    }
  }
}

/** Record a compact, customer-safe observation of the batch result. */
async function recordResult(ctx: RunCtx, args: { sessionId: string; result: BrowserExecutionResult; step?: string }) {
  const observation = args.result.observation;
  if (observation) {
    await runMutation(ctx, internal.merchantBrowser.state.recordObservation as unknown as InternalMutationReference, {
      sessionId: args.sessionId,
      currentUrl: observation.currentUrl,
      pageTitle: observation.pageTitle ?? "",
      currentStep: args.step,
    });
  }
}

/**
 * Start a Browserbase session and open the merchant page. The session record
 * was created with provider CLOUDFLARE|BROWSERBASE; the session created here
 * is always a Browserbase Chromium, so the record's provider is patched to
 * BROWSERBASE when this path runs.
 */
export const startBrowserSession = internalAction({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    merchantUrl: v.string(),
  },
  returns: v.object({ pageTitle: v.string(), currentUrl: v.string() }),
  handler: async (ctx, args) => {
    const started = await getSession(ctx, args.sessionId).catch(() => null);
    if (!started) throw new Error("Merchant session vanished during start.");
    if (started.status !== "STARTING") throw new Error(`Merchant session is ${started.status}; expected STARTING.`);

    // Create the remote browser session (verified Chromium, CAPTCHA auto-solve
    // disabled, no persistent context, timeout bounded to the workflow TTL).
    // Only the returned session id is ever persisted.
    const providerSessionId = await transport.createSession({
      sessionId: args.sessionId,
      // The raw token identifier never leaves Convex; hash for platform metadata.
      tokenIdentifierHash: hashForMetadata(started.tokenIdentifier),
      merchantHost: started.merchantHost,
      taskId: started.taskId,
    });

    try {
      const result = await executeBatch(ctx, {
        sessionId: args.sessionId,
        providerSessionId,
        operations: [{ op: "navigate", url: args.merchantUrl, waitUntil: "domcontentloaded" }],
        assertions: [{ type: "urlHostEquals", host: "__MERCHANT_HOST__" }],
        step: "OPENING_MERCHANT",
      });
      const landed = result.observation?.currentUrl ?? "";
      if (result.verified && landed) {
        await runMutation(ctx, internal.merchantBrowser.state.recordProviderStart as unknown as InternalMutationReference, {
          sessionId: args.sessionId,
          providerSessionId,
          currentUrl: landed,
          pageTitle: result.observation?.pageTitle ?? "",
          expiresAt: Date.now() + SESSION_TTL_MS,
        });
        return { pageTitle: result.observation?.pageTitle ?? "", currentUrl: landed };
      }
      // Landing failed or escaped the host: release the browser, fail the
      // durable session, raise.
      await transport.releaseSession(providerSessionId);
      await runMutation(ctx, internal.merchantBrowser.state.transitionInternal as unknown as InternalMutationReference, {
        sessionId: args.sessionId,
        status: "FAILED",
        errorCode: result.failure?.code === "REDIRECT_ESCAPE" ? "REDIRECT_ESCAPE" : "PROVIDER_START_FAILED",
      });
      throw new Error(result.failure?.message ?? "The merchant page did not open.");
    } catch (cause) {
      // The durable state may already be FAILED above; a bare throw here must
      // still release the browser so nothing is left running on Browserbase.
      await transport.releaseSession(providerSessionId).catch(() => undefined);
      if (cause instanceof Error && /merchant page|did not open|left the approved/.test(cause.message)) throw cause;
      await runMutation(ctx, internal.merchantBrowser.state.transitionInternal as unknown as InternalMutationReference, {
        sessionId: args.sessionId,
        status: "FAILED",
        errorCode: "PROVIDER_START_FAILED",
      }).catch(() => undefined);
      throw cause;
    }
  },
});

/** Deterministic, non-reversible hash for platform-side session metadata. */
function hashForMetadata(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return `h${(hash >>> 0).toString(36)}`;
}

/** Read-only observation of the live page (URL/title), host-guarded. */
export const observeBrowserSession = internalAction({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.object({ currentUrl: v.string(), pageTitle: v.string() }),
  handler: async (ctx, args) => {
    const result = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [{ op: "waitFor" }],
    });
    const observation = result.observation;
    if (!observation) throw new Error("The merchant browser did not report page state.");
    await recordResult(ctx, { sessionId: args.sessionId, result });
    return { currentUrl: observation.currentUrl, pageTitle: observation.pageTitle ?? "" };
  },
});

/** Navigate the session's browser to a product page and verify the landing. */
export const navigateToProduct = internalAction({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    productUrl: v.string(),
  },
  returns: v.object({ success: v.boolean(), pageTitle: v.string(), currentUrl: v.string() }),
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    let host: string;
    try {
      host = new URL(args.productUrl).host.toLowerCase();
    } catch {
      throw new Error("Product URL must be an absolute HTTPS URL.");
    }
    if (host !== session.merchantHost) {
      throw new Error("Product URL is off the approved merchant domain.");
    }
    const result = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [{ op: "navigate", url: args.productUrl, waitUntil: "domcontentloaded" }],
      assertions: [{ type: "urlHostEquals", host }],
      step: "FINDING_PRODUCT",
    });
    await recordResult(ctx, { sessionId: args.sessionId, result, step: "FINDING_PRODUCT" });
    if (result.failure?.code === "REDIRECT_ESCAPE") {
      await failSessionEscape(ctx, args.sessionId);
      throw new Error(result.failure.message);
    }
    return {
      success: result.verified,
      pageTitle: result.observation?.pageTitle ?? "",
      currentUrl: result.observation?.currentUrl ?? "",
    };
  },
});

function escapeGlob(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

/** Fail the durable session on a domain escape. */
async function failSessionEscape(ctx: RunCtx, sessionId: string): Promise<void> {
  const session = await getSession(ctx, sessionId);
  if (session.providerSessionId) {
    await transport.releaseSession(session.providerSessionId);
  }
  await runMutation(ctx, internal.merchantBrowser.state.transitionInternal as unknown as InternalMutationReference, {
    sessionId,
    status: "FAILED",
    errorCode: "REDIRECT_ESCAPE",
  });
}

/** Add the currently-open product to the merchant cart, verified by badge delta. */
export const addToCart = internalAction({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    productName: v.string(),
  },
  returns: v.object({ success: v.boolean(), cartItems: v.number() }),
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    requireProviderSession(session.providerSessionId);

    const beforeResult = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [{ op: "evaluate", expression: cartBadgeExpression() }],
    });
    const before = Number(beforeResult.operations.find((op) => op.op === "evaluate")?.value ?? 0);
    if (!beforeResult.verified) throw new Error("The merchant cart could not be read before adding.");

    const result = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [
        { op: "evaluate", expression: clickAnyExpression(ADD_SELECTORS) },
        { op: "waitFor", state: "visible", target: { kind: "css", selector: "body" }, timeoutMs: 3_000 },
      ],
      assertions: postconditionAssertions("cartIncreased", {}, before),
      step: "VERIFYING_CART",
    });
    await recordResult(ctx, { sessionId: args.sessionId, result, step: "VERIFYING_CART" });
    if (result.failure?.code === "REDIRECT_ESCAPE") {
      await failSessionEscape(ctx, args.sessionId);
      throw new Error(result.failure.message);
    }
    const afterResult = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [{ op: "evaluate", expression: cartBadgeExpression() }],
    });
    const after = Number(afterResult.operations.find((op) => op.op === "evaluate")?.value ?? 0);
    return { success: result.verified, cartItems: result.verified ? after : before };
  },
});

/** Change an item quantity in the merchant cart, verified by the live input. */
export const updateQuantity = internalAction({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    productName: v.string(),
    quantity: v.number(),
  },
  returns: v.object({ success: v.boolean(), cartItems: v.number() }),
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    requireProviderSession(session.providerSessionId);

    const hasQty = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [{ op: "evaluate", expression: QTY_INPUT_EXPRESSION }],
    });
    if (hasQty.operations.find((op) => op.op === "evaluate")?.value !== true) {
      return { success: false, cartItems: 0 };
    }
    const result = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [
        { op: "evaluate", expression: `(function(){ var wanted = ${Math.trunc(args.quantity)}; var selectors = ['input[type="number"]', 'input.qty', 'input[name*="quantity"]', 'input[name*="updates"]']; for (var i = 0; i < selectors.length; i++) { var input = document.querySelector(selectors[i]); if (input && input.offsetParent !== null) { input.value = String(wanted); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); return true; } } return false; })()` },
      ],
      assertions: postconditionAssertions("cartQuantity", { quantity: args.quantity }, 0),
      step: "VERIFYING_CART",
    });
    await recordResult(ctx, { sessionId: args.sessionId, result, step: "VERIFYING_CART" });
    if (result.failure?.code === "REDIRECT_ESCAPE") {
      await failSessionEscape(ctx, args.sessionId);
      throw new Error(result.failure.message);
    }
    return { success: result.verified, cartItems: result.verified ? Math.trunc(args.quantity) : 0 };
  },
});

/** Remove an item from the merchant cart, verified by badge drop. */
export const removeItem = internalAction({
  args: {
    sessionId: v.id("merchantBrowserSessions"),
    productName: v.string(),
  },
  returns: v.object({ success: v.boolean(), cartItems: v.number() }),
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    requireProviderSession(session.providerSessionId);

    const beforeResult = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [{ op: "evaluate", expression: cartBadgeExpression() }],
    });
    const before = Number(beforeResult.operations.find((op) => op.op === "evaluate")?.value ?? 0);
    if (!beforeResult.verified) throw new Error("The merchant cart could not be read before removing.");

    const result = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [
        { op: "evaluate", expression: clickAnyExpression(REMOVE_SELECTORS) },
        { op: "waitFor", state: "visible", target: { kind: "css", selector: "body" }, timeoutMs: 3_000 },
      ],
      assertions: postconditionAssertions("cartDecreased", {}, before),
      step: "VERIFYING_CART",
    });
    await recordResult(ctx, { sessionId: args.sessionId, result, step: "VERIFYING_CART" });
    if (result.failure?.code === "REDIRECT_ESCAPE") {
      await failSessionEscape(ctx, args.sessionId);
      throw new Error(result.failure.message);
    }
    const afterResult = await executeBatch(ctx, {
      sessionId: args.sessionId,
      operations: [{ op: "evaluate", expression: cartBadgeExpression() }],
    });
    const after = Number(afterResult.operations.find((op) => op.op === "evaluate")?.value ?? 0);
    return { success: result.verified, cartItems: result.verified ? after : before };
  },
});

function requireProviderSession(providerSessionId: string | undefined): string {
  if (!providerSessionId) throw new Error("Merchant session has no live browser.");
  return providerSessionId;
}

/**
 * Resolve the short-lived interactive view for the CURRENT browser session
 * (HITL takeover). The URL is provider-issued and short-lived; it is
 * returned only to the session owner through an authenticated route and is
 * never persisted, logged, or embedded in events.
 */
export const getLiveView = internalAction({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.object({ liveViewUrl: v.string(), expiresInSeconds: v.number() }),
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    const providerSessionId = requireProviderSession(session.providerSessionId);
    return transport.getDebugUrls(providerSessionId);
  },
});

/** Release the remote browser at workflow end (completed/expired/failed). */
export const releaseSession = internalAction({
  args: { sessionId: v.id("merchantBrowserSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await getSession(ctx, args.sessionId);
    if (session.providerSessionId) {
      await transport.releaseSession(session.providerSessionId);
    }
    return null;
  },
});
