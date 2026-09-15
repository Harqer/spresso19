import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireFirebaseIdentity } from "./lib/identity";

const mediaKind = v.union(v.literal("media_generation"), v.literal("virtual_try_on"));
const mediaType = v.union(v.literal("image"), v.literal("video"));
const mediaStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("retrying"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("verification_pending"),
);

const mediaJob = v.object({
  _id: v.id("mediaJobs"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  idempotencyKey: v.string(),
  kind: mediaKind,
  mediaType,
  prompt: v.optional(v.string()),
  imageUrls: v.optional(v.array(v.string())),
  status: mediaStatus,
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
});

function requireIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 200) {
    throw new Error("A valid media idempotency key is required.");
  }
  return normalized;
}

function validateJobInput(prompt: string | undefined, imageUrls: string[] | undefined): void {
  if (prompt !== undefined && (prompt.trim().length < 1 || prompt.length > 4_000)) {
    throw new Error("Media prompt must contain between 1 and 4,000 characters.");
  }
  if (imageUrls !== undefined && (
    imageUrls.length > 4 || imageUrls.some((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol !== "https:" || url.length > 2_048;
      } catch {
        return true;
      }
    })
  )) {
    throw new Error("Media references must be at most four HTTPS URLs.");
  }
}

function requireLegacyJobId(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 256) {
    throw new Error("A valid legacy job identifier is required.");
  }
  return normalized;
}

function legacyStatusToConvexStatus(status: string, hasVerifiedAsset: boolean): "completed" | "failed" | "verification_pending" {
  switch (status) {
    case "completed":
      return hasVerifiedAsset ? "completed" : "verification_pending";
    case "failed":
    case "canceled":
      return "failed";
    case "queued":
    case "running":
    case "processing":
    case "retrying":
    case "unknown":
      return "verification_pending";
    default:
      throw new Error("Unsupported legacy media job status.");
  }
}

/**
 * Migration-only import. It is internal so clients cannot create jobs by
 * supplying an arbitrary ownership token. The importer never overwrites an
 * existing Convex job and never treats an unverified legacy completion as done.
 */
