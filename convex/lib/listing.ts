import { v } from "convex/values";

/**
 * A user-scoped snapshot of an external merchant listing.
 * This is not owned inventory and must not be treated as a canonical product row.
 */
export const listingValidator = v.object({
  id: v.string(),
  name: v.string(),
  brand: v.optional(v.string()),
  category: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  merchantUrl: v.string(),
  source: v.union(
    v.literal("parallel"),
    v.literal("serpapi"),
    v.literal("apify"),
    v.literal("kitesurf"),
  ),
  providerListingId: v.optional(v.string()),
  observedPrice: v.optional(v.object({
    amount: v.number(),
    currency: v.string(),
    evidenceUrl: v.string(),
  })),
  videoUrl: v.optional(v.string()),
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  reviewSummary: v.optional(v.string()),
  discoveredAt: v.string(),
  expiresAt: v.optional(v.string()),
  confidence: v.optional(v.number()),
});
