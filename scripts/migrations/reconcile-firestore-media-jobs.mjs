import { readFile, writeFile } from "node:fs/promises";

const ALLOWED_COLLECTION = "virtualTryOnJobs";
const ALLOWED_MEDIA_TYPES = new Set(["image", "video"]);
const LEGACY_STATUSES = new Set(["queued", "running", "processing", "retrying", "completed", "failed", "canceled", "unknown"]);
const HEX64 = /^[a-f0-9]{64}$/i;

function statusFor(record) {
  if (record.status === "completed") {
    return record.hasOutput === true && typeof record.provider === "string" && record.provider.trim()
      && typeof record.providerJobId === "string" && record.providerJobId.trim()
      && typeof record.convexAssetId === "string" && record.convexAssetId.trim()
      && typeof record.outputHash === "string" && HEX64.test(record.outputHash)
      ? "completed"
      : "verification_pending";
  }
  if (record.status === "failed" || record.status === "canceled") return "failed";
  return "verification_pending";
}

function validate(record) {
  const errors = [];
  if (!record || typeof record !== "object" || Array.isArray(record)) return ["record must be an object"];
  if (record.collection !== ALLOWED_COLLECTION) errors.push("unsupported legacy collection");
  for (const field of ["documentId", "uid", "tokenIdentifier", "jobId", "idempotencyKey"]) {
    if (typeof record[field] !== "string" || record[field].trim().length === 0 || record[field].length > 1_000) errors.push(`${field} is required`);
  }
  if (!ALLOWED_MEDIA_TYPES.has(record.mediaType)) errors.push("mediaType is invalid");
  if (typeof record.status !== "string" || !LEGACY_STATUSES.has(record.status)) errors.push("status is invalid");
  return errors;
}

export function reconcileRecords(records) {
  const seen = new Set();
  const statusCounts = {};
  let invalidCount = 0;
  let duplicateCount = 0;
  const reconciled = records.map((record) => {
    const errors = validate(record);
    const key = typeof record?.tokenIdentifier === "string" && typeof record?.idempotencyKey === "string"
      ? `${record.tokenIdentifier}:${record.idempotencyKey}`
      : null;
    if (key && seen.has(key)) {
      errors.push("duplicate owner/idempotency key");
      duplicateCount += 1;
    } else if (key) {
      seen.add(key);
    }
    if (errors.length > 0) invalidCount += 1;
    const targetStatus = errors.length > 0 ? null : statusFor(record);
    if (targetStatus) statusCounts[targetStatus] = (statusCounts[targetStatus] || 0) + 1;
    return {
      sourceCollection: record?.collection,
      sourceDocumentId: record?.documentId,
      legacyJobId: record?.jobId,
      tokenIdentifier: record?.tokenIdentifier,
      idempotencyKey: record?.idempotencyKey,
      targetStatus,
      provider: record?.provider,
      providerJobId: record?.providerJobId,
      convexAssetId: record?.convexAssetId,
      errors,
    };
  });
  return { records: reconciled, invalidCount, duplicateCount, statusCounts };
}

export async function run(args = process.argv.slice(2)) {
  const inputIndex = args.indexOf("--input");
  const outputIndex = args.indexOf("--output");
  if (inputIndex < 0 || outputIndex < 0 || !args[inputIndex + 1] || !args[outputIndex + 1]) {
    throw new Error("Usage: node reconcile-firestore-media-jobs.mjs --input legacy.ndjson --output report.json");
  }
  const input = await readFile(args[inputIndex + 1], "utf8");
  const records = input.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      return { collection: "invalid", documentId: `line-${index + 1}` };
    }
  });
  const report = reconcileRecords(records);
  await writeFile(args[outputIndex + 1], `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  return report.invalidCount === 0 && report.duplicateCount === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Reconciliation failed.");
    process.exitCode = 2;
  }
}
