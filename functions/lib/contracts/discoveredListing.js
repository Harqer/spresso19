"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveredListingSchema = void 0;
exports.canonicalMerchantUrl = canonicalMerchantUrl;
exports.stableListingId = stableListingId;
const zod_1 = require("zod");
exports.DiscoveredListingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    brand: zod_1.z.string().min(1).optional(),
    category: zod_1.z.string().min(1).optional(),
    imageUrl: zod_1.z.string().url().refine(value => value.startsWith("https://"), "imageUrl must use HTTPS").optional(),
    merchantUrl: zod_1.z.string().url().refine(value => value.startsWith("https://"), "merchantUrl must use HTTPS"),
    source: zod_1.z.enum(["parallel", "serpapi", "apify", "kitesurf"]),
    providerListingId: zod_1.z.string().min(1).optional(),
    observedPrice: zod_1.z.object({
        amount: zod_1.z.number().positive(),
        currency: zod_1.z.string().regex(/^[A-Z]{3}$/),
        evidenceUrl: zod_1.z.string().url().refine(value => value.startsWith("https://"), "evidenceUrl must use HTTPS")
    }).optional(),
    videoUrl: zod_1.z.string().url().refine(value => value.startsWith("https://"), "videoUrl must use HTTPS").optional(),
    rating: zod_1.z.number().min(0).max(5).optional(),
    reviewCount: zod_1.z.number().int().nonnegative().optional(),
    reviewSummary: zod_1.z.string().trim().min(1).max(500).optional(),
    discoveredAt: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional()
}).strict();
function canonicalMerchantUrl(value) {
    const url = new URL(value);
    if (url.protocol !== "https:")
        throw new Error("Merchant URLs must use HTTPS");
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
        if (/^(utm_|ref$|src$|campaign$)/i.test(key))
            url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
}
function stableListingId(source, merchantUrl, providerListingId) {
    const input = `${source}:${canonicalMerchantUrl(merchantUrl)}:${providerListingId || ""}`;
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `${source}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
//# sourceMappingURL=discoveredListing.js.map