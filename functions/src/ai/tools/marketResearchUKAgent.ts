import { ai } from "../genkit";
import { z } from "genkit";
import { parallelDeepResearchTool } from "./parallelDeepResearch";

export const marketResearchUKAgent = ai.defineTool(
  {
    name: "marketResearchUKAgent",
    description: "Delegate to the UK Market Research Subagent. Use this when the user needs to research market trends, pricing, or product availability specifically in the United Kingdom.",
    inputSchema: z.object({
      query: z.string().describe("The research query for the UK market"),
    }),
    outputSchema: z.object({
      report: z.string(),
    }),
  },
  async ({ query }) => {
    console.log("Delegating to UK Market Research Agent for query:", query);
    // Leverage the parallel deep research tool, scoped to UK
    const ukQuery = `UK Market Research: ${query}`;
    // Assuming parallelDeepResearch is a callable Genkit tool function
    const result = await parallelDeepResearchTool({ query: ukQuery });
    return { report: `UK Market Research Report:\n${JSON.stringify(result)}` };
  }
);
