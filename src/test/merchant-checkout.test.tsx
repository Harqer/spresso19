import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartDrawer } from "../components/CartDrawer";
import { requestMerchantCheckout, verifiedMerchantUrl } from "../lib/merchantCheckout";
import type { CartItem, ProductItem } from "../types";

const product: ProductItem = {
  id: "coat-1",
  name: "Wool Coat",
  brand: "Merchant",
  category: "Outerwear",
  price: 120,
  currency: "USD",
  sku: "coat-1",
  rating: 4.5,
  description: "A wool coat.",
  image: "https://merchant.example/images/coat.jpg",
  virtualTryOnEligible: false,
  mcpServerId: "parallel",
  listing: {
    id: "listing-coat-1",
    name: "Wool Coat",
    merchantUrl: "https://merchant.example/products/coat",
    source: "parallel",
    observedPrice: {
      amount: 120,
      currency: "USD",
      evidenceUrl: "https://merchant.example/products/coat",
    },
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

test("catalog checkout adds the verified listing once before opening the cart", async () => {
  const events: string[] = [];

  await requestMerchantCheckout(product, {
    addToCart: async received => {
      assert.strictEqual(received, product);
      events.push("add");
    },
    openCart: () => events.push("open"),
  });

  assert.deepEqual(events, ["add", "open"]);
});

test("verified merchant URLs accept HTTPS and reject other protocols", () => {
  assert.equal(verifiedMerchantUrl("https://merchant.example/products/coat"), "https://merchant.example/products/coat");
  assert.equal(verifiedMerchantUrl("http://merchant.example/products/coat"), null);
});

test("cart checkout renders a direct HTTPS merchant handoff", () => {
  const html = renderToStaticMarkup(
    <CartDrawer
      isOpen
      cart={[cartItem]}
      onClose={() => undefined}
      onUpdateQuantity={() => undefined}
      onRemoveItem={() => undefined}
      onClearCart={() => undefined}
    />,
  );

  assert.match(html, /href="https:\/\/merchant\.example\/products\/coat"/);
  assert.match(html, />Continue to merchant checkout</);
});
