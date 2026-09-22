#!/usr/bin/env bash

ci_section() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}

ci_die() {
  printf '\n\033[1;31mCI FAILED:\033[0m %s\n' "$*" >&2
  exit 1
}

ci_require() {
  command -v "$1" >/dev/null 2>&1 || ci_die "Required command missing: $1"
}

ci_run() {
  printf '+ '
  printf '%q ' "$@"
  printf '\n'
  "$@"
}

repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

has_package_script() {
  local script="$1"
  node -e '
    const p=require("./package.json");
    process.exit(p.scripts && Object.prototype.hasOwnProperty.call(p.scripts, process.argv[1]) ? 0 : 1)
  ' "$script"
}

package_runner() {
  if [[ -f pnpm-lock.yaml ]]; then
    printf 'pnpm'
  elif [[ -f yarn.lock ]]; then
    printf 'yarn'
  elif [[ -f bun.lockb || -f bun.lock ]]; then
    printf 'bun'
  else
    printf 'npm'
  fi
}

run_package_script() {
  local script="$1" pm
  pm="$(package_runner)"
  case "$pm" in
    npm) ci_run npm run "$script" ;;
    pnpm) ci_run pnpm run "$script" ;;
    yarn) ci_run yarn "$script" ;;
    bun) ci_run bun run "$script" ;;
  esac
}

is_test_or_generated_path() {
  case "$1" in
    */test/*|*/tests/*|*/__tests__/*|*/androidTest/*|*/testFixtures/*|*/build/*|*/node_modules/*|*/.gradle/*|*/.git/*|*/dist/*|*/coverage/*)
      return 0 ;;
    *) return 1 ;;
  esac
}
