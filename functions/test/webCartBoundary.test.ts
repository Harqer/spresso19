import assert from "node:assert/strict";
import test from "node:test";
import { parseWebCart } from "../src/cart/webCart";

const listing = {
  id: "listing-coat-1",
  name: "Wool Coat",
  merchantUrl: "https://merchant.example/products/coat",
  source: "parallel" as const,
  discoveredAt: "2026-08-31T00:00:00.000Z",
  quantity: 1,
  addedAt: "2026-08-31T00:01:00.000Z",
};

const { quantity: _quantity, addedAt: _addedAt, ...productListing } = listing;

const cartItem = {
  product: {
    id: listing.id,
    name: "Wool Coat",
    brand: "Merchant",
    category: "Outerwear",
    price: 120,
    currency: "USD",
    merchantUrl: listing.merchantUrl,
    sku: "coat-1",
    rating: 4.5,
    description: "A wool coat.",
    image: "https://merchant.example/images/coat.jpg",
    virtualTryOnEligible: false,
    mcpServerId: "parallel",
    availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT" as const,
    listing: productListing,
  },
  listing,
  quantity: 1,
};

test("accepts a consistent cart item and returns only its rendering fields", () => {
  const [parsed] = parseWebCart({ cart: [cartItem] });

  assert.deepEqual(parsed, cartItem);
});

test("accepts unavailable product price and image renderings", () => {
  const [parsed] = parseWebCart({
    cart: [{
      ...cartItem,
      product: {
        ...cartItem.product,
        price: 0,
        currency: "",
        image: "",
      },
    }],
  });

  assert.equal(parsed.product.price, 0);
  assert.equal(parsed.product.currency, "");
  assert.equal(parsed.product.image, "");
});

test("rejects mismatched duplicated quantity", () => {
  assert.throws(() => parseWebCart({ cart: [{ ...cartItem, quantity: 2 }] }));
});

test("rejects arbitrary nested product fields", () => {
  assert.throws(() => parseWebCart({ cart: [{ ...cartItem, product: { ...cartItem.product, stock: 99 } }] }));
});
