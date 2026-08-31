import { ai } from "../genkit";
import { z } from "genkit";
import { defineSecret } from "firebase-functions/params";
import { consumeBudget, withCache } from "../costControls";
import { DiscoveredListingSchema } from "../../contracts/discoveredListing";
import { assertModelListingProvenance } from "../providers/discoveryTypes";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const discoverPersonalizedProductsFlow = ai.defineFlow(
  {
    name: "discoverPersonalizedProductsFlow",
    inputSchema: z.object({
      searchQueries: z.array(z.string()),
      requesterUid: z.string().optional(),
      providerListings: z.array(DiscoveredListingSchema).optional(),
    }),
    outputSchema: z.object({
      listings: z.array(DiscoveredListingSchema),
      items: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          brand: z.string().optional(),
          category: z.string().optional(),
          price: z.number().nullable(),
          currency: z.string().optional(),
          imageUrl: z.string().url().optional(),
          merchantUrl: z.string().url(),
          source: z.string(),
          priceEvidence: z.string().optional(),
        })
      ),
    }),
  },
  async ({ searchQueries, requesterUid, providerListings }) => {
    try {
      const { value } = await withCache("productResearch", { searchQueries }, async () => {
        if (requesterUid) await consumeBudget(requesterUid, "search");
        const validatedListings = providerListings || [];
        if (validatedListings.length === 0) return { listings: [], items: [] };
        const { GoogleGenAI } = await import("@google/genai");
        const client = new GoogleGenAI({ apiKey: geminiApiKey.value() });
        const response = await client.interactions.create({
            model: "gemini-3.1-flash-lite-preview",
            input: `Rank these validated merchant listings for the queries ${searchQueries.join(", ")}. Return a JSON array containing only the supplied listing fields id, merchantUrl, source, price, priceEvidence, and imageUrl. Do not add, omit, or change URLs, source, prices, price evidence, images, or IDs. Validated listings: ${JSON.stringify(validatedListings)}`,
            response_mime_type: "application/json",
        });
        let modelOutput: unknown;
        try {
          modelOutput = JSON.parse(response.output_text || "[]");
        } catch {
          throw new Error("Personalized discovery returned an invalid product payload.");
        }
        const rankedListings = assertModelListingProvenance(modelOutput, validatedListings);
        return {
          listings: rankedListings,
          items: rankedListings.map(listing => ({
            id: listing.id,
            name: listing.name,
            brand: listing.brand,
            category: listing.category,
            price: listing.observedPrice?.amount ?? null,
            currency: listing.observedPrice?.currency,
            imageUrl: listing.imageUrl,
            merchantUrl: listing.merchantUrl,
            source: listing.source,
            priceEvidence: listing.observedPrice?.evidenceUrl,
          })),
        };
      });
      return value;
    } catch (e) {
      console.error("Parallel Web Search Product Discovery failed:", e);
      throw e;
    }
  }
);
