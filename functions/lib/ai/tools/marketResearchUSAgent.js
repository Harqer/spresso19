"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketResearchUSAgent = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const parallelDeepResearch_1 = require("./parallelDeepResearch");
exports.marketResearchUSAgent = genkit_1.ai.defineTool({
    name: "marketResearchUSAgent",
    description: "Delegate to the US Market Research Subagent. Use this when the user needs to research market trends, pricing, or product availability specifically in the United States.",
    inputSchema: genkit_2.z.object({
        query: genkit_2.z.string().describe("The research query for the US market"),
    }),
    outputSchema: genkit_2.z.object({
        report: genkit_2.z.string(),
    }),
}, async ({ query }) => {
    console.log("Delegating to US Market Research Agent for query:", query);
    // Leverage the parallel deep research tool, scoped to US
    const usQuery = `US Market Research: ${query}`;
    const result = await (0, parallelDeepResearch_1.parallelDeepResearchTool)({ query: usQuery });
    return { report: `US Market Research Report:\n${JSON.stringify(result)}` };
});
//# sourceMappingURL=marketResearchUSAgent.js.map