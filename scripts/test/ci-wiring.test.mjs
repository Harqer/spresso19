import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/spresso-multi-agent-cicd.yml", "utf8");
const gate = readFileSync("scripts/ci-gate.sh", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("the normal workflow invokes the shared production gate", () => {
  assert.match(workflow, /scripts\/ci-gate\.sh/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
});

test("the production gate runs the required application checks", () => {
  for (const command of [
    "npm ci",
    "npm audit --audit-level=moderate",
    "npm run lint",
    "npm run build",
    "node scripts/test/production-hardcoding-boundary.test.mjs",
    "node scripts/test/deployed-capability-audit.mjs",
    "npm run test:ci-wiring",
    "node --test scripts/test/firebase-config.test.mjs",
    "npm run test:contracts",
    "npx tsx --test functions/test/webapi.test.ts",
    "npm run test:smoke",
    "npm run test:mcp",
    "npm run test:bundle-budget",
    "npm run build",
    "npm test",
    "./gradlew :composeApp:lintDebug :composeApp:compileDebugKotlinAndroid :composeApp:testDebugUnitTest --no-daemon",
    "terraform validate",
    "SPRESSO_TERRAFORM_PLAN=true",
    "TF_VAR_project_id",
    "TF_VAR_tool_server_image",
  ]) {
      assert.ok(gate.includes(command), `CI gate is missing: ${command}`);
  }
});

test("CI wiring has no live deployment probe or production env-file fallback", () => {
  assert.doesNotMatch(gate, /deployed-capability-audit\.mjs\s+--live/);
  assert.doesNotMatch(gate, /npm run test:integration/);
  assert.doesNotMatch(gate, /\.env/);
  assert.equal(packageJson.scripts["test:ci-wiring"], "node --test scripts/test/ci-wiring.test.mjs");
});
