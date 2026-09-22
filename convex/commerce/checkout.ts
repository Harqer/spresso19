import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "../lib/identity";
import { listingValidator as listing } from "../lib/listing";

const checkoutStatus = v.union(
  v.literal("NEW"), v.literal("QUOTING"), v.literal("AWAITING_STEP_UP"),
  v.literal("READY_FOR_PAYMENT"), v.literal("PROCESSING"), v.literal("COMPLETED"), v.literal("FAILED"),
);
const orderStatus = v.union(
  v.literal("AUTHORIZED"), v.literal("PROCESSING"), v.literal("IN_TRANSIT"),
  v.literal("DELIVERED"), v.literal("RETURN_REQUESTED"), v.literal("RETURNED"), v.literal("CANCELLED"),
);
const returnStatus = v.union(v.literal("NONE"), v.literal("REQUESTED"), v.literal("APPROVED"), v.literal("COMPLETED"));
const webhookStatus = v.union(v.literal("PROCESSING"), v.literal("COMPLETED"), v.literal("IGNORED"), v.literal("FAILED"));

const checkoutAttempt = v.object({
  _id: v.id("checkoutAttempts"), _creationTime: v.number(), tokenIdentifier: v.string(), listingId: v.string(),
  listing, quantity: v.number(), idempotencyKey: v.string(), status: checkoutStatus,
  amountCents: v.optional(v.number()), currency: v.optional(v.string()), merchantUrl: v.optional(v.string()),
  quoteObservedAt: v.optional(v.string()), paymentIntentId: v.optional(v.string()), orderId: v.optional(v.string()),
  failureCode: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
});
const order = v.object({
  _id: v.id("orders"), _creationTime: v.number(), tokenIdentifier: v.string(),
  checkoutAttemptId: v.id("checkoutAttempts"), paymentIntentId: v.string(), listingId: v.string(), listing,
  quantity: v.number(), amountCents: v.number(), currency: v.string(), merchantUrl: v.string(), status: orderStatus,
  deviceSource: v.optional(v.string()), humanConfirmedAt: v.optional(v.string()), mcpTransactionHash: v.optional(v.string()),
  shippingAddress: v.optional(v.string()), trackingStatus: v.optional(v.string()), carrier: v.optional(v.string()),
  trackingNumber: v.optional(v.string()), estimatedDelivery: v.optional(v.string()), returnStatus: v.optional(returnStatus),
  returnReason: v.optional(v.string()), reminderSet: v.optional(v.boolean()), reminderTime: v.optional(v.string()),
  paymentMethod: v.optional(v.string()), createdAt: v.number(),
});

export const getCheckoutAttempt = query({
  args: { attemptId: v.id("checkoutAttempts") }, returns: v.union(checkoutAttempt, v.null()),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const attempt = await ctx.db.get(args.attemptId);
    return attempt && attempt.tokenIdentifier === identity.tokenIdentifier ? attempt : null;
  },
});

export const getCheckoutAttemptInternal = internalQuery({
  args: { attemptId: v.id("checkoutAttempts") }, returns: v.union(checkoutAttempt, v.null()),
  handler: async (ctx, args) => ctx.db.get(args.attemptId),
});

export const listOrders = query({
  args: { limit: v.number() }, returns: v.array(order),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50) throw new Error("Order limit must be a whole number between 1 and 50.");
    return ctx.db.query("orders").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).order("desc").take(args.limit);
  },
});

export const acquireCheckoutAttempt = mutation({
  args: { listingId: v.string(), listing, quantity: v.number(), idempotencyKey: v.string() }, returns: v.id("checkoutAttempts"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const listingId = args.listingId.trim();
    const idempotencyKey = args.idempotencyKey.trim();
    if (!listingId || args.listing.id !== listingId) throw new Error("Checkout listing identity is invalid.");
    if (!idempotencyKey) throw new Error("idempotencyKey is required.");
    if (!Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > 25) throw new Error("quantity must be an integer between 1 and 25.");
    const existing = await ctx.db.query("checkoutAttempts").withIndex("by_token_identifier_and_idempotency_key", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier).eq("idempotencyKey", idempotencyKey)).unique();
    if (existing) return existing._id;
    const now = Date.now();
    return ctx.db.insert("checkoutAttempts", { tokenIdentifier: identity.tokenIdentifier, listingId, listing: args.listing, quantity: args.quantity, idempotencyKey, status: "NEW", createdAt: now, updatedAt: now });
  },
});

