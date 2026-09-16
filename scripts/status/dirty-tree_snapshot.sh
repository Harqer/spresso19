#!/usr/bin/env bash
set -euo pipefail
echo "=== CURRENT CLEAN COMMITTED STATE ==="
git status --short --untracked-files=no
echo
echo "=== REMOTE MAIN ==="
git rev-parse origin/main
echo
echo "=== LOCAL HEAD ==="
git rev-parse HEAD
echo
echo "=== UNPUSHED COMMITS ON MAIN ==="
git log --oneline origin/main..HEAD
echo
echo "=== DIRTY/WORKING-TREE PATHS NOT IN HEAD ==="
git diff --stat --name-only
git ls-files --others --exclude-standard | sed 's/^/?? /'
echo
echo "=== SKILL DELETIONS NOT YET COMMITTED ==="
git diff --name-only | grep -E '\.agents/skills/' || echo "none in unstaged diff"
echo
echo "=== LFS OBJECTS NOT YET COMMITTED ==="
git lfs status --porcelain | grep -E '^[AMD]' || echo "none"
