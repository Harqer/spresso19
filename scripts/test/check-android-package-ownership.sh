#!/usr/bin/env bash
set -euo pipefail

# Migration gate for the Android application identity. This intentionally does
# not rewrite packages: it proves whether the rename can be archived safely.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

old_id='com.spresso19'
new_id='com.spresso'
failures=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; failures=$((failures + 1)); }
warn() { printf 'WARN  %s\n' "$1"; }

if rg -q "namespace = \"$new_id\"" composeApp/build.gradle.kts &&
   rg -q "applicationId = \"$new_id\"" composeApp/build.gradle.kts; then
  pass "Gradle namespace and applicationId use $new_id"
else
  fail "Gradle namespace/applicationId are not both $new_id"
fi

if rg -q '"package_name": "com\.spresso"' composeApp/google-services.json &&
   ! rg -q "$old_id" composeApp/google-services.json; then
  pass "Google services configuration uses only $new_id"
else
  fail "Google services configuration still references $old_id or lacks $new_id"
fi

if ! rg -q "$old_id" composeApp/src composeApp/build.gradle.kts composeApp/google-services.json; then
  pass "Android source, manifest resources, and build configuration contain no $old_id"
else
  fail "Android source/configuration still contains $old_id"
fi

old_source_paths="$(find composeApp/src -path '*com/spresso19*' -type f -print)"
if [[ -z "$old_source_paths" ]]; then
  pass "No filesystem source files remain under com/spresso19"
else
  fail "Filesystem still contains old package paths:\n$old_source_paths"
fi

# These are external release/test consumers. They are deliberately reported as
# unsafe rather than silently ignored, because changing the package identity
# without updating them breaks deployment or device automation.
legacy_tool_refs="$(rg -n "$old_id" fastlane run_monkey_trace.sh 2>/dev/null || true)"
if [[ -n "$legacy_tool_refs" ]]; then
  warn "External tooling still targets $old_id; archive is unsafe until updated"
  printf '%s\n' "$legacy_tool_refs" >&2
  failures=$((failures + 1))
else
  pass "Release and device tooling do not target $old_id"
fi

tracked_old="$(git ls-files | rg 'com/spresso19|com\.spresso19' || true)"
if [[ -n "$tracked_old" ]]; then
  warn "Git still tracks old-package paths; treat the rename as a delete-plus-add until checkpointed"
  printf '%s\n' "$tracked_old" >&2
else
  pass "Git index has no old-package paths"
fi

if (( failures > 0 )); then
  printf '\nAndroid package ownership gate: BLOCKED (%d finding(s))\n' "$failures" >&2
  exit 1
fi

printf '\nAndroid package ownership gate: READY TO ARCHIVE\n'
