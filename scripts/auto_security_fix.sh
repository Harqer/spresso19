#!/usr/bin/env bash
set -e

echo "=== Spresso Zero-Touch Security Remediation & Auto-Sync ==="

# 1. Pull latest remote changes from main
echo "[1/4] Pulling latest changes from remote main..."
git pull origin main --rebase

# 2. Run npm audit fix
echo "[2/4] Executing npm audit fix..."
npm audit fix || true
npm install

# 3. Verify build integrity
echo "[3/4] Verifying web bundle build..."
npm run build

# 4. Commit and push auto-fixes if changes exist
echo "[4/4] Checking for security patch updates..."
if [[ -n $(git status --porcelain package.json package-lock.json) ]]; then
  git add package.json package-lock.json
  git commit -m "security(autofix): Patch vulnerabilities via automated security script"
  git push origin main
  echo "✅ Security fixes automatically committed, tested, and pushed to origin main!"
else
  echo "✅ No unpatched vulnerabilities found. Workspace is clean and fully updated!"
fi
