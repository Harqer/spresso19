import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const bundleDir = "composeApp/build/dist/wasmJs/productionExecutable";
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;

test("the production wasm bundle stays within the deployment budget", async () => {
  assert.ok(fs.existsSync(bundleDir), "production wasm bundle is missing; run :composeApp:wasmJsBrowserDistribution first");
  const files = fs.readdirSync(bundleDir, { recursive: true });
  const total = files
    .filter((entry) => {
      const full = path.join(bundleDir, entry.toString());
      return fs.statSync(full).isFile();
    })
    .reduce((sum, entry) => sum + fs.statSync(path.join(bundleDir, entry.toString())).size, 0);
  assert.ok(total <= MAX_TOTAL_BYTES, `bundle is ${total} bytes; budget is ${MAX_TOTAL_BYTES}`);
  console.log(`bundle budget ok: ${(total / (1024 * 1024)).toFixed(1)}MiB of ${(MAX_TOTAL_BYTES / (1024 * 1024))}MiB`);
});
