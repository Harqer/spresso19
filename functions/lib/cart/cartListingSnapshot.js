"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartListingSnapshotSchema = void 0;
exports.createCartListingSnapshot = createCartListingSnapshot;
const zod_1 = require("zod");
const discoveredListing_1 = require("../contracts/discoveredListing");
exports.CartListingSnapshotSchema = discoveredListing_1.DiscoveredListingSchema.extend({
    quantity: zod_1.z.number().int().positive().max(25),
    addedAt: zod_1.z.string().datetime(),
}).strict();
function createCartListingSnapshot(listing, quantity, addedAt = new Date()) {
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 25) {
        throw new Error("Cart quantity must be a whole number between 1 and 25.");
    }
    const parsedListing = discoveredListing_1.DiscoveredListingSchema.parse(listing);
    return Object.assign(Object.assign({}, parsedListing), { merchantUrl: (0, discoveredListing_1.canonicalMerchantUrl)(parsedListing.merchantUrl), quantity, addedAt: addedAt.toISOString() });
}
//# sourceMappingURL=cartListingSnapshot.js.map