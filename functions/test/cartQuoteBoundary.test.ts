import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createCartListingSnapshot } from "../src/cart/cartListingSnapshot";
import { getMerchantQuote, MerchantQuoteError } from "../src/payments/merchantQuote";
import { createCheckoutIntent, stripeWebhook } from "../src/webhooks";
import { confirmPurchase, createStripeIntent } from "../src/payments";
import { addToCart } from "../src/cart";
import { db } from "../src/shared/db";

const now = new Date("2026-08-30T12:00:00.000Z");
const listing = {
  id: "parallel-1234abcd",
  name: "Burr grinder",
  merchantUrl: "https://merchant.example/products/burr-grinder?utm_source=search",
  source: "parallel" as const,
  providerListingId: "grinder-42",
  observedPrice: {
    amount: 19.99,
    currency: "USD",
    evidenceUrl: "https://merchant.example/products/burr-grinder",
  },
  discoveredAt: "2026-08-30T11:58:00.000Z",
};

test("cart writes store verified listing metadata without inventory claims", async (t) => {
  const writes: unknown[] = [];
  t.after(async () => {
    await db.terminate();
  });
  t.mock.method(db as any, "runTransaction", async (operation: any) => operation({
    get: async (reference: any) => reference.id === "user-123"
      ? { exists: false, data: () => undefined }
      : { exists: false, data: () => undefined },
    set: (_reference: unknown, value: unknown) => writes.push(value),
    create: () => undefined,
  }));

  const result = await addToCart.run({
    auth: { uid: "user-123" },
    data: {
      listing,
      quantity: 2,
      idempotencyKey: "12b9fc19-0f9a-472a-bb1c-a2e7d8954255",
    },
  } as any);
  const cart = writes[0] as { items: unknown[] };
  const snapshot = cart.items[0] as Record<string, unknown>;

  assert.deepEqual(snapshot, {
    ...listing,
    merchantUrl: "https://merchant.example/products/burr-grinder",
    quantity: 2,
    addedAt: snapshot.addedAt,
  });
  assert.deepEqual(result, { success: true, totalItems: 2 });
  assert.equal("stock" in snapshot, false);
  assert.equal("reserved" in snapshot, false);
  assert.equal("availability" in snapshot, false);
});

test("merchant quote uses a fresh provider observation and computes integer cents", async () => {
  const quote = await getMerchantQuote(
    createCartListingSnapshot(listing, 3, now),
    {
      lookup: async () => ({
        listingId: listing.id,
        merchantUrl: "https://merchant.example/products/burr-grinder",
        amount: 12.34,
        currency: "usd",
        observedAt: "2026-08-30T11:59:30.000Z",
        expiresAt: "2026-08-30T12:04:30.000Z",
      }),
    },
    now,
  );

  assert.deepEqual(quote, {
    listingId: listing.id,
    merchantUrl: "https://merchant.example/products/burr-grinder",
    quantity: 3,
    currency: "USD",
    unitAmountCents: 1234,
    totalAmountCents: 3702,
    observedAt: "2026-08-30T11:59:30.000Z",
    expiresAt: "2026-08-30T12:04:30.000Z",
  });
});

test("stale provider observations require a fresh quote", async () => {
  await assert.rejects(
    getMerchantQuote(
      createCartListingSnapshot(listing, 1, now),
      {
        lookup: async () => ({
          listingId: listing.id,
          merchantUrl: listing.merchantUrl,
          amount: 19.99,
          currency: "USD",
          observedAt: "2026-08-30T11:54:59.999Z",
        }),
      },
      now,
    ),
    (error: unknown) => error instanceof MerchantQuoteError && error.code === "stale-observation",
  );
});

test("missing provider prices cannot produce a financial quote", async () => {
  await assert.rejects(
    getMerchantQuote(
      createCartListingSnapshot({ ...listing, observedPrice: undefined }, 1, now),
      {
        lookup: async () => ({
          listingId: listing.id,
          merchantUrl: listing.merchantUrl,
          currency: "USD",
          observedAt: "2026-08-30T11:59:30.000Z",
        }),
      },
      now,
    ),
    (error: unknown) => error instanceof MerchantQuoteError && error.code === "unknown-price",
  );
});

test("payment endpoints reject client pricing and keep merchant checkout user-completed", async () => {
  const request = {
    auth: { uid: "user-123", token: {} },
    data: {
      productId: listing.id,
      quantity: 1,
      idempotencyKey: "12b9fc19-0f9a-472a-bb1c-a2e7d8954255",
      unitPrice: 1,
      currency: "USD",
      merchantUrl: listing.merchantUrl,
    },
  };

  for (const callable of [createStripeIntent, confirmPurchase, createCheckoutIntent]) {
    await assert.rejects(
      callable.run(request as any),
      (error: any) => error?.code === "invalid-argument",
    );
  }

  const paymentsSource = await readFile(path.join(process.cwd(), "src/payments/index.ts"), "utf8");
  const webhooksSource = await readFile(path.join(process.cwd(), "src/webhooks.ts"), "utf8");
  assert.doesNotMatch(paymentsSource, /paymentIntents\.create/);
  assert.doesNotMatch(webhooksSource, /purchaseAttempts/);
  assert.ok(stripeWebhook);
});
