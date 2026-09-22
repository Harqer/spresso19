/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const identityA = { issuer: "https://securetoken.google.com/get-spresso", subject: "grocery-user-a", tokenIdentifier: "https://securetoken.google.com/get-spresso:grocery-user-a" };
const identityB = { issuer: "https://securetoken.google.com/get-spresso", subject: "grocery-user-b", tokenIdentifier: "https://securetoken.google.com/get-spresso:grocery-user-b" };

function testConvex() {
  return convexTest(schema, modules);
}

test("grocery list is private to its owner", async () => {
  const t = testConvex();
  const itemId = await t.withIdentity(identityA).mutation(api.grocery.addItem, { name: "Oat milk", category: "Dairy" });
  expect(await t.withIdentity(identityA).query(api.grocery.getMyList, {})).toMatchObject({ items: [{ id: itemId, name: "Oat milk", category: "Dairy", checked: false }] });
  expect(await t.withIdentity(identityB).query(api.grocery.getMyList, {})).toEqual({ items: [] });
});

test("addItem requires a name and normalizes blank categories", async () => {
  const t = testConvex();
  await expect(t.withIdentity(identityA).mutation(api.grocery.addItem, { name: "   ", category: "Produce" })).rejects.toThrow(/name/);
  const id = await t.withIdentity(identityA).mutation(api.grocery.addItem, { name: "Basil", category: "   " });
  const list = await t.withIdentity(identityA).query(api.grocery.getMyList, {});
  const item = list.items.find((entry) => entry.id === id);
  expect(item?.category).toBe("Other");
});

test("setChecked and removeItem are owner-scoped", async () => {
  const t = testConvex();
  const itemId = await t.withIdentity(identityA).mutation(api.grocery.addItem, { name: "Rice", category: "Pantry" });
  await expect(t.withIdentity(identityB).mutation(api.grocery.setChecked, { itemId, checked: true })).rejects.toThrow(/not found/i);
  await t.withIdentity(identityA).mutation(api.grocery.setChecked, { itemId, checked: true });
  expect((await t.withIdentity(identityA).query(api.grocery.getMyList, {})).items[0]?.checked).toBe(true);
  await expect(t.withIdentity(identityB).mutation(api.grocery.removeItem, { itemId })).rejects.toThrow(/not found/i);
  await t.withIdentity(identityA).mutation(api.grocery.removeItem, { itemId });
  expect(await t.withIdentity(identityA).query(api.grocery.getMyList, {})).toEqual({ items: [] });
});

test("checkout failure transition is terminal-safe and scoped to live states", async () => {
  const t = testConvex();
  const listing = {
    id: "listing-fail-1", name: "Fail jacket", brand: "Merchant", category: "outerwear",
    imageUrl: "https://merchant.example/fail.jpg", merchantUrl: "https://merchant.example/fail", source: "kitesurf" as const,
    discoveredAt: "2026-09-08T00:00:00.000Z",
  };
  const attemptId = await t.withIdentity(identityA).mutation(api.commerce.checkout.acquireCheckoutAttempt, { listingId: listing.id, listing, quantity: 1, idempotencyKey: "fail-key-1" });
  // NEW is not a live payment state — the failure transition must be a no-op.
  await t.mutation(internal.commerce.checkout.failCheckoutAttempt, { attemptId, failureCode: "card_declined" });
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toMatchObject({ status: "NEW" });
  // Once quoted (AWAITING_STEP_UP), the failure transition lands and persists.
  await t.mutation(internal.commerce.checkout.markQuoted, { attemptId, amountCents: 1999, currency: "USD", merchantUrl: listing.merchantUrl, observedAt: "2026-09-08T00:00:00.000Z" });
  await t.mutation(internal.commerce.checkout.failCheckoutAttempt, { attemptId, failureCode: "card_declined" });
  expect(await t.withIdentity(identityA).query(api.commerce.checkout.getCheckoutAttempt, { attemptId })).toMatchObject({ status: "FAILED", failureCode: "card_declined" });
});
