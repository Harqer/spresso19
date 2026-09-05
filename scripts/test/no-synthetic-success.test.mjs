import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("strict production scanner passes the current source tree", async () => {
  const { stdout } = await execFileAsync("node", ["scripts/universal_mock_scanner.cjs", "--strict-production"], { maxBuffer: 2_000_000 });
  assert.doesNotMatch(stdout, /Synthetic success payload|Test credential|Localhost fallback|Provider test artifact/);
});
