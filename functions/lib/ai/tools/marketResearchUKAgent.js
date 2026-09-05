"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketResearchUKAgent = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const parallelDeepResearch_1 = require("./parallelDeepResearch");
exports.marketResearchUKAgent = genkit_1.ai.defineTool({
    name: "marketResearchUKAgent",
    description: "Delegate to the UK Market Research Subagent. Use this when the user needs to research market trends, pricing, or product availability specifically in the United Kingdom.",
    inputSchema: genkit_2.z.object({
        query: genkit_2.z.string().describe("The research query for the UK market"),
    }),
    outputSchema: genkit_2.z.object({
        report: genkit_2.z.string(),
    }),
}, async ({ query }) => {
    console.log("Delegating to UK Market Research Agent for query:", query);
    // Leverage the parallel deep research tool, scoped to UK
    const ukQuery = `UK Market Research: ${query}`;
    // Assuming parallelDeepResearch is a callable Genkit tool function
    const result = await (0, parallelDeepResearch_1.parallelDeepResearchTool)({ query: ukQuery });
    return { report: `UK Market Research Report:\n${JSON.stringify(result)}` };
});
//# sourceMappingURL=marketResearchUKAgent.js.map