import { internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "../lib/identity";

const checkoutStatus = v.union(
  v.literal("NEW"),
  v.literal("QUOTING"),
  v.literal("AWAITING_STEP_UP"),
  v.literal("READY_FOR_PAYMENT"),
  v.literal("PROCESSING"),
  v.literal("COMPLETED"),
  v.literal("FAILED"),
);

const webhookStatus = v.union(
  v.literal("PROCESSING"),
  v.literal("COMPLETED"),
  v.literal("IGNORED"),
  v.literal("FAILED"),
);

const checkoutAttempt = v.object({
  _id: v.id("checkoutAttempts"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  listingId: v.string(),
  quantity: v.number(),
  idempotencyKey: v.string(),
  status: checkoutStatus,
  amountCents: v.optional(v.number()),
  currency: v.optional(v.string()),
  merchantUrl: v.optional(v.string()),
  quoteObservedAt: v.optional(v.string()),
  paymentIntentId: v.optional(v.string()),
  orderId: v.optional(v.string()),
  failureCode: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const order = v.object({
  _id: v.id("orders"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  checkoutAttemptId: v.id("checkoutAttempts"),
  paymentIntentId: v.string(),
  listingId: v.string(),
  quantity: v.number(),
  amountCents: v.number(),
  currency: v.string(),
  merchantUrl: v.string(),
  createdAt: v.number(),
});

export const getCheckoutAttempt = query({
  args: { attemptId: v.id("checkoutAttempts") },
  returns: v.union(checkoutAttempt, v.null()),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.tokenIdentifier !== identity.tokenIdentifier) return null;
    return attempt;
  },
});

export const listOrders = query({
  args: { limit: v.number() },
  returns: v.array(order),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50) {
      throw new Error("Order limit must be a whole number between 1 and 50.");
    }
    return await ctx.db
      .query("orders")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(args.limit);
  },
});

function requireHttpsUrl(value: string, fieldName: string): string {
  const normalized = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${fieldName} must be a valid HTTPS URL.`);
  }
  if (parsed.protocol !== "https:" || !parsed.hostname) {
    throw new Error(`${fieldName} must use HTTPS.`);
  }
  return parsed.toString();
}

export const acquireCheckoutAttempt = mutation({
  args: {
    listingId: v.string(),
    quantity: v.number(),
    idempotencyKey: v.string(),
  },
  returns: v.id("checkoutAttempts"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const listingId = args.listingId.trim();
    const idempotencyKey = args.idempotencyKey.trim();
    if (!listingId) throw new Error("listingId is required.");
    if (!idempotencyKey) throw new Error("idempotencyKey is required.");
    if (!Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > 25) {
      throw new Error("quantity must be an integer between 1 and 25.");
    }

    const existing = await ctx.db
      .query("checkoutAttempts")
      .withIndex("by_token_identifier_and_idempotency_key", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("idempotencyKey", idempotencyKey),
      )
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("checkoutAttempts", {
      tokenIdentifier: identity.tokenIdentifier,
      listingId,
      quantity: args.quantity,
      idempotencyKey,
      status: "NEW",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markQuoted = internalMutation({
  args: {
    attemptId: v.id("checkoutAttempts"),
    amountCents: v.number(),
    currency: v.string(),
    merchantUrl: v.string(),
    observedAt: v.string(),
  },
  returns: v.object({
    _id: v.id("checkoutAttempts"),
    status: checkoutStatus,
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("checkoutAttempts", args.attemptId);
    if (!attempt) throw new Error("Checkout attempt not found.");
    if (attempt.status !== "NEW" && attempt.status !== "QUOTING") {
      throw new Error(`Cannot mark quoted from state ${attempt.status}.`);
    }
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) {
      throw new Error("amountCents must be a positive integer.");
    }
    const currency = args.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a 3-letter code.");
    const merchantUrl = requireHttpsUrl(args.merchantUrl, "merchantUrl");
    await ctx.db.patch("checkoutAttempts", args.attemptId, {
      amountCents: args.amountCents,
      currency,
      merchantUrl,
      quoteObservedAt: args.observedAt,
      status: "AWAITING_STEP_UP",
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("checkoutAttempts", args.attemptId);
    if (!updated) throw new Error("Checkout attempt missing after update.");
    return { _id: updated._id, status: updated.status };
  },
});

export const finalizeQuote = internalMutation({
  args: {
    attemptId: v.id("checkoutAttempts"),
    amountCents: v.number(),
    currency: v.string(),
    merchantUrl: v.string(),
    observedAt: v.string(),
  },
  returns: v.object({
    _id: v.id("checkoutAttempts"),
    status: checkoutStatus,
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("checkoutAttempts", args.attemptId);
    if (!attempt) throw new Error("Checkout attempt not found.");
    if (attempt.status !== "AWAITING_STEP_UP") {
      throw new Error(`Cannot finalize quote from state ${attempt.status}.`);
    }
    // Ensure the finalized quote matches the previously quoted values
    if (attempt.amountCents !== undefined && attempt.amountCents !== args.amountCents) {
      throw new Error("Quoted amount mismatch.");
    }
    if (attempt.currency !== undefined && attempt.currency !== args.currency.trim().toUpperCase()) {
      throw new Error("Quoted currency mismatch.");
    }
    const merchantUrl = requireHttpsUrl(args.merchantUrl, "merchantUrl");
    await ctx.db.patch("checkoutAttempts", args.attemptId, {
      amountCents: args.amountCents,
      currency: args.currency.trim().toUpperCase(),
      merchantUrl,
      quoteObservedAt: args.observedAt,
      status: "READY_FOR_PAYMENT",
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get("checkoutAttempts", args.attemptId);
    if (!updated) throw new Error("Checkout attempt missing after update.");
    return { _id: updated._id, status: updated.status };
  },
});

export const acquireWebhookEvent = internalMutation({
  args: {
    provider: v.string(),
    eventId: v.string(),
    payloadHash: v.string(),
  },
  returns: v.object({ acquired: v.boolean() }),
  handler: async (ctx, args) => {
    const provider = args.provider.trim();
    const eventId = args.eventId.trim();
    if (!provider || !eventId) throw new Error("provider and eventId are required.");
    const existing = await ctx.db
      .query("webhookInbox")
      .withIndex("by_provider_and_event_id", (q) => q.eq("provider", provider).eq("eventId", eventId))
      .unique();
    if (existing) return { acquired: false };
    const now = Date.now();
    await ctx.db.insert("webhookInbox", {
      provider,
      eventId,
      payloadHash: args.payloadHash,
      status: "PROCESSING",
      createdAt: now,
      updatedAt: now,
    });
    return { acquired: true };
  },
});

// Public webhook status helper kept internal for now; exposed via HTTP action later
export const completeWebhookEvent = internalMutation({
  args: {
    provider: v.string(),
    eventId: v.string(),
    status: webhookStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("webhookInbox")
      .withIndex("by_provider_and_event_id", (q) =>
        q.eq("provider", args.provider.trim()).eq("eventId", args.eventId.trim()),
      )
      .unique();
    if (!doc) throw new Error("Webhook event not found.");
    await ctx.db.patch("webhookInbox", doc._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});
