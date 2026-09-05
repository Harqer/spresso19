import { ai } from "../genkit";
import { z } from "genkit";
import { defineSecret } from "firebase-functions/params";
import Parallel from "parallel-web";
import { consumeBudget, withCache } from "../costControls";

const parallelApiKey = defineSecret("PARALLEL_API_KEY");

export const parallelDeepResearchTool = ai.defineTool(
  {
    name: "parallelDeepResearch",
    description: "Perform an AI-powered deep research task using Parallel API. Returns highly detailed structured research.",
    inputSchema: z.object({
      query: z.string().describe("The research topic or objective"),
      processor: z.enum(["ultra", "pro", "core", "ultra-fast", "pro-fast"]).optional().describe("Processor type to use. Defaults to ultra."),
    }),
    outputSchema: z.object({
      research: z.any().describe("JSON result containing detailed research and citations"),
    }),
  },
  async ({ query, processor }, ctx) => {
    // Application Safeguard
    const uid = ctx.context?.auth?.uid;
    if (!uid) {
      throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    
    try {
      const apiKey = parallelApiKey.value();
      if (!apiKey) {
        throw new Error("Missing PARALLEL_API_KEY configuration. Add it via Firebase secrets.");
      }
      
      const { value } = await withCache("productResearch", { query, processor: processor || "ultra" }, async () => {
        await consumeBudget(uid, "research");
        const client = new Parallel({ apiKey });
        const taskRun = await client.taskRun.create({
          input: query,
          processor: (processor as any) || "ultra",
        });
        let runResult;
        for (let i = 0; i < 12; i++) {
          try {
            runResult = await client.taskRun.result(taskRun.run_id, { timeout: 25 });
            break;
          } catch (error: any) {
            if (i === 11) throw new Error(`Research task timed out after multiple attempts. Error: ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, Math.min(8_000, 1_000 * 2 ** i)));
          }
        }
        return { research: runResult };
      });
      return value;
    } catch (e: any) {
      console.error("Parallel deep research error:", e);
      throw new Error(`Failed to execute deep research using Parallel: ${e.message}`);
    }
  }
);
