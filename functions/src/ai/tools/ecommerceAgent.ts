import { ai } from "../genkit";
import { z } from "genkit";
import { discoverPersonalizedProductsFlow } from "../flows/discoverPersonalizedProductsFlow";

export const ecommerceAgent = ai.defineTool(
  {
    name: "ecommerceAgent",
    description: "Delegate to the Ecommerce Subagent. Use this when the user needs highly personalized product discovery or bulk e-commerce processing.",
    inputSchema: z.object({
      searchQueries: z.array(z.string()).describe("The search queries to find products for"),
    }),
    outputSchema: z.object({
      items: z.array(z.any()),
    }),
  },
  async ({ searchQueries }, ctx) => {
    const uid = ctx.context?.auth?.uid;
    if (!uid) throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    // Internally delegates to the existing ecommerce flow which uses Model Garden
    const result = await discoverPersonalizedProductsFlow({ searchQueries, requesterUid: uid });
    return result;
  }
);
