"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spressoShopperFlow = void 0;
const genkit_1 = require("../genkit");
const zod_1 = require("zod");
// Import tools to ensure they are registered with the AI instance
require("../tools/addToCart");
require("../tools/searchProducts");
exports.spressoShopperFlow = genkit_1.ai.defineFlow({
    name: "spressoShopperFlow",
    inputSchema: zod_1.z.object({
        prompt: zod_1.z.string(),
        history: zod_1.z.array(zod_1.z.object({
            role: zod_1.z.enum(["user", "model", "system"]),
            content: zod_1.z.string()
        })).optional(),
    }),
    outputSchema: zod_1.z.object({
        response: zod_1.z.string(),
    }),
}, async ({ prompt, history }) => {
    // Load the prompt from the .prompt file
    const shopperPrompt = await genkit_1.ai.prompt("shopperPrompt");
    // Generate the response using the .prompt template
    const { text } = await shopperPrompt({ userPrompt: prompt });
    return { response: text };
});
//# sourceMappingURL=shopperFlow.js.map