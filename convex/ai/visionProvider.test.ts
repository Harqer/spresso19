import { describe, expect, test } from "vitest";
import { VisualListingSchema, fetchVisionListings, normalizeApifyResult } from "./visionProvider";

describe("apify lens provider adapter", () => {
  test("normalizes a full provider row onto the visual-listing contract", () => {
    const normalized = normalizeApifyResult(
      {
        productUrl: "https://merchant.example/jacket",
        id: "apify-1",
        name: "Denim Jacket",
        brand: "Example Brand",
        imageUrl: "https://cdn.merchant.example/jacket.jpg",
        price: "89.99",
        currency: "usd",
        rating: 4.5,
        reviewCount: 12,
      },
      "2026-09-12T00:00:00.000Z",
    );
    expect(normalized).toMatchObject({
      id: "https://merchant.example/jacket#apify-1",
      name: "Denim Jacket",
      brand: "Example Brand",
      merchantUrl: "https://merchant.example/jacket",
      source: "apify",
      providerListingId: "apify-1",
      observedPrice: { amount: 89.99, currency: "USD", evidenceUrl: "https://merchant.example/jacket" },
      rating: 4.5,
      reviewCount: 12,
      discoveredAt: "2026-09-12T00:00:00.000Z",
    });
    expect(() => VisualListingSchema.parse(normalized)).not.toThrow();
  });

  test("skips rows without a usable merchant URL or name", () => {
    expect(normalizeApifyResult({ title: "No URL" }, "2026-09-12T00:00:00.000Z")).toBeUndefined();
    expect(normalizeApifyResult({ url: "http://insecure.example/x", name: "Insecure" }, "2026-09-12T00:00:00.000Z")).toBeUndefined();
  });

  test("fetchVisionListings calls the Apify actor with the image and normalizes results", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(
        JSON.stringify([
          { productUrl: "https://merchant.example/shoe", id: "s1", name: "Running Shoe", price: 120, currency: "USD" },
          { broken: true },
        ]),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const listings = await fetchVisionListings("QUJD", "token", { fetchImpl, timeoutMs: 5_000 });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("api.apify.com");
    expect(calls[0].init?.method).toBe("POST");
    expect(String(calls[0].init?.body)).toContain('"imagesBase64":["QUJD"]');
    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({ name: "Running Shoe", source: "apify", observedPrice: { amount: 120 } });
  });

  test("fetchVisionListings surfaces provider HTTP failure and timeouts honestly", async () => {
    const failing = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    await expect(fetchVisionListings("QUJD", "token", { fetchImpl: failing })).rejects.toThrow(/HTTP 500/);

    const hanging = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })) as unknown as typeof fetch;
    await expect(fetchVisionListings("QUJD", "token", { fetchImpl: hanging, timeoutMs: 10 })).rejects.toThrow();
  });
});
