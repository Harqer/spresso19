import type { ProductItem } from "../types";
import type { CartListingSnapshot, DiscoveredListing, ListingSource } from "./discoveredListing";

type CallableListing = {
  id: unknown;
  name: unknown;
  brand?: unknown;
  category?: unknown;
  price?: unknown;
  currency?: unknown;
  imageUrl?: unknown;
  merchantUrl: unknown;
  source: unknown;
  providerListingId?: unknown;
  priceEvidence?: unknown;
  discoveredAt?: unknown;
  expiresAt?: unknown;
  confidence?: unknown;
};

export type DiscoveryRequest = {
  query: string;
  location?: string | null;
  radius?: number;
};

export type DiscoveryCallableRequest = {
  searchQueries: string[];
};

export type DiscoveryCallableResponse = { items: CallableListing[] };
export type DiscoveryCallable = (
  request: DiscoveryCallableRequest,
  signal: AbortSignal,
) => Promise<DiscoveryCallableResponse>;

type DiscoveryRepositoryOptions = {
  discover: DiscoveryCallable;
  debounceMs?: number;
  defaultTtlMs?: number;
  now?: () => number;
};

type CacheEntry = { listingIds: string[]; expiresAt: number };
type PendingRequest = { key: string; controller: AbortController; promise: Promise<DiscoveredListing[]> };

