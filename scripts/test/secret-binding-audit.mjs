import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const convexConfig = await fs.readFile(path.join(repoRoot, "convex/convex.config.ts"), "utf8");
const discovery = await fs.readFile(path.join(repoRoot, "convex/discovery.ts"), "utf8");
const envExample = await fs.readFile(path.join(repoRoot, ".env.example"), "utf8").catch(() => "");

const requiredDiscoverySecrets = ["PARALLEL_API_KEY", "SERPAPI_API_KEY"];
const declaredInConfig = [...convexConfig.matchAll(/env:\s*\{([\s\S]*?)\n\s*\}/g)].flatMap((match) =>
  [...match[1].matchAll(/([A-Z][A-Z0-9_]+):\s*v\.optional\(v\.string\(\)\)/g)].map((item) => item[1]),
);
const errors = [];
for (const secret of requiredDiscoverySecrets) {
  if (!declaredInConfig.includes(secret)) errors.push(`${secret} is not declared in convex.config.ts.`);
  if (!new RegExp(`env\\.${secret}`).test(discovery)) errors.push(`${secret} is not consumed by the active discovery action.`);
}
if (!/Discovery providers returned no verified listings/.test(discovery)) {
  errors.push("Discovery does not fail closed when providers return no verified listings.");
}
if (/discoverPersonalizedProducts/.test(discovery)) {
  errors.push("Removed Firebase discovery callable still appears in Convex discovery source.");
}

const report = {
  ok: errors.length === 0,
  requiredDiscoverySecrets,
  declaredInConfig,
  envExampleMentionsDiscoverySecrets: requiredDiscoverySecrets.every((secret) => envExample.includes(secret)),
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
