import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const verifiedProductionOrigin = "https://get-spresso.web.app";

function routePathsFromSource(webApiSource) {
  const routeBlock = webApiSource.match(/export const WEB_API_ROUTES\s*=\s*\[(?<routes>[\s\S]*?)\]\s*as const/);
  if (!routeBlock?.groups?.routes) return [];
  return [...routeBlock.groups.routes.matchAll(/path:\s*["']([^"']+)["']/g)].map((match) => match[1]);
}

function normalizeEndpointPath(endpointPath) {
  return endpointPath.replace(/^\/api(?=\/|$)/, "") || "/";
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

export function validateSourceConfiguration({ endpointContract, firebaseConfig, rootExports, webApiSource }) {
  const errors = validateProductionBaseUrl(endpointContract.baseUrl);
  const rewrite = firebaseConfig.hosting?.rewrites?.find((entry) => entry.source === "/api/**");
  if (rewrite?.function !== "webApi") errors.push("/api/** is not routed to webApi.");
  if (!/export\s*\{\s*webApi\s*\}\s*from\s*["']\.\/webapi["']/.test(rootExports)) {
    errors.push("functions/src/index.ts does not export webApi.");
  }
  if (!/export\s+const\s+webApi\s*=\s*onRequest\b/.test(webApiSource)) {
    errors.push("webApi is not an exported HTTP Function.");
  }
  if (!/export\s+const\s+WEB_API_ROUTES\s*=/.test(webApiSource)) {
    errors.push("webApi route inventory is missing.");
  }
  if (/res\.status\(200\)\.json\(\{\s*status:\s*["']ok["']\s*\}\)/.test(webApiSource)) {
    errors.push("web-api-health returns a static success payload instead of checking infrastructure.");
  }

  const contractRoutes = endpointContract.routes;
  if (!Array.isArray(contractRoutes) || contractRoutes.length === 0) {
    errors.push("production endpoint contract must document the route inventory.");
  } else {
    const routePaths = contractRoutes.map((route) => route.path);
    if (new Set(routePaths).size !== routePaths.length) errors.push("production endpoint contract contains duplicate routes.");
    const sourcePaths = routePathsFromSource(webApiSource);
    if (sourcePaths.length !== routePaths.length || sourcePaths.some((routePath) => !routePaths.includes(routePath))) {
      errors.push("production endpoint contract does not match the webApi route inventory.");
    }
    for (const endpoint of endpointContract.endpoints ?? []) {
      const routePath = normalizeEndpointPath(endpoint.path);
      const route = contractRoutes.find((candidate) => candidate.path === routePath);
      if (!route) errors.push(`${endpoint.name} is not represented in the documented route inventory.`);
      else if (!route.methods.includes(endpoint.method)) errors.push(`${endpoint.name} uses an undocumented HTTP method.`);
    }
  }

  return errors;
}

async function loadSourceConfiguration() {
  const endpointContract = JSON.parse(await fs.readFile(path.join(repoRoot, "contracts/production-endpoints.json"), "utf8"));
  const firebaseConfig = JSON.parse(await fs.readFile(path.join(repoRoot, "firebase.json"), "utf8"));
  const rootExports = await fs.readFile(path.join(repoRoot, "functions/src/index.ts"), "utf8");
  const webApiSource = await fs.readFile(path.join(repoRoot, "functions/src/webapi.ts"), "utf8");
  return { endpointContract, firebaseConfig, rootExports, webApiSource };
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
