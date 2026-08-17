"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.virtualTryOnFlow = void 0;
const genkit_1 = require("../genkit");
const zod_1 = require("zod");
exports.virtualTryOnFlow = genkit_1.ai.defineFlow({
    name: "virtualTryOnFlow",
    inputSchema: zod_1.z.object({
        base64Image: zod_1.z.string(),
    }),
    outputSchema: zod_1.z.object({
        response: zod_1.z.string(),
    }),
}, async ({ base64Image }) => {
    const virtualTryOnPrompt = await genkit_1.ai.prompt("virtualTryOn");
    const dataUri = base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    const { text } = await virtualTryOnPrompt({ base64Image: dataUri });
    return { response: text };
});
//# sourceMappingURL=virtualTryOnFlow.js.map