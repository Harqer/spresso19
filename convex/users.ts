import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";

/**
 * CVX-001 user profile functions.
 *
 * `me` derives the caller's identity server-side (never from arguments) and
 * reads the caller's own document through the token-identifier index.
 * `ensureUser` is internal-only: it upserts the profile on first authenticated
 * contact and is invoked by the client bootstrap flow.
 */

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      firebaseUid: v.string(),
      tokenIdentifier: v.string(),
      email: v.optional(v.string()),
      displayName: v.optional(v.string()),
      createdAt: v.number(),
      trialStartedAt: v.optional(v.number()),
      trialEndsAt: v.optional(v.number()),
    }),
    v.null(),
  ),
});

export const ensureUser = internalMutation({
  args: {
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) {
      // Identity already provisioned; nothing to do.
      return existing._id;
    }

    // Also reconcile an older profile row keyed by the same Firebase UID
    // (e.g. provisioned before tokenIdentifier rotation) instead of duplicating.
    const byUid = await ctx.db
      .query("users")
      .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", identity.firebaseUid))
      .unique();
    if (byUid) {
      await ctx.db.patch("users", byUid._id, { tokenIdentifier: identity.tokenIdentifier });
      return byUid._id;
    }

    const createdAt = Date.now();
    const trialEndsAt = createdAt + 14 * 24 * 60 * 60 * 1000;
    return await ctx.db.insert("users", {
      firebaseUid: identity.firebaseUid,
      tokenIdentifier: identity.tokenIdentifier,
      email: args.email,
      displayName: args.displayName,
      createdAt,
      trialStartedAt: createdAt,
      trialEndsAt,
    });
  },
  returns: v.id("users"),
});
