"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProductsTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const params_1 = require("firebase-functions/params");
const serpapiKey = (0, params_1.defineSecret)("SERPAPI_API_KEY");
exports.searchProductsTool = genkit_1.ai.defineTool({
    name: "searchProducts",
    description: "Searches the Spresso store inventory and internet for products matching the user's query.",
    inputSchema: genkit_2.z.object({
        query: genkit_2.z.string().describe("The search query (e.g. 'espresso machine', 'dark roast beans')"),
        category: genkit_2.z.string().optional().describe("Optional category to filter by"),
    }),
    outputSchema: genkit_2.z.object({
        results: genkit_2.z.array(genkit_2.z.object({
            id: genkit_2.z.string(),
            name: genkit_2.z.string(),
            price: genkit_2.z.number(),
            description: genkit_2.z.string(),
            imageUrl: genkit_2.z.string().optional(),
            source: genkit_2.z.string().optional(),
        })),
    }),
}, async ({ query, category }, ctx) => {
    var _a, _b;
    // Application Safeguard
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid) {
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    }
    console.log(`User ${uid} searching products for query: ${query}, category: ${category}`);
    try {
        const apiKey = serpapiKey.value();
        if (!apiKey) {
            throw new Error("Missing SERPAPI_API_KEY configuration.");
        }
        const searchQuery = category ? `${category} ${query}` : query;
        const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`SerpApi responded with status: ${response.status}`);
        }
        const data = await response.json();
        const shoppingResults = data.shopping_results || [];
        return {
            results: shoppingResults.slice(0, 5).map((item, index) => {
                const priceRaw = item.price || "0";
                const priceValue = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
                return {
                    id: item.product_id || `serp_${index}`,
                    name: item.title || item.source,
                    price: isNaN(priceValue) ? 0.0 : priceValue,
                    description: item.snippet || item.title || "",
                    imageUrl: item.thumbnail,
                    source: item.source,
                };
            })
        };
    }
    catch (e) {
        console.error("Search error:", e);
        // Native model fallback to generic web search if needed, but here we return standard search errors.
        throw new Error(`Failed to search products: ${e.message}`);
    }
});
//# sourceMappingURL=searchProducts.js.map