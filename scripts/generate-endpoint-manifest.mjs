import fs from "node:fs/promises";
import path from "node:path";

// Regenerates contracts/production-endpoints.json from the live convex/http.ts
// route inventory so the contract can never drift from the source. Run this
// whenever an http.route is added or changed:
//
//   node scripts/generate-endpoint-manifest.mjs
//
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const httpPath = path.join(repoRoot, "convex/http.ts");
const manifestPath = path.join(repoRoot, "contracts/production-endpoints.json");

const PROD_CONVEX_SITE = "https://woozy-anteater-572.convex.site";
const PROBED_ENDPOINTS = [
  { name: "bridge health", path: "/api/health", method: "GET", expectedStatuses: [200, 503], requiresJson: true },
  { name: "account identity guard", path: "/api/account/me", method: "GET", expectedStatuses: [200, 401], requiresJson: true },
];

const httpSource = await fs.readFile(httpPath, "utf8");
const routes = [...httpSource.matchAll(/http\.route\(\{\s*path:\s*["']([^"']+)["']\s*,\s*method:\s*["']([A-Z]+)["']/g)];
if (routes.length === 0) {
  console.error("No http.route declarations found in convex/http.ts; refusing to write an empty manifest.");
  process.exit(1);
}

const byPath = new Map();
for (const [, p, method] of routes) {
  if (!byPath.has(p)) byPath.set(p, []);
  byPath.get(p).push(method);
}

const sorted = [...byPath.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const manifest = {
  baseUrl: PROD_CONVEX_SITE,
  description:
    "Convex HTTP bridge (api.*) exposed at the production Convex site. Generated from convex/http.ts route inventory; regenerate with scripts/generate-endpoint-manifest.mjs when routes change.",
  routes: sorted.map(([routePath, methods]) => ({ path: routePath, methods: methods.sort() })),
  endpoints: PROBED_ENDPOINTS,
};

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${sorted.length} routes to contracts/production-endpoints.json`);
