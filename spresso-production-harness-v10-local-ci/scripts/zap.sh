#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/ci-lib.sh"

ROOT="$(repo_root)"
cd "$ROOT"
ci_require docker
ci_require curl

REPORTS="$ROOT/build/reports/zap"
mkdir -p "$REPORTS"

target="${SPRESSO_ZAP_TARGET:-}"
started_pid=""

cleanup() {
  if [[ -n "$started_pid" ]]; then
    kill "$started_pid" >/dev/null 2>&1 || true
    wait "$started_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

is_local_target() {
  case "$1" in
    http://127.0.0.1:*|http://localhost:*|http://0.0.0.0:*|https://127.0.0.1:*|https://localhost:*|https://0.0.0.0:*)
      return 0 ;;
    *) return 1 ;;
  esac
}

probe_ports() {
  local p
  for p in 3000 3001 4173 5173 8080 8081; do
    if curl -fsS --max-time 1 "http://127.0.0.1:$p/" >/dev/null 2>&1; then
      printf 'http://127.0.0.1:%s' "$p"
      return 0
    fi
  done
  return 1
}

if [[ -z "$target" ]]; then
  target="$(probe_ports || true)"
fi

if [[ -z "$target" && -x scripts/ci-start-web.sh ]]; then
  ci_section "Starting repository-defined local web target"
  scripts/ci-start-web.sh >"$REPORTS/web-target.log" 2>&1 &
  started_pid="$!"
elif [[ -z "$target" && -f package.json ]]; then
  ci_section "Starting local web target from package scripts"
  if has_package_script "ci:web:start"; then
    run_package_script "ci:web:start" >"$REPORTS/web-target.log" 2>&1 &
    started_pid="$!"
  elif has_package_script "dev"; then
    run_package_script "dev" >"$REPORTS/web-target.log" 2>&1 &
    started_pid="$!"
  fi
fi

if [[ -z "$target" && -n "$started_pid" ]]; then
  for _ in $(seq 1 60); do
    target="$(probe_ports || true)"
    [[ -n "$target" ]] && break
    sleep 1
  done
fi

[[ -n "$target" ]] || ci_die "No local ZAP target is running. Provide scripts/ci-start-web.sh or SPRESSO_ZAP_TARGET=http://127.0.0.1:<port>."
is_local_target "$target" || ci_die "Automatic ZAP pre-push scanning is restricted to a local target; refusing remote target: $target"

docker_target="$target"
docker_target="${docker_target/127.0.0.1/host.docker.internal}"
docker_target="${docker_target/localhost/host.docker.internal}"
docker_target="${docker_target/0.0.0.0/host.docker.internal}"

ci_section "OWASP ZAP passive baseline: $target"
set +e
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -v "$REPORTS:/zap/wrk/:rw" \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t "$docker_target" \
  -r zap-baseline.html \
  -J zap-baseline.json \
  -w zap-baseline.md \
  -m 1
rc=$?
set -e

case "$rc" in
  0) ;;
  1) ci_die "ZAP reported one or more FAIL alerts. See build/reports/zap/." ;;
  2) ci_die "ZAP reported one or more WARN alerts. Review/fix or explicitly configure a justified rule disposition." ;;
  *) ci_die "ZAP could not complete (exit $rc). See build/reports/zap/." ;;
esac

ci_section "ZAP baseline passed"
