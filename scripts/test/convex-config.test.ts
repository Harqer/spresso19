import assert from "node:assert/strict";
import test from "node:test";
import { resolveConvexUrl } from "../../src/lib/convexConfig.ts";

const productionUrl = "https://woozy-anteater-572.convex.cloud";
const developmentUrl = "https://decisive-dolphin-161.convex.cloud";

test("requires the platform-supplied URL in production", () => {
  assert.throws(
    () => resolveConvexUrl({ isProduction: true }),
    /production convex configuration is missing/i,
  );
});

test("accepts the platform-supplied production deployment URL", () => {
  assert.equal(
    resolveConvexUrl({ isProduction: true, configuredUrl: productionUrl }),
    productionUrl,
  );
});

test("does not select a development URL when production configuration is absent", () => {
  assert.throws(
    () => resolveConvexUrl({ isProduction: true }),
    /production convex configuration is missing/i,
  );
  assert.notEqual(resolveConvexUrl({ isProduction: false, configuredUrl: developmentUrl }), productionUrl);
});

test("returns the configured development deployment only for development", () => {
  assert.equal(
    resolveConvexUrl({ isProduction: false, configuredUrl: developmentUrl }),
    developmentUrl,
  );
});

test("keeps development without configuration explicitly unconfigured", () => {
  assert.equal(resolveConvexUrl({ isProduction: false }), undefined);
});

test("rejects non-HTTPS, credential-bearing, and non-Convex URLs", () => {
  for (const configuredUrl of [
    "http://decisive-dolphin-161.convex.cloud",
    "https://user:pass@decisive-dolphin-161.convex.cloud",
    "https://decisive-dolphin-161.convex.cloud/path",
    "https://example.com",
  ]) {
    assert.throws(() => resolveConvexUrl({ isProduction: true, configuredUrl }));
  }
});
