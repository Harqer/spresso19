"use node";

import { action, env } from "./_generated/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { requireFirebaseIdentity } from "./lib/identity";
import { BunnyMediaStore, assertOwnedPrivateMediaKey, bunnyConfigFromEnv } from "./media/bunnyStore";
import { VisualListingSchema, fetchVisionListings } from "./ai/visionProvider";

/**
 * Lens/camera visual search — the single Convex owner of this boundary.
 *
 * The caller sends a Bunny media key (already owner-scoped via
 * `media.actions.storeUploadedBytes`); the payload bytes are fetched through
 * the verified media boundary, never from a client-supplied URL. Provider
 * results are zod-validated before they reach the client, and failures are
 * honest: an unconfigured provider is a typed precondition failure, not a
 * silent empty result.
 */

export const searchByImage = action({
  args: {
    /** Owner-scoped Bunny media key of the captured image. */
    imageMediaKey: v.string(),
  },
  returns: v.object({
    listings: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        brand: v.optional(v.string()),
        category: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        merchantUrl: v.string(),
        source: v.literal("apify"),
        providerListingId: v.optional(v.string()),
        observedPrice: v.optional(v.object({ amount: v.number(), currency: v.string(), evidenceUrl: v.string() })),
        videoUrl: v.optional(v.string()),
        rating: v.optional(v.number()),
        reviewCount: v.optional(v.number()),
        reviewSummary: v.optional(v.string()),
        discoveredAt: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const apiToken = env.APIFY_API_TOKEN;
    if (!apiToken) {
      throw new Error("VISION_PROVIDER_UNCONFIGURED: visual search is unavailable because APIFY_API_TOKEN is not configured.");
    }
    assertOwnedPrivateMediaKey(identity.firebaseUid, args.imageMediaKey);

    // Fetch the exact owner-scoped bytes through the verified media boundary.
    const assetId = await ctx.runQuery(internal.media.getOwnedAssetByKey, {
      mediaKey: args.imageMediaKey,
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!assetId) throw new Error("Media asset not found for this user.");
    const store = new BunnyMediaStore(bunnyConfigFromEnv(env));
    const bytes = await store.getPrivateBytes(args.imageMediaKey);

    const base64 = Buffer.from(bytes).toString("base64");
    try {
      const listings = await fetchVisionListings(base64, apiToken);
      // An honest empty result is collapsed into an explicit failure so the
      // UI never renders a fake "no results" success state.
      if (listings.length === 0) throw new Error("Visual search returned no product matches for this image.");
      return { listings };
    } catch (cause) {
      if (cause instanceof Error && cause.message.startsWith("Visual search")) throw cause;
      throw new Error(`Visual search is temporarily unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  },
});
