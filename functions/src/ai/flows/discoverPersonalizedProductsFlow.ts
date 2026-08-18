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
    // In a real Genkit setup with Google Search Grounding enabled:
    const { text } = await ai.generate({
      model: "gemini-1.5-flash",
      prompt: `Perform a live web search for products using these queries: ${searchQueries.join(", ")}. 
      Extract the best matches into a JSON array of objects with fields: id (uuid), name, brand, category, price (number), and imageUrl.`,
      config: {
        responseMimeType: "application/json",
      },
      // Note: Grounding plugin would be attached here if configured
      // tools: [googleSearchRetrieval] 
    });

    try {
      const items = JSON.parse(text || "[]");
      return { items: Array.isArray(items) ? items : [] };
    } catch (e) {
      return { items: [] };
    }
  }
);
