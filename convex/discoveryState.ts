import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";

/**
 * Internal reads over the caller's durable user state, used by the discovery
 * actions (which run in the Node runtime and therefore cannot define queries
 * themselves). Every read is owner-scoped by the verified identity.
 */

export const myPreferences = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      searchInquiries: v.optional(v.array(v.string())),
      vibes: v.optional(v.array(v.string())),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const row = await ctx.db
      .query("preferences")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!row) return null;
    return { searchInquiries: row.searchInquiries, vibes: row.vibes };
  },
});

export const mySavedProductIds = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const rows = await ctx.db
      .query("savedProducts")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(20);
    return rows.map((row) => row.productId);
  },
});

export const myLikedProductIds = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const rows = await ctx.db
      .query("likedProducts")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(20);
    return rows.map((row) => row.productId);
  },
});

export const myRecentOrderListingNames = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(5);
    return rows.map((row) => row.listing.name);
  },
});
