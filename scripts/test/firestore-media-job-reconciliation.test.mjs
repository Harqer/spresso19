import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { reconcileRecords } from "../migrations/reconcile-firestore-media-jobs.mjs";

test("reconciliation preserves verified completion and makes ambiguous completion pending", () => {
  const result = reconcileRecords([
    {
      collection: "virtualTryOnJobs",
      documentId: "owner_job-verified",
      uid: "owner",
      tokenIdentifier: "https://securetoken.google.com/get-spresso:owner",
      jobId: "job-verified",
      idempotencyKey: "request-verified",
      mediaType: "image",
      status: "completed",
      hasOutput: true,
      outputHash: "a".repeat(64),
      provider: "verified-provider",
      providerJobId: "provider-job-1",
      convexAssetId: "j57asset",
    },
    {
      collection: "virtualTryOnJobs",
      documentId: "owner_job-ambiguous",
      uid: "owner",
      tokenIdentifier: "https://securetoken.google.com/get-spresso:owner",
      jobId: "job-ambiguous",
      idempotencyKey: "request-ambiguous",
      mediaType: "image",
      status: "completed",
      hasOutput: true,
      outputHash: "b".repeat(64),
      provider: "verified-provider",
    },
  ]);

  assert.equal(result.invalidCount, 0);
  assert.equal(result.duplicateCount, 0);
  assert.deepEqual(result.statusCounts, { completed: 1, verification_pending: 1 });
  assert.equal(result.records[0].targetStatus, "completed");
  assert.equal(result.records[1].targetStatus, "verification_pending");
});

test("reconciliation reports invalid rows and duplicate ownership keys", () => {
  const result = reconcileRecords([
    {
      collection: "virtualTryOnJobs",
      documentId: "one",
      uid: "owner",
      tokenIdentifier: "token",
      jobId: "job-1",
      idempotencyKey: "same-request",
      mediaType: "image",
      status: "failed",
    },
    {
      collection: "virtualTryOnJobs",
      documentId: "two",
      uid: "owner",
      tokenIdentifier: "token",
      jobId: "job-2",
      idempotencyKey: "same-request",
      mediaType: "image",
      status: "failed",
    },
    { collection: "unexpected", documentId: "bad" },
  ]);

  assert.equal(result.invalidCount, 2);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.records[1].errors[0], "duplicate owner/idempotency key");
  assert.equal(result.records[2].errors[0], "unsupported legacy collection");
});

test("CLI writes a report without mutating the source manifest", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "spresso-media-reconcile-"));
  const input = path.join(directory, "legacy.ndjson");
  const output = path.join(directory, "report.json");
  await writeFile(input, JSON.stringify({
    collection: "virtualTryOnJobs",
    documentId: "owner_job-1",
    uid: "owner",
    tokenIdentifier: "token",
    jobId: "job-1",
    idempotencyKey: "request-1",
    mediaType: "image",
    status: "failed",
  }) + "\n");

  const before = await readFile(input, "utf8");
  const { run } = await import("../migrations/reconcile-firestore-media-jobs.mjs");
  assert.equal(await run(["--input", input, "--output", output]), 0);
  assert.equal(await readFile(input, "utf8"), before);
  const report = JSON.parse(await readFile(output, "utf8"));
  assert.equal(report.invalidCount, 0);
  assert.equal(report.records[0].targetStatus, "failed");
});
