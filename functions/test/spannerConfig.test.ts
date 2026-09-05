import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const testDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(testDir, "../src/database/spannerClient.ts"), "utf8");

test("Spanner defaults stay on the verified Google project and catalog resources", () => {
  assert.match(source, /process\.env\.GCLOUD_PROJECT\s*\|\|\s*["']get-spresso["']/);
  assert.match(source, /process\.env\.SPANNER_INSTANCE\s*\|\|\s*["']spresso-catalog["']/);
  assert.match(source, /process\.env\.SPANNER_DATABASE\s*\|\|\s*["']catalog_db["']/);
  assert.doesNotMatch(source, /spresso-(?:19|5561f)/);
});
