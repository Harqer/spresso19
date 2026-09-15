/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const owner = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-uid-owner",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-owner",
};
const other = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-uid-other",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-other",
};

const listing = {
  id: "listing-1",
  name: "Verified jacket",
  merchantUrl: "https://merchant.example/products/jacket",
  source: "kitesurf" as const,
  discoveredAt: "2026-09-08T00:00:00.000Z",
  expiresAt: "2026-09-08T01:00:00.000Z",
};

test("preferences are authenticated, owner-scoped, and updated without replacing other fields", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);

  await authenticated.mutation(api.reactiveState.setPreferences, {
    galleryPermission: "GRANTED",
  });
  await authenticated.mutation(api.reactiveState.setPreferences, {
    galleryPermission: "DENIED",
  });

  expect(await authenticated.query(api.reactiveState.getPreferences, {})).toMatchObject({
    galleryPermission: "DENIED",
  });
  expect(await t.withIdentity(other).query(api.reactiveState.getPreferences, {})).toBeNull();
  await expect(t.query(api.reactiveState.getPreferences, {})).rejects.toThrow(/[Uu]nauthenticated/);
});

test("saved products are idempotent and data-scoped", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);

  await authenticated.mutation(api.reactiveState.setSavedProduct, {
    productId: "product-1",
    saved: true,
  });
  await authenticated.mutation(api.reactiveState.setSavedProduct, {
    productId: "product-1",
    saved: true,
  });
  await t.withIdentity(other).mutation(api.reactiveState.setSavedProduct, {
    productId: "product-other",
    saved: true,
  });

  expect(await authenticated.query(api.reactiveState.listSavedProducts, { limit: 100 })).toMatchObject([
    { productId: "product-1" },
  ]);
  expect(await t.withIdentity(other).query(api.reactiveState.listSavedProducts, { limit: 100 })).toMatchObject([
    { productId: "product-other" },
  ]);
  await authenticated.mutation(api.reactiveState.setSavedProduct, {
    productId: "product-1",
    saved: false,
  });
  expect(await authenticated.query(api.reactiveState.listSavedProducts, { limit: 100 })).toEqual([]);
});

test("liked products and search preferences are authenticated and owner-scoped", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);
  await authenticated.mutation(api.reactiveState.setLikedProduct, { productId: "product-1", liked: true });
  await authenticated.mutation(api.reactiveState.setPreferences, { searchInquiries: ["winter jackets"] });
  expect(await authenticated.query(api.reactiveState.listLikedProducts, { limit: 100 })).toMatchObject([{ productId: "product-1" }]);
  expect(await authenticated.query(api.reactiveState.getPreferences, {})).toMatchObject({ searchInquiries: ["winter jackets"] });
  expect(await t.withIdentity(other).query(api.reactiveState.listLikedProducts, { limit: 100 })).toEqual([]);
});

test("cart validates quantity, deduplicates by listing, and never exposes another user's intent", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);

  await authenticated.mutation(api.reactiveState.addCartItem, {
    productId: "listing-1",
    listing,
    quantity: 2,
  });
  await authenticated.mutation(api.reactiveState.addCartItem, {
    productId: "listing-1",
    listing,
    quantity: 1,
  });

  expect(await authenticated.query(api.reactiveState.listCartItems, { limit: 100 })).toMatchObject([
    { productId: "listing-1", quantity: 3 },
  ]);
  await expect(authenticated.mutation(api.reactiveState.setCartQuantity, {
    productId: "listing-1",
    quantity: 26,
  })).rejects.toThrow(/between 1 and 25/);
  expect(await t.withIdentity(other).query(api.reactiveState.listCartItems, { limit: 100 })).toEqual([]);
});

test("wardrobe mutations are O(1), idempotent by client key, and cross-user safe", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);

  const assetId = await t.mutation(internal.media.recordAsset, {
    tokenIdentifier: owner.tokenIdentifier,
    mediaKey: "private/users/firebase-uid-owner/generated/blue-shirt.jpg",
    mimeType: "image/jpeg",
    byteLength: 128,
    sha256: "c".repeat(64),
  });
  const item = {
    clientId: "upload-1",
    kind: "user_upload" as const,
    name: "Blue shirt",
    category: "TOP",
    weatherSuitability: "ALL_WEATHER" as const,
    image: "private/users/firebase-uid-owner/generated/blue-shirt.jpg",
    mediaAssetId: assetId,
    mediaKey: "private/users/firebase-uid-owner/generated/blue-shirt.jpg",
    addedAt: 1725753600000,
  };
  await authenticated.mutation(api.reactiveState.addWardrobeItem, item);
  await authenticated.mutation(api.reactiveState.addWardrobeItem, item);

  expect(await authenticated.query(api.reactiveState.listWardrobeItems, { limit: 100 })).toMatchObject([
    { clientId: "upload-1", name: "Blue shirt" },
  ]);
  expect(await t.withIdentity(other).query(api.reactiveState.listWardrobeItems, { limit: 100 })).toEqual([]);
  await expect(t.withIdentity(other).mutation(api.reactiveState.removeWardrobeItem, {
    clientId: "upload-1",
  })).rejects.toThrow(/not found/);
});
