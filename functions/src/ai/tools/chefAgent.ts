import { ai } from "../genkit";
import { z } from "genkit";

export const chefAgent = ai.defineTool(
  {
    name: "chefAgent",
    description: "Provide focused cooking help. Use this when the user asks for recipes or meal prep.",
    inputSchema: z.object({
      topic: z.string().describe("The topic or question for the Chef AI"),
    }),
    outputSchema: z.object({
      action: z.string(),
      topic: z.string(),
    }),
  },
  async ({ topic }) => {
    console.log("Delegating to Chef AI with topic:", topic);
    // Returns a structured signal that the frontend can intercept to launch the Chef AI modal
    return {
      action: "LAUNCH_CHEF_AI",
      topic,
    };
  }
);
