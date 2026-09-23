#!/usr/bin/env bash
set -euo pipefail

# Shared production gate used by pull requests, main, and release workflows.
# Live deployment probes remain opt-in workflow steps; this gate never treats
# unavailable infrastructure as a passing result.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_npm_ci() {
  local package_dir="$1"
  echo "== [gate] install locked dependencies: ${package_dir#$ROOT/} =="
  (
    cd "$package_dir"
    npm ci
  )
}

run_npm_audit() {
  local package_dir="$1"
  echo "== [gate] dependency vulnerability audit: ${package_dir#$ROOT/} =="
  (
    cd "$package_dir"
    npm audit --audit-level=moderate
  )
}

echo "== [gate] forbidden-identifier lint =="
FORBIDDEN_IDENTIFIERS='spresso-19|spresso_19|spresso19|5561f'
DEPLOYABLE_PATHS=(
  'src/**'
  'server/**'
  'functions/src/**'
  'composeApp/src/**'
  'terraform/**'
  'firebase.json'
  '.firebaserc'
)
if git -C "$ROOT" grep -nE "$FORBIDDEN_IDENTIFIERS" -- "${DEPLOYABLE_PATHS[@]}" >/dev/null 2>&1; then
  echo "forbidden identifiers found in deployable paths:"
  git -C "$ROOT" grep -nE "$FORBIDDEN_IDENTIFIERS" -- "${DEPLOYABLE_PATHS[@]}" || true
  exit 1
fi
echo "clean"

run_npm_ci "$ROOT"
run_npm_ci "$ROOT/functions"

run_npm_audit "$ROOT"
run_npm_audit "$ROOT/functions"

echo "== [gate] root typecheck, lint, and production build =="
(
  cd "$ROOT"
  npm run lint
  npm run build
)

echo "== [gate] source production hardcoding and capability audits =="
(
  cd "$ROOT"
  node scripts/test/production-hardcoding-boundary.test.mjs
  node scripts/test/deployed-capability-audit.mjs
)

echo "== [gate] API route, Firebase wiring, and callable contracts =="
(
  cd "$ROOT"
  npm run test:ci-wiring
  node --test scripts/test/firebase-config.test.mjs
  node --test scripts/test/web-auth.test.mjs
  npm run test:contracts
  node scripts/verify-action-contract.mjs
)

echo "== [gate] smoke, MCP, and bundle checks =="
(
  cd "$ROOT"
  npm run test:smoke
  npm run test:mcp
  npm run test:bundle-budget
)

echo "== [gate] functions build and tests =="
(
  cd "$ROOT/functions"
  npm run build
  npm test
)

# Android and Terraform remain part of the existing production gate.
echo "== [gate] Android: lint + compile + unit tests =="
(
  cd "$ROOT"
  ./gradlew :androidApp:lintDebug :androidApp:assembleDebug :composeApp:allTests :composeApp:detekt --no-daemon
)

echo "== [gate] terraform: validate + non-destructive plan =="
if [ -d "$ROOT/terraform" ]; then
  (
    cd "$ROOT/terraform"
    terraform fmt -check
    terraform validate
    if [ "${SPRESSO_TERRAFORM_PLAN:-false}" = "true" ]; then
      : "${TF_VAR_project_id:?TF_VAR_project_id is required for a Terraform plan}"
      : "${TF_VAR_tool_server_image:?TF_VAR_tool_server_image is required for a Terraform plan}"
      terraform plan -out /tmp/spresso-plan.tfplan -no-color >/dev/null
      terraform show /tmp/spresso-plan.tfplan -no-color >/tmp/spresso-plan.txt
      if grep -qE "$FORBIDDEN_IDENTIFIERS" /tmp/spresso-plan.txt; then
        echo "forbidden identifiers in terraform plan"
        exit 1
      fi
    else
      echo "Terraform plan skipped; set SPRESSO_TERRAFORM_PLAN=true with explicit production TF_VAR_* values to run it."
    fi
  )
fi

echo "== [gate] all checks passed =="
