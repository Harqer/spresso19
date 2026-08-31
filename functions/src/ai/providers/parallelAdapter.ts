import { deduplicateListings, normalizeProviderListing, type ProviderNormalizationOptions } from "./discoveryTypes";

export function normalizeParallelResults(results: unknown[], options: ProviderNormalizationOptions = {}) {
  return deduplicateListings(results.flatMap(result => {
    if (!result || typeof result !== "object") return [];
    const item = result as Record<string, unknown>;
    const listing = normalizeProviderListing({
      source: "parallel",
      merchantUrl: item.url,
      providerListingId: item.id,
      name: item.title,
      brand: item.merchant,
      category: item.category,
      imageUrl: item.imageUrl ?? item.image,
      price: item.price,
      currency: item.currency,
    }, options);
    return listing ? [listing] : [];
  }));
}
