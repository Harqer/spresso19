import { ai } from "../genkit";
import { z } from "genkit";
import { DiscoveredListingSchema } from "../../contracts/discoveredListing";
import { addListingToCart } from "../../cart/addListingToCart";

export const addToCartTool = ai.defineTool(
  {
    name: "addToCart",
    description: "Adds a discovered merchant listing to the user's cart. This records shopping intent only; merchant price and availability are verified during checkout.",
    inputSchema: z.object({
      listing: z.object({
        id: z.string(),
        name: z.string(),
        brand: z.string().optional(),
        category: z.string().optional(),
        imageUrl: z.string().optional(),
        merchantUrl: z.string(),
        source: z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
        providerListingId: z.string().optional(),
        observedPrice: z.object({ amount: z.number(), currency: z.string(), evidenceUrl: z.string() }).optional(),
        videoUrl: z.string().optional(),
        rating: z.number().optional(),
        reviewCount: z.number().optional(),
        reviewSummary: z.string().optional(),
        discoveredAt: z.string(),
        expiresAt: z.string().optional(),
        confidence: z.number().optional(),
      }).describe("The complete discovered merchant listing to add"),
      quantity: z.number().int().positive().max(25).describe("The number of items to add"),
      idempotencyKey: z.string().uuid().describe("A unique request key for safe retries"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      totalItems: z.number(),
    }),
  },
  async ({ listing, quantity, idempotencyKey }, ctx) => {
    const uid = ctx.context?.auth?.uid;
    if (!uid) {
      throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    
    const result = await addListingToCart(uid, DiscoveredListingSchema.parse(listing), quantity, idempotencyKey);
    return {
      success: true,
      message: "Added to your cart.",
      totalItems: result.totalItems,
    };
  }
);
