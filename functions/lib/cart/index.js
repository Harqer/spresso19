"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addToCart = void 0;
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
const discoveredListing_1 = require("../contracts/discoveredListing");
const addListingToCart_1 = require("./addListingToCart");
const AddToCartSchema = zod_1.z.object({
    listing: discoveredListing_1.DiscoveredListingSchema,
    quantity: zod_1.z.number().int().positive().max(25),
    idempotencyKey: zod_1.z.string().uuid(),
}).strict();
exports.addToCart = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Sign in to update your cart.");
    const input = AddToCartSchema.safeParse(request.data);
    if (!input.success)
        throw new https_1.HttpsError("invalid-argument", "A valid product and quantity are required.");
    const { listing, quantity, idempotencyKey } = input.data;
    try {
        return await (0, addListingToCart_1.addListingToCart)(request.auth.uid, listing, quantity, idempotencyKey);
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        if (error instanceof Error && error.message === "A cart item cannot exceed 25 units.") {
            throw new https_1.HttpsError("invalid-argument", error.message);
        }
        throw error;
    }
});
//# sourceMappingURL=index.js.map