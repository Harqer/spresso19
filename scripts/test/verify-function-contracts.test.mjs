import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

test("client callable contract resolves to exported functions", async () => {
  const run = promisify(execFile);
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  await assert.doesNotReject(run("node", ["scripts/verify-function-contracts.mjs"], { cwd: repoRoot, maxBuffer: 100000 }));
});
