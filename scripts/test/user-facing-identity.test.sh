#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

failures=0
pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; failures=$((failures + 1)); }

for file in \
  composeApp/src/androidMain/res/values/strings.xml \
  composeApp/src/commonMain/composeResources/values/strings.xml \
  index.html \
  metadata.json \
  fastlane/metadata/android/en-US/title.txt; do
  if [[ ! -f "$file" ]]; then
    fail "Missing identity file: $file"
  elif rg -q 'Spresso' "$file" && ! rg -qi 'Spresso19' "$file"; then
    pass "$file identifies the product as Spresso"
  else
    fail "$file does not contain the canonical user-facing name"
  fi
done

if rg -q 'android:label="@string/app_name"' composeApp/src/androidMain/AndroidManifest.xml; then
  pass "Android launcher label resolves through app_name"
else
  fail "Android launcher label is not bound to app_name"
fi

if rg -q 'package_name\("com\.spresso"\)' fastlane/Appfile; then
  pass "Play release tooling targets the canonical Android application ID"
else
  fail "Play release tooling does not target com.spresso"
fi

if rg -q 'https://get-spresso\.web\.app' README.md composeApp/src/androidMain/kotlin/network/SpressoConfig.kt; then
  pass "Production hosting URL is get-spresso.web.app"
else
  fail "Production hosting URL is not consistently get-spresso.web.app"
fi

if (( failures > 0 )); then
  printf '\nUser-facing identity gate: FAILED (%d finding(s))\n' "$failures" >&2
  exit 1
fi

printf '\nUser-facing identity gate: PASSED\n'
