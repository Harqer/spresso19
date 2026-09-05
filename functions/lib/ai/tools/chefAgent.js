"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chefAgent = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
exports.chefAgent = genkit_1.ai.defineTool({
    name: "chefAgent",
    description: "Provide focused cooking help. Use this when the user asks for recipes or meal prep.",
    inputSchema: genkit_2.z.object({
        topic: genkit_2.z.string().describe("The topic or question for the Chef AI"),
    }),
    outputSchema: genkit_2.z.object({
        action: genkit_2.z.string(),
        topic: genkit_2.z.string(),
    }),
}, async ({ topic }) => {
    console.log("Delegating to Chef AI with topic:", topic);
    // Returns a structured signal that the frontend can intercept to launch the Chef AI modal
    return {
        action: "LAUNCH_CHEF_AI",
        topic,
    };
});
//# sourceMappingURL=chefAgent.js.map