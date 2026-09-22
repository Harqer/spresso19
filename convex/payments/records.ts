import { internalQuery, internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "../lib/identity";

/**
 * Owner-scoped payment-method records. Card details are written only by the
 * Stripe action after server-side verification — the client can never supply
 * brand, last4, or expiry data, and never raw card numbers.
 */

export const listPaymentMethods = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("paymentMethods"),
    _creationTime: v.number(),
    tokenIdentifier: v.string(),
    stripePaymentMethodId: v.string(),
    stripeCustomerId: v.string(),
    brand: v.string(),
    last4: v.string(),
    expMonth: v.number(),
    expYear: v.number(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("paymentMethods")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .collect();
  },
});

/**
 * Owner-scoped default payment method for off-session confirmation.
 * Falls back to the most recently attached card when no explicit default
 * exists, so checkout works before the user manages ordering in Profile.
 */
export const getDefaultPaymentMethod = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(v.null(), v.object({
    stripePaymentMethodId: v.string(),
    stripeCustomerId: v.string(),
    brand: v.string(),
    last4: v.string(),
    expMonth: v.number(),
    expYear: v.number(),
    isDefault: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("paymentMethods")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .order("desc")
      .collect();
    const selected = rows.find((row) => row.isDefault) ?? rows[0];
    if (!selected) return null;
    return {
      stripePaymentMethodId: selected.stripePaymentMethodId,
      stripeCustomerId: selected.stripeCustomerId,
      brand: selected.brand,
      last4: selected.last4,
      expMonth: selected.expMonth,
      expYear: selected.expYear,
      isDefault: selected.isDefault,
    };
  },
});

export const getOwnedPaymentMethod = internalQuery({
  args: { tokenIdentifier: v.string(), paymentMethodId: v.id("paymentMethods") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.paymentMethodId);
    if (!record || record.tokenIdentifier !== args.tokenIdentifier) return null;
    return record;
  },
});

export const recordPaymentMethod = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    stripePaymentMethodId: v.string(),
    stripeCustomerId: v.string(),
    brand: v.string(),
    last4: v.string(),
    expMonth: v.number(),
    expYear: v.number(),
    isDefault: v.boolean(),
  },
  returns: v.id("paymentMethods"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("paymentMethods")
      .withIndex("by_token_identifier_and_pm_id", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier).eq("stripePaymentMethodId", args.stripePaymentMethodId),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("paymentMethods", { ...args, createdAt: Date.now() });
  },
});

export const removePaymentMethodRecord = internalMutation({
  args: { paymentMethodId: v.id("paymentMethods") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("paymentMethods", args.paymentMethodId);
    return null;
  },
});
