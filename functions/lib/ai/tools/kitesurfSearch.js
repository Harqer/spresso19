"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kitesurfSearchTool = void 0;
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const kitesurfService_1 = require("../../kitesurfService");
const costControls_1 = require("../costControls");
const discoveredListing_1 = require("../../contracts/discoveredListing");
exports.kitesurfSearchTool = genkit_1.ai.defineTool({
    name: "kitesurfSearch",
    description: "Inspect public product listings on configured allowlisted merchant domains. Kitesurf never submits orders, payment credentials, account changes, or security actions.",
    inputSchema: genkit_2.z.object({
        query: genkit_2.z.string().min(2).max(240),
        retailerHint: genkit_2.z.string().max(120).optional(),
    }),
    // DiscoveredListingSchema is the canonical Zod 4 runtime contract;
    // Genkit's schema generic is Zod 3-shaped, so bridge only the type here.
    outputSchema: genkit_2.z.object({ products: genkit_2.z.array(discoveredListing_1.DiscoveredListingSchema) }),
}, async ({ query, retailerHint }, ctx) => {
    var _a, _b;
    const uid = (_b = (_a = ctx.context) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.uid;
    if (!uid)
        throw new Error("Application safeguard triggered: Unauthenticated Kitesurf search blocked.");
    const { value } = await (0, costControls_1.withCache)("productSearch", { provider: "kitesurf", query, retailerHint }, async () => {
        await (0, costControls_1.consumeBudget)(uid, "search");
        return { products: await (0, kitesurfService_1.searchKitesurfRetailerProducts)(query, retailerHint) };
    });
    return value;
});
//# sourceMappingURL=kitesurfSearch.js.map