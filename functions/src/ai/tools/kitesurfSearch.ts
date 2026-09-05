import { ai } from "../genkit";
import { z } from "genkit";
import { searchKitesurfRetailerProducts } from "../../kitesurfService";
import { consumeBudget, withCache } from "../costControls";
import { DiscoveredListingSchema } from "../../contracts/discoveredListing";

export const kitesurfSearchTool = ai.defineTool(
  {
    name: "kitesurfSearch",
    description: "Inspect public product listings on configured allowlisted merchant domains. Kitesurf never submits orders, payment credentials, account changes, or security actions.",
    inputSchema: z.object({
      query: z.string().min(2).max(240),
      retailerHint: z.string().max(120).optional(),
    }),
    // DiscoveredListingSchema is the canonical Zod 4 runtime contract;
    // Genkit's schema generic is Zod 3-shaped, so bridge only the type here.
    outputSchema: z.object({ products: z.array(DiscoveredListingSchema as any) }),
  },
  async ({ query, retailerHint }, ctx) => {
    const uid = ctx.context?.auth?.uid;
    if (!uid) throw new Error("Application safeguard triggered: Unauthenticated Kitesurf search blocked.");
    const { value } = await withCache("productSearch", { provider: "kitesurf", query, retailerHint }, async () => {
      await consumeBudget(uid, "search");
      return { products: await searchKitesurfRetailerProducts(query, retailerHint) };
    });
    return value;
  },
);
