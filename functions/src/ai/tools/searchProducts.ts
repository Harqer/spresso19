import { ai } from "../genkit";
import { z } from "genkit";
import { defineSecret } from "firebase-functions/params";

const serpapiKey = defineSecret("SERPAPI_API_KEY");

export const searchProductsTool = ai.defineTool(
  {
    name: "searchProducts",
    description: "Searches the Spresso store inventory and internet for products matching the user's query.",
    inputSchema: z.object({
      query: z.string().describe("The search query (e.g. 'espresso machine', 'dark roast beans')"),
      category: z.string().optional().describe("Optional category to filter by"),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        description: z.string(),
        imageUrl: z.string().optional(),
        source: z.string().optional(),
      })),
    }),
  },
  async ({ query, category }, ctx) => {
    // Application Safeguard
    const uid = ctx.context?.auth?.uid;
    if (!uid) {
      throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    
    console.log(`User ${uid} searching products for query: ${query}, category: ${category}`);
    
    try {
      const apiKey = serpapiKey.value();
      if (!apiKey) {
        throw new Error("Missing SERPAPI_API_KEY configuration.");
      }
      
      const searchQuery = category ? `${category} ${query}` : query;
      const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`SerpApi responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      const shoppingResults = data.shopping_results || [];
      
      return {
        results: shoppingResults.slice(0, 5).map((item: any, index: number) => {
          const priceRaw = item.price || "0";
          const priceValue = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
          return {
            id: item.product_id || `serp_${index}`,
            name: item.title || item.source,
            price: isNaN(priceValue) ? 0.0 : priceValue,
            description: item.snippet || item.title || "",
            imageUrl: item.thumbnail,
            source: item.source,
          };
        })
      };
    } catch (e: any) {
      console.error("Search error:", e);
      // Native model fallback to generic web search if needed, but here we return standard search errors.
      throw new Error(`Failed to search products: ${e.message}`);
    }
  }
);
