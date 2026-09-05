"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeParallelResults = normalizeParallelResults;
const discoveryTypes_1 = require("./discoveryTypes");
function normalizeParallelResults(results, options = {}) {
    return (0, discoveryTypes_1.deduplicateListings)(results.flatMap(result => {
        var _a;
        if (!result || typeof result !== "object")
            return [];
        const item = result;
        const listing = (0, discoveryTypes_1.normalizeProviderListing)({
            source: "parallel",
            merchantUrl: item.url,
            providerListingId: item.id,
            name: item.title,
            brand: item.merchant,
            category: item.category,
            imageUrl: (_a = item.imageUrl) !== null && _a !== void 0 ? _a : item.image,
            price: item.price,
            currency: item.currency,
        }, options);
        return listing ? [listing] : [];
    }));
}
//# sourceMappingURL=parallelAdapter.js.map