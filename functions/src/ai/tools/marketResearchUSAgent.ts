import { ai } from "../genkit";
import { z } from "genkit";
import { parallelDeepResearchTool } from "./parallelDeepResearch";

export const marketResearchUSAgent = ai.defineTool(
  {
    name: "marketResearchUSAgent",
    description: "Delegate to the US Market Research Subagent. Use this when the user needs to research market trends, pricing, or product availability specifically in the United States.",
    inputSchema: z.object({
      query: z.string().describe("The research query for the US market"),
    }),
    outputSchema: z.object({
      report: z.string(),
    }),
  },
  async ({ query }) => {
    console.log("Delegating to US Market Research Agent for query:", query);
    // Leverage the parallel deep research tool, scoped to US
    const usQuery = `US Market Research: ${query}`;
    const result = await parallelDeepResearchTool({ query: usQuery });
    return { report: `US Market Research Report:\n${JSON.stringify(result)}` };
  }
);
