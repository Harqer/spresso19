import assert from "node:assert/strict";
import { test } from "node:test";
import { withCartQuantity } from "../lib/cartState";
import type { CartItem, ProductItem } from "../types";

const product: ProductItem = {
  id: "listing-coat-1",
  name: "Wool Coat",
  brand: "Merchant",
  category: "Outerwear",
  price: 120,
  currency: "USD",
  merchantUrl: "https://merchant.example/products/coat",
  sku: "coat-1",
  rating: 4.5,
  description: "A wool coat.",
  image: "https://merchant.example/images/coat.jpg",
  virtualTryOnEligible: false,
  mcpServerId: "parallel",
  availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
  listing: {
    id: "listing-coat-1",
    name: "Wool Coat",
    merchantUrl: "https://merchant.example/products/coat",
    source: "parallel",
    discoveredAt: "2026-08-31T00:00:00.000Z",
  },
};

const cartItem: CartItem = {
  product,
  listing: {
    ...product.listing!,
    quantity: 1,
    addedAt: "2026-08-31T00:01:00.000Z",
  },
  quantity: 1,
};

test("quantity updates keep the listing snapshot synchronized", () => {
  const updated = withCartQuantity(cartItem, 2);

  assert.equal(updated.quantity, 2);
  assert.equal(updated.listing.quantity, 2);
  assert.equal(cartItem.quantity, 1);
  assert.equal(cartItem.listing.quantity, 1);
});
