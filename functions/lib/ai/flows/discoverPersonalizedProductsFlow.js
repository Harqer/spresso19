"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPersonalizedProductsFlow = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
exports.discoverPersonalizedProductsFlow = genkit_1.ai.defineFlow({
    name: "discoverPersonalizedProductsFlow",
    inputSchema: genkit_2.z.object({
        searchQueries: genkit_2.z.array(genkit_2.z.string()),
    }),
    outputSchema: genkit_2.z.object({
        items: genkit_2.z.array(genkit_2.z.object({
            id: genkit_2.z.string(),
            name: genkit_2.z.string(),
            brand: genkit_2.z.string(),
            category: genkit_2.z.string(),
            price: genkit_2.z.number().nullable(),
            imageUrl: genkit_2.z.string(),
        })),
    }),
}, async ({ searchQueries }) => {
    // In a real Genkit setup with Google Search Grounding enabled:
    const { text } = await genkit_1.ai.generate({
        model: "gemini-1.5-flash",
        prompt: `Perform a live web search for products using these queries: ${searchQueries.join(", ")}. 
      Extract the best matches into a JSON array of objects with fields: id (uuid), name, brand, category, price (number), and imageUrl.`,
        config: {
            responseMimeType: "application/json",
        },
        // Note: Grounding plugin would be attached here if configured
        // tools: [googleSearchRetrieval] 
    });
    try {
        const items = JSON.parse(text || "[]");
        return { items: Array.isArray(items) ? items : [] };
    }
    catch (e) {
        return { items: [] };
    }
});
//# sourceMappingURL=discoverPersonalizedProductsFlow.js.map