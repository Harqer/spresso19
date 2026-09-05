"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeApifyResults = normalizeApifyResults;
const discoveryTypes_1 = require("./discoveryTypes");
function normalizeApifyResults(results, options = {}) {
    return (0, discoveryTypes_1.deduplicateListings)(results.flatMap(result => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        if (!result || typeof result !== "object")
            return [];
        const item = result;
        const listing = (0, discoveryTypes_1.normalizeProviderListing)({
            source: "apify",
            merchantUrl: (_b = (_a = item.productUrl) !== null && _a !== void 0 ? _a : item.url) !== null && _b !== void 0 ? _b : item.link,
            providerListingId: (_d = (_c = item.id) !== null && _c !== void 0 ? _c : item.productId) !== null && _d !== void 0 ? _d : item.sku,
            name: (_e = item.name) !== null && _e !== void 0 ? _e : item.title,
            brand: (_f = item.brand) !== null && _f !== void 0 ? _f : item.merchant,
            category: item.category,
            imageUrl: (_h = (_g = item.imageUrl) !== null && _g !== void 0 ? _g : item.image) !== null && _h !== void 0 ? _h : item.thumbnail,
            price: (_j = item.price) !== null && _j !== void 0 ? _j : item.currentPrice,
            currency: item.currency,
            videoUrl: (_l = (_k = item.videoUrl) !== null && _k !== void 0 ? _k : item.video) !== null && _l !== void 0 ? _l : item.video_url,
            rating: (_m = item.rating) !== null && _m !== void 0 ? _m : item.stars,
            reviewCount: (_p = (_o = item.reviewCount) !== null && _o !== void 0 ? _o : item.reviewsCount) !== null && _p !== void 0 ? _p : item.review_count,
            reviewSummary: (_q = item.reviewSummary) !== null && _q !== void 0 ? _q : item.review_summary,
        }, options);
        return listing ? [listing] : [];
    }));
}
//# sourceMappingURL=apifyAdapter.js.map