"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProviderPrice = parseProviderPrice;
exports.normalizeProviderListing = normalizeProviderListing;
exports.deduplicateListings = deduplicateListings;
exports.assertModelListingProvenance = assertModelListingProvenance;
const zod_1 = require("zod");
const discoveredListing_1 = require("../../contracts/discoveredListing");
const isoCurrency = /^[A-Z]{3}$/;
const modelListingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    merchantUrl: zod_1.z.string().url(),
    source: zod_1.z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
    price: zod_1.z.number().positive().nullable(),
    priceEvidence: zod_1.z.string().url().optional(),
    imageUrl: zod_1.z.string().url().optional(),
}).strict();
function stringValue(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
function httpsUrl(value) {
    const url = stringValue(value);
    if (!url)
        return undefined;
    try {
        return (0, discoveredListing_1.canonicalMerchantUrl)(url);
    }
    catch (_a) {
        return undefined;
    }
}
function imageUrl(value) {
    return httpsUrl(value);
}
function currencyFrom(value, price) {
    var _a, _b, _c;
    const explicit = (_a = stringValue(value)) === null || _a === void 0 ? void 0 : _a.toUpperCase();
    if (explicit && isoCurrency.test(explicit))
        return explicit;
    const code = (_c = (_b = price.match(/\b([A-Za-z]{3})\b/)) === null || _b === void 0 ? void 0 : _b[1]) === null || _c === void 0 ? void 0 : _c.toUpperCase();
    if (code && isoCurrency.test(code))
        return code;
    if (price.includes("€"))
        return "EUR";
    if (price.includes("£"))
        return "GBP";
    if (price.includes("¥"))
        return "JPY";
    if (price.includes("$"))
        return "USD";
    return undefined;
}
function parseProviderPrice(value, currency, evidenceUrl) {
    const numeric = typeof value === "number" ? value : undefined;
    const raw = typeof value === "string" ? value.trim() : undefined;
    const amount = numeric !== null && numeric !== void 0 ? numeric : (raw ? Number(raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "")) : Number.NaN);
    if (!Number.isFinite(amount) || amount <= 0)
        return undefined;
    const normalizedCurrency = currencyFrom(currency, raw || "") || (numeric !== undefined ? "USD" : undefined);
    if (!normalizedCurrency)
        return undefined;
    return { amount, currency: normalizedCurrency, evidenceUrl };
}
function normalizeProviderListing(input, options = {}) {
    const merchantUrl = httpsUrl(input.merchantUrl);
    const name = stringValue(input.name);
    if (!merchantUrl || !name)
        return undefined;
    const providerListingId = stringValue(input.providerListingId);
    const observedPrice = parseProviderPrice(input.price, input.currency, merchantUrl);
    const listing = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ id: (0, discoveredListing_1.stableListingId)(input.source, merchantUrl, providerListingId), name, brand: stringValue(input.brand), category: stringValue(input.category), imageUrl: imageUrl(input.imageUrl), merchantUrl, source: input.source, providerListingId,
        observedPrice }, (typeof input.videoUrl === "string" && input.videoUrl.startsWith("https://") ? { videoUrl: input.videoUrl } : {})), (typeof input.rating === "number" && input.rating >= 0 && input.rating <= 5 ? { rating: input.rating } : {})), (typeof input.reviewCount === "number" && Number.isInteger(input.reviewCount) && input.reviewCount >= 0 ? { reviewCount: input.reviewCount } : {})), (typeof input.reviewSummary === "string" && input.reviewSummary.trim() ? { reviewSummary: input.reviewSummary.trim() } : {})), { discoveredAt: options.discoveredAt || input.discoveredAt || new Date().toISOString() });
    const parsed = discoveredListing_1.DiscoveredListingSchema.safeParse(listing);
    return parsed.success ? parsed.data : undefined;
}
function deduplicateListings(listings) {
    const seen = new Set();
    return listings.filter(listing => {
        const key = `${listing.source}:${(0, discoveredListing_1.canonicalMerchantUrl)(listing.merchantUrl)}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function assertModelListingProvenance(modelOutput, providerListings) {
    var _a;
    const candidates = zod_1.z.array(modelListingSchema).parse(modelOutput);
    const recordsById = new Map(providerListings.map(listing => [listing.id, listing]));
    const result = [];
    const seen = new Set();
    for (const candidate of candidates) {
        const listing = recordsById.get(candidate.id);
        if (!listing || seen.has(listing.id))
            throw new Error("Model returned a listing without validated provider provenance.");
        const expectedPrice = listing.observedPrice;
        const sameMerchantUrl = (0, discoveredListing_1.canonicalMerchantUrl)(candidate.merchantUrl) === (0, discoveredListing_1.canonicalMerchantUrl)(listing.merchantUrl);
        const sameImageUrl = candidate.imageUrl === listing.imageUrl;
        const samePrice = candidate.price === ((_a = expectedPrice === null || expectedPrice === void 0 ? void 0 : expectedPrice.amount) !== null && _a !== void 0 ? _a : null);
        const sameEvidence = candidate.priceEvidence === (expectedPrice === null || expectedPrice === void 0 ? void 0 : expectedPrice.evidenceUrl);
        if (!sameMerchantUrl || candidate.source !== listing.source || !sameImageUrl || !samePrice || !sameEvidence) {
            throw new Error("Model changed validated provider listing evidence.");
        }
        seen.add(listing.id);
        result.push(listing);
    }
    return result;
}
//# sourceMappingURL=discoveryTypes.js.map