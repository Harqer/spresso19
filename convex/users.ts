import { query, mutation, internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";

/**
 * CVX-001 user profile functions.
 *
 * `me` derives the caller's identity server-side (never from arguments) and
 * reads the caller's own document through the token-identifier index.
 * `bootstrap`/`ensureUser` upsert the profile on first authenticated contact.
 * `updateProfile`, `getEntitlement`, and `deactivateAccount` own the app-level
 * profile, entitlement, and account-lifecycle behavior.
 */

export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      firebaseUid: v.string(),
      tokenIdentifier: v.string(),
      email: v.optional(v.string()),
      displayName: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      createdAt: v.number(),
      trialStartedAt: v.optional(v.number()),
      trialEndsAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

const profileArgs = {
  email: v.optional(v.string()),
  displayName: v.optional(v.string()),
};

async function ensureUserForIdentity(ctx: MutationCtx, args: { email?: string; displayName?: string }) {
  const identity = await requireFirebaseIdentity(ctx);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (existing) return existing._id;

  const byUid = await ctx.db
    .query("users")
    .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", identity.firebaseUid))
    .unique();
  if (byUid) {
    await ctx.db.patch("users", byUid._id, {
      tokenIdentifier: identity.tokenIdentifier,
      ...(args.email === undefined ? {} : { email: args.email }),
      ...(args.displayName === undefined ? {} : { displayName: args.displayName }),
    });
    return byUid._id;
  }

  const createdAt = Date.now();
  return await ctx.db.insert("users", {
    firebaseUid: identity.firebaseUid,
    tokenIdentifier: identity.tokenIdentifier,
    email: args.email,
    displayName: args.displayName,
    createdAt,
    trialStartedAt: createdAt,
    trialEndsAt: createdAt + 14 * 24 * 60 * 60 * 1000,
  });
}

export const bootstrap = mutation({
  args: profileArgs,
  returns: v.id("users"),
  handler: (ctx, args) => ensureUserForIdentity(ctx, args),
});

export const ensureUser = internalMutation({
  args: profileArgs,
  returns: v.id("users"),
  handler: (ctx, args) => ensureUserForIdentity(ctx, args),
});

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
    photoUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!existing) throw new Error("Profile not found.");
    await ctx.db.patch("users", existing._id, {
      displayName: args.displayName.trim() || identity.firebaseUid,
      photoUrl: args.photoUrl,
    });
    return null;
  },
});

export const getEntitlement = query({
  args: {},
  returns: v.object({
    tier: v.string(),
    trialActive: v.boolean(),
    trialEndsAt: v.optional(v.number()),
    autoRenewDate: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("Profile not found.");
    // Entitlement state is derived from the verified trial window. A real
    // subscription tier can only be written by verified payment reconciliation
    // (Stripe webhook) — never by a client call.
    const trialActive = user.trialEndsAt !== undefined && Date.now() < user.trialEndsAt;
    return {
      tier: "VIP Member",
      trialActive,
      ...(user.trialEndsAt === undefined ? {} : { trialEndsAt: user.trialEndsAt }),
      ...(user.trialEndsAt === undefined
        ? {}
        : { autoRenewDate: new Date(user.trialEndsAt).toISOString() }),
    };
  },
});

export const deactivateAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    const tokenIdentifier = identity.tokenIdentifier;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
    if (!user) throw new Error("Profile not found.");

    for await (const row of ctx.db.query("preferences").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("preferences", row._id);
    for await (const row of ctx.db.query("savedProducts").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("savedProducts", row._id);
    for await (const row of ctx.db.query("likedProducts").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("likedProducts", row._id);
    for await (const row of ctx.db.query("cartItems").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("cartItems", row._id);
    for await (const row of ctx.db.query("wardrobeItems").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("wardrobeItems", row._id);
    for await (const row of ctx.db.query("wardrobeOutfits").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("wardrobeOutfits", row._id);
    for await (const row of ctx.db.query("aiUsage").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("aiUsage", row._id);
    for await (const row of ctx.db.query("mediaJobs").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("mediaJobs", row._id);
    for await (const row of ctx.db.query("paymentMethods").withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) await ctx.db.delete("paymentMethods", row._id);
    for await (const asset of ctx.db
      .query("mediaAssets")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))) {
      await ctx.db.delete("mediaAssets", asset._id);
    }
    // Financial records (orders) are retained for audit obligations; all other
    // owner-scoped application state is purged above.
    await ctx.db.delete("users", user._id);
    return null;
  },
});