export const markQuoted = internalMutation({
  args: { attemptId: v.id("checkoutAttempts"), amountCents: v.number(), currency: v.string(), merchantUrl: v.string(), observedAt: v.string() },
  returns: v.object({ attemptId: v.id("checkoutAttempts"), amountCents: v.number(), currency: v.string(), merchantUrl: v.string(), observedAt: v.string() }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Checkout attempt not found.");
    if (attempt.status !== "NEW" && attempt.status !== "QUOTING") {
      if (attempt.status === "AWAITING_STEP_UP" && attempt.amountCents === args.amountCents && attempt.currency === args.currency.trim().toUpperCase()) return { attemptId: args.attemptId, amountCents: args.amountCents, currency: args.currency.trim().toUpperCase(), merchantUrl: requireHttpsUrl(args.merchantUrl), observedAt: args.observedAt };
      throw new Error(`Cannot quote from state ${attempt.status}.`);
    }
    if (!Number.isInteger(args.amountCents) || args.amountCents <= 0) throw new Error("amountCents must be a positive integer.");
    const currency = args.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a 3-letter code.");
    const merchantUrl = requireHttpsUrl(args.merchantUrl);
    await ctx.db.patch(args.attemptId, { amountCents: args.amountCents, currency, merchantUrl, quoteObservedAt: args.observedAt, status: "AWAITING_STEP_UP", updatedAt: Date.now() });
    return { attemptId: args.attemptId, amountCents: args.amountCents, currency, merchantUrl, observedAt: args.observedAt };
  },
});

export const attachPaymentIntent = internalMutation({
  args: { attemptId: v.id("checkoutAttempts"), paymentIntentId: v.string(), amountCents: v.number(), currency: v.string() },
  returns: v.object({ paymentIntentId: v.string() }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Checkout attempt not found.");
    if (attempt.paymentIntentId) return { paymentIntentId: attempt.paymentIntentId };
    if (attempt.status !== "AWAITING_STEP_UP") throw new Error(`Cannot attach payment from state ${attempt.status}.`);
    if (attempt.amountCents !== args.amountCents || attempt.currency !== args.currency.toUpperCase()) throw new Error("Payment does not match the verified quote.");
    await ctx.db.patch(args.attemptId, { paymentIntentId: args.paymentIntentId, status: "PROCESSING", updatedAt: Date.now() });
    return { paymentIntentId: args.paymentIntentId };
  },
});

export const failCheckoutAttempt = internalMutation({
  args: { attemptId: v.id("checkoutAttempts"), failureCode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) return null;
    if (attempt.status !== "PROCESSING" && attempt.status !== "AWAITING_STEP_UP") return null;
    // A failed charge invalidates the verified quote: stripping it keeps the
    // webhook reconciler unable to match stale amounts to a new intent.
    if (attempt.status === "AWAITING_STEP_UP") {
      await ctx.db.patch(args.attemptId, {
        amountCents: undefined,
        currency: undefined,
        merchantUrl: undefined,
        quoteObservedAt: undefined,
        status: "FAILED",
        failureCode: args.failureCode.trim().slice(0, 120) || "unknown",
        updatedAt: Date.now(),
      });
      return null;
    }
    await ctx.db.patch(args.attemptId, { status: "FAILED", failureCode: args.failureCode.trim().slice(0, 120) || "unknown", updatedAt: Date.now() });
    return null;
  },
});

export const setOrderReminder = mutation({
  args: { orderId: v.id("orders"), reminderTime: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db.get(args.orderId);
    if (!existing || existing.tokenIdentifier !== identity.tokenIdentifier) throw new Error("Order not found.");
    if (!args.reminderTime.trim()) throw new Error("reminderTime is required.");
    await ctx.db.patch(args.orderId, { reminderSet: true, reminderTime: args.reminderTime.trim() });
    return null;
  },
});

export const acknowledgeDelivery = mutation({
  args: { orderId: v.id("orders") }, returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db.get(args.orderId);
    if (!existing || existing.tokenIdentifier !== identity.tokenIdentifier) throw new Error("Order not found.");
    if (existing.status !== "DELIVERED") {
      await ctx.db.patch(args.orderId, { status: "DELIVERED", trackingStatus: "DELIVERED" });
    }
    return null;
  },
});

export const requestReturn = mutation({
  args: { orderId: v.id("orders"), reason: v.string(), idempotencyKey: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db.get(args.orderId);
    if (!existing || existing.tokenIdentifier !== identity.tokenIdentifier) throw new Error("Order not found.");
    const reason = args.reason.trim();
    const key = args.idempotencyKey.trim();
    if (reason.length < 3 || reason.length > 500 || !key) throw new Error("A valid return reason and idempotency key are required.");
    if (existing.returnStatus === "REQUESTED" || existing.returnStatus === "COMPLETED" || existing.status === "CANCELLED") return null;
    await ctx.db.patch(args.orderId, { status: "RETURN_REQUESTED", returnStatus: "REQUESTED", returnReason: reason });
    return null;
  },
});

