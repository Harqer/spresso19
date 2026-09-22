#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/ci-lib.sh"

ROOT="$(repo_root)"
cd "$ROOT"

ci_section "Spresso local production gate"
printf 'commit: %s\n' "$(git rev-parse --short HEAD 2>/dev/null || echo working-tree)"
printf 'This gate does not read secrets, require credentials, or deploy production.\n'

ci_run bash scripts/quality.sh
ci_run bash scripts/security.sh

# Spresso has a Web surface, so DAST is part of the production gate.
ci_run bash scripts/zap.sh

ci_section "ALL LOCAL CI GATES PASSED"
