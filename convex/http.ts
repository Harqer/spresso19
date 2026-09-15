import Stripe from "stripe";
import { httpAction, env } from "./_generated/server";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";

const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

function responseJson(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function stripeSecret(): string {
  const value = env.STRIPE_SECRET_KEY;
  if (!value) throw new Error("Stripe is not configured in the Convex deployment.");
  return value;
}

function webhookSecret(): string {
  const value = env.STRIPE_WEBHOOK_SECRET;
  if (!value) throw new Error("Stripe webhook signing secret is not configured in the Convex deployment.");
  return value;
}

/**
 * Signed Stripe webhook boundary. Raw body text is required — signature
 * verification runs over the exact request body with the SubtleCrypto provider
 * (Convex's default runtime has no Node crypto). A verified
 * `payment_intent.succeeded` creates the owner-visible Convex order exactly
 * once via the acquired inbox event; anything else fails with an honest status
 * so Stripe retries.
 */
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return responseJson(400, { error: "Missing stripe-signature header." });

  const payload = await request.text();
  const stripe = new Stripe(stripeSecret(), { apiVersion: "2025-01-27.acacia" as any });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret(), STRIPE_WEBHOOK_TOLERANCE_SECONDS, cryptoProvider);
  } catch {
    return responseJson(400, { error: "Webhook signature verification failed." });
  }

  if (event.type !== "payment_intent.succeeded") {
    return responseJson(200, { ignored: event.type });
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  const eventId = event.id;
  const paymentIntentId = intent.id;
  const amountCents = intent.amount;
  const currency = intent.currency;
  if (!paymentIntentId || !Number.isInteger(amountCents) || amountCents <= 0 || !currency) {
    return responseJson(200, { ignored: "Unmanaged payment intent payload." });
  }

  const payloadHash = `sha256:${intent.id}:${intent.amount}:${intent.currency}:${event.id}`;
  const { acquired } = await ctx.runMutation(internal.commerce.checkout.acquireWebhookEvent, {
    provider: "stripe",
    eventId,
    payloadHash,
  });

  if (!acquired) {
    // Same event already recorded: completed earlier or mid-flight in another
    // delivery. 409 is retryable for a still-processing event and harmless
    // once the order already exists.
    return responseJson(409, { error: "Event already recorded." });
  }

  try {
    const { orderId, created } = await ctx.runMutation(internal.commerce.checkout.completePayment, {
      provider: "stripe",
      eventId,
      paymentIntentId,
      amountCents,
      currency,
    });
    return responseJson(200, { orderId, created });
  } catch (cause) {
    await ctx.runMutation(internal.commerce.checkout.completeWebhookEvent, {
      provider: "stripe",
      eventId,
      status: "FAILED",
    }).catch(() => undefined);
    console.error("Stripe order reconciliation failed.", { eventId, paymentIntentId, cause: cause instanceof Error ? cause.message : String(cause) });
    return responseJson(500, { error: "Order reconciliation failed." });
  }
});

const http = httpRouter();

http.route({ path: "/stripe_webhook", method: "POST", handler: stripeWebhook });

export default http;
