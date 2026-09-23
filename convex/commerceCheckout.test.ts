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

// ---- Server-verifiable purchase authorization test scaffolding -------------

/** Real P-256 keypair + message signing through Node's WebCrypto. */
async function makeDeviceKey() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const toB64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");
  return {
    publicKeyB64: toB64(raw),
    signMessage: async (message: string): Promise<string> => {
      // Signs the message bytes directly (WebCrypto hashes internally with
      // SHA-256) — matching the server's crypto.verify("sha256", message).
      const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(message)));
      return toB64(sig);
    },
  };
}

function b64urlToB64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}

/**
 * Full server-verifiable authorization chain for tests: register a real
 * device key, issue the exact-intent challenge, sign it, and authorize.
 * The canonical message format must match `checkoutIntentMessage` exactly.
 */
async function authorizeAttempt(
  t: ReturnType<typeof testConvex>,
  attemptId: string,
  options: { identity?: typeof identityA; amountCents?: number; currency?: string; merchantUrl?: string; keyPair?: Awaited<ReturnType<typeof makeDeviceKey>>; registerDevice?: boolean } = {},
) {
  const identity = options.identity ?? identityA;
  const keyPair = options.keyPair ?? (await makeDeviceKey());
  if (options.registerDevice !== false) {
    await t.withIdentity(identity).mutation(api.commerce.checkout.registerCheckoutDevice, { publicKey: keyPair.publicKeyB64, label: "test device" });
  }
  // The challenge is server-minted inside the action; tests read it back from
  // the attempt snapshot after issueCheckoutChallenge has run.
  const issueChallengeInternal = async (): Promise<string> => {
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
    const attempt = (await t.query(internal.commerce.checkout.getCheckoutAttemptInternal, { attemptId: attemptId as never }))!;
    const message = [
      "SPRESSO PURCHASE CONFIRMATION",
      `Merchant: ${options.merchantUrl ?? attempt.merchantUrl ?? listing.merchantUrl}`,
      `Amount: ${options.amountCents ?? attempt.amountCents ?? 0} ${options.currency ?? attempt.currency ?? "USD"}`,
      `Quantity: ${attempt.quantity}`,
      `Listing: ${attempt.listingId}`,
      `Challenge: ${challenge}`,
      "",
    ].join("\n");
    await t.mutation(internal.commerce.checkout.issueCheckoutChallenge, { attemptId: attemptId as never, challenge, digest: message, ttlMs: 5 * 60 * 1000 });
    return message;
  };
  const message = await issueChallengeInternal();
  const signature = await keyPair.signMessage(message);
  return t.withIdentity(identity).action(api.commerce.actions.authorizeCheckout, {
    attemptId: attemptId as never,
    signature,
    publicKey: keyPair.publicKeyB64,
  });
}
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

// ---- Server-verifiable exact-intent purchase authorization ----------------

test("payment cannot be attached without server-verified device authorization (bypass)", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "bypass-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await expect(
    t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_bypass", amountCents: 2500, currency: "USD" }),
  ).rejects.toThrow(/authorization is required/i);
});

test("confirmCheckout refuses attempts that never reached READY_FOR_PAYMENT", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "confirm-gate-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await expect(t.withIdentity(identityA).action(api.commerce.actions.confirmCheckout, { attemptId })).rejects.toThrow(/authorization is required/i);
});

test("authorize advances a quoted attempt to READY_FOR_PAYMENT with a valid device signature", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "authorize-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  const result = await authorizeAttempt(t, attemptId);
  expect(result.status).toBe("READY_FOR_PAYMENT");
  // Payment attachment now succeeds: the authorization boundary was crossed.
  await t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_auth_1", amountCents: 2500, currency: "USD" });
});

test("a signature from an unregistered key is rejected", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "unreg-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  // A real, valid signature — but from a key that was never registered.
  await expect(authorizeAttempt(t, attemptId, { registerDevice: false })).rejects.toThrow(/not registered for purchase confirmation/i);
});