export const reconcileLegacy = internalMutation({
  args: {
    legacyJobId: v.string(),
    legacyStatus: v.string(),
    tokenIdentifier: v.string(),
    idempotencyKey: v.string(),
    kind: mediaKind,
    mediaType,
    prompt: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    provider: v.optional(v.string()),
    providerJobId: v.optional(v.string()),
    assetId: v.optional(v.id("mediaAssets")),
    errorCode: v.optional(v.string()),
  },
  returns: v.id("mediaJobs"),
  handler: async (ctx, args) => {
    const legacyJobId = requireLegacyJobId(args.legacyJobId);
    const idempotencyKey = requireIdempotencyKey(args.idempotencyKey);
    validateJobInput(args.prompt, args.imageUrls);
    const existing = await ctx.db
      .query("mediaJobs")
      .withIndex("by_token_identifier_and_idempotency_key", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier).eq("idempotencyKey", idempotencyKey),
      )
      .unique();
    if (existing) {
      if (existing.legacyJobId !== legacyJobId) {
        throw new Error("The idempotency key is already owned by another media job.");
      }
      return existing._id;
    }

    const hasVerifiedAsset = Boolean(args.provider && args.providerJobId && args.assetId);
    if (args.assetId) {
      const asset = await ctx.db.get(args.assetId);
      if (!asset || asset.tokenIdentifier !== args.tokenIdentifier) {
        throw new Error("Legacy media asset ownership could not be verified.");
      }
    }
    const status = legacyStatusToConvexStatus(args.legacyStatus, hasVerifiedAsset);
    const now = Date.now();
    return await ctx.db.insert("mediaJobs", {
      tokenIdentifier: args.tokenIdentifier,
      idempotencyKey,
      kind: args.kind,
      mediaType: args.mediaType,
      ...(args.prompt === undefined ? {} : { prompt: args.prompt.trim() }),
      ...(args.imageUrls === undefined ? {} : { imageUrls: args.imageUrls }),
      status,
      ...(args.provider === undefined ? {} : { provider: args.provider }),
      ...(args.providerJobId === undefined ? {} : { providerJobId: args.providerJobId }),
      ...(args.assetId === undefined ? {} : { assetId: args.assetId }),
      ...(args.errorCode === undefined ? {} : { errorCode: args.errorCode }),
      legacyJobId,
      legacyStatus: args.legacyStatus,
      reconciledAt: now,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

const allowedTransitions: Record<string, readonly string[]> = {
  queued: ["running", "failed"],
  running: ["retrying", "completed", "failed", "verification_pending"],
  retrying: ["running", "failed", "verification_pending"],
};

export const create = mutation({
  args: {
    idempotencyKey: v.string(),
    kind: mediaKind,
    mediaType,
    prompt: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  returns: v.id("mediaJobs"),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    return await createJobForIdentity(ctx, { ...args, tokenIdentifier: identity.tokenIdentifier });
  },
});

/**
 * Internal creation for server actions (provider execution paths). Actions do
 * not carry caller identity into runMutation, so the verified token identifier
 * is passed explicitly by the action that derived it.
 */
export const createInternal = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    idempotencyKey: v.string(),
    kind: mediaKind,
    mediaType,
    prompt: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  },
  returns: v.id("mediaJobs"),
  handler: async (ctx, args) => {
    return await createJobForIdentity(ctx, args);
  },
});

async function createJobForIdentity(
  ctx: MutationCtx,
  args: {
    tokenIdentifier: string;
    idempotencyKey: string;
    kind: "media_generation" | "virtual_try_on";
    mediaType: "image" | "video";
    prompt?: string;
    imageUrls?: string[];
  },
): Promise<Id<"mediaJobs">> {
  const idempotencyKey = requireIdempotencyKey(args.idempotencyKey);
  validateJobInput(args.prompt, args.imageUrls);
  const existing = await ctx.db
    .query("mediaJobs")
    .withIndex("by_token_identifier_and_idempotency_key", (q) =>
      q.eq("tokenIdentifier", args.tokenIdentifier).eq("idempotencyKey", idempotencyKey),
    )
    .unique();
  if (existing) {
    if (existing.kind !== args.kind || existing.mediaType !== args.mediaType) {
      throw new Error("The idempotency key is already bound to a different media operation.");
    }
    return existing._id;
  }

  const now = Date.now();
  return await ctx.db.insert("mediaJobs", {
    tokenIdentifier: args.tokenIdentifier,
    idempotencyKey,
    kind: args.kind,
    mediaType: args.mediaType,
    ...(args.prompt === undefined ? {} : { prompt: args.prompt.trim() }),
    ...(args.imageUrls === undefined ? {} : { imageUrls: args.imageUrls }),
    status: "queued",
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export const get = query({
  args: { jobId: v.id("mediaJobs") },
  returns: v.union(mediaJob, v.null()),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.tokenIdentifier !== identity.tokenIdentifier) return null;
    return job;
  },
});

export const transition = internalMutation({
  args: {
    jobId: v.id("mediaJobs"),
    from: mediaStatus,
    to: mediaStatus,
    provider: v.optional(v.string()),
    providerJobId: v.optional(v.string()),
    assetId: v.optional(v.id("mediaAssets")),
    outfitId: v.optional(v.id("wardrobeOutfits")),
    errorCode: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Media job not found.");
    if (job.status !== args.from) throw new Error(`Media job state changed from ${args.from}.`);
    if (!allowedTransitions[job.status]?.includes(args.to)) {
      throw new Error(`Media job cannot transition from ${job.status} to ${args.to}.`);
    }
    if (["completed", "failed", "verification_pending"].includes(job.status)) {
      throw new Error("A terminal or verification-pending media job cannot transition.");
    }
    if (args.to === "completed" && (!args.provider || (!args.assetId && !args.outfitId))) {
      throw new Error("Completed job requires a provider and a durable output.");
    }
    const now = Date.now();
    await ctx.db.patch("mediaJobs", args.jobId, {
      status: args.to,
      provider: args.provider ?? job.provider,
      ...(args.providerJobId === undefined ? {} : { providerJobId: args.providerJobId }),
      ...(args.assetId === undefined ? {} : { assetId: args.assetId }),
      ...(args.outfitId === undefined ? {} : { outfitId: args.outfitId }),
      ...(args.errorCode === undefined ? {} : { errorCode: args.errorCode }),
      attemptCount: job.attemptCount + (args.to === "running" || args.to === "retrying" ? 1 : 0),
      updatedAt: now,
    });
    return null;
  },
});
