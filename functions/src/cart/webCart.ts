import { z } from "zod";
import { CartListingSnapshotSchema } from "./cartListingSnapshot";
import { DiscoveredListingSchema } from "../contracts/discoveredListing";

const ProductRenderingSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(512),
  brand: z.string().min(1).max(256),
  category: z.string().min(1).max(256),
  price: z.number().finite().nonnegative(),
  currency: z.union([z.literal(""), z.string().regex(/^[A-Z]{3}$/)]),
  merchantUrl: z.string().url().refine(value => value.startsWith("https://"), "merchantUrl must use HTTPS"),
  sku: z.string().min(1).max(256),
  rating: z.number().finite().nonnegative(),
  description: z.string().max(4_000),
  image: z.union([
    z.literal(""),
    z.string().url().refine(value => value.startsWith("https://"), "image must use HTTPS"),
  ]),
  virtualTryOnEligible: z.boolean(),
  mcpServerId: z.string().min(1).max(256),
  availabilityStatus: z.enum(["UNKNOWN", "VERIFY_AT_MERCHANT_CHECKOUT", "AVAILABLE", "UNAVAILABLE"]),
  listing: DiscoveredListingSchema,
}).strict();

const WebCartItemSchema = z.object({
  product: ProductRenderingSchema,
  listing: CartListingSnapshotSchema,
  quantity: z.number().int().min(1).max(25),
}).strict().superRefine((item, context) => {
  if (item.product.id !== item.listing.id || item.product.listing.id !== item.listing.id) {
    context.addIssue({ code: "custom", message: "Cart product and listing IDs must agree." });
  }
  if (item.quantity !== item.listing.quantity) {
    context.addIssue({ code: "custom", message: "Cart quantities must agree." });
  }
  if (
    item.product.merchantUrl !== item.listing.merchantUrl
    || item.product.listing.merchantUrl !== item.listing.merchantUrl
  ) {
    context.addIssue({ code: "custom", message: "Cart merchant URLs must agree." });
  }
});

const WebCartSchema = z.object({
  cart: z.array(WebCartItemSchema).max(100),
}).strict();

export type WebCartItem = z.infer<typeof WebCartItemSchema>;

export function parseWebCart(body: unknown): WebCartItem[] {
  return WebCartSchema.parse(body).cart;
}