const SOURCES: readonly ListingSource[] = ["parallel", "serpapi", "apify", "kitesurf"];
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function isSource(value: unknown): value is ListingSource {
  return typeof value === "string" && SOURCES.includes(value as ListingSource);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function httpsUrl(value: unknown): string | undefined {
  const text = stringValue(value);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function dateValue(value: unknown): string | undefined {
  const text = stringValue(value);
  if (!text || Number.isNaN(Date.parse(text))) return undefined;
  return new Date(text).toISOString();
}

function abortError(): DOMException {
  return new DOMException("Discovery request was cancelled.", "AbortError");
}

function waitFor(delayMs: number, signal: AbortSignal): Promise<void> {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      value => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      error => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export function displayListingPrice(listing: Pick<DiscoveredListing, "observedPrice">): string {
  if (!listing.observedPrice) return "Price at merchant";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: listing.observedPrice.currency,
  }).format(listing.observedPrice.amount);
}

export function createCartListingSnapshot(listing: DiscoveredListing, quantity: number): CartListingSnapshot {
  return { ...listing, quantity, addedAt: new Date().toISOString() };
}

export class DiscoveryRepository {
  private readonly discover: DiscoveryCallable;
  private readonly debounceMs: number;
  private readonly defaultTtlMs: number;
  private readonly now: () => number;
  private readonly listings = new Map<string, DiscoveredListing>();
  private readonly products = new Map<string, ProductItem>();
  private readonly cache = new Map<string, CacheEntry>();
  private pending: PendingRequest | null = null;

  constructor({ discover, debounceMs = 250, defaultTtlMs = DEFAULT_TTL_MS, now = Date.now }: DiscoveryRepositoryOptions) {
    this.discover = discover;
    this.debounceMs = debounceMs;
    this.defaultTtlMs = defaultTtlMs;
    this.now = now;
  }

  async search(request: DiscoveryRequest): Promise<DiscoveredListing[]> {
    const normalized = this.normalizeRequest(request);
    const key = JSON.stringify(normalized);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return cached.listingIds.map(id => this.listings.get(id)).filter((listing): listing is DiscoveredListing => Boolean(listing));
    }
    if (this.pending?.key === key) return this.pending.promise;
    this.cancel();

    const controller = new AbortController();
    const promise = this.run(normalized, key, controller);
    this.pending = { key, controller, promise };
    try {
      return await promise;
    } finally {
      if (this.pending?.promise === promise) this.pending = null;
    }
  }

  cancel(): void {
    this.pending?.controller.abort();
    this.pending = null;
  }

  getListings(): DiscoveredListing[] {
    return [...this.listings.values()];
  }

  getProducts(): ProductItem[] {
    return [...this.products.values()];
  }

  asProducts(listings: readonly DiscoveredListing[]): ProductItem[] {
    return listings.map(listing => this.toProduct(listing));
  }

  private async run(request: Required<DiscoveryRequest>, key: string, controller: AbortController): Promise<DiscoveredListing[]> {
    await waitFor(this.debounceMs, controller.signal);
    const response = await abortable(this.discover({ searchQueries: [request.query] }, controller.signal), controller.signal);
    const listings = response.items
      .map(item => this.normalizeListing(item))
      .filter((listing): listing is DiscoveredListing => Boolean(listing));
    const canonicalListings = listings.map(listing => this.upsertListing(listing));
    const providerExpiresAt = canonicalListings.length > 0
      ? Math.min(...canonicalListings.map(listing => Date.parse(listing.expiresAt || "") || this.now() + this.defaultTtlMs))
      : this.now() + this.defaultTtlMs;
    this.cache.set(key, { listingIds: canonicalListings.map(listing => listing.id), expiresAt: providerExpiresAt });
    return canonicalListings;
  }

  private normalizeRequest(request: DiscoveryRequest): Required<DiscoveryRequest> {
    const query = request.query.trim().replace(/\s+/g, " ");
    if (!query) throw new Error("A discovery query is required.");
    const location = request.location?.trim().replace(/\s+/g, " ") || "";
    const radius = Number.isFinite(request.radius) ? Number(request.radius) : 0;
    return { query: location ? `${query} near ${location}` : query, location, radius };
  }

  private normalizeListing(candidate: CallableListing): DiscoveredListing | undefined {
    const id = stringValue(candidate.id);
    const name = stringValue(candidate.name);
    const merchantUrl = httpsUrl(candidate.merchantUrl);
    if (!id || !name || !merchantUrl || !isSource(candidate.source)) return undefined;
    const price = typeof candidate.price === "number" && Number.isFinite(candidate.price) && candidate.price > 0 ? candidate.price : undefined;
    const currency = stringValue(candidate.currency)?.toUpperCase();
    const evidenceUrl = httpsUrl(candidate.priceEvidence);
    const observedPrice = price && currency && /^[A-Z]{3}$/.test(currency) && evidenceUrl
      ? { amount: price, currency, evidenceUrl }
      : undefined;
    const discoveredAt = dateValue(candidate.discoveredAt) || new Date(this.now()).toISOString();
    const suppliedExpiry = dateValue(candidate.expiresAt);
    const expiresAt = suppliedExpiry && Date.parse(suppliedExpiry) > this.now()
      ? suppliedExpiry
      : new Date(this.now() + this.defaultTtlMs).toISOString();
    const confidence = typeof candidate.confidence === "number" && candidate.confidence >= 0 && candidate.confidence <= 1
      ? candidate.confidence
      : undefined;
    return {
      id,
      name,
      brand: stringValue(candidate.brand),
      category: stringValue(candidate.category),
      imageUrl: httpsUrl(candidate.imageUrl),
      merchantUrl,
      source: candidate.source,
      providerListingId: stringValue(candidate.providerListingId),
      observedPrice,
      discoveredAt,
      expiresAt,
      confidence,
    };
  }

  private upsertListing(next: DiscoveredListing): DiscoveredListing {
    const existing = this.listings.get(next.id);
    if (existing) {
      Object.assign(existing, next);
      return existing;
    }
    this.listings.set(next.id, next);
    return next;
  }

  private toProduct(listing: DiscoveredListing): ProductItem {
    const next: ProductItem = {
      id: listing.id,
      name: listing.name,
      brand: listing.brand || "Merchant listing",
      category: listing.category || "Uncategorized",
      price: listing.observedPrice?.amount || 0,
      currency: listing.observedPrice?.currency || "",
      availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
      merchantUrl: listing.merchantUrl,
      sku: listing.providerListingId || listing.id,
      rating: 0,
      description: "Verified merchant listing. Final price and availability are shown by the merchant.",
      image: listing.imageUrl || "",
      virtualTryOnEligible: Boolean(listing.imageUrl),
      mcpServerId: listing.source,
      listing,
    };
    const existing = this.products.get(listing.id);
    if (existing) {
      Object.assign(existing, next);
      return existing;
    }
    this.products.set(listing.id, next);
    return next;
  }
}

export const firebaseDiscoveryCallable: DiscoveryCallable = async (request, signal) => {
  const { authFetch } = await import("./firebase");
  const response = await authFetch(
    "https://us-central1-get-spresso.cloudfunctions.net/discoverPersonalizedProducts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: request }),
      signal,
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || "Discovery is unavailable.");
  const result = body?.result;
  if (!result || !Array.isArray(result.items)) throw new Error("Discovery returned an invalid listing response.");
  return { items: result.items };
};
