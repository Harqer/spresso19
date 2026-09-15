import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";

const MAX_LIST_LIMIT = 100;

function boundedLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new Error(`List limit must be a whole number between 1 and ${MAX_LIST_LIMIT}.`);
  }
  return limit;
}

const galleryPermission = v.union(
  v.literal("UNDETERMINED"),
  v.literal("GRANTED"),
  v.literal("DENIED"),
);

const theme = v.union(v.literal("system"), v.literal("light"), v.literal("dark"));
const coordinates = v.object({ lat: v.number(), lng: v.number() });
const weatherCondition = v.union(
  v.literal("SUMMER_HEAT"),
  v.literal("MILD_SPRING_AUTUMN"),
  v.literal("WINTER_COLD"),
  v.literal("ALL_WEATHER"),
  v.literal("HOT_SUMMER"),
  v.literal("COLD_WINTER"),
);

const weatherSuitability = v.union(
  v.literal("SUMMER_HEAT"),
  v.literal("MILD_SPRING_AUTUMN"),
  v.literal("WINTER_COLD"),
  v.literal("ALL_WEATHER"),
  v.literal("HOT_SUMMER"),
  v.literal("COLD_WINTER"),
);

const listing = v.object({
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

export const getPreferences = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("preferences"),
      _creationTime: v.number(),
      tokenIdentifier: v.string(),
      galleryPermission,
      theme: v.optional(theme),
      seedHex: v.optional(v.string()),
      secondarySeedHex: v.optional(v.string()),
      location: v.optional(v.string()),
      radius: v.optional(v.number()),
      coords: v.optional(coordinates),
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
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("preferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const setPreferences = mutation({
  args: {
    galleryPermission: v.optional(galleryPermission),
    theme: v.optional(theme),
    seedHex: v.optional(v.string()),
    secondarySeedHex: v.optional(v.string()),
    location: v.optional(v.string()),
    radius: v.optional(v.number()),
    coords: v.optional(coordinates),
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
  },
  returns: v.id("preferences"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    const now = Date.now();

    const patch = {
      ...(args.galleryPermission === undefined ? {} : { galleryPermission: args.galleryPermission }),
      ...(args.theme === undefined ? {} : { theme: args.theme }),
      ...(args.seedHex === undefined ? {} : { seedHex: args.seedHex }),
      ...(args.secondarySeedHex === undefined ? {} : { secondarySeedHex: args.secondarySeedHex }),
      ...(args.location === undefined ? {} : { location: args.location }),
      ...(args.radius === undefined ? {} : { radius: args.radius }),
      ...(args.coords === undefined ? {} : { coords: args.coords }),
      ...(args.onboardingCompleted === undefined ? {} : { onboardingCompleted: args.onboardingCompleted }),
      ...(args.locationEnabled === undefined ? {} : { locationEnabled: args.locationEnabled }),
      ...(args.searchInquiries === undefined ? {} : { searchInquiries: args.searchInquiries.slice(-50) }),
      ...(args.vibes === undefined ? {} : { vibes: args.vibes }),
      ...(args.pushNotifications === undefined ? {} : { pushNotifications: args.pushNotifications }),
      ...(args.avatarProfile === undefined ? {} : { avatarProfile: args.avatarProfile }),
      updatedAt: now,
    };
    if (Object.keys(patch).length === 1) throw new Error("At least one preference is required.");

    if (existing) {
      await ctx.db.patch("preferences", existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("preferences", {
      tokenIdentifier: identity.tokenIdentifier,
      galleryPermission: args.galleryPermission ?? "UNDETERMINED",
      ...patch,
    });
  },
});

export const listSavedProducts = query({
  args: { limit: v.number() },
  returns: v.array(v.object({
    _id: v.id("savedProducts"),
    _creationTime: v.number(),
    tokenIdentifier: v.string(),
    productId: v.string(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("savedProducts")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});

export const setSavedProduct = mutation({
  args: {
    productId: v.string(),
    saved: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("savedProducts")
      .withIndex("by_token_identifier_and_product_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("productId", args.productId),
      )
      .unique();

    if (args.saved && !existing) {
      await ctx.db.insert("savedProducts", {
        tokenIdentifier: identity.tokenIdentifier,
        productId: args.productId,
        updatedAt: Date.now(),
      });
    } else if (!args.saved && existing) {
      await ctx.db.delete("savedProducts", existing._id);
    }
    return null;
  },
});

export const listCartItems = query({
  args: { limit: v.number() },
  returns: v.array(v.object({
    _id: v.id("cartItems"),
    _creationTime: v.number(),
    tokenIdentifier: v.string(),
    productId: v.string(),
    listing,
    quantity: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("cartItems")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});

export const addCartItem = mutation({
  args: {
    productId: v.string(),
    listing,
    quantity: v.number(),
  },
  returns: v.id("cartItems"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    if (!args.productId.trim() || args.listing.id !== args.productId) {
      throw new Error("Cart product and listing IDs must agree.");
    }
    if (!Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > 25) {
      throw new Error("Cart quantity must be a whole number between 1 and 25.");
    }

    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_token_identifier_and_product_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("productId", args.productId),
      )
      .unique();
    const now = Date.now();

    if (existing) {
      const nextQuantity = existing.quantity + args.quantity;
      if (nextQuantity > 25) {
        throw new Error("A cart item cannot exceed 25 units.");
      }
      await ctx.db.patch("cartItems", existing._id, {
        listing: args.listing,
        quantity: nextQuantity,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("cartItems", {
      tokenIdentifier: identity.tokenIdentifier,
      productId: args.productId,
      listing: args.listing,
      quantity: args.quantity,
      updatedAt: now,
    });
  },
});

export const removeCartItem = mutation({
  args: { productId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_token_identifier_and_product_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("productId", args.productId),
      )
      .unique();
    if (existing) await ctx.db.delete("cartItems", existing._id);
    return null;
  },
});

export const setCartQuantity = mutation({
  args: {
    productId: v.string(),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    if (!Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > 25) {
      throw new Error("Cart quantity must be a whole number between 1 and 25.");
    }
    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_token_identifier_and_product_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("productId", args.productId),
      )
      .unique();
    if (!existing) throw new Error("Cart item not found.");
    await ctx.db.patch("cartItems", existing._id, { quantity: args.quantity, updatedAt: Date.now() });
    return null;
  },
});

const wardrobeItemArgs = {
  clientId: v.string(),
  kind: v.union(v.literal("user_upload"), v.literal("bookmarked_product")),
  name: v.string(),
  category: v.string(),
  weatherSuitability,
  image: v.string(),
  brand: v.optional(v.string()),
  price: v.optional(v.number()),
  productId: v.optional(v.string()),
  addedAt: v.number(),
  color: v.optional(v.string()),
  mediaAssetId: v.optional(v.id("mediaAssets")),
  mediaKey: v.optional(v.string()),
};

export const listWardrobeItems = query({
  args: { limit: v.number() },
  returns: v.array(v.object({
    _id: v.id("wardrobeItems"),
    _creationTime: v.number(),
    tokenIdentifier: v.string(),
    ...wardrobeItemArgs,
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("wardrobeItems")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});

export const addWardrobeItem = mutation({
  args: wardrobeItemArgs,
  returns: v.id("wardrobeItems"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_token_identifier_and_client_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("clientId", args.clientId),
      )
      .unique();
    if (args.mediaAssetId) {
      const asset = await ctx.db.get(args.mediaAssetId);
      if (!asset || asset.tokenIdentifier !== identity.tokenIdentifier || asset.mediaKey !== args.mediaKey) {
        throw new Error("Wardrobe media ownership could not be verified.");
      }
    }
    if (args.kind === "user_upload" && (!args.mediaAssetId || !args.mediaKey)) {
      throw new Error("Uploaded wardrobe items require verified media ownership.");
    }
    if (existing) {
      if (existing.kind !== args.kind) throw new Error("Wardrobe item kind cannot change.");
      await ctx.db.patch("wardrobeItems", existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("wardrobeItems", {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const listLikedProducts = query({
  args: { limit: v.number() },
  returns: v.array(v.object({
    _id: v.id("likedProducts"),
    _creationTime: v.number(),
    tokenIdentifier: v.string(),
    productId: v.string(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("likedProducts")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});

export const setLikedProduct = mutation({
  args: { productId: v.string(), liked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("likedProducts")
      .withIndex("by_token_identifier_and_product_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("productId", args.productId),
      )
      .unique();
    if (args.liked && !existing) {
      await ctx.db.insert("likedProducts", {
        tokenIdentifier: identity.tokenIdentifier,
        productId: args.productId,
        updatedAt: Date.now(),
      });
    }
    if (!args.liked && existing) await ctx.db.delete("likedProducts", existing._id);
    return null;
  },
});

const outfitItem = v.object({
  id: v.string(),
  kind: v.union(v.literal("user_upload"), v.literal("bookmarked_product")),
  name: v.string(),
  category: v.string(),
  weatherSuitability,
  image: v.string(),
  brand: v.optional(v.string()),
  price: v.optional(v.number()),
  productId: v.optional(v.string()),
  addedAt: v.number(),
  color: v.optional(v.string()),
  mediaKey: v.optional(v.string()),
});

export const listWardrobeOutfits = query({
  args: { limit: v.number() },
  returns: v.array(v.object({
    _id: v.id("wardrobeOutfits"),
    _creationTime: v.number(),
    tokenIdentifier: v.string(),
    clientId: v.string(),
    title: v.string(),
    weatherCondition: weatherSuitability,
    temperatureText: v.string(),
    items: v.array(outfitItem),
    stylingAdvice: v.string(),
    weatherMatchScore: v.number(),
    savedAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("wardrobeOutfits")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});

const outfitArgs = {
  clientId: v.string(),
  title: v.string(),
  weatherCondition,
  temperatureText: v.string(),
  items: v.array(outfitItem),
  stylingAdvice: v.string(),
  weatherMatchScore: v.number(),
  savedAt: v.number(),
};

export const saveWardrobeOutfitInternal = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    ...outfitArgs,
  },
  returns: v.id("wardrobeOutfits"),
  handler: async (ctx, args) => {
    const { tokenIdentifier, ...outfit } = args;
    const existing = await ctx.db
      .query("wardrobeOutfits")
      .withIndex("by_token_identifier_and_client_id", (q) =>
        q.eq("tokenIdentifier", tokenIdentifier).eq("clientId", outfit.clientId),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("wardrobeOutfits", {
      tokenIdentifier,
      ...outfit,
      updatedAt: Date.now(),
    });
  },
});

export const saveWardrobeOutfit = mutation({
  args: {
    clientId: v.string(),
    title: v.string(),
    weatherCondition,
    temperatureText: v.string(),
    items: v.array(outfitItem),
    stylingAdvice: v.string(),
    weatherMatchScore: v.number(),
    savedAt: v.number(),
  },
  returns: v.id("wardrobeOutfits"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("wardrobeOutfits")
      .withIndex("by_token_identifier_and_client_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("wardrobeOutfits", {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const removeWardrobeOutfit = mutation({
  args: { clientId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("wardrobeOutfits")
      .withIndex("by_token_identifier_and_client_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("clientId", args.clientId),
      )
      .unique();
    if (!existing) throw new Error("Wardrobe outfit not found.");
    await ctx.db.delete("wardrobeOutfits", existing._id);
    return null;
  },
});

export const removeWardrobeItem = mutation({
  args: { clientId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_token_identifier_and_client_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("clientId", args.clientId),
      )
      .unique();
    if (!existing) throw new Error("Wardrobe item not found.");
    await ctx.db.delete("wardrobeItems", existing._id);
    return null;
  },
});
