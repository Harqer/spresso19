import { ai } from "../genkit";
import { z } from "genkit";

export const spin360Flow = ai.defineFlow(
  {
    name: "spin360Flow",
    inputSchema: z.object({
      productId: z.string(),
      name: z.string().optional(),
      brand: z.string().optional(),
      category: z.string().optional(),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async (input) => {
    const spin360Prompt = await ai.prompt("spin360");
    const { text } = await spin360Prompt(input);
    return { response: text };
  }
);
