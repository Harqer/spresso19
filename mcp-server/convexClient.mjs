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
      const response = await fetch(config.data.SPRESSO_MCP_DISCOVERY_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.data.SPRESSO_MCP_DISCOVERY_TOKEN}`,
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error("Product discovery is temporarily unavailable.");
      }
      return SearchResponseSchema.parse(await response.json());
    },
  };
}
