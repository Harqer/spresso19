"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceAgent = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const discoverPersonalizedProductsFlow_1 = require("../flows/discoverPersonalizedProductsFlow");
exports.ecommerceAgent = genkit_1.ai.defineTool({
    name: "ecommerceAgent",
    description: "Delegate to the Ecommerce Subagent. Use this when the user needs highly personalized product discovery or bulk e-commerce processing.",
    inputSchema: genkit_2.z.object({
        searchQueries: genkit_2.z.array(genkit_2.z.string()).describe("The search queries to find products for"),
    }),
    outputSchema: genkit_2.z.object({
        items: genkit_2.z.array(genkit_2.z.any()),
    }),
}, async ({ searchQueries }, ctx) => {
    var _a, _b;
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid)
        throw new Error("Application safeguard triggered: Unauthenticated AI tool execution attempt blocked.");
    // Internally delegates to the existing ecommerce flow which uses Model Garden
    const result = await (0, discoverPersonalizedProductsFlow_1.discoverPersonalizedProductsFlow)({ searchQueries, requesterUid: uid });
    return result;
});
//# sourceMappingURL=ecommerceAgent.js.map