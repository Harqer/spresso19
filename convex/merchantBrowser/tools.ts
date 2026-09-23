import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { FunctionReference } from "convex/server";

/**
 * Semantic merchant browser tools for the Spresso agent (harness contract:
 * docs/merchant-browser-automation.md). The LLM chooses semantic intent only;
 * deterministic code validates owner, session state, domain policy, action
 * class, budget, and approval requirements before any provider call.
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
const getSessionRef = internal.merchantBrowser.state.getSessionInternal as unknown as InternalQueryReference;
// beginSession is an action (public) but tools invoke it through runAction; the
// generated tree only exposes public functions via `api`, internals via `internal`.
// beginSession is public, so reference it through `api`.

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

export const merchantBrowserTools = {
  merchant_begin_session: createTool({
    description:
      "Begin a merchant browser automation session on an allowed merchant product or cart page. Use only for merchants the user explicitly asked to shop at.",
    inputSchema: z.object({ merchantUrl: MERCHANT_URL }).strict(),
    execute: async (ctx, input) => {
      if (!ctx.userId) throw new Error("Agent user context is required for merchant automation.");
      return ctx.runAction(beginSessionRef, { merchantUrl: input.merchantUrl });
    },
  }),

  merchant_observe_cart: createTool({
    description:
      "Observe the current merchant page state (page title, URL, step) without changing anything. Reversible and read-only.",
    inputSchema: z.object({ sessionId: z.string().min(1) }).strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const observed = (await ctx.runAction(observeRef, { sessionId: input.sessionId })) as {
        pageTitle: string;
        currentUrl: string;
      };
      await ctx.runMutation(consumeBudgetRef, {
        sessionId: input.sessionId,
        actionType: "TOOL_OBSERVE",
        summary: observed.pageTitle ? `Observed page: ${observed.pageTitle}.` : "Observed current merchant page.",
      });
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
      await ctx.runMutation(consumeBudgetRef, {
        sessionId: input.sessionId,
        actionType: "TOOL_OPEN_PRODUCT",
        summary: "Opening the requested product page.",
      });
      return { started: true };
    },
  }),

  merchant_add_to_cart: createTool({
    description:
      "Add the currently-open, user-specified product variant to the merchant cart. Reversible; never purchases.",
    inputSchema: z
      .object({ sessionId: z.string().min(1), productName: z.string().trim().min(1).max(200) })
      .strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const result = (await ctx.runMutation(consumeBudgetRef, {
        sessionId: input.sessionId,
        actionType: "TOOL_ADD_TO_CART",
        summary: `Adding ${input.productName} to the merchant cart.`,
      })) as { ok: boolean; sequence: number };
      if (!result.ok) throw new Error("Merchant automation reached its action budget for this session.");
      return { added: true, sequence: result.sequence };
    },
  }),

  merchant_update_quantity: createTool({
    description: "Update the quantity of an item in the merchant cart.",
    inputSchema: z
      .object({
        sessionId: z.string().min(1),
        productName: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(20),
      })
      .strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const result = (await ctx.runMutation(consumeBudgetRef, {
        sessionId: input.sessionId,
        actionType: "TOOL_UPDATE_QUANTITY",
        summary: `Updating ${input.productName} quantity to ${input.quantity}.`,
      })) as { ok: boolean; sequence: number };
      if (!result.ok) throw new Error("Merchant automation reached its action budget for this session.");
      return { updated: true, sequence: result.sequence };
    },
  }),

  merchant_remove_item: createTool({
    description: "Remove an item from the merchant cart.",
    inputSchema: z
      .object({ sessionId: z.string().min(1), productName: z.string().trim().min(1).max(200) })
      .strict(),
    execute: async (ctx, input) => {
      await requireAutonomousReady(ctx, input.sessionId);
      const result = (await ctx.runMutation(consumeBudgetRef, {
        sessionId: input.sessionId,
        actionType: "TOOL_REMOVE_ITEM",
        summary: `Removing ${input.productName} from the merchant cart.`,
      })) as { ok: boolean; sequence: number };
      if (!result.ok) throw new Error("Merchant automation reached its action budget for this session.");
      return { removed: true, sequence: result.sequence };
    },
  }),

  merchant_request_handoff: createTool({
    description:
      "Pause automation and ask the user to take over the browser (MFA, CAPTCHA, SSO, credentials, or sensitive fields).",
    inputSchema: z
      .object({ sessionId: z.string().min(1), reason: z.string().trim().min(3).max(160) })
      .strict(),
    execute: async (ctx, input) => {
      await requireActiveSession(ctx, input.sessionId);
      await ctx.runMutation(transitionRef, {
        sessionId: input.sessionId,
        status: "HANDOFF_REQUIRED",
        reason: input.reason,
      });
      return { handoffRequested: true };
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
      await ctx.runMutation(consumeBudgetRef, {
        sessionId: input.sessionId,
        actionType: "TOOL_APPROVAL_BLOCKED",
        summary: `Account flow needs your approval: ${input.purpose}.`,
      });
      return { approved: false, reason: "explicit user approval record required" };
    },
  }),
};