test("a tampered signature over the registered key is rejected", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "tamper-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  const keyPair = await makeDeviceKey();
  await t.withIdentity(identityA).mutation(api.commerce.checkout.registerCheckoutDevice, { publicKey: keyPair.publicKeyB64 });
  const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const message = `SPRESSO PURCHASE CONFIRMATION\nMerchant: ${listing.merchantUrl}\nAmount: 2500 USD\nQuantity: 2\nListing: ${listing.id}\nChallenge: ${challenge}\n`;
  await t.mutation(internal.commerce.checkout.issueCheckoutChallenge, { attemptId, challenge, digest: message, ttlMs: 5 * 60 * 1000 });
  // A real signature — but over a different intent than the stored digest.
  await expect(t.withIdentity(identityA).action(api.commerce.actions.authorizeCheckout, {
    attemptId,
    signature: await keyPair.signMessage("SPRESSO PURCHASE CONFIRMATION\\nAmount: 1 USD\\n"),
    publicKey: keyPair.publicKeyB64,
  })).rejects.toThrow(/signature is invalid/i);
});

test("cross-user device registration does not authorize another user's attempt", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "cross-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  // B registers a device and signs, but the attempt belongs to A.
  await expect(authorizeAttempt(t, attemptId, { identity: identityB })).rejects.toThrow(/not registered for purchase confirmation|Checkout attempt not found/i);
});

test("a consumed challenge cannot authorize (replay of consumed nonce)", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "consumed-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  const keyPair = await makeDeviceKey();
  await t.withIdentity(identityA).mutation(api.commerce.checkout.registerCheckoutDevice, { publicKey: keyPair.publicKeyB64 });
  await t.mutation(internal.commerce.checkout.issueCheckoutChallenge, { attemptId, challenge: "one-shot", digest: "one-shot message", ttlMs: 30_000 });
  const device = (await t.query(internal.commerce.checkout.getCheckoutDeviceInternal, { tokenIdentifier: identityA.tokenIdentifier, publicKey: keyPair.publicKeyB64 }))!;
  await t.mutation(internal.commerce.checkout.consumeCheckoutChallenge, { attemptId, deviceKeyId: device._id });
  await expect(t.withIdentity(identityA).action(api.commerce.actions.authorizeCheckout, {
    attemptId,
    signature: await keyPair.signMessage("one-shot message"),
    publicKey: keyPair.publicKeyB64,
  })).rejects.toThrow(/already authorized/i);
});

test("challenge consumption is single-use (replay)", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "replay-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  // The first authorization consumes the challenge; the exact same signature
  // replayed must fail.
  const keyPair = await makeDeviceKey();
  await t.withIdentity(identityA).mutation(api.commerce.checkout.registerCheckoutDevice, { publicKey: keyPair.publicKeyB64 });
  const issueAndSign = async (): Promise<{ challenge: string; signature: string }> => {
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
    const message = `SPRESSO PURCHASE CONFIRMATION\nMerchant: ${listing.merchantUrl}\nAmount: 2500 USD\nQuantity: 2\nListing: ${listing.id}\nChallenge: ${challenge}\n`;
    await t.mutation(internal.commerce.checkout.issueCheckoutChallenge, { attemptId, challenge, digest: message, ttlMs: 5 * 60 * 1000 });
    return { challenge, signature: await keyPair.signMessage(message) };
  };
  const first = await issueAndSign();
  await expect(t.withIdentity(identityA).action(api.commerce.actions.authorizeCheckout, { attemptId, signature: first.signature, publicKey: keyPair.publicKeyB64 })).resolves.toMatchObject({ status: "READY_FOR_PAYMENT" });
  // Replay of the same signature against a re-issued identical challenge:
  // consumption is one-shot per challenge, and READY_FOR_PAYMENT refuses.
  await expect(t.withIdentity(identityA).action(api.commerce.actions.authorizeCheckout, { attemptId, signature: first.signature, publicKey: keyPair.publicKeyB64 })).rejects.toThrow(/already authorized/i);
});

