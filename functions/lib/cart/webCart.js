"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWebCart = parseWebCart;
const zod_1 = require("zod");
const cartListingSnapshot_1 = require("./cartListingSnapshot");
const discoveredListing_1 = require("../contracts/discoveredListing");
const ProductRenderingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).max(256),
    name: zod_1.z.string().min(1).max(512),
    brand: zod_1.z.string().min(1).max(256),
    category: zod_1.z.string().min(1).max(256),
    price: zod_1.z.number().finite().nonnegative(),
    currency: zod_1.z.union([zod_1.z.literal(""), zod_1.z.string().regex(/^[A-Z]{3}$/)]),
    merchantUrl: zod_1.z.string().url().refine(value => value.startsWith("https://"), "merchantUrl must use HTTPS"),
    sku: zod_1.z.string().min(1).max(256),
    rating: zod_1.z.number().finite().nonnegative(),
    description: zod_1.z.string().max(4000),
    image: zod_1.z.union([
        zod_1.z.literal(""),
        zod_1.z.string().url().refine(value => value.startsWith("https://"), "image must use HTTPS"),
    ]),
    virtualTryOnEligible: zod_1.z.boolean(),
    mcpServerId: zod_1.z.string().min(1).max(256),
    availabilityStatus: zod_1.z.enum(["UNKNOWN", "VERIFY_AT_MERCHANT_CHECKOUT", "AVAILABLE", "UNAVAILABLE"]),
    listing: discoveredListing_1.DiscoveredListingSchema,
}).strict();
const WebCartItemSchema = zod_1.z.object({
    product: ProductRenderingSchema,
    listing: cartListingSnapshot_1.CartListingSnapshotSchema,
    quantity: zod_1.z.number().int().min(1).max(25),
}).strict().superRefine((item, context) => {
    if (item.product.id !== item.listing.id || item.product.listing.id !== item.listing.id) {
        context.addIssue({ code: "custom", message: "Cart product and listing IDs must agree." });
    }
    if (item.quantity !== item.listing.quantity) {
        context.addIssue({ code: "custom", message: "Cart quantities must agree." });
    }
    if (item.product.merchantUrl !== item.listing.merchantUrl
        || item.product.listing.merchantUrl !== item.listing.merchantUrl) {
        context.addIssue({ code: "custom", message: "Cart merchant URLs must agree." });
    }
});
const WebCartSchema = zod_1.z.object({
    cart: zod_1.z.array(WebCartItemSchema).max(100),
}).strict();
function parseWebCart(body) {
    return WebCartSchema.parse(body).cart;
}
//# sourceMappingURL=webCart.js.map