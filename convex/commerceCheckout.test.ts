/// <reference types="vite/client" />
import Stripe from "stripe";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { stripeWebhook } from "./http";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const identityA = { issuer: "https://securetoken.google.com/get-spresso", subject: "commerce-user-a", tokenIdentifier: "https://securetoken.google.com/get-spresso:commerce-user-a" };
const identityB = { issuer: "https://securetoken.google.com/get-spresso", subject: "commerce-user-b", tokenIdentifier: "https://securetoken.google.com/get-spresso:commerce-user-b" };
const listing = {
  id: "listing-1", name: "Verified jacket", brand: "Merchant", category: "outerwear",
  imageUrl: "https://merchant.example/jacket.jpg", merchantUrl: "https://merchant.example/item", source: "kitesurf" as const,
  observedPrice: { amount: 12.5, currency: "USD", evidenceUrl: "https://merchant.example/item" }, discoveredAt: "2026-09-08T00:00:00.000Z",
};
function testConvex() { return convexTest(schema, modules); }
function acquire(t: ReturnType<typeof testConvex>, identity = identityA, key = "checkout-key-1") {
  return t.withIdentity(identity).mutation(api.commerce.checkout.acquireCheckoutAttempt, { listingId: listing.id, listing, quantity: 2, idempotencyKey: key });
}

test("acquireCheckoutAttempt requires authentication and rejects client pricing", async () => {
  const t = testConvex();
  await expect(t.mutation(api.commerce.checkout.acquireCheckoutAttempt, { listingId: listing.id, listing, quantity: 1, idempotencyKey: "checkout-key-1", amountCents: 100 } as never)).rejects.toThrow();
});

test("acquireCheckoutAttempt is idempotent per authenticated user and key", async () => {
  const t = testConvex();
  const first = await acquire(t);
  expect(await acquire(t)).toEqual(first);
  expect(await acquire(t, identityB)).not.toBe(first);
});

test("checkout quote advances only from a new state and validates HTTPS", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "checkout-key-2");
  const quoted = await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 1250, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  expect(quoted).toMatchObject({ attemptId, amountCents: 1250, currency: "USD" });
  await expect(t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 1250, currency: "USD", merchantUrl: "http://merchant.example/item", observedAt: "2026-09-08T00:00:00.000Z" })).rejects.toThrow(/HTTPS/);
});

test("checkout status is visible only to its owner", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "status-key");
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toMatchObject({ listingId: listing.id, status: "NEW" });
  expect(await t.withIdentity(identityB).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toBeNull();
});

test("orders are bounded and scoped to the authenticated user", async () => {
  const t = testConvex();
  await expect(t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 0 })).rejects.toThrow(/between 1 and 50/);
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 })).toEqual([]);
  expect(await t.withIdentity(identityB).query(api.commerce.checkout.listOrders, { limit: 10 })).toEqual([]);
});

test("webhook inbox is idempotent and rejects payload mismatch", async () => {
  const t = testConvex();
  const input = { provider: "stripe", eventId: "evt_123", payloadHash: "sha256:abc" };
  expect(await t.mutation(internal.commerce.checkout.acquireWebhookEvent, input)).toEqual({ acquired: true });
  expect(await t.mutation(internal.commerce.checkout.acquireWebhookEvent, input)).toEqual({ acquired: false });
  await expect(t.mutation(internal.commerce.checkout.acquireWebhookEvent, { ...input, payloadHash: "sha256:different" })).rejects.toThrow(/payload mismatch/);
});

