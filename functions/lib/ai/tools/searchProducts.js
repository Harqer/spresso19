"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProductsTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const params_1 = require("firebase-functions/params");
const costControls_1 = require("../costControls");
const serpApiAdapter_1 = require("../providers/serpApiAdapter");
const serpapiKey = (0, params_1.defineSecret)("SERPAPI_API_KEY");
exports.searchProductsTool = genkit_1.ai.defineTool({
    name: "searchProducts",
    description: "Discovers products and compares listings from the Spresso catalog and the internet. Spresso does not own or represent merchant inventory.",
    inputSchema: genkit_2.z.object({
        query: genkit_2.z.string().describe("The search query (e.g. 'espresso machine', 'dark roast beans')"),
        category: genkit_2.z.string().optional().describe("Optional category to filter by"),
    }),
    outputSchema: genkit_2.z.object({
        results: genkit_2.z.array(genkit_2.z.object({
            id: genkit_2.z.string(),
            name: genkit_2.z.string(),
            price: genkit_2.z.number().nullable(),
            description: genkit_2.z.string(),
            imageUrl: genkit_2.z.string().optional(),
            source: genkit_2.z.enum(["serpapi"]),
            merchantUrl: genkit_2.z.string().url(),
        })),
    }),
}, async ({ query, category }, ctx) => {
    var _a, _b;
    // Application Safeguard
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    console.log("Product search requested", { uid, category });
    try {
        const searchQuery = category ? `${category} ${query}` : query;
        const { value } = await (0, costControls_1.withCache)("productSearch", { searchQuery }, async () => {
            await (0, costControls_1.consumeBudget)(uid, "search");
            const apiKey = serpapiKey.value();
            if (!apiKey) {
                throw new Error("DISCOVERY_INFRASTRUCTURE_UNAVAILABLE: SERPAPI_API_KEY is not configured for this environment.");
            }
            const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`SerpApi responded with status: ${response.status}`);
            const data = await response.json();
            const shoppingResults = Array.isArray(data.shopping_results) ? data.shopping_results : [];
            const listings = (0, serpApiAdapter_1.normalizeSerpApiResults)(shoppingResults);
            return {
                results: listings.slice(0, 5).map(listing => { var _a; var _b; return ({
                    id: listing.id,
                    name: listing.name,
                    price: (_b = (_a = listing.observedPrice) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : null,
                    description: listing.category || listing.brand || listing.name,
                    imageUrl: listing.imageUrl,
                    source: "serpapi",
                    merchantUrl: listing.merchantUrl,
                }); }),
            };
        });
        return value;
    }
    catch (e) {
        console.error("Search error:", e);
        // Native model fallback to generic web search if needed, but here we return standard search errors.
        throw new Error(`Failed to search products: ${e.message}`);
    }
});
//# sourceMappingURL=searchProducts.js.map