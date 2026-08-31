import { deduplicateListings, normalizeProviderListing, type ProviderNormalizationOptions } from "./discoveryTypes";

export function normalizeSerpApiResults(results: unknown[], options: ProviderNormalizationOptions = {}) {
  return deduplicateListings(results.flatMap(result => {
    if (!result || typeof result !== "object") return [];
    const item = result as Record<string, unknown>;
    const listing = normalizeProviderListing({
      source: "serpapi",
      merchantUrl: item.link ?? item.product_link ?? item.product_url,
      providerListingId: item.product_id ?? item.productId,
      name: item.title,
      brand: item.source,
      category: item.category,
      imageUrl: item.thumbnail ?? item.image,
      price: item.price ?? item.extracted_price,
      currency: item.currency,
    }, options);
    return listing ? [listing] : [];
  }));
}
