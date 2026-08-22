"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDataflowVideoPipeline = exports.generateLocationContext = exports.vtoEngine = exports.checkUserPermissions = exports.AgentEngine = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
const parallelDeepResearch_1 = require("./tools/parallelDeepResearch");
const parallelWebSearch_1 = require("./tools/parallelWebSearch");
const genkit_1 = require("./genkit");
const genkit_2 = require("genkit");
// Replaced mock with real Genkit execution
class AgentEngine {
    constructor(config) {
        this.config = config;
        console.log("Initializing AgentEngine with config:", config);
    }
    async execute(task, context) {
        console.log(`Executing task: ${task}`);
        try {
            const response = await genkit_1.ai.generate({
                model: this.config.model || "googleai/gemini-1.5-flash",
                tools: this.config.tools,
                prompt: task,
            });
            return { result: response.text };
        }
        catch (e) {
            console.error("AgentEngine execution failed:", e);
            throw new Error(`AgentEngine failed: ${e.message}`);
        }
    }
}
exports.AgentEngine = AgentEngine;
exports.checkUserPermissions = genkit_1.ai.defineTool({
    name: "checkUserPermissions",
    description: "Checks if the user has required permissions to execute heavy cloud jobs like VTO generation.",
    inputSchema: genkit_2.z.object({
        userId: genkit_2.z.string().describe("The user ID"),
        action: genkit_2.z.string().describe("The action attempting to be performed")
    }),
    outputSchema: genkit_2.z.object({
        allowed: genkit_2.z.boolean(),
        reason: genkit_2.z.string().optional()
    }),
}, async ({ userId, action }) => {
    console.log(`Checking permissions for ${userId} attempting ${action}`);
    // In production, query IAM or custom user claims here
    return { allowed: true };
});
exports.vtoEngine = new AgentEngine({
    model: "vertex-ai-gemini-1.5-pro",
    tools: [parallelDeepResearch_1.parallelDeepResearchTool, parallelWebSearch_1.parallelWebSearchTool, exports.checkUserPermissions],
    toolChoice: "any", // Forced function calling: requires the agent to call at least one tool
});
const pubsub = new pubsub_1.PubSub();
exports.generateLocationContext = genkit_1.ai.defineTool({
    name: "generateLocationContext",
    description: "Generates location context using Google Maps grounding and Parallel API for VTO",
    inputSchema: genkit_2.z.object({
        location: genkit_2.z.string().describe("The physical location to ground the context"),
    }),
    outputSchema: genkit_2.z.object({
        context: genkit_2.z.string().describe("The generated visual and environmental context"),
    }),
}, async ({ location }, ctx) => {
    console.log(`Generating location context for: ${location}`);
    // Real Parallel API integration to get high-res context (using existing tool logic)
    const researchResult = await (0, parallelDeepResearch_1.parallelDeepResearchTool)({
        query: `Analyze visual environment, lighting, and cinematic mood of ${location}.`,
        processor: "pro"
    }, ctx);
    const fullContext = `Parallel Deep Research:\n${JSON.stringify(researchResult)}`;
    return { context: fullContext };
});
exports.triggerDataflowVideoPipeline = genkit_1.ai.defineTool({
    name: "triggerDataflowVideoPipeline",
    description: "Publishes a VTO video generation payload to Dataflow via Pub/Sub",
    inputSchema: genkit_2.z.object({
        userId: genkit_2.z.string().describe("The user ID"),
        productRef: genkit_2.z.string().describe("The product reference ID"),
        locationContext: genkit_2.z.string().describe("The location context generated for VTO"),
    }),
    outputSchema: genkit_2.z.object({
        success: genkit_2.z.boolean(),
        messageId: genkit_2.z.string().optional(),
    }),
}, async ({ userId, productRef, locationContext }) => {
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
    }
    catch (error) {
        console.error("Failed to trigger Dataflow pipeline:", error);
        throw new Error(`Pub/Sub publish error: ${error.message}`);
    }
});
//# sourceMappingURL=vtoAgent.js.map