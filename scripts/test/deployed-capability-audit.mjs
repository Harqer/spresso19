import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const endpointContract = JSON.parse(await fs.readFile(path.join(repoRoot, "contracts/production-endpoints.json"), "utf8"));
const firebaseConfig = JSON.parse(await fs.readFile(path.join(repoRoot, "firebase.json"), "utf8"));
const rootExports = await fs.readFile(path.join(repoRoot, "functions/src/index.ts"), "utf8");
const webApiSource = await fs.readFile(path.join(repoRoot, "functions/src/webapi.ts"), "utf8");
const live = process.argv.includes("--live");
const errors = [];
const rewrite = firebaseConfig.hosting?.rewrites?.find((entry) => entry.source === "/api/**");

if (rewrite?.function !== "webApi") errors.push("/api/** is not routed to webApi.");
if (!/export\s*\{\s*webApi\s*\}\s*from\s*["']\.\/webapi["']/.test(rootExports)) {
  errors.push("functions/src/index.ts does not export webApi.");
}
if (!/export\s+const\s+webApi\s*=\s*onRequest\b/.test(webApiSource)) {
  errors.push("webApi is not an exported HTTP Function.");
}
if (/res\.status\(200\)\.json\(\{\s*status:\s*["']ok["']\s*\}\)/.test(webApiSource)) {
  errors.push("web-api-health returns a static success payload instead of checking infrastructure.");
}

const endpointChecks = [];
if (live) {
  for (const endpoint of endpointContract.endpoints) {
    const url = new URL(endpoint.path, endpointContract.baseUrl).toString();
    try {
      const response = await fetch(url, { method: endpoint.method, redirect: "manual" });
      const contentType = response.headers.get("content-type") || "";
      let body = null;
      if (contentType.includes("application/json")) body = await response.json();
      const check = { name: endpoint.name, url, status: response.status, contentType, body };
      endpointChecks.push(check);
      if (!endpoint.expectedStatuses.includes(response.status)) errors.push(`${endpoint.name} returned ${response.status}, expected ${endpoint.expectedStatuses.join(", ")}.`);
      if (endpoint.requiresJson && !contentType.includes("application/json")) errors.push(`${endpoint.name} did not return JSON.`);
      if (body && body.status === "ok" && !body.dependencies) errors.push(`${endpoint.name} returned an unverified success payload.`);
    } catch (error) {
      endpointChecks.push({ name: endpoint.name, url, error: error instanceof Error ? error.message : String(error) });
      errors.push(`${endpoint.name} could not be reached.`);
    }
  }
}

const report = {
  ok: errors.length === 0,
  live,
  baseUrl: endpointContract.baseUrl,
  endpointChecks,
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
