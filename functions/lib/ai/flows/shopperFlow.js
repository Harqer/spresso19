"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spressoShopperFlow = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const modelRouting_1 = require("../modelRouting");
// Import tools to ensure they are registered with the AI instance
require("../tools/addToCart");
require("../tools/searchProducts");
require("../tools/parallelWebSearch");
require("../tools/parallelDeepResearch");
require("../tools/chefAgent");
require("../tools/ecommerceAgent");
require("../tools/virtualTryOnAgent");
require("../tools/mediaGeneration");
require("../tools/marketResearchUKAgent");
require("../tools/marketResearchUSAgent");
exports.spressoShopperFlow = genkit_1.ai.defineFlow({
    name: "spressoShopperFlow",
    inputSchema: genkit_2.z.object({
        prompt: genkit_2.z.string(),
        locale: genkit_2.z.string().default("en-US"),
        locationContext: genkit_2.z.string().max(160).optional(),
        history: genkit_2.z.array(genkit_2.z.object({
            role: genkit_2.z.enum(["user", "model", "system"]),
            content: genkit_2.z.string()
        })).optional(),
    }),
    outputSchema: genkit_2.z.object({
        response: genkit_2.z.string(),
    }),
}, async ({ prompt, locale, locationContext }) => {
    // Load the prompt from the .prompt file
    const shopperPrompt = await genkit_1.ai.prompt("shopperPrompt");
    // Generate the response using the .prompt template
    const { text } = await shopperPrompt({ userPrompt: prompt, locale, locationContext: locationContext || "" }, {
        model: (0, modelRouting_1.selectShopperModel)(prompt),
    });
    return { response: text };
});
//# sourceMappingURL=shopperFlow.js.map