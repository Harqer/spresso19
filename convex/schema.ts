import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex migration schema. User-scoped data is keyed by Convex's verified
 * tokenIdentifier; clients never supply an authorization identity.
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
    firebaseUid: v.string(),
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
    trialStartedAt: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
  })
    .index("by_firebase_uid", ["firebaseUid"])
    .index("by_token_identifier", ["tokenIdentifier"]),

  aiUsage: defineTable({
    tokenIdentifier: v.string(),
    threadId: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    createdAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_created_at", ["tokenIdentifier", "createdAt"]),

  mediaAssets: defineTable({
    tokenIdentifier: v.string(),
    mediaKey: v.string(),
    mimeType: v.string(),
    byteLength: v.number(),
    sha256: v.string(),
    jobId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_media_key", ["tokenIdentifier", "mediaKey"]),

  checkoutAttempts: defineTable({
    tokenIdentifier: v.string(),
    listingId: v.string(),
    quantity: v.number(),
    idempotencyKey: v.string(),
    status: v.union(
      v.literal("NEW"),
      v.literal("QUOTING"),
      v.literal("AWAITING_STEP_UP"),
      v.literal("READY_FOR_PAYMENT"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
    ),
    amountCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    merchantUrl: v.optional(v.string()),
    quoteObservedAt: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    orderId: v.optional(v.string()),
    failureCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token_identifier_and_idempotency_key", ["tokenIdentifier", "idempotencyKey"])
    .index("by_payment_intent_id", ["paymentIntentId"]),

  webhookInbox: defineTable({
    provider: v.string(),
    eventId: v.string(),
    payloadHash: v.string(),
    status: v.union(v.literal("PROCESSING"), v.literal("COMPLETED"), v.literal("IGNORED"), v.literal("FAILED")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_provider_and_event_id", ["provider", "eventId"]),

  orders: defineTable({
    tokenIdentifier: v.string(),
    checkoutAttemptId: v.id("checkoutAttempts"),
    paymentIntentId: v.string(),
    listingId: v.string(),
    quantity: v.number(),
    amountCents: v.number(),
    currency: v.string(),
    merchantUrl: v.string(),
    createdAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_checkout_attempt_id", ["checkoutAttemptId"]),
});
