"use node";

import { action, env } from "../_generated/server";
import { internal } from "../_generated/api";
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
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const source = assertAllowedSource(args.sourceUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(source, { signal: controller.signal, redirect: "error" });
      if (!response.ok) throw new Error(`Generated media source failed (${response.status}).`);
      const bytes = await readLimited(response);
      const contentType = (response.headers.get("content-type") || args.mimeType).split(";", 1)[0].trim();
      const media = await createMediaKey(identity.firebaseUid, bytes, contentType);
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
    } finally {
      clearTimeout(timeout);
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
