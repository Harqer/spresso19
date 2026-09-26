#!/usr/bin/env bash
set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-.}"
FORCE="${2:-}"

if [[ ! -d "$TARGET" ]]; then
  echo "Target directory does not exist: $TARGET" >&2
  exit 2
fi

TARGET="$(cd "$TARGET" && pwd)"
mkdir -p "$TARGET/.agents/skills" "$TARGET/docs/browser-automation"

for src in "$BUNDLE_DIR"/.agents/skills/*; do
  name="$(basename "$src")"
  dest="$TARGET/.agents/skills/$name"
  if [[ -e "$dest" && "$FORCE" != "--force" ]]; then
    echo "Refusing to overwrite existing skill: $dest" >&2
    echo "Re-run with: $0 \"$TARGET\" --force" >&2
    exit 3
  fi
  rm -rf "$dest"
  cp -R "$src" "$dest"
done

if [[ ! -f "$TARGET/docs/browser-automation/README.md" ]]; then
  cp "$BUNDLE_DIR/docs/browser-automation/README.md" "$TARGET/docs/browser-automation/README.md"
fi

if [[ ! -f "$TARGET/.noodle.toml" ]]; then
  cp "$BUNDLE_DIR/.noodle.toml.example" "$TARGET/.noodle.toml"
  echo "Created .noodle.toml with mode=supervised."
else
  echo "Preserved existing .noodle.toml."
  mode="$(grep -E '^[[:space:]]*mode[[:space:]]*=' "$TARGET/.noodle.toml" | head -1 || true)"
  if [[ -n "$mode" ]]; then
    echo "Current Noodle $mode"
  else
    echo "No explicit mode found; Noodle's configured/default mode will apply."
  fi
fi

echo
echo "Installed Spresso browser orchestration skills into:"
echo "  $TARGET/.agents/skills"
echo
echo "Recommended: noodle mode supervised"
echo "Invoke the spresso-browser-orchestrator skill to inspect status."
