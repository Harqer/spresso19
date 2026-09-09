/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const identityA = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "commerce-user-a",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:commerce-user-a",
};
const identityB = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "commerce-user-b",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:commerce-user-b",
};

function testConvex() {
  return convexTest(schema, modules);
}

test("acquireCheckoutAttempt requires authentication and rejects client pricing", async () => {
  const t = testConvex();
  await expect(
    t.mutation(api.commerce.checkout.acquireCheckoutAttempt, {
      listingId: "listing-1",
      quantity: 1,
      idempotencyKey: "checkout-key-1",
      amountCents: 100,
    } as never),
  ).rejects.toThrow();
});

test("acquireCheckoutAttempt is idempotent per authenticated user and key", async () => {
  const t = testConvex();
  const authed = t.withIdentity(identityA);
  const first = await authed.mutation(api.commerce.checkout.acquireCheckoutAttempt, {
    listingId: "listing-1",
    quantity: 2,
    idempotencyKey: "checkout-key-1",
  });
  const second = await authed.mutation(api.commerce.checkout.acquireCheckoutAttempt, {
    listingId: "listing-1",
    quantity: 2,
    idempotencyKey: "checkout-key-1",
  });
  expect(second).toEqual(first);

  const otherUser = t.withIdentity(identityB);
  const other = await otherUser.mutation(api.commerce.checkout.acquireCheckoutAttempt, {
    listingId: "listing-1",
    quantity: 2,
    idempotencyKey: "checkout-key-1",
  });
  expect(other).not.toBe(first);
});

test("checkout attempt can only advance through an expected state", async () => {
  const t = testConvex();
  const attemptId = await t.withIdentity(identityA).mutation(api.commerce.checkout.acquireCheckoutAttempt, {
    listingId: "listing-1",
    quantity: 1,
    idempotencyKey: "checkout-key-2",
  });

  await expect(
    t.mutation(internal.commerce.checkout.finalizeQuote, {
      attemptId,
      amountCents: 1250,
      currency: "USD",
      merchantUrl: "https://merchant.example/item",
      observedAt: "2026-09-08T00:00:00.000Z",
    }),
  ).rejects.toThrow(/state/i);

  const quoted = await t.mutation(internal.commerce.checkout.markQuoted, {
    attemptId,
    amountCents: 1250,
    currency: "USD",
    merchantUrl: "https://merchant.example/item",
    observedAt: "2026-09-08T00:00:00.000Z",
  });
  expect(quoted.status).toBe("AWAITING_STEP_UP");

  await expect(
    t.mutation(internal.commerce.checkout.finalizeQuote, {
      attemptId,
      amountCents: 1250,
      currency: "USD",
      merchantUrl: "http://merchant.example/item",
      observedAt: "2026-09-08T00:00:00.000Z",
    }),
  ).rejects.toThrow(/HTTPS/);

  const finalized = await t.mutation(internal.commerce.checkout.finalizeQuote, {
    attemptId,
    amountCents: 1250,
    currency: "USD",
    merchantUrl: "https://merchant.example/item",
    observedAt: "2026-09-08T00:00:00.000Z",
  });
  expect(finalized.status).toBe("READY_FOR_PAYMENT");
});

test("checkout status is visible only to its owner", async () => {
  const t = testConvex();
  const attemptId = await t.withIdentity(identityA).mutation(api.commerce.checkout.acquireCheckoutAttempt, {
    listingId: "listing-owner-only",
    quantity: 1,
    idempotencyKey: "status-key",
  });
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId }))
    .toMatchObject({ listingId: "listing-owner-only", status: "NEW" });
  expect(await t.withIdentity(identityB).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toBeNull();
});

test("orders are bounded and scoped to the authenticated user", async () => {
  const t = testConvex();
  await expect(t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 0 })).rejects.toThrow(/between 1 and 50/);
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.listOrders, { limit: 10 })).toEqual([]);
  expect(await t.withIdentity(identityB).query(api.commerce.checkout.listOrders, { limit: 10 })).toEqual([]);
});

test("webhook inbox is idempotent by provider and event id", async () => {
  const t = testConvex();
  const first = await t.mutation(internal.commerce.checkout.acquireWebhookEvent, {
    provider: "stripe",
    eventId: "evt_123",
    payloadHash: "sha256:abc",
  });
  const second = await t.mutation(internal.commerce.checkout.acquireWebhookEvent, {
    provider: "stripe",
    eventId: "evt_123",
    payloadHash: "sha256:abc",
  });
  expect(first).toEqual({ acquired: true });
  expect(second).toEqual({ acquired: false });
});
