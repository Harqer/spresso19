import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { FunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";

/**
 * Semantic merchant browser tools for the Spresso agent (harness contract:
 * docs/merchant-browser-automation.md). The LLM chooses semantic intent only;
 * deterministic code validates owner, session state, domain policy, action
 * class, budget, and approval requirements before any provider call.
 *
 * Every mutating tool follows the contract's semantic ordering:
 *   authorize → execute (browser action) → observe → verify postcondition →
 *   record event/state → return confirmed result.
 * consumeActionBudget is accounting only — it never substitutes for the
 * browser operation.
 *
 * Success contract (Phase 1, binding on the Phase 2 runtime): a tool may
 * return a success boolean ONLY on verified browser evidence — the Phase 2
 * executor returns a BrowserExecutionResult with verified=true (outcome OK
 * and every postcondition assertion passed, convex/merchantBrowser/contracts.ts).
 * Recording an event or consuming budget is never evidence of success. A
 * state-changing operation that times out after dispatch maps to
 * OUTCOME_UNKNOWN, which tools surface as an error, never as success — the
 * true merchant-side effect may have landed, so the workflow must re-observe
 * and reconcile before any retry of a non-idempotent operation.
 *
 * Permission classes:
 *  - autonomous: reversible observation/cart prep inside the allowed merchant
 *  - approval:   requires a prior explicit user approval record (this pass:
 *                fails closed with needs-approval; approval plumbing is a
 *                remaining-work item, never silently skipped)
 *  - handoff:    pauses automation and asks the human to take over
 */

type InternalActionReference = FunctionReference<"action", "internal", Record<string, unknown>, unknown>;
type InternalMutationReference = FunctionReference<"mutation", "internal", Record<string, unknown>, unknown>;
type InternalQueryReference = FunctionReference<"query", "internal", Record<string, unknown>, unknown>;

type ToolCtxLike = {
  userId?: string;
  runQuery: (ref: InternalQueryReference, args: Record<string, unknown>) => Promise<unknown>;
  runMutation: (ref: InternalMutationReference, args: Record<string, unknown>) => Promise<unknown>;
  runAction: (ref: InternalActionReference, args: Record<string, unknown>) => Promise<unknown>;
};

const beginSessionRef = api.merchantBrowser.index.beginSession as unknown as InternalActionReference;
const consumeBudgetRef = internal.merchantBrowser.state.consumeActionBudget as unknown as InternalMutationReference;
const transitionRef = internal.merchantBrowser.state.transitionInternal as unknown as InternalMutationReference;
const observeRef = internal.merchantBrowser.provider.observeBrowserSession as unknown as InternalActionReference;
const navigateRef = internal.merchantBrowser.provider.navigateToProduct as unknown as InternalActionReference;
const addToCartRef = internal.merchantBrowser.provider.addToCart as unknown as InternalActionReference;
const updateQuantityRef = internal.merchantBrowser.provider.updateQuantity as unknown as InternalActionReference;
const removeItemRef = internal.merchantBrowser.provider.removeItem as unknown as InternalActionReference;
const recordStepRef = internal.merchantBrowser.state.recordStep as unknown as InternalMutationReference;
const getSessionRef = internal.merchantBrowser.state.getSessionInternal as unknown as InternalQueryReference;

const MERCHANT_URL = z.string().url().max(2000);

async function requireActiveSession(
  ctx: ToolCtxLike,
  sessionId: string,
): Promise<{ status: string; merchantHost: string; actionBudgetUsed: number }> {
  if (!ctx.userId) throw new Error("Agent user context is required for merchant automation.");
  const session = (await ctx.runQuery(getSessionRef, {
    sessionId,
  })) as { status: string; merchantHost: string; actionBudgetUsed: number; tokenIdentifier: string } | null;
  if (!session || session.tokenIdentifier !== ctx.userId) {
    throw new Error("Forbidden: merchant session ownership check failed.");
  }
  return session;
}

async function requireAutonomousReady(
  ctx: Parameters<typeof requireActiveSession>[0],
  sessionId: string,
): Promise<void> {
  const session = await requireActiveSession(ctx, sessionId);
  if (session.status !== "ACTIVE") {
    throw new Error(`Merchant automation is ${session.status}; this action needs an ACTIVE session.`);
  }
  if (session.actionBudgetUsed >= 40) {
    throw new Error("Merchant automation reached its action budget for this session.");
  }
}

/** Consume one unit of action budget (accounting only, never the action itself). */
async function consumeBudget(
  ctx: ToolCtxLike,
  sessionId: string,
  actionType: string,
  summary: string,
): Promise<number> {
  const result = (await ctx.runMutation(consumeBudgetRef, {
    sessionId,
    actionType,
    summary,
  })) as { ok: boolean; sequence: number };
  if (!result.ok) throw new Error("Merchant automation reached its action budget for this session.");
  return result.sequence;
}

export const merchantBrowserTools = {
  merchant_begin_session: createTool({
    description:
      "Begin a merchant browser automation session on an allowed merchant product or cart page. Use only for merchants the user explicitly asked to shop at.",
    inputSchema: z.object({ merchantUrl: MERCHANT_URL }).strict(),
    execute: async (ctx, input) => {
      if (!ctx.userId) throw new Error("Agent user context is required for merchant automation.");
      const result = (await ctx.runAction(beginSessionRef, { merchantUrl: input.merchantUrl })) as {
        sessionId: string;
      };
      return { sessionId: result.sessionId, started: true };
    },
  }),

  merchant_observe_cart: createTool({
    description:
      "Observe the current merchant page state (page title, URL) without changing anything. Reversible and read-only.",
    inputSchema: z.object({ sessionId: z.string().min(1) }).strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const observed = (await ctx.runAction(observeRef, { sessionId: input.sessionId })) as {
        pageTitle: string;
        currentUrl: string;
      };
      await consumeBudget(ctx, input.sessionId, "TOOL_OBSERVE", observed.pageTitle ? `Observed page: ${observed.pageTitle}.` : "Observed current merchant page.");
      return observed;
    },
  }),

  merchant_open_product: createTool({
    description:
      "Navigate the merchant session to a specific product page on the same approved merchant. Only URLs on the session's merchant host are accepted.",
    inputSchema: z.object({ sessionId: z.string().min(1), productUrl: MERCHANT_URL }).strict(),
    execute: async (ctx, input) => {
      const session = await requireActiveSession(ctx, input.sessionId);
      let host: string;
      try {
        host = new URL(input.productUrl).host.toLowerCase();
      } catch {
        throw new Error("Product URL must be absolute.");
      }
      if (host !== session.merchantHost) {
        throw new Error("Product URL is off the approved merchant domain.");
      }
      if (session.status !== "ACTIVE") throw new Error(`Merchant automation is ${session.status}.`);

      const sequence = await consumeBudget(ctx, input.sessionId, "TOOL_OPEN_PRODUCT", "Opening the requested product page.");
      // Execute → observe/verify happens inside the provider layer; it returns
      // success only after the browser actually landed on the product page.
      const nav = (await ctx.runAction(navigateRef, {
        sessionId: input.sessionId as Id<"merchantBrowserSessions">,
        productUrl: input.productUrl,
      })) as { success: boolean; pageTitle: string; currentUrl: string };
      if (!nav.success) {
        throw new Error("The merchant did not load the requested product page.");
      }
      await ctx.runMutation(recordStepRef, {
        sessionId: input.sessionId,
        currentStep: "FINDING_PRODUCT",
      });
      return { opened: true, sequence, pageTitle: nav.pageTitle, currentUrl: nav.currentUrl };
    },
  }),

  merchant_add_to_cart: createTool({
    description:
      "Add the currently-open product to the merchant cart. Returns confirmed only after the merchant cart is re-observed and shows the item was added. Reversible; never purchases.",
    inputSchema: z
      .object({ sessionId: z.string().min(1), productName: z.string().trim().min(1).max(200) })
      .strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const sequence = await consumeBudget(ctx, input.sessionId, "TOOL_ADD_TO_CART", `Adding ${input.productName} to the merchant cart.`);
      await ctx.runMutation(recordStepRef, { sessionId: input.sessionId, currentStep: "ADDING_TO_CART" });
      // Execute → observe → verify postcondition (cart count increased).
      const result = (await ctx.runAction(addToCartRef, {
        sessionId: input.sessionId as Id<"merchantBrowserSessions">,
        productName: input.productName,
      })) as { success: boolean; cartItems: number };
      if (!result.success) {
        throw new Error(`The merchant cart did not confirm ${input.productName} was added.`);
      }
      return { added: true, sequence, cartItems: result.cartItems };
    },
  }),

  merchant_update_quantity: createTool({
    description:
      "Update an item quantity in the merchant cart. Returns confirmed only after the merchant cart is re-observed and shows the requested quantity.",
    inputSchema: z
      .object({
        sessionId: z.string().min(1),
        productName: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(20),
      })
      .strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const sequence = await consumeBudget(ctx, input.sessionId, "TOOL_UPDATE_QUANTITY", `Updating ${input.productName} quantity to ${input.quantity}.`);
      await ctx.runMutation(recordStepRef, { sessionId: input.sessionId, currentStep: "SELECTING_VARIANT" });
      // Execute → observe → verify postcondition (input reflects quantity).
      const result = (await ctx.runAction(updateQuantityRef, {
        sessionId: input.sessionId as Id<"merchantBrowserSessions">,
        productName: input.productName,
        quantity: input.quantity,
      })) as { success: boolean; cartItems: number };
      if (!result.success) {
        throw new Error(`The merchant cart did not confirm the new quantity for ${input.productName}.`);
      }
      return { updated: true, sequence, cartItems: result.cartItems };
    },
  }),

  merchant_remove_item: createTool({
    description:
      "Remove an item from the merchant cart. Returns confirmed only after the merchant cart is re-observed and no longer contains the item.",
    inputSchema: z
      .object({ sessionId: z.string().min(1), productName: z.string().trim().min(1).max(200) })
      .strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const sequence = await consumeBudget(ctx, input.sessionId, "TOOL_REMOVE_ITEM", `Removing ${input.productName} from the merchant cart.`);
      // Execute → observe → verify postcondition (cart count decreased).
      const result = (await ctx.runAction(removeItemRef, {
        sessionId: input.sessionId as Id<"merchantBrowserSessions">,
        productName: input.productName,
      })) as { success: boolean; cartItems: number };
      if (!result.success) {
        throw new Error(`The merchant cart did not confirm ${input.productName} was removed.`);
      }
      return { removed: true, sequence, cartItems: result.cartItems };
    },
  }),

  merchant_request_handoff: createTool({
    description:
      "Pause automation and ask the user to take over the browser (MFA, CAPTCHA, SSO, credentials, or sensitive fields).",
    inputSchema: z
      .object({ sessionId: z.string().min(1), reason: z.string().trim().min(3).max(160) })
      .strict(),
    execute: async (ctx, input) => {
      const session = await requireActiveSession(ctx, input.sessionId);
      // Sensitive inputs are classified into the dedicated waiting states when
      // the automation is otherwise healthy: WAITING_SECURE_INPUT keeps a
      // credential broker in control of the browser; WAITING_USER_INPUT covers
      // non-secret user steps. HANDOFF_REQUIRED remains the general escape for
      // MFA/SSO/CAPTCHA and anything the classification cannot decide.
      const lower = input.reason.toLowerCase();
      if (
        session.status === "ACTIVE" &&
        /(password|secure|payment|card|cvv|otp|pin)/.test(lower)
      ) {
        await ctx.runMutation(transitionRef, {
          sessionId: input.sessionId,
          status: "WAITING_SECURE_INPUT",
          reason: input.reason,
        });
        return { handoffRequested: true, status: "WAITING_SECURE_INPUT" };
      }
      if (session.status === "ACTIVE" && /(form|field|input|question|answer|date of birth)/.test(lower)) {
        await ctx.runMutation(transitionRef, {
          sessionId: input.sessionId,
          status: "WAITING_USER_INPUT",
          reason: input.reason,
        });
        return { handoffRequested: true, status: "WAITING_USER_INPUT" };
      }
      await ctx.runMutation(transitionRef, {
        sessionId: input.sessionId,
        status: "HANDOFF_REQUIRED",
        reason: input.reason,
      });
      return { handoffRequested: true, status: "HANDOFF_REQUIRED" };
    },
  }),

  merchant_begin_account_flow: createTool({
    description:
      "Request explicit user approval to create or sign into a merchant account. Requires prior explicit approval; returns needs-approval until then.",
    inputSchema: z
      .object({ sessionId: z.string().min(1), purpose: z.string().trim().min(3).max(160) })
      .strict(),
    execute: async (ctx, input) => {
      await requireActiveSession(ctx, input.sessionId);
      // Approval records are a remaining-work item; until they exist this
      // tool must fail closed rather than invent consent.
      await consumeBudget(ctx, input.sessionId, "TOOL_APPROVAL_BLOCKED", `Account flow needs your approval: ${input.purpose}.`);
      return { approved: false, reason: "explicit user approval record required" };
    },
  }),
};
