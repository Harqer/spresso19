#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/ci-lib.sh"

ROOT="$(repo_root)"
cd "$ROOT"
REPORTS="$ROOT/build/reports/security"
mkdir -p "$REPORTS"

ci_section "Semgrep"
ci_require semgrep
ci_run semgrep scan --config auto --error \
  --exclude node_modules --exclude build --exclude .gradle --exclude dist .

ci_section "OSV-Scanner"
ci_require osv-scanner
ci_run osv-scanner scan source --recursive "$ROOT"

ci_section "Trivy filesystem"
ci_require trivy
ci_run trivy fs --exit-code 1 --severity HIGH,CRITICAL \
  --scanners vuln,misconfig \
  --skip-dirs node_modules --skip-dirs build --skip-dirs .gradle --skip-dirs .git "$ROOT"

ci_section "Checkov IaC/config"
ci_require checkov
ci_run checkov -d "$ROOT" --quiet --compact \
  --skip-path "$ROOT/node_modules" --skip-path "$ROOT/build" --skip-path "$ROOT/.gradle"

ci_section "Committed-secret scan"
ci_require detect-secrets
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
detect-secrets scan --all-files \
  --exclude-files '(^|/)(node_modules|build|\.gradle|dist|coverage|\.git)/' >"$tmp"
python3 - "$tmp" <<'PY'
import json, sys
data=json.load(open(sys.argv[1], encoding="utf-8"))
results=data.get("results", {})
count=sum(len(v) for v in results.values())
if count:
    for path, findings in results.items():
        for f in findings:
            print(f"{path}:{f.get('line_number','?')}: {f.get('type','potential secret')}")
    raise SystemExit(f"detect-secrets found {count} potential committed secret(s)")
print("No potential committed secrets found.")
PY

# Lockfile/package-manager audit without requiring any secret or external service credential.
if [[ -f package.json ]]; then
  ci_section "Package-manager vulnerability audit"
  pm="$(package_runner)"
  case "$pm" in
    npm)
      env -u npm_config_allow_scripts npm --userconfig=/dev/null audit --audit-level=high
      ;;
    pnpm) pnpm audit --audit-level high ;;
    yarn) yarn npm audit --severity high ;;
    bun) : ;; # OSV + Trivy remain authoritative here.
  esac
fi

# Supply-chain artifact when the tools are present. Missing Syft/Grype does not reduce
# the mandatory OSV/Trivy coverage above.
if command -v syft >/dev/null 2>&1 && command -v grype >/dev/null 2>&1; then
  ci_section "SBOM + Grype"
  ci_run syft "dir:$ROOT" -o "cyclonedx-json=$REPORTS/sbom.cdx.json"
  ci_run grype "sbom:$REPORTS/sbom.cdx.json" --fail-on high
fi

ci_section "Security gate passed"
