"use node";

import { action, env, type ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "../lib/identity";
import { createMediaKey, MAX_GENERATED_MEDIA_BYTES } from "./boundary";
import { BunnyMediaStore, bunnyConfigFromEnv } from "./bunnyStore";
import type { Id } from "../_generated/dataModel";

const FETCH_TIMEOUT_MS = 30_000;

function sourceHosts(): string[] {
  return (env.BUNNY_SOURCE_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function assertAllowedSource(sourceUrl: string): URL {
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== "https:") throw new Error("Generated media source must use HTTPS.");
  const allowed = sourceHosts();
  if (allowed.length === 0 || !allowed.includes(parsed.hostname.toLowerCase())) {
    throw new Error("Generated media source is not an approved provider.");
  }
  return parsed;
}

async function readLimited(response: Response): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_GENERATED_MEDIA_BYTES) throw new Error("Generated media exceeds the 25 MiB limit.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Generated media response has no body.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.byteLength;
    if (total > MAX_GENERATED_MEDIA_BYTES) {
      await reader.cancel();
      throw new Error("Generated media exceeds the 25 MiB limit.");
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export const storeUploadedBytes = action({
  args: {
    bytes: v.bytes(),
    mimeType: v.string(),
    jobId: v.optional(v.string()),
  },
  returns: v.object({
    assetId: v.id("mediaAssets"),
    mediaKey: v.string(),
    mimeType: v.string(),
    byteLength: v.number(),
    sha256: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const bytes = new Uint8Array(args.bytes);
    const media = await createMediaKey(identity.firebaseUid, bytes, args.mimeType);
    const store = new BunnyMediaStore(bunnyConfigFromEnv(env));
    await store.putGenerated(media, bytes);
    const assetId: Id<"mediaAssets"> = await ctx.runMutation(internal.media.recordAsset, {
      tokenIdentifier: identity.tokenIdentifier,
      mediaKey: media.mediaKey,
      mimeType: media.mimeType,
      byteLength: media.byteLength,
      sha256: media.sha256,
      jobId: args.jobId,
    });
    return { assetId, ...media };
  },
});

async function storeFromUrl(ctx: ActionCtx, identity: { tokenIdentifier: string; firebaseUid: string }, sourceUrl: string, mimeType: string, jobId?: string): Promise<{ assetId: Id<"mediaAssets">; mediaKey: string }> {
  const source = assertAllowedSource(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source, { signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error(`Generated media source failed (${response.status}).`);
    const bytes = await readLimited(response);
    const contentType = (response.headers.get("content-type") || mimeType).split(";", 1)[0].trim();
    const media = await createMediaKey(identity.firebaseUid, bytes, contentType);
    const store = new BunnyMediaStore(bunnyConfigFromEnv(env));
    await store.putGenerated(media, bytes);
    const assetId: Id<"mediaAssets"> = await ctx.runMutation(internal.media.recordAsset, {
      tokenIdentifier: identity.tokenIdentifier,
      mediaKey: media.mediaKey,
      mimeType: media.mimeType,
      byteLength: media.byteLength,
      sha256: media.sha256,
      jobId,
    });
    return { assetId, mediaKey: media.mediaKey };
  } finally {
    clearTimeout(timeout);
  }
}

export const storeGeneratedFromUrl = action({
  args: {
    sourceUrl: v.string(),
    mimeType: v.string(),
    jobId: v.optional(v.string()),
  },
  returns: v.object({
    assetId: v.id("mediaAssets"),
    mediaKey: v.string(),
    mimeType: v.string(),
    byteLength: v.number(),
    sha256: v.string(),
  }),
  handler: async (ctx, args): Promise<{ assetId: Id<"mediaAssets">; mediaKey: string; mimeType: string; byteLength: number; sha256: string }> => {
    const identity = await requireFirebaseIdentity(ctx);
    const { assetId, ...media } = await storeFromUrl(ctx, identity, args.sourceUrl, args.mimeType, args.jobId);
    const created = await ctx.runQuery(internal.media.getOwnedAsset, { assetId, tokenIdentifier: identity.tokenIdentifier });
    if (!created) throw new Error("Stored media could not be verified.");
    return { assetId, mediaKey: created.mediaKey, mimeType: created.mimeType, byteLength: created.byteLength, sha256: created.sha256 };
  },
});

/**
 * Virtual try-on provider execution as a mediaJobs operation. Image try-on
 * runs through the configured fal.ai model; video try-on and any
 * unconfigured-provider case fail with a typed error code instead of falling
 * back to a different provider or a placeholder image. Output bytes go
 * through the existing Bunny media boundary via storeGeneratedFromUrl.
 */
const FAL_IMAGE_TRYON_MODEL = "fal-ai/fashn/tryon/v1.6";
const FAL_POLL_INTERVAL_MS = 2_000;
const FAL_POLL_TIMEOUT_MS = 120_000;

type FalTryOnResponse = { request_id?: string; status?: string; response_url?: string; error?: string };

async function falRequest(path: string, apiKey: string, body?: unknown, method: "POST" | "GET" = "POST"): Promise<FalTryOnResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`https://fal.run${path}`, {
      method,
      signal: controller.signal,
      headers: { Authorization: `Key ${apiKey}`, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`fal.ai request failed (${response.status}).`);
    return await response.json() as FalTryOnResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function runFalImageTryOn(ctx: ActionCtx, identity: { tokenIdentifier: string; firebaseUid: string }, jobId: Id<"mediaJobs">, personImageUrl: string, garmentImageUrl: string): Promise<{ assetId: Id<"mediaAssets">; mediaKey: string }> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error("TRYON_PROVIDER_UNCONFIGURED: fal.ai is not configured in the deployment.");
  try {
    const submitted = await falRequest(`/${FAL_IMAGE_TRYON_MODEL}`, apiKey, {
      model_image_url: personImageUrl,
      garment_image_url: garmentImageUrl,
    });
    if (!submitted.request_id) throw new Error("fal.ai did not return a request id.");
    const deadline = Date.now() + FAL_POLL_TIMEOUT_MS;
    while (true) {
      if (Date.now() > deadline) throw new Error("fal.ai try-on did not finish in time.");
      const status = await falRequest(`/${FAL_IMAGE_TRYON_MODEL}/requests/${encodeURIComponent(submitted.request_id)}/status`, apiKey, undefined, "GET");
      if (status.status === "COMPLETED") break;
      if (status.error) throw new Error(`fal.ai try-on failed: ${status.error}`);
      await new Promise((resolve) => setTimeout(resolve, FAL_POLL_INTERVAL_MS));
    }
    const result = await falRequest(`/${FAL_IMAGE_TRYON_MODEL}/requests/${encodeURIComponent(submitted.request_id)}`, apiKey, undefined, "GET");
    const outputUrl = (result as unknown as { image?: { url?: string } }).image?.url;
    if (!outputUrl) throw new Error("fal.ai try-on returned no image.");
    return await storeFromUrl(ctx, identity, outputUrl, "image/jpeg", jobId);
  } catch (cause) {
    throw cause;
  }
}

export const runTryOnJob = action({
  args: {
    jobId: v.id("mediaJobs"),
    personImageUrl: v.string(),
    garmentImageUrl: v.string(),
  },
  returns: v.object({ jobId: v.id("mediaJobs"), status: v.string(), assetId: v.optional(v.id("mediaAssets")), mediaKey: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const job = await ctx.runQuery(api.mediaJobs.get, { jobId: args.jobId });
    if (!job || job.tokenIdentifier !== identity.tokenIdentifier) throw new Error("Media job not found.");
    if (job.kind !== "virtual_try_on") throw new Error("Job is not a virtual try-on operation.");
    if (job.status !== "queued") throw new Error("Try-on job is already in progress or finished.");

    if (job.mediaType === "video") {
      await ctx.runMutation(internal.mediaJobs.transition, { jobId: args.jobId, from: "queued", to: "failed", errorCode: "TRYON_VIDEO_UNSUPPORTED" });
      throw new Error("TRYON_VIDEO_UNSUPPORTED: video try-on has no verified provider in this deployment.");
    }

    await ctx.runMutation(internal.mediaJobs.transition, { jobId: args.jobId, from: "queued", to: "running", provider: "fal-ai" });
    try {
      const stored = await runFalImageTryOn(ctx, identity, args.jobId, args.personImageUrl, args.garmentImageUrl);
      await ctx.runMutation(internal.mediaJobs.transition, {
        jobId: args.jobId,
        from: "running",
        to: "completed",
        provider: "fal-ai",
        assetId: stored.assetId,
      });
      return { jobId: args.jobId, status: "completed", assetId: stored.assetId, mediaKey: stored.mediaKey };
    } catch (cause) {
      const errorCode = cause instanceof Error && cause.message.startsWith("TRYON_PROVIDER_UNCONFIGURED") ? "TRYON_PROVIDER_UNCONFIGURED" : "TRYON_PROVIDER_FAILED";
      await ctx.runMutation(internal.mediaJobs.transition, {
        jobId: args.jobId,
        from: "running",
        to: "failed",
        errorCode,
      }).catch(() => undefined);
      throw cause;
    }
  },
});

export const createPrivateReadUrl = action({
  args: { assetId: v.id("mediaAssets") },
  returns: v.object({ url: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const asset = await ctx.runQuery(internal.media.getOwnedAsset, {
      assetId: args.assetId,
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!asset) throw new Error("Media asset not found.");
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
    const store = new BunnyMediaStore(bunnyConfigFromEnv(env));
    const url = await store.createReadUrl(identity.firebaseUid, asset.mediaKey);
    return { url, expiresAt };
  },
});
