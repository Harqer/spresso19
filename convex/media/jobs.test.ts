/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const owner = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-media-owner",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-media-owner",
};
const other = {
  ...owner,
  subject: "firebase-media-other",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-media-other",
};

const createArgs = {
  idempotencyKey: "vto-request-123",
  kind: "virtual_try_on" as const,
  mediaType: "image" as const,
  prompt: "Show this jacket on me",
  imageUrls: ["https://merchant.example/jacket.jpg"],
};

test("media jobs are authenticated, idempotent, and owner-scoped", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);
  const first = await authenticated.mutation(api.mediaJobs.create, createArgs);
  const duplicate = await authenticated.mutation(api.mediaJobs.create, createArgs);

  expect(first).toBe(duplicate);
  expect(await authenticated.query(api.mediaJobs.get, { jobId: first })).toMatchObject({
    _id: first,
    tokenIdentifier: owner.tokenIdentifier,
    status: "queued",
    idempotencyKey: createArgs.idempotencyKey,
  });
  expect(await t.withIdentity(other).query(api.mediaJobs.get, { jobId: first })).toBeNull();
  await expect(t.query(api.mediaJobs.get, { jobId: first })).rejects.toThrow(/[Uu]nauthenticated/);
});

test("outfit generation completes its job with a durable outfit row", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);

  const jobId = await authenticated.mutation(api.mediaJobs.create, {
    idempotencyKey: "outfit-request-1",
    kind: "virtual_try_on",
    mediaType: "image",
    prompt: "outfit-for-cold-weather",
  });
  const outfitId = await authenticated.mutation(api.reactiveState.saveWardrobeOutfit, {
    clientId: "outfit-request-1",
    title: "Cold Weather Look",
    weatherCondition: "COLD_WINTER",
    temperatureText: "38°F Chilly Winter Day",
    items: [],
    stylingAdvice: "Layer up.",
    weatherMatchScore: 90,
    savedAt: Date.now(),
  });

  await t.mutation(internal.mediaJobs.transition, {
    jobId,
    from: "queued",
    to: "running",
    provider: "convex-gateway",
  });
  await t.mutation(internal.mediaJobs.transition, {
    jobId,
    from: "running",
    to: "completed",
    provider: "convex-gateway",
    outfitId,
  });

  const job = await authenticated.query(api.mediaJobs.get, { jobId });
  expect(job).toMatchObject({ status: "completed", outfitId, provider: "convex-gateway" });
});

test("legacy reconciliation is idempotent and keeps unverified completions pending", async () => {
  const t = convexTest(schema, modules);
  const first = await t.mutation(internal.mediaJobs.reconcileLegacy, {
    legacyJobId: "legacy-vto-1",
    legacyStatus: "completed",
    tokenIdentifier: owner.tokenIdentifier,
    idempotencyKey: "legacy-request-1",
    kind: "virtual_try_on",
    mediaType: "image",
    prompt: "Legacy try-on",
  });
  const duplicate = await t.mutation(internal.mediaJobs.reconcileLegacy, {
    legacyJobId: "legacy-vto-1",
    legacyStatus: "completed",
    tokenIdentifier: owner.tokenIdentifier,
    idempotencyKey: "legacy-request-1",
    kind: "virtual_try_on",
    mediaType: "image",
    prompt: "Legacy try-on",
  });

  expect(duplicate).toBe(first);
  expect(await t.withIdentity(owner).query(api.mediaJobs.get, { jobId: first })).toMatchObject({
    status: "verification_pending",
    legacyJobId: "legacy-vto-1",
    legacyStatus: "completed",
  });
});

test("legacy reconciliation rejects a cross-user asset", async () => {
  const t = convexTest(schema, modules);
  const otherAsset = await t.mutation(internal.media.recordAsset, {
    tokenIdentifier: other.tokenIdentifier,
    mediaKey: "private/users/firebase-media-other/generated/result.png",
    mimeType: "image/png",
    byteLength: 128,
    sha256: "b".repeat(64),
  });

  await expect(t.mutation(internal.mediaJobs.reconcileLegacy, {
    legacyJobId: "legacy-vto-2",
    legacyStatus: "completed",
    tokenIdentifier: owner.tokenIdentifier,
    idempotencyKey: "legacy-request-2",
    kind: "virtual_try_on",
    mediaType: "image",
    provider: "verified-provider",
    assetId: otherAsset,
  })).rejects.toThrow(/ownership/i);
});

test("media job transitions are compare-and-set and terminal states cannot regress", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);
  const jobId = await authenticated.mutation(api.mediaJobs.create, createArgs);

  await authenticated.mutation(internal.mediaJobs.transition, {
    jobId,
    from: "queued",
    to: "running",
    provider: "verified-provider",
  });
  const assetId = await authenticated.mutation(internal.media.recordAsset, {
    tokenIdentifier: owner.tokenIdentifier,
    mediaKey: "private/users/firebase-media-owner/generated/result.png",
    mimeType: "image/png",
    byteLength: 128,
    sha256: "a".repeat(64),
    jobId,
  });
  await authenticated.mutation(internal.mediaJobs.transition, {
    jobId,
    from: "running",
    to: "completed",
    provider: "verified-provider",
    providerJobId: "provider-job-123",
    assetId,
  });

  await expect(authenticated.mutation(internal.mediaJobs.transition, {
    jobId,
    from: "completed",
    to: "retrying",
    provider: "verified-provider",
  })).rejects.toThrow(/terminal|state|cannot transition/i);

  expect(await authenticated.query(api.mediaJobs.get, { jobId })).toMatchObject({
    status: "completed",
    assetId,
  });
});
