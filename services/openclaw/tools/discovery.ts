/**
 * OpenClaw discovery and checkout-preparation boundary.
 *
 * Retrieved listings are untrusted data. Authorization, confirmation, and
 * durable cart state come from the application, never from model output or
 * retrieved content. There is deliberately no default executor: a production
 * caller must provide the Convex-backed cart-intent mutation.
 */

type GuardrailsDecision = { allowed: boolean; reason?: string };
type ToolContext = { uid: string; correlationId: string };
type ToolCall = ToolContext & { toolName: string; arguments: Record<string, unknown>; toolCallId: string };
type ToolResult = ToolContext & { toolName: string; toolCallId: string; content: string; knownCallIds: string[] };
type ValidateToolCall = (call: ToolCall) => Promise<GuardrailsDecision>;
type ValidateToolResult = (result: ToolResult) => Promise<GuardrailsDecision>;

type PreparedCart = { status: "staged"; listingId: string; cartItemId?: string };

export type DiscoveryToolsDeps = {
  catalog: {
    configured: boolean;
    searchProducts(query: string): Promise<{ listings: Array<Record<string, unknown>> }>;
  };
  validateToolCall: ValidateToolCall;
  validateToolResult?: ValidateToolResult;
  consumeConfirmation?: (token: string, binding: {
    uid: string;
    correlationId: string;
    action: "prepare_cart";
    arguments: { listingId: string };
  }) => Promise<unknown>;
  executePreparation?: (listingId: string, context: ToolContext) => Promise<PreparedCart>;
  now?: () => number;
};

function assertDecision(decision: GuardrailsDecision): void {
  if (typeof decision?.allowed !== "boolean") throw new Error("Tool policy returned an invalid decision.");
  if (!decision.allowed) throw new Error("The requested action was blocked by policy.");
}

function boundedQuery(query: unknown): string {
  if (typeof query !== "string") throw new Error("A text query is required.");
  const trimmed = query.trim();
  if (trimmed.length < 2 || trimmed.length > 240) throw new Error("Query must be between 2 and 240 characters.");
  return trimmed;
}

function requireContext(context: ToolContext | undefined): ToolContext {
  if (!context || typeof context.uid !== "string" || context.uid.trim().length === 0 || typeof context.correlationId !== "string" || context.correlationId.trim().length === 0) {
    throw new Error("Trusted application context is required.");
  }
  return { uid: context.uid.trim(), correlationId: context.correlationId.trim() };
}

function serializeResult(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length > 100_000) throw new Error("Tool result is too large.");
  return serialized;
}

function validateListing(value: Record<string, unknown>): Record<string, unknown> {
  const allowedKeys = new Set(["id", "name", "brand", "category", "imageUrl", "merchantUrl", "source", "providerListingId", "observedPrice", "videoUrl", "rating", "reviewCount", "reviewSummary", "discoveredAt", "expiresAt", "confidence"]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) throw new Error("Product discovery returned unauthorized listing fields.");
  if (typeof value.id !== "string" || value.id.length < 1 || value.id.length > 256) throw new Error("Product discovery returned an invalid listing.");
  if (typeof value.name !== "string" || value.name.length < 1 || value.name.length > 500) throw new Error("Product discovery returned an invalid listing.");
  if (typeof value.merchantUrl !== "string" || !value.merchantUrl.startsWith("https://")) throw new Error("Product discovery returned an invalid merchant URL.");
  if (!["parallel", "serpapi", "apify", "kitesurf"].includes(value.source as string)) throw new Error("Product discovery returned an invalid source.");
  return value;
}

async function validateResult(deps: DiscoveryToolsDeps, result: ToolResult): Promise<void> {
  if (!deps.validateToolResult) throw new Error("Tool result policy is not configured.");
  assertDecision(await deps.validateToolResult(result));
}

