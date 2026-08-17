"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProductsTool = void 0;
const genkit_1 = require("../genkit");
const zod_1 = require("zod");
exports.searchProductsTool = genkit_1.ai.defineTool({
    name: "searchProducts",
    description: "Searches the Spresso store inventory for products matching the user's query.",
    inputSchema: zod_1.z.object({
        query: zod_1.z.string().describe("The search query (e.g. 'espresso machine', 'dark roast beans')"),
        category: zod_1.z.string().optional().describe("Optional category to filter by"),
    }),
    outputSchema: zod_1.z.object({
        results: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            price: zod_1.z.number(),
            description: zod_1.z.string(),
        })),
    }),
}, async ({ query, category }) => {
    console.log(`Searching products for query: ${query}, category: ${category}`);
    // Simulate database lookup
    return {
        results: [
            {
                id: "prod_123",
                name: "Premium Espresso Beans",
                price: 19.99,
                description: "Dark roast espresso beans.",
            }
        ]
    };
});
//# sourceMappingURL=searchProducts.js.map