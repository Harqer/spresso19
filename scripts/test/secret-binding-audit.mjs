import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = path.join(repoRoot, "functions/src");
const terraformPath = path.join(repoRoot, "terraform/main.tf");
const launchSecrets = ["PARALLEL_API_KEY", "SERPAPI_API_KEY"];

async function collectTypeScriptFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(entryPath);
    return entry.name.endsWith(".ts") ? [entryPath] : [];
  }));
  return files.flat();
}

const files = await collectTypeScriptFiles(sourceRoot);
const sources = await Promise.all(files.map(async (file) => [file, await fs.readFile(file, "utf8")]));
const allSource = sources.map(([, source]) => source).join("\n");
const terraform = await fs.readFile(terraformPath, "utf8");
const declaredSecrets = [...new Set([...allSource.matchAll(/defineSecret\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1]))].sort();
const exportedFunctions = [...new Set([...allSource.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*on(?:Call|Request|MessagePublished)\b/g)].map((match) => match[1]))].sort();
const terraformSecrets = new Set([...terraform.matchAll(/"([A-Z][A-Z0-9_]+)"/g)].map((match) => match[1]));
const aiSource = await fs.readFile(path.join(sourceRoot, "ai/index.ts"), "utf8");
const searchProductsSource = await fs.readFile(path.join(sourceRoot, "ai/tools/searchProducts.ts"), "utf8");

const callableSecrets = Object.fromEntries(exportedFunctions.map((name) => [name, []]));
callableSecrets.discoverPersonalizedProducts = ["GEMINI_API_KEY", "PARALLEL_API_KEY"];
callableSecrets.chatStream = [
  "GEMINI_API_KEY",
  "HIGGSFIELD_API_KEY_ID",
  "HIGGSFIELD_KEY_SECRET",
  "SERPAPI_API_KEY",
  "PARALLEL_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
];

const errors = [];
for (const secret of launchSecrets) {
  if (!declaredSecrets.includes(secret)) errors.push(`${secret} is not declared with defineSecret.`);
  if (!terraformSecrets.has(secret)) errors.push(`${secret} is not declared in terraform/main.tf.`);
}
if (!/discoverPersonalizedProducts\s*=\s*onCall\(\{[^}]*secrets:\s*\[geminiApiKey,\s*parallelApiKey\]/s.test(aiSource)) {
  errors.push("discoverPersonalizedProducts is not bound to PARALLEL_API_KEY.");
}
if (!/shopperSecrets\s*=\s*\[\.\.\.mediaSecrets,\s*serpApiKey,\s*parallelApiKey/s.test(aiSource)
  || !/chatStream\s*=\s*onRequest\(\{\s*secrets:\s*shopperSecrets/s.test(aiSource)) {
  errors.push("chatStream is not bound to SERPAPI_API_KEY and PARALLEL_API_KEY.");
}
if (!/defineSecret\(\s*["']SERPAPI_API_KEY["']\s*\)/.test(searchProductsSource)) {
  errors.push("searchProducts does not declare SERPAPI_API_KEY.");
}
if (!/DISCOVERY_INFRASTRUCTURE_UNAVAILABLE:\s*SERPAPI_API_KEY/.test(searchProductsSource)) {
  errors.push("searchProducts does not fail closed when SerpAPI infrastructure is unavailable.");
}
if (!/PARALLEL_API_KEY is not configured for this environment/.test(aiSource)) {
  errors.push("discoverPersonalizedProducts does not fail closed when Parallel infrastructure is unavailable.");
}

const report = {
  ok: errors.length === 0,
  launchSecrets,
  declaredSecrets,
  unmanagedDeclaredSecrets: declaredSecrets.filter((secret) => !terraformSecrets.has(secret)),
  callableSecrets,
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
