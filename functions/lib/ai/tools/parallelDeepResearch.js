"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parallelDeepResearchTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const params_1 = require("firebase-functions/params");
const parallel_web_1 = __importDefault(require("parallel-web"));
const costControls_1 = require("../costControls");
const parallelApiKey = (0, params_1.defineSecret)("PARALLEL_API_KEY");
exports.parallelDeepResearchTool = genkit_1.ai.defineTool({
    name: "parallelDeepResearch",
    description: "Perform an AI-powered deep research task using Parallel API. Returns highly detailed structured research.",
    inputSchema: genkit_2.z.object({
        query: genkit_2.z.string().describe("The research topic or objective"),
        processor: genkit_2.z.enum(["ultra", "pro", "core", "ultra-fast", "pro-fast"]).optional().describe("Processor type to use. Defaults to ultra."),
    }),
    outputSchema: genkit_2.z.object({
        research: genkit_2.z.any().describe("JSON result containing detailed research and citations"),
    }),
}, async ({ query, processor }, ctx) => {
    var _a, _b;
    // Application Safeguard
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    try {
        const apiKey = parallelApiKey.value();
        if (!apiKey) {
            throw new Error("Missing PARALLEL_API_KEY configuration. Add it via Firebase secrets.");
        }
        const { value } = await (0, costControls_1.withCache)("productResearch", { query, processor: processor || "ultra" }, async () => {
            await (0, costControls_1.consumeBudget)(uid, "research");
            const client = new parallel_web_1.default({ apiKey });
            const taskRun = await client.taskRun.create({
                input: query,
                processor: processor || "ultra",
            });
            let runResult;
            for (let i = 0; i < 12; i++) {
                try {
                    runResult = await client.taskRun.result(taskRun.run_id, { timeout: 25 });
                    break;
                }
                catch (error) {
                    if (i === 11)
                        throw new Error(`Research task timed out after multiple attempts. Error: ${error.message}`);
                    await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 1000 * 2 ** i)));
                }
            }
            return { research: runResult };
        });
        return value;
    }
    catch (e) {
        console.error("Parallel deep research error:", e);
        throw new Error(`Failed to execute deep research using Parallel: ${e.message}`);
    }
});
//# sourceMappingURL=parallelDeepResearch.js.map