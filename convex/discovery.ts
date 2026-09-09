"use node";

import Parallel from "parallel-web";
import { action, env } from "./_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";

const listing = v.object({
  id: v.string(),
  name: v.string(),
  brand: v.optional(v.string()),
  category: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  merchantUrl: v.string(),
  source: v.union(v.literal("parallel"), v.literal("serpapi"), v.literal("kitesurf")),
  providerListingId: v.optional(v.string()),
  observedPrice: v.optional(v.object({ amount: v.number(), currency: v.string(), evidenceUrl: v.string() })),
  discoveredAt: v.string(),
});

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

async function fetchKitesurf(query: string, accountId: string, token: string, signal: AbortSignal): Promise<Record<string, unknown>[]> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/browser-run/json?browser=kitesurf`, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      url: `https://www.google.com/search?q=${encodeURIComponent(`${query} buy online`)}`,
      prompt: `Extract current retail product listings matching ${query}. Return title, price, currency, image URL, and direct HTTPS product URL. Do not interact with carts, accounts, checkout, or payment forms.`,
      response_format: { type: "json_schema", json_schema: { type: "object", properties: { products: { type: "array" } }, required: ["products"] } },
    }),
  });
  if (!response.ok) throw new Error(`Kitesurf request failed (${response.status}).`);
  const data = await response.json() as { result?: { products?: unknown } };
  return Array.isArray(data.result?.products) ? data.result.products.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

export const search = action({
  args: { query: v.string(), location: v.optional(v.string()), radius: v.optional(v.number()) },
  returns: v.object({ listings: v.array(listing) }),
  handler: async (ctx, args) => {
    await requireFirebaseIdentity(ctx);
    const query = args.query.trim().replace(/\s+/g, " ");
    if (query.length < 2 || query.length > 240) throw new Error("A valid discovery query is required.");
    const scopedQuery = args.location?.trim() ? `${query} near ${args.location.trim()}` : query;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const discoveredAt = new Date().toISOString();
    try {
      const tasks: Promise<{ source: "parallel" | "serpapi" | "kitesurf"; items: Record<string, unknown>[] }>[] = [];
      if (env.SERPAPI_API_KEY) tasks.push(fetchSerpApi(scopedQuery, env.SERPAPI_API_KEY, controller.signal).then(items => ({ source: "serpapi", items })));
      if (env.PARALLEL_API_KEY) tasks.push(fetchParallel(scopedQuery, env.PARALLEL_API_KEY, controller.signal).then(items => ({ source: "parallel", items })));
      if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) tasks.push(fetchKitesurf(scopedQuery, env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_API_TOKEN, controller.signal).then(items => ({ source: "kitesurf", items })));
      if (tasks.length === 0) throw new Error("Discovery providers are not configured in the Convex deployment.");
      const settled = await Promise.allSettled(tasks);
      const seen = new Set<string>();
      const listings = settled.flatMap(result => result.status === "fulfilled"
        ? result.value.items.flatMap(item => {
          const normalized = normalize(result.value.source, item, discoveredAt);
          if (!normalized || seen.has(normalized.id)) return [];
          seen.add(normalized.id);
          return [normalized];
        })
        : []).slice(0, 50);
      if (listings.length === 0) throw new Error("Discovery providers returned no verified listings.");
      return { listings };
    } finally {
      clearTimeout(timeout);
    }
  },
});
