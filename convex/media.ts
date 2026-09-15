import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const recordAsset = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    mediaKey: v.string(),
    mimeType: v.string(),
    byteLength: v.number(),
    sha256: v.string(),
    jobId: v.optional(v.string()),
  },
  returns: v.id("mediaAssets"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mediaAssets")
      .withIndex("by_token_identifier_and_media_key", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier).eq("mediaKey", args.mediaKey),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("mediaAssets", { ...args, createdAt: Date.now() });
  },
});

export const getOwnedAsset = internalQuery({
  args: { assetId: v.id("mediaAssets"), tokenIdentifier: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("mediaAssets"),
      _creationTime: v.number(),
      tokenIdentifier: v.string(),
      mediaKey: v.string(),
      mimeType: v.string(),
      byteLength: v.number(),
      sha256: v.string(),
      jobId: v.optional(v.string()),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.tokenIdentifier !== args.tokenIdentifier) return null;
    return asset;
  },
});

export const getOwnedAssetByKey = internalQuery({
  args: { mediaKey: v.string(), tokenIdentifier: v.string() },
  returns: v.union(v.id("mediaAssets"), v.null()),
  handler: async (ctx, args) => {
    const asset = await ctx.db
      .query("mediaAssets")
      .withIndex("by_token_identifier_and_media_key", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier).eq("mediaKey", args.mediaKey),
      )
      .unique();
    return asset?._id ?? null;
  },
});
