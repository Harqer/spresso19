import { z } from "zod";
import {
  canonicalMerchantUrl,
  DiscoveredListingSchema,
  stableListingId,
  type DiscoveredListing,
} from "../../contracts/discoveredListing";

export type DiscoveryProvider = DiscoveredListing["source"];

export type ProviderNormalizationOptions = {
  discoveredAt?: string;
};

export type ProviderListingInput = {
  source: DiscoveryProvider;
  merchantUrl: unknown;
  providerListingId?: unknown;
  name?: unknown;
  brand?: unknown;
  category?: unknown;
  imageUrl?: unknown;
  price?: unknown;
  currency?: unknown;
  discoveredAt?: string;
};

const isoCurrency = /^[A-Z]{3}$/;
const modelListingSchema = z.object({
  id: z.string().min(1),
  merchantUrl: z.string().url(),
  source: z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
  price: z.number().positive().nullable(),
  priceEvidence: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
}).strict();

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function httpsUrl(value: unknown): string | undefined {
  const url = stringValue(value);
  if (!url) return undefined;
  try {
    return canonicalMerchantUrl(url);
  } catch {
    return undefined;
  }
}

function imageUrl(value: unknown): string | undefined {
  return httpsUrl(value);
}

function currencyFrom(value: unknown, price: string): string | undefined {
  const explicit = stringValue(value)?.toUpperCase();
  if (explicit && isoCurrency.test(explicit)) return explicit;
  const code = price.match(/\b([A-Za-z]{3})\b/)?.[1]?.toUpperCase();
  if (code && isoCurrency.test(code)) return code;
  if (price.includes("€")) return "EUR";
  if (price.includes("£")) return "GBP";
  if (price.includes("¥")) return "JPY";
  if (price.includes("$")) return "USD";
  return undefined;
}

export function parseProviderPrice(value: unknown, currency: unknown, evidenceUrl: string) {
  const numeric = typeof value === "number" ? value : undefined;
  const raw = typeof value === "string" ? value.trim() : undefined;
  const amount = numeric ?? (raw ? Number(raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "")) : Number.NaN);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const normalizedCurrency = currencyFrom(currency, raw || "") || (numeric !== undefined ? "USD" : undefined);
  if (!normalizedCurrency) return undefined;
  return { amount, currency: normalizedCurrency, evidenceUrl };
}

export function normalizeProviderListing(input: ProviderListingInput, options: ProviderNormalizationOptions = {}): DiscoveredListing | undefined {
  const merchantUrl = httpsUrl(input.merchantUrl);
  const name = stringValue(input.name);
  if (!merchantUrl || !name) return undefined;

  const providerListingId = stringValue(input.providerListingId);
  const observedPrice = parseProviderPrice(input.price, input.currency, merchantUrl);
  const listing = {
    id: stableListingId(input.source, merchantUrl, providerListingId),
    name,
    brand: stringValue(input.brand),
    category: stringValue(input.category),
    imageUrl: imageUrl(input.imageUrl),
    merchantUrl,
    source: input.source,
    providerListingId,
    observedPrice,
    discoveredAt: options.discoveredAt || input.discoveredAt || new Date().toISOString(),
  };
  const parsed = DiscoveredListingSchema.safeParse(listing);
  return parsed.success ? parsed.data : undefined;
}

export function deduplicateListings(listings: DiscoveredListing[]): DiscoveredListing[] {
  const seen = new Set<string>();
  return listings.filter(listing => {
    const key = `${listing.source}:${canonicalMerchantUrl(listing.merchantUrl)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function assertModelListingProvenance(modelOutput: unknown, providerListings: readonly DiscoveredListing[]): DiscoveredListing[] {
  const candidates = z.array(modelListingSchema).parse(modelOutput);
  const recordsById = new Map(providerListings.map(listing => [listing.id, listing]));
  const result: DiscoveredListing[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const listing = recordsById.get(candidate.id);
    if (!listing || seen.has(listing.id)) throw new Error("Model returned a listing without validated provider provenance.");
    const expectedPrice = listing.observedPrice;
    const sameMerchantUrl = canonicalMerchantUrl(candidate.merchantUrl) === canonicalMerchantUrl(listing.merchantUrl);
    const sameImageUrl = candidate.imageUrl === listing.imageUrl;
    const samePrice = candidate.price === (expectedPrice?.amount ?? null);
    const sameEvidence = candidate.priceEvidence === expectedPrice?.evidenceUrl;
    if (!sameMerchantUrl || candidate.source !== listing.source || !sameImageUrl || !samePrice || !sameEvidence) {
      throw new Error("Model changed validated provider listing evidence.");
    }
    seen.add(listing.id);
    result.push(listing);
  }

  return result;
}