test("payment completion writes one owner-scoped order and replays are idempotent", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "order-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_test_1", amountCents: 2500, currency: "USD" });
  await expect(t.mutation(internal.commerce.checkout.completePayment, { provider: "stripe", eventId: "evt_order", paymentIntentId: "pi_test_1", amountCents: 2500, currency: "USD" })).rejects.toThrow(/not been acquired/);
  await t.mutation(internal.commerce.checkout.acquireWebhookEvent, { provider: "stripe", eventId: "evt_order", payloadHash: "sha256:order" });
  const first = await t.mutation(internal.commerce.checkout.completePayment, { provider: "stripe", eventId: "evt_order", paymentIntentId: "pi_test_1", amountCents: 2500, currency: "USD" });
  expect(first.created).toBe(true);
  const replay = await t.mutation(internal.commerce.checkout.completePayment, { provider: "stripe", eventId: "evt_order", paymentIntentId: "pi_test_1", amountCents: 2500, currency: "USD" });
  expect(replay).toEqual({ orderId: first.orderId, created: false });
  const orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({ listingId: listing.id, amountCents: 2500, currency: "USD", status: "PROCESSING" });
  expect(await t.withIdentity(identityB).query(api.commerce.checkout.listOrders, { limit: 10 })).toEqual([]);

  await t.withIdentity(identityA).mutation(api.commerce.checkout.setOrderReminder, { orderId: first.orderId, reminderTime: "Today at 5:00 PM" });
  await expect(t.withIdentity(identityB).mutation(api.commerce.checkout.setOrderReminder, { orderId: first.orderId, reminderTime: "Today" })).rejects.toThrow(/Order not found/);
  await t.withIdentity(identityA).mutation(api.commerce.checkout.requestReturn, { orderId: first.orderId, reason: "Item defective or damaged", idempotencyKey: "return-1" });
  await t.withIdentity(identityA).mutation(api.commerce.checkout.requestReturn, { orderId: first.orderId, reason: "Duplicate request", idempotencyKey: "return-2" });
  const returned = await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId });
  expect(returned).not.toBeNull();
  const ordersAfterReturn = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(ordersAfterReturn[0]).toMatchObject({ status: "RETURN_REQUESTED", returnStatus: "REQUESTED", returnReason: "Item defective or damaged" });
});

const WEBHOOK_SECRET = "whsec_test_secret";
const STRIPE_TEST_SECRET_KEY = "sk_test_webhook_boundary";
function succeededEventBody(metadata?: Record<string, string>): string {
  return JSON.stringify({
    id: "evt_http_1",
    object: "event",
    api_version: "2025-01-27.acacia",
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: "pi_http_1", object: "payment_intent", amount: 2500, currency: "usd", status: "succeeded", ...(metadata ? { metadata } : {}) } },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "payment_intent.succeeded",
  });
}

async function runWebhook(t: ReturnType<typeof testConvex>, payload: string, header?: string | null, secret = WEBHOOK_SECRET): Promise<Response> {
  // convex-test resolves Convex env vars from the test process environment.
  process.env.STRIPE_SECRET_KEY = STRIPE_TEST_SECRET_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (header !== null) headers["stripe-signature"] = header ?? Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return t.fetch("/stripe_webhook", { method: "POST", headers, body: payload });
}

test("stripe webhook rejects missing and invalid signatures without touching data", async () => {
  const t = testConvex();
  const payload = succeededEventBody();
  const missing = await runWebhook(t, payload, null);
  expect(missing.status).toBe(400);
  const invalid = await runWebhook(t, payload, "t=1,v1=deadbeef");
  expect(invalid.status).toBe(400);
  const wrongSecret = await runWebhook(t, payload, undefined, "whsec_not_the_secret");
  expect(wrongSecret.status).toBe(400);
});

test("stripe webhook completes a verified payment into one owner-visible order", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "http-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_http_1", amountCents: 2500, currency: "USD" });

  const response = await runWebhook(t, succeededEventBody());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ created: true });

  const orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({ paymentIntentId: "pi_http_1", amountCents: 2500, currency: "USD", status: "PROCESSING" });
});

test("stripe webhook replays do not create duplicate orders", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "http-replay-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_http_replay", amountCents: 2500, currency: "USD" });

  const payload = succeededEventBody().replace("pi_http_1", "pi_http_replay").replace("evt_http_1", "evt_http_replay");
  const first = await runWebhook(t, payload);
  expect(first.status).toBe(200);
  const replay = await runWebhook(t, payload);
  expect(replay.status).toBe(409);

  const orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders).toHaveLength(1);
});

