"use node";

import Parallel from "parallel-web";
import { action, env, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireFirebaseIdentity } from "./lib/identity";
import { deriveRecommendationQueries } from "./recommendationQueries";
import { listingValidator as listing } from "./lib/listing";

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function price(value: unknown, currency: unknown, evidenceUrl: string) {
  const amount = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const code = typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency)
    ? currency.toUpperCase()
    : "USD";
  return { amount, currency: code, evidenceUrl };
}

function normalize(source: "parallel" | "serpapi" | "kitesurf", item: Record<string, unknown>, discoveredAt: string) {
  const merchantUrl = httpsUrl(item.merchantUrl ?? item.url ?? item.link ?? item.product_url);
  const name = typeof (item.name ?? item.title) === "string" ? String(item.name ?? item.title).trim() : "";
  if (!merchantUrl || !name) return undefined;
  const providerListingId = typeof (item.id ?? item.product_id) === "string" ? String(item.id ?? item.product_id) : undefined;
  return {
    id: `${source}:${providerListingId ?? merchantUrl}`.slice(0, 256),
    name,
    ...(typeof item.brand === "string" || typeof item.source === "string" ? { brand: String(item.brand ?? item.source) } : {}),
    ...(typeof item.category === "string" ? { category: item.category } : {}),
    ...(httpsUrl(item.imageUrl ?? item.image ?? item.thumbnail) ? { imageUrl: httpsUrl(item.imageUrl ?? item.image ?? item.thumbnail) } : {}),
    merchantUrl,
    source,
    ...(providerListingId ? { providerListingId } : {}),
    ...(price(item.price ?? item.extracted_price, item.currency, merchantUrl) ? { observedPrice: price(item.price ?? item.extracted_price, item.currency, merchantUrl) } : {}),
    discoveredAt,
  };
}

