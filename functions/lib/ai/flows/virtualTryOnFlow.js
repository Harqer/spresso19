"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.virtualTryOnFlow = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
exports.virtualTryOnFlow = genkit_1.ai.defineFlow({
    name: "virtualTryOnFlow",
    inputSchema: genkit_2.z.object({
        base64Image: genkit_2.z.string(),
    }),
    outputSchema: genkit_2.z.object({
        response: genkit_2.z.string(),
    }),
}, async ({ base64Image }) => {
    const virtualTryOnPrompt = await genkit_1.ai.prompt("virtualTryOn");
    const dataUri = base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    const { text } = await virtualTryOnPrompt({ base64Image: dataUri });
    return { response: text };
});
//# sourceMappingURL=virtualTryOnFlow.js.map