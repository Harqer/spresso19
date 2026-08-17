import { ai } from "../genkit";
import { z } from "zod";

export const virtualTryOnFlow = ai.defineFlow(
  {
    name: "virtualTryOnFlow",
    inputSchema: z.object({
      base64Image: z.string(),
    }),
    outputSchema: z.object({
      response: z.string(),
    }),
  },
  async ({ base64Image }) => {
    const virtualTryOnPrompt = await ai.prompt("virtualTryOn");
    const dataUri = base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    const { text } = await virtualTryOnPrompt({ base64Image: dataUri });
    return { response: text };
  }
);