export const acquireWebhookEvent = internalMutation({
  args: { provider: v.string(), eventId: v.string(), payloadHash: v.string() }, returns: v.object({ acquired: v.boolean() }),
  handler: async (ctx, args) => {
    const provider = args.provider.trim(); const eventId = args.eventId.trim(); const payloadHash = args.payloadHash.trim();
    if (!provider || !eventId || !payloadHash) throw new Error("provider, eventId, and payloadHash are required.");
    const existing = await ctx.db.query("webhookInbox").withIndex("by_provider_and_event_id", (q) => q.eq("provider", provider).eq("eventId", eventId)).unique();
    if (existing) { if (existing.payloadHash !== payloadHash) throw new Error("Webhook event payload mismatch."); return { acquired: false }; }
    const now = Date.now(); await ctx.db.insert("webhookInbox", { provider, eventId, payloadHash, status: "PROCESSING", createdAt: now, updatedAt: now }); return { acquired: true };
  },
});

export const completePayment = internalMutation({
  args: { provider: v.string(), eventId: v.string(), paymentIntentId: v.string(), amountCents: v.number(), currency: v.string(), checkoutAttemptId: v.optional(v.id("checkoutAttempts")) },
  returns: v.object({ orderId: v.id("orders"), created: v.boolean() }),
  handler: async (ctx, args) => {
    const event = await ctx.db.query("webhookInbox").withIndex("by_provider_and_event_id", (q) => q.eq("provider", args.provider).eq("eventId", args.eventId)).unique();
    if (!event) throw new Error("Webhook event has not been acquired.");
    const existingOrder = await ctx.db.query("orders").withIndex("by_payment_intent_id", (q) => q.eq("paymentIntentId", args.paymentIntentId)).unique();
    if (existingOrder) return { orderId: existingOrder._id, created: false };
    let attempt = await ctx.db.query("checkoutAttempts").withIndex("by_payment_intent_id", (q) => q.eq("paymentIntentId", args.paymentIntentId)).unique();
    if (!attempt && args.checkoutAttemptId) {
      // Healing path: the charge landed but the intent was never attached to
      // the attempt (ambiguous confirm failure). The metadata comes from our
      // own signed event, and every ownership/amount/state check still applies.
      const candidate = await ctx.db.get(args.checkoutAttemptId);
      if (
        candidate &&
        candidate.amountCents === args.amountCents &&
        candidate.currency === args.currency.toUpperCase() &&
        !candidate.paymentIntentId &&
        candidate.status !== "FAILED" &&
        candidate.status !== "COMPLETED"
      ) {
        attempt = candidate;
      }
    }
    if (!attempt || attempt.amountCents !== args.amountCents || attempt.currency !== args.currency.toUpperCase()) throw new Error("Payment does not match a verified checkout attempt.");
    const orderId = await ctx.db.insert("orders", { tokenIdentifier: attempt.tokenIdentifier, checkoutAttemptId: attempt._id, paymentIntentId: args.paymentIntentId, listingId: attempt.listingId, listing: attempt.listing, quantity: attempt.quantity, amountCents: args.amountCents, currency: args.currency.toUpperCase(), merchantUrl: attempt.merchantUrl ?? attempt.listing.merchantUrl, status: "PROCESSING", humanConfirmedAt: new Date().toISOString(), createdAt: Date.now() });
    await ctx.db.patch(attempt._id, { orderId: String(orderId), paymentIntentId: args.paymentIntentId, status: "COMPLETED", updatedAt: Date.now() });
    await ctx.db.patch(event._id, { status: "COMPLETED", updatedAt: Date.now() });
    return { orderId, created: true };
  },
});

export const completeWebhookEvent = internalMutation({
  args: { provider: v.string(), eventId: v.string(), status: webhookStatus }, returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.query("webhookInbox").withIndex("by_provider_and_event_id", (q) => q.eq("provider", args.provider.trim()).eq("eventId", args.eventId.trim())).unique();
    if (!event) throw new Error("Webhook event not found.");
    await ctx.db.patch(event._id, { status: args.status, updatedAt: Date.now() });
    return null;
  },
});

function requireHttpsUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { throw new Error("merchantUrl must be a valid HTTPS URL."); }
  if (parsed.protocol !== "https:" || !parsed.hostname) throw new Error("merchantUrl must use HTTPS.");
  return parsed.toString();
}
