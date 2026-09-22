#!/usr/bin/env bash
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${1:-$(pwd)}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$DEST/.agent-harness-backup-$STAMP"

mkdir -p "$BACKUP"

copy_one() {
  local rel="$1"
  local src="$SRC/$rel"
  local dst="$DEST/$rel"
  if [[ -e "$dst" ]]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -R "$dst" "$BACKUP/$rel"
  fi
  mkdir -p "$(dirname "$dst")"
  cp -R "$src" "$dst"
}

for rel in AGENTS.md ARCHITECTURE.md PROGRESS.md feature_list.json docs scripts .husky README-HARNESS.md .github/pull_request_template.md; do
  copy_one "$rel"
done

find "$DEST/scripts" -type f -name '*.sh' -exec chmod +x {} +
chmod +x "$DEST/.husky/pre-push"

if [[ -f "$DEST/package.json" ]]; then
  bash "$DEST/scripts/setup-husky.sh" "$DEST"
else
  echo "Installed harness, but package.json was not found; run scripts/setup-husky.sh from the JS package root."
fi

echo "Installed local CI harness into: $DEST"
echo "Backed up replaced paths to: $BACKUP"
