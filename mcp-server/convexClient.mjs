import { z } from "zod";

const ConfigSchema = z.object({
  SPRESSO_MCP_DISCOVERY_ENDPOINT: z.string().url().refine((value) => value.startsWith("https://"), "Discovery endpoint must use HTTPS"),
  SPRESSO_MCP_DISCOVERY_TOKEN: z.string().min(1),
}).strict();

const ListingSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(240),
  merchantUrl: z.string().url().refine((value) => value.startsWith("https://")),
  source: z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
  imageUrl: z.string().url().optional(),
  observedPrice: z.object({ amount: z.number().positive(), currency: z.string().regex(/^[A-Z]{3}$/) }).optional(),
}).strict();

const SearchResponseSchema = z.object({ listings: z.array(ListingSchema).max(50) }).strict();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5_000;
const cache = new Map();
const inFlight = new Map();

export function createCatalogClient(env = process.env) {
  const config = ConfigSchema.safeParse({
    SPRESSO_MCP_DISCOVERY_ENDPOINT: env.SPRESSO_MCP_DISCOVERY_ENDPOINT,
    SPRESSO_MCP_DISCOVERY_TOKEN: env.SPRESSO_MCP_DISCOVERY_TOKEN,
  });
  if (!config.success) {
    return {
      configured: false,
      async searchProducts() {
        throw new Error("Product discovery is not available through this ChatGPT connection yet.");
      },
    };
  }

  return {
    configured: true,
    async searchProducts(query) {
      const key = query.trim().replace(/\s+/g, " ").toLowerCase();
      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) return cached.value;
      const existing = inFlight.get(key);
      if (existing) return existing;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const request = (async () => {
        try {
          const response = await fetch(config.data.SPRESSO_MCP_DISCOVERY_ENDPOINT, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${config.data.SPRESSO_MCP_DISCOVERY_TOKEN}`,
            },
            body: JSON.stringify({ query: key }),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Product discovery is temporarily unavailable.");
          const value = SearchResponseSchema.parse(await response.json());
          if (cache.size >= MAX_CACHE_ENTRIES) {
            const oldest = cache.keys().next().value;
            if (oldest) cache.delete(oldest);
          }
          cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
          return value;
        } finally {
          clearTimeout(timeout);
        }
      })();
      inFlight.set(key, request);
      try {
        return await request;
      } finally {
        if (inFlight.get(key) === request) inFlight.delete(key);
      }
    },
  };
}