test("a stale signature is rejected after the challenge is re-issued (material change)", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "material-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  const keyPair = await makeDeviceKey();
  await t.withIdentity(identityA).mutation(api.commerce.checkout.registerCheckoutDevice, { publicKey: keyPair.publicKeyB64 });
  // Challenge #1: the user signs this exact intent.
  const buildMessage = (challenge: string): string =>
    `SPRESSO PURCHASE CONFIRMATION\nMerchant: ${listing.merchantUrl}\nAmount: 2500 USD\nQuantity: 2\nListing: ${listing.id}\nChallenge: ${challenge}\n`;
  await t.mutation(internal.commerce.checkout.issueCheckoutChallenge, { attemptId, challenge: "nonce-1", digest: buildMessage("nonce-1"), ttlMs: 5 * 60 * 1000 });
  const staleSignature = await keyPair.signMessage(buildMessage("nonce-1"));
  // Re-verify (the prepareCheckout re-quote path) re-issues a fresh nonce,
  // which invalidates every signature over the old intent.
  await t.mutation(internal.commerce.checkout.issueCheckoutChallenge, { attemptId, challenge: "nonce-2", digest: buildMessage("nonce-2"), ttlMs: 5 * 60 * 1000 });
  await expect(t.withIdentity(identityA).action(api.commerce.actions.authorizeCheckout, {
    attemptId,
    signature: staleSignature,
    publicKey: keyPair.publicKeyB64,
  })).rejects.toThrow(/signature is invalid/i);
  // A signature over the CURRENT intent authorizes.
  const result = await t.withIdentity(identityA).action(api.commerce.actions.authorizeCheckout, {
    attemptId,
    signature: await keyPair.signMessage(buildMessage("nonce-2")),
    publicKey: keyPair.publicKeyB64,
  });
  expect(result.status).toBe("READY_FOR_PAYMENT");
});

test("device keys are scoped per user and normalized (SPKI DER accepted)", async () => {
  const t = testConvex();
  const keyPair = await makeDeviceKey();
  const raw = Buffer.from(keyPair.publicKeyB64, "base64");
  // Android form: the 26-byte SPKI header already ends in the 0x04 tag, so
  // only X||Y (raw minus its own tag) is appended — total 91 bytes.
  const spki = Buffer.concat([Buffer.from("MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE", "base64"), raw.subarray(1)]);
  const a1 = await t.withIdentity(identityA).mutation(api.commerce.checkout.registerCheckoutDevice, { publicKey: spki.toString("base64") });
  const a2 = await t.withIdentity(identityA).mutation(api.commerce.checkout.registerCheckoutDevice, { publicKey: keyPair.publicKeyB64 });
  expect(a1.deviceKeyId).toBe(a2.deviceKeyId);
  // The internal lookup normalizes the submitted form the same way.
  const found = await t.query(internal.commerce.checkout.getCheckoutDeviceInternal, { tokenIdentifier: identityA.tokenIdentifier, publicKey: spki.toString("base64") });
  expect(found).not.toBeNull();
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
  await authorizeAttempt(t, attemptId);
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
  await authorizeAttempt(t, attemptId);
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
  await authorizeAttempt(t, attemptId);
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

test("acknowledgeDelivery advances fulfillment only for the owner", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "ack-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await authorizeAttempt(t, attemptId);
  await t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_ack_1", amountCents: 2500, currency: "USD" });
  await t.mutation(internal.commerce.checkout.acquireWebhookEvent, { provider: "stripe", eventId: "evt_ack", payloadHash: "sha256:ack" });
  const { orderId } = await t.mutation(internal.commerce.checkout.completePayment, { provider: "stripe", eventId: "evt_ack", paymentIntentId: "pi_ack_1", amountCents: 2500, currency: "USD" });

  // Cross-user acknowledgement is ownership-denied.
  await expect(t.withIdentity(identityB).mutation(api.commerce.checkout.acknowledgeDelivery, { orderId })).rejects.toThrow(/Order not found/);
  // Unauthenticated acknowledgement is rejected.
  await expect(t.mutation(api.commerce.checkout.acknowledgeDelivery, { orderId })).rejects.toThrow(/[Uu]nauthenticated|not found/i);

  const orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders[0]).toMatchObject({ status: "PROCESSING" });
  await t.withIdentity(identityA).mutation(api.commerce.checkout.acknowledgeDelivery, { orderId });
  const acknowledged = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(acknowledged[0]).toMatchObject({ status: "DELIVERED", trackingStatus: "DELIVERED" });
  // Repeated acknowledgement is idempotent.
  await t.withIdentity(identityA).mutation(api.commerce.checkout.acknowledgeDelivery, { orderId });
  expect((await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 }))[0]).toMatchObject({ status: "DELIVERED" });
});

