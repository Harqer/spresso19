#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/ci-lib.sh"

ROOT="$(repo_root)"
cd "$ROOT"

ci_section "Repository integrity"
ci_run git diff --check

if git grep -n -I -E '^(<<<<<<<|=======|>>>>>>>)' -- ':!*.md' ':!*.patch' ':!*.diff' >/tmp/spresso-conflicts.txt 2>/dev/null; then
  cat /tmp/spresso-conflicts.txt
  ci_die "Merge-conflict markers found."
fi

ci_section "Structured files"
ci_require python3
ci_run python3 scripts/validate-structured.py "$ROOT"

ci_section "Shell syntax"
mapfile -t shell_files < <(find . -type f -name '*.sh' \
  -not -path './.git/*' -not -path './node_modules/*' -not -path '*/build/*' -not -path './.gradle/*')
for f in "${shell_files[@]}"; do
  ci_run bash -n "$f"
done
if ((${#shell_files[@]})); then
  ci_require shellcheck
  ci_run shellcheck "${shell_files[@]}"
fi

ci_section "Production placeholder scan"
placeholder_re='TODO\("Not yet implemented"|NotImplementedError|throw new Error\(["'"'"']Not implemented|MOCK_IMPLEMENTATION|STUB_IMPLEMENTATION|PLACEHOLDER_IMPLEMENTATION'
hits=0
while IFS= read -r -d '' f; do
  if is_test_or_generated_path "$f"; then
    continue
  fi
  if grep -nE "$placeholder_re" "$f"; then
    hits=1
  fi
done < <(find . -type f \( -name '*.kt' -o -name '*.kts' -o -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
  -not -path './.git/*' -not -path './node_modules/*' -not -path '*/build/*' -print0)
((hits == 0)) || ci_die "Production placeholder/stub markers found."

if [[ -x ./gradlew ]]; then
  ci_section "Kotlin / KMP / Android"
  ci_run ./gradlew --no-daemon check

  tasks="$(./gradlew --no-daemon tasks --all --console=plain 2>/dev/null || true)"
  for task in lint detekt ktlintCheck buildHealth; do
    if grep -Eq "(^|[[:space:]])${task}([[:space:]-]|$)" <<<"$tasks"; then
      ci_run ./gradlew --no-daemon "$task"
    fi
  done

  # Release verification: run only tasks the actual project exposes.
  for task in assembleRelease bundleRelease; do
    if grep -Eq "(^|[[:space:]])${task}([[:space:]-]|$)" <<<"$tasks"; then
      ci_run ./gradlew --no-daemon "$task"
    fi
  done
fi

if [[ -f package.json ]]; then
  ci_section "JavaScript / TypeScript"
  ci_require node
  pm="$(package_runner)"
  ci_require "$pm"

  # Prefer repo-native scripts. They are the contract for framework-specific behavior.
  declare -A ran=()
  for script in typecheck lint test check build; do
    if has_package_script "$script"; then
      run_package_script "$script"
      ran["$script"]=1
    fi
  done

  if [[ -z "${ran[typecheck]:-}" && -x node_modules/.bin/tsc ]]; then
    ci_run node_modules/.bin/tsc --noEmit
  fi
  if [[ -z "${ran[lint]:-}" && -x node_modules/.bin/eslint ]]; then
    ci_run node_modules/.bin/eslint .
  fi

  # Unused files/exports/dependencies. Require it when installed/configured.
  if [[ -x node_modules/.bin/knip ]]; then
    ci_run node_modules/.bin/knip
  elif [[ -f knip.json || -f knip.jsonc || -f knip.ts || -f knip.config.ts || -f knip.config.js ]]; then
    ci_die "Knip is configured but not installed."
  fi
fi

if [[ -d convex ]]; then
  ci_section "Convex"
  [[ -f package.json ]] || ci_die "convex/ exists but package.json is missing."
  if [[ -x node_modules/.bin/convex ]]; then
    ci_run node_modules/.bin/convex codegen
  else
    ci_die "convex/ exists but the Convex CLI is not installed locally."
  fi
  # Typecheck already ran above when configured; run directly if needed.
  if [[ -x node_modules/.bin/tsc ]]; then
    ci_run node_modules/.bin/tsc --noEmit
  fi
fi

ci_section "Quality gate passed"
