"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToCartTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const discoveredListing_1 = require("../../contracts/discoveredListing");
const addListingToCart_1 = require("../../cart/addListingToCart");
exports.addToCartTool = genkit_1.ai.defineTool({
    name: "addToCart",
    description: "Adds a discovered merchant listing to the user's cart. This records shopping intent only; merchant price and availability are verified during checkout.",
    inputSchema: genkit_2.z.object({
        listing: genkit_2.z.object({
            id: genkit_2.z.string(),
            name: genkit_2.z.string(),
            brand: genkit_2.z.string().optional(),
            category: genkit_2.z.string().optional(),
            imageUrl: genkit_2.z.string().optional(),
            merchantUrl: genkit_2.z.string(),
            source: genkit_2.z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
            providerListingId: genkit_2.z.string().optional(),
            observedPrice: genkit_2.z.object({ amount: genkit_2.z.number(), currency: genkit_2.z.string(), evidenceUrl: genkit_2.z.string() }).optional(),
            videoUrl: genkit_2.z.string().optional(),
            rating: genkit_2.z.number().optional(),
            reviewCount: genkit_2.z.number().optional(),
            reviewSummary: genkit_2.z.string().optional(),
            discoveredAt: genkit_2.z.string(),
            expiresAt: genkit_2.z.string().optional(),
            confidence: genkit_2.z.number().optional(),
        }).describe("The complete discovered merchant listing to add"),
        quantity: genkit_2.z.number().int().positive().max(25).describe("The number of items to add"),
        idempotencyKey: genkit_2.z.string().uuid().describe("A unique request key for safe retries"),
    }),
    outputSchema: genkit_2.z.object({
        success: genkit_2.z.boolean(),
        message: genkit_2.z.string(),
        totalItems: genkit_2.z.number(),
    }),
}, async ({ listing, quantity, idempotencyKey }, ctx) => {
    var _a, _b;
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    const result = await (0, addListingToCart_1.addListingToCart)(uid, discoveredListing_1.DiscoveredListingSchema.parse(listing), quantity, idempotencyKey);
    return {
        success: true,
        message: "Added to your cart.",
        totalItems: result.totalItems,
    };
});
//# sourceMappingURL=addToCart.js.map