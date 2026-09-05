import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const manifestPath = path.resolve("contracts/production-endpoints.json");

export async function loadManifest(file = manifestPath) {
  const source = await fs.readFile(file, "utf8");
  const manifest = JSON.parse(source);
  if (!manifest.baseUrl || !Array.isArray(manifest.endpoints) || manifest.endpoints.length === 0) {
    throw new Error("production endpoint manifest must declare a baseUrl and endpoints");
  }
  return manifest;
}

export async function runSmoke({ manifest, fetchImpl = fetch, baseUrl = process.env.SPRESSO_SMOKE_BASE_URL }) {
  const target = baseUrl || manifest.baseUrl;
  const results = [];
  for (const endpoint of manifest.endpoints) {
    const url = new URL(endpoint.path, target).toString();
    try {
      const response = await fetchImpl(url, {
        method: endpoint.method,
        headers: {
          Accept: "application/json",
          ...(process.env.SPRESSO_SMOKE_AUTH_TOKEN ? { Authorization: `Bearer ${process.env.SPRESSO_SMOKE_AUTH_TOKEN}` } : {}),
          ...(process.env.SPRESSO_SMOKE_APPCHECK_TOKEN ? { "X-Firebase-AppCheck": process.env.SPRESSO_SMOKE_APPCHECK_TOKEN } : {})
        }
      });
      const contentType = response.headers.get("content-type") || "";
      results.push({
        name: endpoint.name,
        url,
        status: response.status,
        ok: endpoint.expectedStatuses.includes(response.status) && (!endpoint.requiresJson || contentType.includes("application/json"))
      });
    } catch (error) {
      results.push({ name: endpoint.name, url, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = await loadManifest();
  const results = await runSmoke({ manifest });
  for (const result of results) console.log(JSON.stringify(result));
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}
