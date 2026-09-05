"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSerpApiResults = normalizeSerpApiResults;
const discoveryTypes_1 = require("./discoveryTypes");
function normalizeSerpApiResults(results, options = {}) {
    return (0, discoveryTypes_1.deduplicateListings)(results.flatMap(result => {
        var _a, _b, _c, _d, _e;
        if (!result || typeof result !== "object")
            return [];
        const item = result;
        const listing = (0, discoveryTypes_1.normalizeProviderListing)({
            source: "serpapi",
            merchantUrl: (_b = (_a = item.link) !== null && _a !== void 0 ? _a : item.product_link) !== null && _b !== void 0 ? _b : item.product_url,
            providerListingId: (_c = item.product_id) !== null && _c !== void 0 ? _c : item.productId,
            name: item.title,
            brand: item.source,
            category: item.category,
            imageUrl: (_d = item.thumbnail) !== null && _d !== void 0 ? _d : item.image,
            price: (_e = item.price) !== null && _e !== void 0 ? _e : item.extracted_price,
            currency: item.currency,
        }, options);
        return listing ? [listing] : [];
    }));
}
//# sourceMappingURL=serpApiAdapter.js.map