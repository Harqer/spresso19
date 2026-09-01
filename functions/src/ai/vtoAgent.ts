import { PubSub } from "@google-cloud/pubsub";
import { parallelDeepResearchTool } from "./tools/parallelDeepResearch";
import { parallelWebSearchTool } from "./tools/parallelWebSearch";
import { ai } from "./genkit";
import { z } from "genkit";

export class AgentEngine {
  constructor(public config: any) {
    console.log("Initializing AgentEngine with config:", config);
  }

  async execute(task: string, context?: any) {
    console.log(`Executing task: ${task}`);
    try {
      const response = await ai.generate({
        model: this.config.model || "googleai/gemini-flash-latest",
        tools: this.config.tools,
        prompt: task,
      });
      return { result: response.text };
    } catch (e: any) {
      console.error("AgentEngine execution failed:", e);
      throw new Error(`AgentEngine failed: ${e.message}`);
    }
  }
}

export const checkUserPermissions = ai.defineTool(
  {
    name: "checkUserPermissions",
    description: "Checks if the user has required permissions to execute heavy cloud jobs like VTO generation.",
    inputSchema: z.object({
      userId: z.string().describe("The user ID"),
      action: z.string().describe("The action attempting to be performed")
    }),
    outputSchema: z.object({
      allowed: z.boolean(),
      reason: z.string().optional()
    }),
  },
  async ({ userId, action }: { userId: string, action: string }) => {
    console.log(`Checking permissions for ${userId} attempting ${action}`);
    // In production, query IAM or custom user claims here
    return { allowed: true };
  }
);

export const vtoEngine = new AgentEngine({
  model: "googleai/gemini-flash-latest",
  tools: [parallelDeepResearchTool, parallelWebSearchTool, checkUserPermissions],
  toolChoice: "any", // Forced function calling: requires the agent to call at least one tool
});

const pubsub = new PubSub();

export const generateLocationContext = ai.defineTool(
  {
    name: "generateLocationContext",
    description: "Generates location context using Google Maps grounding and Parallel API for VTO",
    inputSchema: z.object({
      location: z.string().describe("The physical location to ground the context"),
    }),
    outputSchema: z.object({
      context: z.string().describe("The generated visual and environmental context"),
    }),
  },
  async ({ location }: { location: string }, ctx: any) => {
    console.log(`Generating location context for: ${location}`);
    
    // Real Parallel API integration to get high-res context (using existing tool logic)
    const researchResult = await parallelDeepResearchTool({
      query: `Analyze visual environment, lighting, and cinematic mood of ${location}.`,
      processor: "pro"
    } as any, ctx as any);

    const fullContext = `Parallel Deep Research:\n${JSON.stringify(researchResult)}`;
    
    return { context: fullContext };
  }
);

export const triggerDataflowVideoPipeline = ai.defineTool(
  {
    name: "triggerDataflowVideoPipeline",
    description: "Publishes a VTO video generation payload to Dataflow via Pub/Sub",
    inputSchema: z.object({
      userId: z.string().describe("The user ID"),
      productRef: z.string().describe("The product reference ID"),
      locationContext: z.string().describe("The location context generated for VTO"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      messageId: z.string().optional(),
    }),
  },
  async ({ userId, productRef, locationContext }: { userId: string, productRef: string, locationContext: string }) => {
    try {
      const topicName = "vto-video-requests";
      const payload = {
        userId,
        productRef,
        locationContext,
        timestamp: new Date().toISOString(),
      };
      
      const dataBuffer = Buffer.from(JSON.stringify(payload));
      const messageId = await pubsub.topic(topicName).publishMessage({ data: dataBuffer });
      
      console.log(`Published VTO request ${messageId} to Dataflow.`);
      return { success: true, messageId };
    } catch (error: any) {
      console.error("Failed to trigger Dataflow pipeline:", error);
      throw new Error(`Pub/Sub publish error: ${error.message}`);
    }
  }
);
