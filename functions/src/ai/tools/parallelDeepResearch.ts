import { ai } from "../genkit";
import { z } from "genkit";
import { defineSecret } from "firebase-functions/params";
import Parallel from "parallel-web";

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
    
    console.log(`User ${uid} executing parallel deep research: ${query}`);
    
    try {
      const apiKey = parallelApiKey.value();
      if (!apiKey) {
        throw new Error("Missing PARALLEL_API_KEY configuration. Add it via Firebase secrets.");
      }
      
      const client = new Parallel({ apiKey });
      
      // Create the research task
      const enhancedQuery = `${query}\n\nIMPORTANT: Explicitly include high-resolution visual and lighting references (critical for cinematic VTO integration).`;
      const taskRun = await client.taskRun.create({
        input: enhancedQuery,
        processor: (processor as any) || "ultra",
      });
      
      console.log(`Task created: ${taskRun.run_id}`);
      
      // Poll for results (25s per poll, up to 12 attempts to fit in cloud function timeout)
      let runResult;
      for (let i = 0; i < 12; i++) {
        try {
          // This will block up to 25 seconds waiting for result
          runResult = await client.taskRun.result(taskRun.run_id, { timeout: 25 });
          break;
        } catch (error: any) {
          if (i === 11) throw new Error(`Research task timed out after multiple attempts. ID: ${taskRun.run_id}. Error: ${error.message}`);
          // Wait briefly before retrying if not a timeout error from SDK
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      
      return { research: runResult };
    } catch (e: any) {
      console.error("Parallel deep research error:", e);
      throw new Error(`Failed to execute deep research using Parallel: ${e.message}`);
    }
  }
);
