import { ai } from "../genkit";
import { z } from "genkit";
import { defineSecret } from "firebase-functions/params";
import Parallel from "parallel-web";

const parallelApiKey = defineSecret("PARALLEL_API_KEY");

export const parallelWebSearchTool = ai.defineTool(
  {
    name: "parallelWebSearch",
    description: "Perform an AI-powered web search using Parallel API. Returns concise, highly relevant information.",
    inputSchema: z.object({
      query: z.string().describe("The search query or objective"),
      mode: z.enum(["turbo", "fast", "basic", "advanced"]).optional().describe("Search mode. basic is default."),
    }),
    outputSchema: z.object({
      results: z.any().describe("JSON result from Parallel Search API"),
    }),
  },
  async ({ query, mode }, ctx) => {
    // Application Safeguard
    const uid = ctx.context?.auth?.uid;
    if (!uid) {
      throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    
    console.log(`User ${uid} executing parallel web search: ${query}`);
    
    try {
      const apiKey = parallelApiKey.value();
      if (!apiKey) {
        throw new Error("Missing PARALLEL_API_KEY configuration. Add it via Firebase secrets.");
      }
      
      const client = new Parallel({ apiKey });
      
      const searchResponse = await client.search({
        objective: query,
        search_queries: [query],
        mode: (mode as "turbo" | "fast" | "basic" | "advanced") || "basic",
      });
      
      return { results: searchResponse };
    } catch (e: any) {
      console.error("Parallel search error:", e);
      throw new Error(`Failed to search using Parallel: ${e.message}`);
    }
  }
);
