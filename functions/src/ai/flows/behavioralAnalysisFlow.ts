import { ai } from "../genkit";
import { z } from "genkit";

export const behavioralAnalysisFlow = ai.defineFlow(
  {
    name: "behavioralAnalysisFlow",
    inputSchema: z.object({
      explicitInterests: z.array(z.string()),
      chatHistory: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      inferredPainPoints: z.array(z.string()),
      behavioralProfileSummary: z.string(),
    }),
  },
  async ({ explicitInterests, chatHistory }) => {
    // We will use gemini to analyze the interests and chat history
    const { text } = await ai.generate({
      model: "googleai/gemini-flash-latest",
      prompt: `Analyze the following user data to generate a behavioral profile.
      Explicit Interests: ${explicitInterests.join(", ")}
      Chat History: ${chatHistory?.join(" | ") || "None"}
      
      Output a JSON object with two fields:
      1. inferredPainPoints: Array of strings representing underlying pain points.
      2. behavioralProfileSummary: A short string summarizing their shopping behavior.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    try {
      const result = JSON.parse(text || "{}");
      return {
        inferredPainPoints: result.inferredPainPoints || [],
        behavioralProfileSummary: result.behavioralProfileSummary || "User shopping behavior is still being analyzed.",
      };
    } catch (e) {
      return {
        inferredPainPoints: [],
        behavioralProfileSummary: "Failed to parse behavioral profile.",
      };
    }
  }
);