async function fetchSerpApi(query: string, key: string, signal: AbortSignal): Promise<Record<string, unknown>[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", key);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`SerpAPI request failed (${response.status}).`);
  const data = await response.json() as { shopping_results?: unknown };
  return Array.isArray(data.shopping_results) ? data.shopping_results.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

async function fetchParallel(query: string, key: string, signal: AbortSignal): Promise<Record<string, unknown>[]> {
  const client = new Parallel({ apiKey: key });
  const result = await client.search({ objective: query, search_queries: [query], mode: "basic" }, { signal });
  const values = (result as { results?: unknown }).results;
  return Array.isArray(values) ? values.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

async function fetchKitesurfVerification(merchantUrl: string, productName: string, accountId: string, token: string, signal: AbortSignal) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-run/json?browser=kitesurf`, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      url: merchantUrl,
      prompt: `Inspect this public product page for ${productName}. Return only visible current price, ISO currency, final product URL, and whether the named product is present. Do not log in, add to cart, open checkout, enter payment data, or click place order.`,
      response_format: { type: "json_schema", json_schema: { type: "object", properties: { found: { type: "boolean" }, price: { type: ["number", "string"] }, currency: { type: "string" }, productUrl: { type: "string" } }, required: ["found"] } },
    }),
  });
  if (!response.ok) throw new Error(`Kitesurf request failed (${response.status}).`);
  const data = await response.json() as { result?: Record<string, unknown> };
  return data.result ?? {};
}

/**
 * Product discovery — Convex owns orchestration of external store/search
 * providers. There is no canonical product inventory: listings come from
 * Parallel (primary), SerpAPI (fallback), and Kitesurf (verification) per
 * request. Only user-scoped context (preferences, saved/liked products,
 * cart snapshots, orders) is persisted, never a shared product database.
 *
 * `search` serves explicit user queries; `recommendations` derives queries
 * from the caller's durable preferences/likes and fans out through the same
 * provider tools. Both are authenticated, validated, and rate limited.
 */

const runWithTimeout = async <T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

async function fetchWithSource(
  scopedQuery: string,
): Promise<{ raw: Record<string, unknown>[]; source: "parallel" | "serpapi" }> {
  let raw: Record<string, unknown>[] = [];
  let source: "parallel" | "serpapi" = "parallel";
  if (env.PARALLEL_API_KEY) {
    try {
      raw = await runWithTimeout((signal) => fetchParallel(scopedQuery, env.PARALLEL_API_KEY!, signal));
    } catch {
      raw = [];
    }
  }
  if (raw.length < 3 && env.SERPAPI_API_KEY) {
    source = "serpapi";
    try {
      raw = await runWithTimeout((signal) => fetchSerpApi(scopedQuery, env.SERPAPI_API_KEY!, signal));
    } catch {
      raw = [];
    }
  }
  return { raw, source };
}

function normalizeListings(
  raw: Record<string, unknown>[],
  source: "parallel" | "serpapi",
  discoveredAt: string,
) {
  const seen = new Set<string>();
  return raw
    .flatMap((item) => {
      const normalized = normalize(source, item, discoveredAt);
      if (!normalized || seen.has(normalized.id)) return [];
      seen.add(normalized.id);
      return [normalized];
    })
    .slice(0, 50);
}

export const search = action({
  args: { query: v.string(), location: v.optional(v.string()), radius: v.optional(v.number()) },
  returns: v.object({ listings: v.array(listing) }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const query = args.query.trim().replace(/\s+/g, " ");
    if (query.length < 2 || query.length > 240) throw new Error("A valid discovery query is required.");
    const scopedQuery = args.location?.trim() ? `${query} near ${args.location.trim()}` : query;
    const discoveredAt = new Date().toISOString();

    // Per-user quota before any external provider call.
    await ctx.runMutation(internal.rateLimits.consume, {
      key: identity.tokenIdentifier,
      name: "discoverySearch",
    });

    const { raw, source } = await fetchWithSource(scopedQuery);
    if (raw.length === 0) throw new Error("Discovery providers returned no verified listings.");
    const listings = normalizeListings(raw, source, discoveredAt);
    if (listings.length === 0) throw new Error("Discovery providers returned no verified listings.");
    return { listings };
  },
});

/**
 * Server-derived recommendation feed. Reads the caller's durable user state
 * (preferences, saved/liked products, recent orders), derives a small set of
 * external search queries, and fans them out through the same provider tools
 * as `search`. Nothing is read from or written to a product database; results
 * are live external listings scoped to this user's intent.
 */
export const searchForAgent = internalAction({
  args: { tokenIdentifier: v.string(), query: v.string(), location: v.optional(v.string()) },
  returns: v.object({ listings: v.array(listing) }),
  handler: async (ctx, args) => {
    const query = args.query.trim().replace(/\s+/g, " ");
    if (query.length < 2 || query.length > 240) throw new Error("A valid discovery query is required.");
    const scopedQuery = args.location?.trim() ? `${query} near ${args.location.trim()}` : query;
    await ctx.runMutation(internal.rateLimits.consume, { key: args.tokenIdentifier, name: "discoverySearch" });
    const { raw, source } = await fetchWithSource(scopedQuery);
    const listings = normalizeListings(raw, source, new Date().toISOString());
    if (listings.length === 0) throw new Error("Discovery providers returned no verified listings.");
    return { listings };
  },
});

export const recommendations = action({
  args: {},
  returns: v.object({ listings: v.array(listing), derivedFrom: v.array(v.string()) }),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);

    // Durable user context is the only recommendation input.
    const [preferences, saved, liked, recentOrders] = await Promise.all([
      ctx.runQuery(internal.discoveryState.myPreferences, {}),
      ctx.runQuery(internal.discoveryState.mySavedProductIds, {}),
      ctx.runQuery(internal.discoveryState.myLikedProductIds, {}),
      ctx.runQuery(internal.discoveryState.myRecentOrderListingNames, {}),
    ]);

    const derivedFrom = deriveRecommendationQueries({
      searchInquiries: preferences?.searchInquiries ?? [],
      vibes: preferences?.vibes ?? [],
      savedProductIds: saved,
      likedProductIds: liked,
      recentOrderNames: recentOrders,
    });
    if (derivedFrom.length === 0) throw new Error("NO_PREFERENCES: no durable preference, saved, or order context is available to derive recommendations.");

    const discoveredAt = new Date().toISOString();
    const batches = await Promise.all(
      derivedFrom.map(async (query) => {
        await ctx.runMutation(internal.rateLimits.consume, {
          key: identity.tokenIdentifier,
          name: "discoverySearch",
        });
        return fetchWithSource(query).catch(() => ({ raw: [] as Record<string, unknown>[], source: "parallel" as const }));
      }),
    );
    const listings = batches
      .flatMap((batch) => normalizeListings(batch.raw, batch.source, discoveredAt))
      .filter((listing, index, all) => all.findIndex((candidate) => candidate.id === listing.id) === index)
      .slice(0, 50);
    if (listings.length === 0) throw new Error("Discovery providers returned no verified listings.");
    return { listings, derivedFrom };
  },
});

export const verifyMerchantListing = action({
  args: { merchantUrl: v.string(), productName: v.string() },
  returns: v.object({ found: v.boolean(), merchantUrl: v.string(), observedPrice: v.optional(v.object({ amount: v.number(), currency: v.string(), evidenceUrl: v.string() })) }),
  handler: async (ctx, args) => {
    await requireFirebaseIdentity(ctx);
    const merchantUrl = httpsUrl(args.merchantUrl);
    const productName = args.productName.trim();
    if (!merchantUrl || productName.length < 2 || productName.length > 240) throw new Error("A valid merchant listing is required.");
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) throw new Error("Merchant verification is not configured in the Convex deployment.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const result = await fetchKitesurfVerification(merchantUrl, productName, env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_API_TOKEN, controller.signal);
      const evidenceUrl = httpsUrl(result.productUrl) ?? merchantUrl;
      const observedPrice = price(result.price, result.currency, evidenceUrl);
      return { found: result.found === true, merchantUrl: evidenceUrl, ...(observedPrice ? { observedPrice } : {}) };
    } finally { clearTimeout(timeout); }
  },
});
