import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CVX-001 bootstrap schema (2026-09-05 platform-cost-migration, Convex-only revision).
 *
 * Firebase UID is the canonical identity subject: every user-scoped document is
 * keyed by `tokenIdentifier` (the Convex-verified canonical identity key) or
 * `firebaseUid`, never by caller-supplied arguments.
 *
 * Phase-1 tables land as separate tickets (CVX-002 reactive state, CVX-003
 * checkout/passkeys, CVX-004 entitlements); each arrival must follow
 * convex-migration-helper widen/migrate/narrow rules for populated tables.
 */
export default defineSchema({
  preferences: defineTable({
    tokenIdentifier: v.string(),
    galleryPermission: v.union(
      v.literal("UNDETERMINED"),
      v.literal("GRANTED"),
      v.literal("DENIED"),
    ),
    updatedAt: v.number(),
  }).index("by_token_identifier", ["tokenIdentifier"]),

  savedProducts: defineTable({
    tokenIdentifier: v.string(),
    productId: v.string(),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_product_id", ["tokenIdentifier", "productId"]),

  cartItems: defineTable({
    tokenIdentifier: v.string(),
    productId: v.string(),
    listing: v.object({
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
    }),
    quantity: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_product_id", ["tokenIdentifier", "productId"]),

  wardrobeItems: defineTable({
    tokenIdentifier: v.string(),
    clientId: v.string(),
    kind: v.union(v.literal("user_upload"), v.literal("bookmarked_product")),
    name: v.string(),
    category: v.string(),
    weatherSuitability: v.union(
      v.literal("SUMMER_HEAT"),
      v.literal("MILD_SPRING_AUTUMN"),
      v.literal("WINTER_COLD"),
      v.literal("ALL_WEATHER"),
      v.literal("HOT_SUMMER"),
      v.literal("COLD_WINTER"),
    ),
    image: v.string(),
    brand: v.optional(v.string()),
    price: v.optional(v.number()),
    productId: v.optional(v.string()),
    addedAt: v.number(),
    color: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_client_id", ["tokenIdentifier", "clientId"]),

  users: defineTable({
    // Canonical Firebase subject (Firebase UID).
    firebaseUid: v.string(),
    // Convex tokenIdentifier for the signed-in identity (unique per identity).
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_firebase_uid", ["firebaseUid"])
    .index("by_token_identifier", ["tokenIdentifier"]),
});
