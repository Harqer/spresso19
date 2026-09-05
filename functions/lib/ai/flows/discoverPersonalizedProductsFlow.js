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
const params_1 = require("firebase-functions/params");
const costControls_1 = require("../costControls");
const discoveredListing_1 = require("../../contracts/discoveredListing");
const discoveryTypes_1 = require("../providers/discoveryTypes");
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
exports.discoverPersonalizedProductsFlow = genkit_1.ai.defineFlow({
    name: "discoverPersonalizedProductsFlow",
    inputSchema: genkit_2.z.object({
        searchQueries: genkit_2.z.array(genkit_2.z.string()),
        requesterUid: genkit_2.z.string().optional(),
        // The runtime contract is validated with Zod 4 in the provider boundary.
        // Genkit currently exposes a Zod 3-compatible type, so keep the schema
        // as the single runtime validator while bridging the declaration type.
        providerListings: genkit_2.z.array(discoveredListing_1.DiscoveredListingSchema).optional(),
    }),
    outputSchema: genkit_2.z.object({
        listings: genkit_2.z.array(discoveredListing_1.DiscoveredListingSchema),
        items: genkit_2.z.array(genkit_2.z.object({
            id: genkit_2.z.string(),
            name: genkit_2.z.string(),
            brand: genkit_2.z.string().optional(),
            category: genkit_2.z.string().optional(),
            price: genkit_2.z.number().nullable(),
            currency: genkit_2.z.string().optional(),
            imageUrl: genkit_2.z.string().url().optional(),
            merchantUrl: genkit_2.z.string().url(),
            source: genkit_2.z.string(),
            priceEvidence: genkit_2.z.string().optional(),
        })),
    }),
}, async ({ searchQueries, requesterUid, providerListings }) => {
    try {
        const { value } = await (0, costControls_1.withCache)("productResearch", { searchQueries }, async () => {
            if (requesterUid)
                await (0, costControls_1.consumeBudget)(requesterUid, "search");
            const validatedListings = providerListings || [];
            if (validatedListings.length === 0)
                return { listings: [], items: [] };
            const { GoogleGenAI } = await Promise.resolve().then(() => __importStar(require("@google/genai")));
            const client = new GoogleGenAI({ apiKey: geminiApiKey.value() });
            const response = await client.interactions.create({
                model: "gemini-3.1-flash-lite-preview",
                input: `Rank these validated merchant listings for the queries ${searchQueries.join(", ")}. Return a JSON array containing only the supplied listing fields id, merchantUrl, source, price, priceEvidence, and imageUrl. Do not add, omit, or change URLs, source, prices, price evidence, images, or IDs. Validated listings: ${JSON.stringify(validatedListings)}`,
                response_mime_type: "application/json",
            });
            let modelOutput;
            try {
                modelOutput = JSON.parse(response.output_text || "[]");
            }
            catch (_a) {
                throw new Error("Personalized discovery returned an invalid product payload.");
            }
            const rankedListings = (0, discoveryTypes_1.assertModelListingProvenance)(modelOutput, validatedListings);
            return {
                listings: rankedListings,
                items: rankedListings.map(listing => {
                    var _a, _b, _c, _d;
                    return ({
                        id: listing.id,
                        name: listing.name,
                        brand: listing.brand,
                        category: listing.category,
                        price: (_b = (_a = listing.observedPrice) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : null,
                        currency: (_c = listing.observedPrice) === null || _c === void 0 ? void 0 : _c.currency,
                        imageUrl: listing.imageUrl,
                        merchantUrl: listing.merchantUrl,
                        source: listing.source,
                        priceEvidence: (_d = listing.observedPrice) === null || _d === void 0 ? void 0 : _d.evidenceUrl,
                    });
                }),
            };
        });
        return value;
    }
    catch (e) {
        console.error("Parallel Web Search Product Discovery failed:", e);
        throw e;
    }
});
//# sourceMappingURL=discoverPersonalizedProductsFlow.js.map