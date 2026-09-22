import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const verifiedProductionOrigin = "https://woozy-anteater-572.convex.site";

function routePathsFromSource(httpSource) {
  // A path may be declared once per HTTP method; the contract documents unique
  // paths, so dedupe here.
  return [...new Set([...httpSource.matchAll(/http\.route\(\{\s*path:\s*["']([^"']+)["']/g)].map((match) => match[1]))];
}

function validateProductionBaseUrl(baseUrl) {
  const errors = [];
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    return ["production endpoint baseUrl is not a valid URL."];
  }
  if (url.origin !== verifiedProductionOrigin) {
    errors.push(`production endpoint baseUrl must be ${verifiedProductionOrigin}.`);
  }
  if (url.protocol !== "https:") errors.push("production endpoint baseUrl must use HTTPS.");
  if (url.username || url.password) errors.push("production endpoint baseUrl must not contain credentials.");
  if (url.pathname !== "/" || url.search || url.hash) errors.push("production endpoint baseUrl must be an origin without a path, query, or fragment.");
  return errors;
}

export function validateSourceConfiguration({ endpointContract, firebaseConfig, httpSource }) {
  const errors = validateProductionBaseUrl(endpointContract.baseUrl);
  const rewrite = firebaseConfig.hosting?.rewrites?.find((entry) => entry.source === "**");
  if (!rewrite?.destination) errors.push("Hosting must keep the SPA catch-all rewrite.");
  if (firebaseConfig.hosting?.rewrites?.some((entry) => entry.source === "/api/**")) {
    errors.push("Hosting must not route /api/** to a Functions webApi plane.");
  }

  const contractRoutes = endpointContract.routes;
  if (!Array.isArray(contractRoutes) || contractRoutes.length === 0) {
    errors.push("production endpoint contract must document the route inventory.");
  } else {
    const routePaths = contractRoutes.map((route) => route.path);
    if (new Set(routePaths).size !== routePaths.length) errors.push("production endpoint contract contains duplicate routes.");
    const sourcePaths = routePathsFromSource(httpSource);
    if (sourcePaths.length !== routePaths.length || sourcePaths.some((routePath) => !routePaths.includes(routePath))) {
      errors.push("production endpoint contract does not match the convex/http.ts route inventory.");
    }
  }
  for (const endpoint of endpointContract.endpoints ?? []) {
    const route = contractRoutes.find((candidate) => candidate.path === endpoint.path);
    if (!route) errors.push(`${endpoint.name} is not represented in the documented route inventory.`);
    else if (!route.methods.includes(endpoint.method)) errors.push(`${endpoint.name} uses an undocumented HTTP method.`);
  }

  return errors;
}

async function loadSourceConfiguration() {
  const endpointContract = JSON.parse(await fs.readFile(path.join(repoRoot, "contracts/production-endpoints.json"), "utf8"));
  const firebaseConfig = JSON.parse(await fs.readFile(path.join(repoRoot, "firebase.json"), "utf8"));
  const httpSource = await fs.readFile(path.join(repoRoot, "convex/http.ts"), "utf8");
  return { endpointContract, firebaseConfig, httpSource };
}

const live = process.argv.includes("--live");
const configuration = await loadSourceConfiguration();
const errors = validateSourceConfiguration(configuration);
const endpointChecks = [];

if (live) {
  for (const endpoint of configuration.endpointContract.endpoints) {
    const url = new URL(endpoint.path, configuration.endpointContract.baseUrl).toString();
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
  baseUrl: configuration.endpointContract.baseUrl,
  endpointChecks,
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
