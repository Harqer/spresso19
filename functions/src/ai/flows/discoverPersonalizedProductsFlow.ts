import { ai } from "../genkit";
import { z } from "genkit";

export const discoverPersonalizedProductsFlow = ai.defineFlow(
  {
    name: "discoverPersonalizedProductsFlow",
    inputSchema: z.object({
      searchQueries: z.array(z.string()),
    }),
    outputSchema: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          brand: z.string(),
          category: z.string(),
          price: z.number().nullable(),
          imageUrl: z.string(),
        })
      ),
    }),
  },
  async ({ searchQueries }) => {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await client.interactions.create({
          model: "gemini-3.5-flash",
          input: `Perform a live web search for products using these queries: ${searchQueries.join(", ")}. 
          Extract the best matches into a JSON array of objects with fields: id (uuid), name, brand, category, price (number), and imageUrl.`,
          response_mime_type: "application/json",
          tools: [{ parallelAiSearch: {} }] as any
      });
      
      const text = response.output_text;
      const items = JSON.parse(text || "[]");
      return { items: Array.isArray(items) ? items : [] };
    } catch (e) {
      console.error("Parallel Web Search Product Discovery failed:", e);
      return { items: [] };
    }
  }
);
