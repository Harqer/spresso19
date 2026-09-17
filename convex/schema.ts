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
    theme: v.optional(v.union(v.literal("system"), v.literal("light"), v.literal("dark"))),
    seedHex: v.optional(v.string()),
    secondarySeedHex: v.optional(v.string()),
    location: v.optional(v.string()),
    radius: v.optional(v.number()),
    coords: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    onboardingCompleted: v.optional(v.boolean()),
    locationEnabled: v.optional(v.boolean()),
    searchInquiries: v.optional(v.array(v.string())),
    vibes: v.optional(v.array(v.string())),
    pushNotifications: v.optional(v.boolean()),
    avatarProfile: v.optional(v.object({
      usePersonalAvatar: v.boolean(),
      mediaKey: v.optional(v.string()),
      age: v.optional(v.string()),
      height: v.optional(v.string()),
      weight: v.optional(v.string()),
      fitPreference: v.optional(v.union(v.literal("tailored"), v.literal("regular"), v.literal("relaxed"), v.literal("oversized"))),
    })),
    updatedAt: v.number(),
  }).index("by_token_identifier", ["tokenIdentifier"]),

  savedProducts: defineTable({
    tokenIdentifier: v.string(),
    productId: v.string(),
    // Snapshot of the external listing at bookmark time; never an inventory row.
    listing: v.optional(v.any()),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_product_id", ["tokenIdentifier", "productId"]),

  likedProducts: defineTable({
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
    mediaAssetId: v.optional(v.id("mediaAssets")),
    mediaKey: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_client_id", ["tokenIdentifier", "clientId"]),

  wardrobeOutfits: defineTable({
    tokenIdentifier: v.string(),
    clientId: v.string(),
    title: v.string(),
    weatherCondition: v.union(
      v.literal("SUMMER_HEAT"),
      v.literal("MILD_SPRING_AUTUMN"),
      v.literal("WINTER_COLD"),
      v.literal("ALL_WEATHER"),
      v.literal("HOT_SUMMER"),
      v.literal("COLD_WINTER"),
    ),
    temperatureText: v.string(),
    items: v.array(v.object({
      id: v.string(),
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
      mediaKey: v.optional(v.string()),
    })),
    stylingAdvice: v.string(),
    weatherMatchScore: v.number(),
    savedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_client_id", ["tokenIdentifier", "clientId"]),

  users: defineTable({
    firebaseUid: v.string(),
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
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

  mediaJobs: defineTable({
    tokenIdentifier: v.string(),
    idempotencyKey: v.string(),
    kind: v.union(v.literal("media_generation"), v.literal("virtual_try_on")),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    prompt: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("retrying"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("verification_pending"),
    ),
    provider: v.optional(v.string()),
    providerJobId: v.optional(v.string()),
    assetId: v.optional(v.id("mediaAssets")),
    outfitId: v.optional(v.id("wardrobeOutfits")),
    errorCode: v.optional(v.string()),
    legacyJobId: v.optional(v.string()),
    legacyStatus: v.optional(v.string()),
    reconciledAt: v.optional(v.number()),
    attemptCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_idempotency_key", ["tokenIdentifier", "idempotencyKey"])
    .index("by_token_identifier_and_status", ["tokenIdentifier", "status"]),

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
    listing: v.object({
      id: v.string(),
      name: v.string(),
      brand: v.optional(v.string()),
      category: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      merchantUrl: v.string(),
      source: v.union(v.literal("parallel"), v.literal("serpapi"), v.literal("apify"), v.literal("kitesurf")),
      providerListingId: v.optional(v.string()),
      observedPrice: v.optional(v.object({ amount: v.number(), currency: v.string(), evidenceUrl: v.string() })),
      videoUrl: v.optional(v.string()),
      rating: v.optional(v.number()),
      reviewCount: v.optional(v.number()),
      reviewSummary: v.optional(v.string()),
      discoveredAt: v.string(),
      expiresAt: v.optional(v.string()),
      confidence: v.optional(v.number()),
    }),
    returnRequestKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token_identifier_and_idempotency_key", ["tokenIdentifier", "idempotencyKey"])
    .index("by_payment_intent_id", ["paymentIntentId"]),

  paymentMethods: defineTable({
    tokenIdentifier: v.string(),
    stripePaymentMethodId: v.string(),
    stripeCustomerId: v.string(),
    brand: v.string(),
    last4: v.string(),
    expMonth: v.number(),
    expYear: v.number(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_token_identifier_and_pm_id", ["tokenIdentifier", "stripePaymentMethodId"]),

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
    listing: v.object({
      id: v.string(),
      name: v.string(),
      brand: v.optional(v.string()),
      category: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      merchantUrl: v.string(),
      source: v.union(v.literal("parallel"), v.literal("serpapi"), v.literal("apify"), v.literal("kitesurf")),
      providerListingId: v.optional(v.string()),
      observedPrice: v.optional(v.object({ amount: v.number(), currency: v.string(), evidenceUrl: v.string() })),
      videoUrl: v.optional(v.string()),
      rating: v.optional(v.number()),
      reviewCount: v.optional(v.number()),
      reviewSummary: v.optional(v.string()),
      discoveredAt: v.string(),
      expiresAt: v.optional(v.string()),
      confidence: v.optional(v.number()),
    }),
    quantity: v.number(),
    amountCents: v.number(),
    currency: v.string(),
    merchantUrl: v.string(),
    status: v.union(
      v.literal("AUTHORIZED"),
      v.literal("PROCESSING"),
      v.literal("IN_TRANSIT"),
      v.literal("DELIVERED"),
      v.literal("RETURN_REQUESTED"),
      v.literal("RETURNED"),
      v.literal("CANCELLED"),
    ),
    deviceSource: v.optional(v.string()),
    humanConfirmedAt: v.optional(v.string()),
    mcpTransactionHash: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    trackingStatus: v.optional(v.string()),
    carrier: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    estimatedDelivery: v.optional(v.string()),
    returnStatus: v.optional(v.union(v.literal("NONE"), v.literal("REQUESTED"), v.literal("APPROVED"), v.literal("COMPLETED"))),
    returnReason: v.optional(v.string()),
    reminderSet: v.optional(v.boolean()),
    reminderTime: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    returnRequestKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_checkout_attempt_id", ["checkoutAttemptId"])
    .index("by_payment_intent_id", ["paymentIntentId"]),

  // Curated AI reference data, migrated from Firestore collections of the
  // same names. Global (not owner-scoped): readable by any authenticated
  // user, writable only through the migration seed contract.
  quickPrompts: defineTable({
    legacyId: v.optional(v.string()),
    prompt: v.string(),
    title: v.string(),
    subtitle: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  }).index("by_legacy_id", ["legacyId"]),

  creatorTemplates: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    creator: v.string(),
    category: v.string(),
    description: v.string(),
    icon: v.string(),
    promptExample: v.string(),
    sortOrder: v.number(),
  }).index("by_legacy_id", ["legacyId"]),

  creatorAgents: defineTable({
    legacyId: v.optional(v.string()),
    title: v.string(),
    subtitle: v.string(),
    icon: v.string(),
    color: v.string(),
    bgColor: v.string(),
    borderColor: v.string(),
    capabilities: v.array(v.string()),
    quickPrompts: v.array(v.object({ label: v.string(), prompt: v.string() })),
    sortOrder: v.number(),
  }).index("by_legacy_id", ["legacyId"]),

  // Travel domain: owner-scoped trips with nested events/expenses/voice
  // notes. Nested rows carry the owner's tokenIdentifier plus tripId so a
  // trip detail read is three bounded indexed queries with ownership in the
  // index itself.
  travelTrips: defineTable({
    tokenIdentifier: v.string(),
    legacyId: v.optional(v.string()),
    title: v.string(),
    destination: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(v.literal("UPCOMING"), v.literal("IN_PROGRESS"), v.literal("COMPLETED")),
    coverImage: v.optional(v.string()),
    budgetTotal: v.optional(v.number()),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_legacy_id", ["legacyId"]),

  travelEvents: defineTable({
    tokenIdentifier: v.string(),
    tripId: v.id("travelTrips"),
    legacyId: v.optional(v.string()),
    type: v.union(v.literal("flight"), v.literal("hotel"), v.literal("restaurant"), v.literal("tour"), v.literal("ticket")),
    title: v.string(),
    description: v.string(),
    eventTime: v.string(),
    location: v.string(),
    price: v.optional(v.number()),
    qrData: v.optional(v.string()),
    confirmationCode: v.optional(v.string()),
    gate: v.optional(v.string()),
    seat: v.optional(v.string()),
  }).index("by_token_identifier_and_trip", ["tokenIdentifier", "tripId"]).index("by_legacy_id", ["legacyId"]),

  travelExpenses: defineTable({
    tokenIdentifier: v.string(),
    tripId: v.id("travelTrips"),
    legacyId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    category: v.union(
      v.literal("Dining"), v.literal("Flight"), v.literal("Hotel"), v.literal("Shopping"),
      v.literal("Transport"), v.literal("Activities"), v.literal("Other"),
    ),
    merchant: v.string(),
    date: v.string(),
    items: v.optional(v.array(v.object({ name: v.string(), price: v.number() }))),
    createdAt: v.number(),
  })
    .index("by_token_identifier_and_trip", ["tokenIdentifier", "tripId"])
    .index("by_legacy_id", ["legacyId"]),

  travelVoiceNotes: defineTable({
    tokenIdentifier: v.string(),
    tripId: v.id("travelTrips"),
    legacyId: v.optional(v.string()),
    transcript: v.string(),
    audioMediaKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token_identifier_and_trip", ["tokenIdentifier", "tripId"])
    .index("by_legacy_id", ["legacyId"]),

  // Grocery list: one implicit list per owner, items owner-scoped and keyed
  // by legacy id for the Data Connect migration.
  groceryItems: defineTable({
    tokenIdentifier: v.string(),
    legacyId: v.optional(v.string()),
    name: v.string(),
    category: v.string(),
    checked: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_legacy_id", ["legacyId"]),
});
