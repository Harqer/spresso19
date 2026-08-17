"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spin360Flow = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
exports.spin360Flow = genkit_1.ai.defineFlow({
    name: "spin360Flow",
    inputSchema: genkit_2.z.object({
        productId: genkit_2.z.string(),
        name: genkit_2.z.string().optional(),
        brand: genkit_2.z.string().optional(),
        category: genkit_2.z.string().optional(),
    }),
    outputSchema: genkit_2.z.object({
        response: genkit_2.z.string(),
    }),
}, async (input) => {
    const spin360Prompt = await genkit_1.ai.prompt("spin360");
    const { text } = await spin360Prompt(input);
    return { response: text };
});
//# sourceMappingURL=spin360Flow.js.map