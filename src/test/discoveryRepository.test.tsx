import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DiscoveryRepository,
  displayListingPrice,
  type DiscoveryCallable,
} from "../lib/discoveryRepository";

const listing = {
  id: "parallel-coat-1",
  name: "Verified wool coat",
  brand: "Merchant",
  category: "Outerwear",
  imageUrl: "https://merchant.example/coat.jpg",
  merchantUrl: "https://merchant.example/products/coat",
  source: "parallel" as const,
  observedPrice: { amount: 125, currency: "USD", evidenceUrl: "https://merchant.example/products/coat" },
};

test("renders an unknown price when the callable has no currency-backed observation", () => {
  assert.equal(displayListingPrice({ ...listing, observedPrice: undefined }), "Price at merchant");
});

test("suppresses duplicate requests for the same discovery key", async () => {
  let calls = 0;
  const discover: DiscoveryCallable = async () => {
    calls += 1;
    return { items: [listing] };
  };
  const repository = new DiscoveryRepository({ discover, debounceMs: 0 });

  const [first, second] = await Promise.all([
    repository.search({ query: "wool coat" }),
    repository.search({ query: "wool coat" }),
  ]);

  assert.equal(calls, 1);
  assert.strictEqual(first[0], second[0]);
});

test("cancels an in-flight request when the query changes", async () => {
  let firstSignal: AbortSignal | undefined;
  const discover: DiscoveryCallable = async (request, signal) => {
    if (request.searchQueries[0] === "first query") {
      firstSignal = signal;
      return new Promise(() => undefined);
    }
    return { items: [listing] };
  };
  const repository = new DiscoveryRepository({ discover, debounceMs: 0 });
  const first = repository.search({ query: "first query" });
  await new Promise(resolve => setTimeout(resolve, 0));
  const second = repository.search({ query: "second query" });

  await assert.rejects(first, { name: "AbortError" });
  await second;
  assert.equal(firstSignal?.aborted, true);
});

test("returns the same listing identity to every surface", async () => {
  const repository = new DiscoveryRepository({
    discover: async () => ({ items: [listing] }),
    debounceMs: 0,
  });

  const catalogListings = await repository.search({ query: "wool coat" });
  const chatListings = repository.getListings();
  const visionListings = repository.getListings();
  const wardrobeListings = repository.getListings();

  assert.strictEqual(catalogListings[0], chatListings[0]);
  assert.strictEqual(catalogListings[0], visionListings[0]);
  assert.strictEqual(catalogListings[0], wardrobeListings[0]);
});
