import { ai } from "../genkit";
import { z } from "genkit";
import { defineSecret } from "firebase-functions/params";
import { consumeBudget, withCache } from "../costControls";
import { normalizeSerpApiResults } from "../providers/serpApiAdapter";

const serpapiKey = defineSecret("SERPAPI_API_KEY");

export const searchProductsTool = ai.defineTool(
  {
    name: "searchProducts",
    description: "Discovers products and compares listings from the Spresso catalog and the internet. Spresso does not own or represent merchant inventory.",
    inputSchema: z.object({
      query: z.string().describe("The search query (e.g. 'espresso machine', 'dark roast beans')"),
      category: z.string().optional().describe("Optional category to filter by"),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().nullable(),
        description: z.string(),
        imageUrl: z.string().optional(),
        source: z.enum(["serpapi"]),
        merchantUrl: z.string().url(),
      })),
    }),
  },
  async ({ query, category }, ctx) => {
    // Application Safeguard
    const uid = ctx.context?.auth?.uid;
    if (!uid) {
      throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    
    console.log("Product search requested", { uid, category });
    try {
      const searchQuery = category ? `${category} ${query}` : query;
      const { value } = await withCache("productSearch", { searchQuery }, async () => {
        await consumeBudget(uid, "search");
        const apiKey = serpapiKey.value();
        if (!apiKey) {
          throw new Error("DISCOVERY_INFRASTRUCTURE_UNAVAILABLE: SERPAPI_API_KEY is not configured for this environment.");
        }
        const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`SerpApi responded with status: ${response.status}`);
        const data = await response.json();
        const shoppingResults = Array.isArray(data.shopping_results) ? data.shopping_results : [];
        const listings = normalizeSerpApiResults(shoppingResults);
        return {
          results: listings.slice(0, 5).map(listing => ({
            id: listing.id,
            name: listing.name,
            price: listing.observedPrice?.amount ?? null,
            description: listing.category || listing.brand || listing.name,
            imageUrl: listing.imageUrl,
            source: "serpapi" as const,
            merchantUrl: listing.merchantUrl,
          })),
        };
      });
      return value;
    } catch (e: any) {
      console.error("Search error:", e);
      // Native model fallback to generic web search if needed, but here we return standard search errors.
      throw new Error(`Failed to search products: ${e.message}`);
    }
  }
);
