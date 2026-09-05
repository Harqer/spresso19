#!/usr/bin/env bash
set -euo pipefail

# Spresso converging gatekeeper. One checked-in script reused by CI and release.
# Order: functions -> web data layer -> Android -> terraform validate+plan.
# Every step runs the real artifact's tests; no mocks of success.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== [gate] forbidden-identifier lint =="
# Fails if deployable identifiers reference stale projects/packages.
if git grep -nE 'spresso-19|spresso_19|spresso19|5561f|com\.spresso19' -- \
    ':!*.md' ':!*.txt' ':!.scratch/**' ':!.gitnexus/**' ':!.idea/**' \
    ':!functions/lib/**' ':!dist/**' ':!node_modules/**' >/dev/null 2>&1; then
  echo "forbidden identifiers found:"
  git grep -nE 'spresso-19|spresso_19|spresso19|5561f|com\.spresso19' -- \
    ':!*.md' ':!*.txt' ':!.scratch/**' ':!.gitnexus/**' ':!.idea/**' \
    ':!functions/lib/**' ':!dist/**' ':!node_modules/**' || true
  exit 1
fi
echo "clean"

echo "== [gate] functions: build + failure-path tests =="
(
  cd "$ROOT/functions"
  npm test
)

echo "== [gate] web: data-layer tests =="
(
  cd "$ROOT"
  node --import tsx --test src/test/*.test.ts
)

echo "== [gate] Android: lint + compile + unit tests =="
(
  cd "$ROOT"
  ./gradlew :composeApp:lintDebug :composeApp:compileDebugKotlinAndroid :composeApp:testDebugUnitTest --no-daemon
)

echo "== [gate] terraform: validate + non-destructive plan =="
if [ -d "$ROOT/terraform" ]; then
  (
    cd "$ROOT/terraform"
    terraform fmt -check
    if [ "${CI:-}" = "true" ] || [ ! -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
      terraform validate
    else
      terraform init -backend=false >/dev/null
      terraform validate
      terraform plan -out /tmp/spresso-plan.tfplan -no-color >/dev/null
      terraform show /tmp/spresso-plan.tfplan -no-color >/tmp/spresso-plan.txt
      if grep -qE 'spresso-19|spresso_19|spresso19|5561f|com\.spresso19' /tmp/spresso-plan.txt; then
        echo "forbidden identifiers in terraform plan"
        exit 1
      fi
    fi
  )
fi

echo "== [gate] all checks passed =="