import { deduplicateListings, normalizeProviderListing, type ProviderNormalizationOptions } from "./discoveryTypes";

export function normalizeApifyResults(results: unknown[], options: ProviderNormalizationOptions = {}) {
  return deduplicateListings(results.flatMap(result => {
    if (!result || typeof result !== "object") return [];
    const item = result as Record<string, unknown>;
    const listing = normalizeProviderListing({
      source: "apify",
      merchantUrl: item.productUrl ?? item.url ?? item.link,
      providerListingId: item.id ?? item.productId ?? item.sku,
      name: item.name ?? item.title,
      brand: item.brand ?? item.merchant,
      category: item.category,
      imageUrl: item.imageUrl ?? item.image ?? item.thumbnail,
      price: item.price ?? item.currentPrice,
      currency: item.currency,
    }, options);
    return listing ? [listing] : [];
  }));
}
