import { ai } from "../genkit";
import { z } from "genkit";

// Import tools to ensure they are registered with the AI instance
import "../tools/addToCart";
import "../tools/searchProducts";
import "../tools/parallelWebSearch";
import "../tools/parallelDeepResearch";

export const spressoShopperFlow = ai.defineFlow(
  {
    name: "spressoShopperFlow",
    inputSchema: z.object({
      prompt: z.string(),
      history: z.array(z.object({
        role: z.enum(["user", "model", "system"]),
        content: z.string()
      })).optional(),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async ({ prompt, history }) => {
    // Load the prompt from the .prompt file
    const shopperPrompt = await ai.prompt("shopperPrompt");
    
    // Generate the response using the .prompt template
    const { text } = await shopperPrompt({ userPrompt: prompt });

    return { response: text };
  }
);
