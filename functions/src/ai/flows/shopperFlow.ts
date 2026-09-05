import { ai } from "../genkit";
import { z } from "genkit";
import { selectShopperModel } from "../modelRouting";

// Import tools to ensure they are registered with the AI instance
import "../tools/addToCart";
import "../tools/searchProducts";
import "../tools/parallelWebSearch";
import "../tools/parallelDeepResearch";
import "../tools/chefAgent";
import "../tools/ecommerceAgent";
import "../tools/virtualTryOnAgent";
import "../tools/mediaGeneration";
import "../tools/marketResearchUKAgent";
import "../tools/marketResearchUSAgent";

export const spressoShopperFlow = ai.defineFlow(
  {
    name: "spressoShopperFlow",
    inputSchema: z.object({
      prompt: z.string(),
      locale: z.string().default("en-US"),
      locationContext: z.string().max(160).optional(),
      history: z.array(z.object({
        role: z.enum(["user", "model", "system"]),
        content: z.string()
      })).optional(),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async ({ prompt, locale, locationContext }) => {
    // Load the prompt from the .prompt file
    const shopperPrompt = await ai.prompt("shopperPrompt");
    
    // Generate the response using the .prompt template
    const { text } = await shopperPrompt({ userPrompt: prompt, locale, locationContext: locationContext || "" }, {
      model: selectShopperModel(prompt),
    });

    return { response: text };
  }
);