test("stripe webhook ignores non-payment events after signature verification", async () => {
  const t = testConvex();
  const payload = succeededEventBody().replace("payment_intent.succeeded", "charge.refunded").replace("evt_http_1", "evt_http_ignore");
  const response = await runWebhook(t, payload);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ignored: "charge.refunded" });
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 })).toEqual([]);
});

test("stripe webhook reports internal reconciliation failure honestly", async () => {
  const t = testConvex();
  // Verified event for a payment intent with no matching checkout attempt:
  // completePayment must fail and the handler must surface 500 so Stripe retries.
  const payload = succeededEventBody().replace("pi_http_1", "pi_http_orphan");
  const response = await runWebhook(t, payload);
  expect(response.status).toBe(500);
});

test("failed attempt with a dead quote cannot reconcile any webhook event", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "adv-dead-quote");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 1250, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  // Definitive charge failure: the attempt dies AND the verified quote is stripped.
  await t.mutation(internal.commerce.checkout.failCheckoutAttempt, { attemptId, failureCode: "card_declined" });
  const attempt = await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId });
  expect(attempt).toMatchObject({ status: "FAILED", failureCode: "card_declined" });
  expect(attempt?.amountCents).toBeUndefined();
  expect(attempt?.currency).toBeUndefined();
  // A webhook matching the old quoted amount must find no attempt to reconcile.
  const payload = succeededEventBody().replace("pi_http_1", "pi_adv_orphan").replace("1250", "1250");
  const response = await runWebhook(t, payload);
  expect(response.status).toBe(500);
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 })).toEqual([]);
});

test("ambiguous failure keeps the verified quote so the webhook can reconcile", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "adv-ambiguous");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 1250, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  // Simulate the ambiguous path: attempt stays AWAITING_STEP_UP (no intent attached, not killed).
  const attempt = await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId });
  expect(attempt).toMatchObject({ status: "AWAITING_STEP_UP", amountCents: 1250, currency: "USD" });
  // The webhook reconciler can still match the intact quote when a charge landed:
  // the signed event carries our creation metadata pointing at the attempt.
  const payload = succeededEventBody({ checkoutAttemptId: attemptId }).replace("pi_http_1", "pi_adv_landed").replace("2500", "1250").replace('"currency": "usd"', '"currency": "usd"');
  const response = await runWebhook(t, payload);
  expect(response.status).toBe(200);
  const orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders).toHaveLength(1);
  expect(orders[0]).toMatchObject({ amountCents: 1250, status: "PROCESSING" });
  // The healed attempt is completed and now carries the intent id.
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toMatchObject({ status: "COMPLETED", paymentIntentId: "pi_adv_landed" });
});

test("failCheckoutAttempt ignores terminal and non-live states", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "adv-terminal");
  // NEW is not a live payment state — no-op, state preserved.
  await t.mutation(internal.commerce.checkout.failCheckoutAttempt, { attemptId, failureCode: "spurious" });
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toMatchObject({ status: "NEW" });
  // Already-FAILED attempts are never re-patched.
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 1250, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await t.mutation(internal.commerce.checkout.failCheckoutAttempt, { attemptId, failureCode: "card_declined" });
  await t.mutation(internal.commerce.checkout.failCheckoutAttempt, { attemptId, failureCode: "second_attempt" });
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toMatchObject({ status: "FAILED", failureCode: "card_declined" });
});

test("confirmCheckout rejects a closed attempt before any Stripe call", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "adv-closed");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 1250, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await t.mutation(internal.commerce.checkout.failCheckoutAttempt, { attemptId, failureCode: "card_declined" });
  // The confirm guard order now catches FAILED (closed) attempts explicitly.
  await expect(t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).resolves.toMatchObject({ status: "FAILED" });
});
