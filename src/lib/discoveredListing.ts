export type ListingSource = "parallel" | "serpapi" | "apify" | "kitesurf";

export type DiscoveredListing = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  merchantUrl: string;
  source: ListingSource;
  providerListingId?: string;
  observedPrice?: { amount: number; currency: string; evidenceUrl: string };
  discoveredAt: string;
  expiresAt?: string;
  confidence?: number;
};

export type CartListingSnapshot = DiscoveredListing & { quantity: number; addedAt: string };

export function displayPrice(listing: DiscoveredListing): string {
  if (!listing.observedPrice) return "Price at merchant";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: listing.observedPrice.currency
  }).format(listing.observedPrice.amount);
}
