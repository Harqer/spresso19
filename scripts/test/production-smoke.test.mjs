import test from "node:test";
import assert from "node:assert/strict";
import { loadManifest, runSmoke } from "../smoke/production-smoke.mjs";

test("production smoke manifest contains real endpoint paths", async () => {
  const manifest = await loadManifest();
  assert.ok(manifest.baseUrl.startsWith("https://"));
  assert.ok(manifest.endpoints.every((endpoint) => endpoint.path.startsWith("/")));
  assert.ok(manifest.endpoints.every((endpoint) => endpoint.expectedStatuses.length > 0));
});

test("production smoke reports transport failures instead of inventing success", async () => {
  const manifest = { baseUrl: "https://example.invalid", endpoints: [{ name: "products", method: "GET", path: "/api/products", expectedStatuses: [200], requiresJson: true }] };
  const results = await runSmoke({ manifest, fetchImpl: async () => { throw new Error("offline"); } });
  assert.deepEqual(results[0].ok, false);
  assert.equal(results[0].error, "offline");
});

test("production smoke rejects HTML from a static host", async () => {
  const manifest = { baseUrl: "https://example.test", endpoints: [{ name: "products", method: "GET", path: "/api/products", expectedStatuses: [200], requiresJson: true }] };
  const results = await runSmoke({ manifest, fetchImpl: async () => new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }) });
  assert.equal(results[0].ok, false);
});
