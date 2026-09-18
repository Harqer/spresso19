import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/error-reports.yml", "utf8");
const releaseWorkflow = readFileSync(".github/workflows/release.yml", "utf8");
const gate = readFileSync("scripts/ci-gate.sh", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("the normal workflow is the error-report pipeline", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /zaproxy\/action-baseline@v0\.14\.0/);
  assert.match(workflow, /ZAP_TARGET_URL/);
  assert.match(workflow, /:composeApp:detekt/);
  assert.match(workflow, /\.\/ktlint composeApp\/src androidApp\/src/);
});

test("the release workflow remains deployment-only", () => {
  assert.match(releaseWorkflow, /tags:/);
  assert.match(releaseWorkflow, /fastlane android deploy_internal/);
});

test("the legacy shared production gate retains its required application checks", () => {
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
    "npm test",
    "./gradlew :androidApp:lintDebug :androidApp:assembleDebug :composeApp:allTests :composeApp:detekt --no-daemon",
    "terraform validate",
    "SPRESSO_TERRAFORM_PLAN=true",
    "TF_VAR_project_id",
    "TF_VAR_tool_server_image",
  ]) {
    assert.ok(gate.includes(command), `CI gate is missing: ${command}`);
  }
});

test("the shared gate has no live deployment probe or production env-file fallback", () => {
  assert.doesNotMatch(gate, /deployed-capability-audit\.mjs\s+--live/);
  assert.doesNotMatch(gate, /npm run test:integration/);
  assert.doesNotMatch(gate, /\.env/);
  assert.equal(packageJson.scripts["test:ci-wiring"], "node --test scripts/test/ci-wiring.test.mjs");
});
