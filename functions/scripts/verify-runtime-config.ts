import * as functions from "../lib";

type FunctionLike = {
  __endpoint?: {
    availableMemoryMb?: number | string;
    timeoutSeconds?: number;
    minInstances?: number;
    maxInstances?: number;
    concurrency?: number | null;
    secretEnvironmentVariables?: Array<{ key: string }>;
    callableTrigger?: unknown;
    labels?: Record<string, string>;
  };
};

const PAID_FUNCTIONS = new Set([
  "generateCreatorCampaign",
  "vitposeOrchestrateFit",
  "seasonalStyling",
  "generateRecipeBargainChef",
  "parseReceipt",
  "lensSearch",
  "generateOutfit",
  "generateResponseFromAudio",
]);

const KNOWN_SECRETS = new Set([
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PUBLISHABLE_KEY",
  "GEMINI_API_KEY",
  "HIGGSFIELD_API_KEY_ID",
  "HIGGSFIELD_KEY_SECRET",
  "SERPAPI_API_KEY",
  "PARALLEL_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "GOOGLE_WALLET_PRIVATE_KEY",
  "GOOGLE_WALLET_ISSUER_ID",
  "GOOGLE_WALLET_CLASS_ID",
  "GOOGLE_WALLET_SA_EMAIL",
  "APIFY_API_TOKEN",
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "CDP_WALLET_SECRET",
  "SPRESSO_TOKEN_CONTRACT_ADDRESS",
  "SPRESSO_TOKEN_SYMBOL",
  "SPRESSO_TOKEN_DECIMALS",
]);

const moduleRecord = functions as unknown as Record<string, unknown>;
const exports_ = Object.keys(moduleRecord).filter(
  (k) => typeof moduleRecord[k] === "function",
);

const problems: string[] = [];
const nonFunctions: string[] = [];
const missingBindings = new Set<string>(KNOWN_SECRETS);
const summary: string[] = [];

for (const name of exports_) {
  const fn = moduleRecord[name] as FunctionLike;
  const ep = fn?.__endpoint;
  if (!ep) {
    nonFunctions.push(name);
    continue;
  }

  for (const { key } of ep.secretEnvironmentVariables ?? []) {
    missingBindings.delete(key);
  }

  const isPaid = PAID_FUNCTIONS.has(name);

  // Firebase represents an unset option as a ResetValue sentinel object.
  const toNum = (v: unknown): number | null =>
    v != null && typeof v === "number" ? v : null;

  const mem = toNum(ep.availableMemoryMb);
  const max = toNum(ep.maxInstances);
  const min = toNum(ep.minInstances);
  const isResetMax = ep.maxInstances != null && max === null;

  if (isPaid) {
    if (mem === null || mem < 256) {
      problems.push(`[${name}] paid fn should be memory=256MiB, got ${mem ?? "default"}`);
    }
    if (toNum(ep.timeoutSeconds) !== 60) {
      problems.push(`[${name}] paid fn should timeoutSeconds=60, got ${toNum(ep.timeoutSeconds) ?? "default"}`);
    }
    if (max !== 10) {
      problems.push(`[${name}] paid fn should maxInstances=10, got ${max ?? "default(unbounded)"}`);
    }
  } else if (max === null) {
    problems.push(`[${name}] maxInstances not capped (${isResetMax ? "default=unbounded" : "unset"})`);
  }
  if (min !== null && min !== 0) {
    problems.push(`[${name}] minInstances should be 0, got ${min ?? "default"}`);
  }

  summary.push(
    `${name}: mem=${mem ?? "default"} timeout=${toNum(ep.timeoutSeconds) ?? "default"} ` +
      `max=${max ?? "UNCAPPED"} min=${min ?? "default(0)"} ` +
      `secrets=[${(ep.secretEnvironmentVariables ?? []).map((s) => s.key).join(", ")}]`,
  );
}

if (missingBindings.size > 0) {
  problems.push(
    `SECRETS NEVER BOUND on any exported function: ${[...missingBindings].sort().join(", ")}`,
  );
}

const cloudFunctions = exports_.length - nonFunctions.length;

console.log("=== RUNTIME CONFIG SUMMARY (from compiled lib __endpoint) ===");
summary.sort().forEach((s) => console.log(s));
console.log(`\n(non-function exports skipped: ${nonFunctions.join(", ")})`);

console.log("\n=== RESULT ===");
if (problems.length === 0) {
  console.log(`PASS: all ${cloudFunctions} cloud functions have valid runtime config; all ${KNOWN_SECRETS.size} known secrets bound.`);
  process.exit(0);
} else {
  console.log(`FAIL: ${problems.length} problem(s) across ${cloudFunctions} cloud functions`);
  problems.forEach((p) => console.log("  - " + p));
  process.exit(1);
}
