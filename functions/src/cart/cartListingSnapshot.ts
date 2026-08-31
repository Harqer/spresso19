import { z } from "zod";
import { DiscoveredListingSchema, canonicalMerchantUrl, type CartListingSnapshot, type DiscoveredListing } from "../contracts/discoveredListing";

export const CartListingSnapshotSchema = DiscoveredListingSchema.extend({
  quantity: z.number().int().positive().max(25),
  addedAt: z.string().datetime(),
}).strict();

export function createCartListingSnapshot(
  listing: DiscoveredListing,
  quantity: number,
  addedAt: Date = new Date(),
): CartListingSnapshot {
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 25) {
    throw new Error("Cart quantity must be a whole number between 1 and 25.");
  }

  const parsedListing = DiscoveredListingSchema.parse(listing);
  return {
    ...parsedListing,
    merchantUrl: canonicalMerchantUrl(parsedListing.merchantUrl),
    quantity,
    addedAt: addedAt.toISOString(),
  };
}
