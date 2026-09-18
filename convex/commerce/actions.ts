"use node";

import Stripe from "stripe";
import { action, env } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "../lib/identity";
import type { Id } from "../_generated/dataModel";

function httpsUrl(value: string): string {
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { throw new Error("Merchant URL must be a valid HTTPS URL."); }
  if (parsed.protocol !== "https:" || !parsed.hostname) throw new Error("Merchant URL must use HTTPS.");
  return parsed.toString();
}

function allowlistedUrl(value: string): string {
  const normalized = httpsUrl(value);
  const domains = (env.KITESURF_ALLOWED_DOMAINS ?? "").split(",").map((domain: string) => domain.trim().toLowerCase()).filter(Boolean);
  if (domains.length === 0) throw new Error("Merchant quote provider is not configured in the Convex deployment.");
  const hostname = new URL(normalized).hostname.toLowerCase();
  if (!domains.some((domain: string) => hostname === domain || hostname.endsWith(`.${domain}`))) throw new Error("Merchant URL is not allowlisted for verification.");
  return normalized;
}

function price(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Merchant quote did not include a valid price.");
  return amount;
}

function currency(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value)) throw new Error("Merchant quote did not include a valid currency.");
  return value.toUpperCase();
}

type CheckoutAttemptSnapshot = {
  tokenIdentifier: string;
  listingId: string;
  listing: { merchantUrl: string; name: string };
  quantity: number;
  status: string;
  amountCents?: number;
  currency?: string;
  merchantUrl?: string;
  quoteObservedAt?: string;
  paymentIntentId?: string;
  idempotencyKey: string;
};

async function merchantQuote(attempt: CheckoutAttemptSnapshot) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) throw new Error("Merchant quote provider is not configured in the Convex deployment.");
  const merchantUrl = allowlistedUrl(attempt.listing.merchantUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-run/json?browser=kitesurf`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        url: merchantUrl,
        prompt: `Inspect this public product page for ${attempt.listing.name}. Return only visible current price, ISO currency, final product URL, and whether the named product is present. Do not log in, add to cart, open checkout, enter payment data, or click place order.`,
        response_format: { type: "json_schema", json_schema: { type: "object", properties: { found: { type: "boolean" }, price: { type: ["number", "string"] }, currency: { type: "string" }, productUrl: { type: "string" } }, required: ["found"] } },
      }),
    });
    if (!response.ok) throw new Error(`Merchant quote provider failed (${response.status}).`);
    const data = await response.json() as { result?: { found?: unknown; price?: unknown; currency?: unknown; productUrl?: unknown } };
    if (data.result?.found !== true) throw new Error("Merchant listing could not be verified.");
    return { amountCents: Math.round(price(data.result.price) * 100) * attempt.quantity, currency: currency(data.result.currency), merchantUrl: allowlistedUrl(typeof data.result.productUrl === "string" ? data.result.productUrl : merchantUrl), observedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timeout);
  }
}

type PrepareCheckoutResult = { attemptId: Id<"checkoutAttempts">; amountCents: number; currency: string; merchantUrl: string; observedAt: string };

type PaymentIntentResult = { clientSecret: string; paymentIntentId: string; amountCents: number; currency: string; publishableKey: string };

export const prepareCheckout = action({
  args: { attemptId: v.id("checkoutAttempts") },
  returns: v.object({ attemptId: v.id("checkoutAttempts"), amountCents: v.number(), currency: v.string(), merchantUrl: v.string(), observedAt: v.string() }),
  handler: async (ctx, args): Promise<PrepareCheckoutResult> => {
    const identity = await requireFirebaseIdentity(ctx);
    const attempt: CheckoutAttemptSnapshot | null = await ctx.runQuery(internal.commerce.checkout.getCheckoutAttemptInternal, { attemptId: args.attemptId });
    if (!attempt || attempt.tokenIdentifier !== identity.tokenIdentifier) throw new Error("Checkout attempt not found.");
    if (attempt.status !== "NEW" && attempt.status !== "QUOTING") {
      if (attempt.amountCents && attempt.currency && attempt.merchantUrl && attempt.quoteObservedAt) return { attemptId: args.attemptId, amountCents: attempt.amountCents, currency: attempt.currency, merchantUrl: attempt.merchantUrl, observedAt: attempt.quoteObservedAt };
      throw new Error(`Checkout cannot be quoted from state ${attempt.status}.`);
    }
    const quote = await merchantQuote(attempt);
    return ctx.runMutation(internal.commerce.checkout.markQuoted, { attemptId: args.attemptId, ...quote });
  },
});

export const createPaymentIntent = action({
  args: { attemptId: v.id("checkoutAttempts"), confirmedAmountCents: v.number(), confirmedCurrency: v.string() },
  returns: v.object({ clientSecret: v.string(), paymentIntentId: v.string(), amountCents: v.number(), currency: v.string(), publishableKey: v.string() }),
  handler: async (ctx, args): Promise<PaymentIntentResult> => {
    const identity = await requireFirebaseIdentity(ctx);
    const attempt: CheckoutAttemptSnapshot | null = await ctx.runQuery(internal.commerce.checkout.getCheckoutAttemptInternal, { attemptId: args.attemptId });
    if (!attempt || attempt.tokenIdentifier !== identity.tokenIdentifier || !attempt.amountCents || !attempt.currency) throw new Error("Checkout quote not found.");
    if (attempt.amountCents !== args.confirmedAmountCents || attempt.currency !== args.confirmedCurrency.trim().toUpperCase()) throw new Error("Checkout confirmation does not match the verified quote.");
    if (attempt.paymentIntentId) throw new Error("This checkout is already in progress.");
    if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe checkout is not configured in the Convex deployment.");
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion });
    const intent = await stripe.paymentIntents.create({ amount: attempt.amountCents, currency: attempt.currency.toLowerCase(), automatic_payment_methods: { enabled: true }, metadata: { checkoutAttemptId: String(args.attemptId), tokenIdentifier: identity.tokenIdentifier, listingId: attempt.listingId, quantity: String(attempt.quantity) } }, { idempotencyKey: `convex_${identity.tokenIdentifier}_${attempt.idempotencyKey}` });
    await ctx.runMutation(internal.commerce.checkout.attachPaymentIntent, { attemptId: args.attemptId, paymentIntentId: intent.id, amountCents: attempt.amountCents, currency: attempt.currency });
    if (!intent.client_secret) throw new Error("Stripe did not return a payment client secret.");
    if (!env.STRIPE_PUBLISHABLE_KEY) throw new Error("Stripe public configuration is missing in the Convex deployment.");
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id, amountCents: attempt.amountCents, currency: attempt.currency, publishableKey: env.STRIPE_PUBLISHABLE_KEY };
  },
});