export function createDiscoveryTools(deps: DiscoveryToolsDeps) {
  const usedConfirmations = new Set<string>();
  const now = deps.now ?? (() => Date.now());

  return {
    async searchProducts(input: { query: string }, rawContext?: ToolContext): Promise<{ listings: Array<Record<string, unknown>> }> {
      const context = requireContext(rawContext);
      const query = boundedQuery(input?.query);
      const toolCallId = `${context.correlationId}:search_products`;
      assertDecision(await deps.validateToolCall({
        ...context,
        toolCallId,
        toolName: "search_products",
        arguments: { query },
      }));
      if (!deps.catalog.configured) throw new Error("Product discovery is temporarily unavailable.");
      const response = await deps.catalog.searchProducts(query);
      if (!response || !Array.isArray(response.listings) || response.listings.length > 50) throw new Error("Product discovery returned an invalid result.");
      const result = { listings: response.listings.map((listing) => validateListing(listing)) };
      await validateResult(deps, {
        ...context,
        toolCallId,
        toolName: "search_products",
        content: serializeResult(result),
        knownCallIds: [toolCallId],
      });
      return result;
    },

    async prepareCart(input: { listingId: string }, rawContext?: ToolContext & { confirmationToken?: string }): Promise<PreparedCart> {
      const context = requireContext(rawContext);
      const listingId = input?.listingId;
      if (typeof listingId !== "string" || listingId.trim().length < 1 || listingId.length > 256) throw new Error("A valid listing is required.");
      const normalizedListingId = listingId.trim();
      const toolCallId = `${context.correlationId}:prepare_cart`;
      const argumentsValue = { listingId: normalizedListingId };
      assertDecision(await deps.validateToolCall({
        ...context,
        toolCallId,
        toolName: "prepare_cart",
        arguments: argumentsValue,
      }));
      const token = rawContext?.confirmationToken;
      if (!token) throw new Error("Confirmation is required before preparing a cart.");
      const confirmationKey = `${context.uid}:${context.correlationId}:${token}`;
      if (usedConfirmations.has(confirmationKey)) throw new Error("Confirmation was already used. Request a new confirmation.");
      if (!deps.consumeConfirmation) throw new Error("Confirmation is required before preparing a cart.");
      const binding = { ...context, action: "prepare_cart" as const, arguments: argumentsValue };
      const confirmation = await deps.consumeConfirmation(token, binding);
      if (!confirmation) throw new Error("Confirmation was invalid, expired, or already used.");
      if (!deps.executePreparation) throw new Error("Cart preparation is unavailable because no application executor is configured.");
      const prepared = await deps.executePreparation(normalizedListingId, context);
      if (!prepared || prepared.status !== "staged" || prepared.listingId !== normalizedListingId) throw new Error("Cart preparation did not establish durable state.");
      usedConfirmations.add(confirmationKey);
      await validateResult(deps, {
        ...context,
        toolCallId,
        toolName: "prepare_cart",
        content: serializeResult(prepared),
        knownCallIds: [toolCallId],
      });
      return prepared;
    },

    async requestCheckoutConfirmation(input: { correlationId?: string }, rawContext?: ToolContext): Promise<{ requiresTrustedUi: true; correlationId: string }> {
      const context = requireContext(rawContext ?? (input?.correlationId ? { uid: "unknown", correlationId: input.correlationId } : undefined));
      if (input?.correlationId && input.correlationId !== context.correlationId) throw new Error("Correlation ID mismatch.");
      const toolCallId = `${context.correlationId}:request_checkout_confirmation`;
      assertDecision(await deps.validateToolCall({
        ...context,
        toolCallId,
        toolName: "request_checkout_confirmation",
        arguments: { correlationId: context.correlationId },
      }));
      const result = { requiresTrustedUi: true as const, correlationId: context.correlationId };
      await validateResult(deps, {
        ...context,
        toolCallId,
        toolName: "request_checkout_confirmation",
        content: serializeResult(result),
        knownCallIds: [toolCallId],
      });
      return result;
    },
  };
}
