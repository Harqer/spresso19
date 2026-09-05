import assert from "node:assert/strict";
import test from "node:test";
import { fetchApifyLensResults, parseLensApifyResults } from "../src/ai/lensSearch";

test("lens results preserve an unknown Apify price as an absent observed price", () => {
  const [listing] = parseLensApifyResults([
    {
      id: "lens-1",
      title: "Travel mug",
      productUrl: "https://merchant.example/products/travel-mug",
      imageUrl: "https://images.example/travel-mug.jpg",
    },
  ], { discoveredAt: "2026-08-31T00:00:00.000Z" });

  assert.deepEqual(listing, {
    id: listing.id,
    name: "Travel mug",
    brand: undefined,
    category: undefined,
    merchantUrl: "https://merchant.example/products/travel-mug",
    imageUrl: "https://images.example/travel-mug.jpg",
    source: "apify",
    providerListingId: "lens-1",
    observedPrice: undefined,
    discoveredAt: "2026-08-31T00:00:00.000Z",
  });
  assert.equal(listing.observedPrice, undefined);
});

test("Apify Lens boundary normalizes only provider records through its injected fetch", async () => {
  let request: Request | undefined;
  const listings = await fetchApifyLensResults("data:image/jpeg;base64,ZmFrZQ==", "test-token", {
    fetchImpl: async (input, init) => {
      request = new Request(input, init);
      return Response.json([
        {
          id: "lens-2",
          title: "Espresso grinder",
          productUrl: "https://merchant.example/products/grinder",
          price: "USD 89.50",
        },
      ]);
    },
  });

  assert.match(request!.url, /borderline~google-lens\/run-sync-get-dataset-items/);
  assert.equal(request!.headers.get("Authorization"), "Bearer test-token");
  assert.deepEqual(await request!.json(), {
    searchTypes: ["all", "products", "visual-match"],
    imagesBase64: ["data:image/jpeg;base64,ZmFrZQ=="],
    language: "en",
  });
  assert.deepEqual(listings[0].observedPrice, {
    amount: 89.5,
    currency: "USD",
    evidenceUrl: "https://merchant.example/products/grinder",
  });
});

test("Lens evidence is preserved only when the provider supplies validated media and review fields", () => {
  const [listing] = parseLensApifyResults([
    {
      id: "lens-3",
      title: "Running shoes",
      productUrl: "https://merchant.example/products/shoes",
      imageUrl: "https://images.example/shoes.jpg",
      videoUrl: "https://cdn.example/shoes.mp4",
      rating: 4.6,
      reviewsCount: 128,
      reviewSummary: "Comfortable for daily training.",
    },
  ]);

  assert.equal(listing.videoUrl, "https://cdn.example/shoes.mp4");
  assert.equal(listing.rating, 4.6);
  assert.equal(listing.reviewCount, 128);
  assert.equal(listing.reviewSummary, "Comfortable for daily training.");
});
