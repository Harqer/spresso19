"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parallelWebSearchTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const params_1 = require("firebase-functions/params");
const parallel_web_1 = __importDefault(require("parallel-web"));
const parallelApiKey = (0, params_1.defineSecret)("PARALLEL_API_KEY");
exports.parallelWebSearchTool = genkit_1.ai.defineTool({
    name: "parallelWebSearch",
    description: "Perform an AI-powered web search using Parallel API. Returns concise, highly relevant information.",
    inputSchema: genkit_2.z.object({
        query: genkit_2.z.string().describe("The search query or objective"),
        mode: genkit_2.z.enum(["turbo", "fast", "basic", "advanced"]).optional().describe("Search mode. basic is default."),
    }),
    outputSchema: genkit_2.z.object({
        results: genkit_2.z.any().describe("JSON result from Parallel Search API"),
    }),
}, async ({ query, mode }, ctx) => {
    var _a, _b;
    // Application Safeguard
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    console.log(`User ${uid} executing parallel web search: ${query}`);
    try {
        const apiKey = parallelApiKey.value();
        if (!apiKey) {
            throw new Error("Missing PARALLEL_API_KEY configuration. Add it via Firebase secrets.");
        }
        const client = new parallel_web_1.default({ apiKey });
        const searchResponse = await client.search({
            objective: query,
            search_queries: [query],
            mode: mode || "basic",
        });
        return { results: searchResponse };
    }
    catch (e) {
        console.error("Parallel search error:", e);
        throw new Error(`Failed to search using Parallel: ${e.message}`);
    }
});
//# sourceMappingURL=parallelWebSearch.js.map