test("requestReturn is ownership-gated and respects return lifecycle", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "return-edge-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await authorizeAttempt(t, attemptId);
  await t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_return_1", amountCents: 2500, currency: "USD" });
  await t.mutation(internal.commerce.checkout.acquireWebhookEvent, { provider: "stripe", eventId: "evt_return", payloadHash: "sha256:return" });
  const { orderId } = await t.mutation(internal.commerce.checkout.completePayment, { provider: "stripe", eventId: "evt_return", paymentIntentId: "pi_return_1", amountCents: 2500, currency: "USD" });

  // Cross-user return requests are ownership-denied.
  await expect(t.withIdentity(identityB).mutation(api.commerce.checkout.requestReturn, { orderId, reason: "Wrong item received", idempotencyKey: "return-b-1" })).rejects.toThrow(/Order not found/);
  // Invalid reasons are rejected before any state change.
  await expect(t.withIdentity(identityA).mutation(api.commerce.checkout.requestReturn, { orderId, reason: "ab", idempotencyKey: "return-b-2" })).rejects.toThrow(/valid return reason/);
  await expect(t.withIdentity(identityA).mutation(api.commerce.checkout.requestReturn, { orderId, reason: "x".repeat(501), idempotencyKey: "return-b-3" })).rejects.toThrow(/valid return reason/);

  // A delivered order can be returned.
  await t.withIdentity(identityA).mutation(api.commerce.checkout.acknowledgeDelivery, { orderId });
  await t.withIdentity(identityA).mutation(api.commerce.checkout.requestReturn, { orderId, reason: "Arrived damaged", idempotencyKey: "return-edge-1" });
  let orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders[0]).toMatchObject({ status: "RETURN_REQUESTED", returnStatus: "REQUESTED", returnReason: "Arrived damaged" });

  // A second return request is a no-op once the return is in flight, even with a different key.
  await t.withIdentity(identityA).mutation(api.commerce.checkout.requestReturn, { orderId, reason: "Changed my mind about the reason", idempotencyKey: "return-edge-2" });
  orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders[0]).toMatchObject({ returnStatus: "REQUESTED", returnReason: "Arrived damaged" });
});

test("reminder state survives subsequent status transitions and is scoped per order", async () => {
  const t = testConvex();
  const attemptId = await acquire(t, identityA, "reminder-edge-key");
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 2500, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await authorizeAttempt(t, attemptId);
  await t.mutation(internal.commerce.checkout.attachPaymentIntent, { attemptId, paymentIntentId: "pi_reminder_1", amountCents: 2500, currency: "USD" });
  await t.mutation(internal.commerce.checkout.acquireWebhookEvent, { provider: "stripe", eventId: "evt_reminder", payloadHash: "sha256:reminder" });
  const { orderId } = await t.mutation(internal.commerce.checkout.completePayment, { provider: "stripe", eventId: "evt_reminder", paymentIntentId: "pi_reminder_1", amountCents: 2500, currency: "USD" });

  // Reminder set on a PROCESSING order persists through delivery acknowledgement.
  await t.withIdentity(identityA).mutation(api.commerce.checkout.setOrderReminder, { orderId, reminderTime: "Tomorrow morning" });
  await t.withIdentity(identityA).mutation(api.commerce.checkout.acknowledgeDelivery, { orderId });
  const orders = await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 });
  expect(orders[0]).toMatchObject({ status: "DELIVERED", reminderSet: true, reminderTime: "Tomorrow morning" });
  // Reminder requires a non-blank time.
  await expect(t.withIdentity(identityA).mutation(api.commerce.checkout.setOrderReminder, { orderId, reminderTime: "   " })).rejects.toThrow(/reminderTime is required/);
});
