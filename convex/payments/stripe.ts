"use node";

import Stripe from "stripe";
import { action, env } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "../lib/identity";

/**
 * Payment-method boundary. The client may only reference an existing Stripe
 * PaymentMethod ID (created inside Stripe Elements, never raw card data).
 * Card details are read back from Stripe after server-side verification —
 * never accepted from client arguments. Every operation fails explicitly when
 * the deployment's Stripe configuration is missing or invalid (the current
 * live key in the vault is expired, so add/list/detach fail honestly instead
 * of pretending success).
 */

function stripeClient(): Stripe {
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured in the Convex deployment.");
  return new Stripe(secretKey, { apiVersion: "2025-01-27.acacia" as any });
}

async function ensureStripeCustomer(
  stripe: Stripe,
  args: { stripeCustomerId?: string | undefined; email?: string | undefined },
): Promise<string> {
  if (args.stripeCustomerId) {
    const customer = await stripe.customers.retrieve(args.stripeCustomerId);
    if (customer.deleted) throw new Error("Saved Stripe customer no longer exists.");
    return customer.id;
  }
  const customer = await stripe.customers.create({ ...(args.email ? { email: args.email } : {}) });
  return customer.id;
}function isCardPm(value: Stripe.PaymentMethod): value is Stripe.PaymentMethod & { card: NonNullable<Stripe.PaymentMethod["card"]> } {
  return value.card !== null && value.card !== undefined;
}

export const attachPaymentMethod = action({
  args: { stripePaymentMethodId: v.string() },
  returns: v.object({
    recordId: v.id("paymentMethods"),
    brand: v.string(),
    last4: v.string(),
    expMonth: v.number(),
    expYear: v.number(),
  }),
  handler: async (ctx, args): Promise<{ recordId: any; brand: string; last4: string; expMonth: number; expYear: number }> => {
    const identity = await requireFirebaseIdentity(ctx);
    const pmId = args.stripePaymentMethodId.trim();
    if (!/^pm_[A-Za-z0-9]{8,}$/.test(pmId)) throw new Error("A valid Stripe PaymentMethod ID is required.");

    const user = await ctx.runQuery(api.users.me, {});
    if (!user) throw new Error("Profile not found.");

    const stripe = stripeClient();
    let pm: Stripe.PaymentMethod;
    try {
      pm = await stripe.paymentMethods.retrieve(pmId);
    } catch {
      throw new Error("Payment method could not be verified with Stripe.");
    }
    if (!isCardPm(pm)) throw new Error("Only card payment methods can be saved.");

    const customerId = await ensureStripeCustomer(stripe, {
      stripeCustomerId: user.stripeCustomerId,
      email: user.email,
    });
    const attached = await stripe.paymentMethods.attach(pmId, { customer: customerId });
    if (attached.customer !== customerId) throw new Error("Payment method attach failed.");
    if (!isCardPm(attached)) throw new Error("Only card payment methods can be saved.");

    const card = attached.card;
    const recordId = await ctx.runMutation(internal.payments.records.recordPaymentMethod, {
      tokenIdentifier: identity.tokenIdentifier,
      stripePaymentMethodId: attached.id,
      stripeCustomerId: customerId,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      isDefault: false,
    });
    return { recordId, brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year };
  },
});

export const detachPaymentMethod = action({
  args: { recordId: v.id("paymentMethods") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const record = await ctx.runQuery(internal.payments.records.getOwnedPaymentMethod, {
      tokenIdentifier: identity.tokenIdentifier,
      paymentMethodId: args.recordId,
    });
    if (!record) throw new Error("Payment method not found.");

    const stripe = stripeClient();
    await stripe.paymentMethods.detach(record.stripePaymentMethodId);
    await ctx.runMutation(internal.payments.records.removePaymentMethodRecord, { paymentMethodId: args.recordId });
    return null;
  },
});
