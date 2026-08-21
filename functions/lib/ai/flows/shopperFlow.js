"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spressoShopperFlow = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
// Import tools to ensure they are registered with the AI instance
require("../tools/addToCart");
require("../tools/searchProducts");
require("../tools/parallelWebSearch");
require("../tools/parallelDeepResearch");
require("../tools/prepareCryptoPurchase");
exports.spressoShopperFlow = genkit_1.ai.defineFlow({
    name: "spressoShopperFlow",
    inputSchema: genkit_2.z.object({
        prompt: genkit_2.z.string(),
        history: genkit_2.z.array(genkit_2.z.object({
            role: genkit_2.z.enum(["user", "model", "system"]),
            content: genkit_2.z.string()
        })).optional(),
    }),
    outputSchema: genkit_2.z.object({
        response: genkit_2.z.string(),
    }),
}, async ({ prompt, history }) => {
    // Load the prompt from the .prompt file
    const shopperPrompt = await genkit_1.ai.prompt("shopperPrompt");
    // Generate the response using the .prompt template
    const { text } = await shopperPrompt({ userPrompt: prompt });
    return { response: text };
});
//# sourceMappingURL=shopperFlow.js.map