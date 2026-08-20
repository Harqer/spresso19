"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.behavioralAnalysisFlow = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
exports.behavioralAnalysisFlow = genkit_1.ai.defineFlow({
    name: "behavioralAnalysisFlow",
    inputSchema: genkit_2.z.object({
        explicitInterests: genkit_2.z.array(genkit_2.z.string()),
        chatHistory: genkit_2.z.array(genkit_2.z.string()).optional(),
    }),
    outputSchema: genkit_2.z.object({
        inferredPainPoints: genkit_2.z.array(genkit_2.z.string()),
        behavioralProfileSummary: genkit_2.z.string(),
    }),
}, async ({ explicitInterests, chatHistory }) => {
    // We will use gemini to analyze the interests and chat history
    const { text } = await genkit_1.ai.generate({
        model: "gemini-1.5-flash",
        prompt: `Analyze the following user data to generate a behavioral profile.
      Explicit Interests: ${explicitInterests.join(", ")}
      Chat History: ${(chatHistory === null || chatHistory === void 0 ? void 0 : chatHistory.join(" | ")) || "None"}
      
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
    }
    catch (e) {
        return {
            inferredPainPoints: [],
            behavioralProfileSummary: "Failed to parse behavioral profile.",
        };
    }
});
//# sourceMappingURL=behavioralAnalysisFlow.js.map