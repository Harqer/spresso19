import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApifyResults } from "../src/ai/providers/apifyAdapter";
import { normalizeParallelResults } from "../src/ai/providers/parallelAdapter";
import { assertModelListingProvenance } from "../src/ai/providers/discoveryTypes";
import { normalizeSerpApiResults } from "../src/ai/providers/serpApiAdapter";

const discoveredAt = "2026-08-30T12:00:00.000Z";

test("normalizes valid provider records, numeric prices, and duplicate canonical URLs", () => {
  const listings = normalizeSerpApiResults([
    {
      product_id: "espresso-1",
      title: "Espresso Maker",
      link: "https://merchant.example/products/espresso?utm_source=search",
      thumbnail: "https://images.example/espresso.jpg",
      price: 249.99,
    },
    {
      product_id: "espresso-2",
      title: "Duplicate Espresso Maker",
      link: "https://merchant.example/products/espresso",
      price: "$249.99",
    },
  ], { discoveredAt });

  assert.equal(listings.length, 1);
  assert.equal(listings[0].merchantUrl, "https://merchant.example/products/espresso");
  assert.deepEqual(listings[0].observedPrice, {
    amount: 249.99,
    currency: "USD",
    evidenceUrl: "https://merchant.example/products/espresso",
  });
});

test("rejects records without direct HTTPS merchant URLs", () => {
  assert.deepEqual(normalizeParallelResults([
    { title: "Missing URL", excerpts: ["$89.00"] },
    { title: "Insecure URL", url: "http://merchant.example/item", excerpts: ["$89.00"] },
  ], { discoveredAt }), []);
});

test("keeps unknown prices null and does not infer them from unrelated text", () => {
  const listings = normalizeParallelResults([
    {
      title: "Coffee grinder",
      url: "https://merchant.example/grinder",
      excerpts: ["Compare this grinder with the $249.00 espresso machine in our guide."],
    },
  ], { discoveredAt });

  assert.equal(listings.length, 1);
  assert.equal(listings[0].observedPrice, undefined);
});

test("uses direct provider price fields with matching evidence URLs", () => {
  const listings = normalizeApifyResults([
    {
      id: "apify-1",
      name: "Kettle",
      productUrl: "https://merchant.example/kettle",
      imageUrl: "https://images.example/kettle.jpg",
      price: "EUR 129.50",
    },
  ], { discoveredAt });

  assert.deepEqual(listings[0].observedPrice, {
    amount: 129.5,
    currency: "EUR",
    evidenceUrl: "https://merchant.example/kettle",
  });
});

test("rejects model records with fabricated URLs, prices, sources, or images", () => {
  const [listing] = normalizeSerpApiResults([
    {
      product_id: "espresso-1",
      title: "Espresso Maker",
      link: "https://merchant.example/products/espresso",
      thumbnail: "https://images.example/espresso.jpg",
      price: "$249.99",
    },
  ], { discoveredAt });
  const valid = {
    id: listing.id,
    merchantUrl: listing.merchantUrl,
    source: listing.source,
    price: listing.observedPrice?.amount ?? null,
    priceEvidence: listing.observedPrice?.evidenceUrl,
    imageUrl: listing.imageUrl,
  };

  assert.deepEqual(assertModelListingProvenance([valid], [listing]), [listing]);
  for (const forged of [
    { ...valid, merchantUrl: "https://fabricated.example/product" },
    { ...valid, price: 1 },
    { ...valid, source: "parallel" },
    { ...valid, imageUrl: "https://fabricated.example/image.jpg" },
    { ...valid, priceEvidence: "https://fabricated.example/price" },
  ]) {
    assert.throws(() => assertModelListingProvenance([forged], [listing]));
  }
});
