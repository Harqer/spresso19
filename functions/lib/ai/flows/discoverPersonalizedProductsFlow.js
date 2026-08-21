"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPersonalizedProductsFlow = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
exports.discoverPersonalizedProductsFlow = genkit_1.ai.defineFlow({
    name: "discoverPersonalizedProductsFlow",
    inputSchema: genkit_2.z.object({
        searchQueries: genkit_2.z.array(genkit_2.z.string()),
    }),
    outputSchema: genkit_2.z.object({
        items: genkit_2.z.array(genkit_2.z.object({
            id: genkit_2.z.string(),
            name: genkit_2.z.string(),
            brand: genkit_2.z.string(),
            category: genkit_2.z.string(),
            price: genkit_2.z.number().nullable(),
            imageUrl: genkit_2.z.string(),
        })),
    }),
}, async ({ searchQueries }) => {
    try {
        const { GoogleGenAI } = await Promise.resolve().then(() => __importStar(require("@google/genai")));
        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await client.interactions.create({
            model: "gemini-3.5-flash",
            input: `Perform a live web search for products using these queries: ${searchQueries.join(", ")}. 
          Extract the best matches into a JSON array of objects with fields: id (uuid), name, brand, category, price (number), and imageUrl.`,
            response_mime_type: "application/json",
            tools: [{ parallelAiSearch: {} }]
        });
        const text = response.output_text;
        const items = JSON.parse(text || "[]");
        return { items: Array.isArray(items) ? items : [] };
    }
    catch (e) {
        console.error("Parallel Web Search Product Discovery failed:", e);
        return { items: [] };
    }
});
//# sourceMappingURL=discoverPersonalizedProductsFlow.js.map