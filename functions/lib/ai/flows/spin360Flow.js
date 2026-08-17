"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spin360Flow = void 0;
const genkit_1 = require("../genkit");
const zod_1 = require("zod");
exports.spin360Flow = genkit_1.ai.defineFlow({
    name: "spin360Flow",
    inputSchema: zod_1.z.object({
        productId: zod_1.z.string(),
        name: zod_1.z.string().optional(),
        brand: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
    }),
    outputSchema: zod_1.z.object({
        response: zod_1.z.string(),
    }),
}, async (input) => {
    const spin360Prompt = await genkit_1.ai.prompt("spin360");
    const { text } = await spin360Prompt(input);
    return { response: text };
});
//# sourceMappingURL=spin360Flow.js.map