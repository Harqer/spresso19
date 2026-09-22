#!/usr/bin/env bash
set -euo pipefail

DEST="${1:-$(pwd)}"
cd "$DEST"
[[ -f package.json ]] || {
  echo "package.json not found; Husky requires the JS package root." >&2
  exit 1
}

if [[ -f pnpm-lock.yaml ]]; then
  pm=pnpm
elif [[ -f yarn.lock ]]; then
  pm=yarn
elif [[ -f bun.lockb || -f bun.lock ]]; then
  pm=bun
else
  pm=npm
fi

node <<'NODE'
const fs=require("fs");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
p.scripts ??= {};
const existing=p.scripts.prepare ?? "";
if (!/\bhusky\b/.test(existing)) {
  p.scripts.prepare=existing ? `${existing} && husky` : "husky";
}
fs.writeFileSync("package.json", JSON.stringify(p,null,2)+"\n");
NODE

case "$pm" in
  npm) npm install --save-dev husky ;;
  pnpm) pnpm add -D husky ;;
  yarn) yarn add -D husky ;;
  bun) bun add -d husky ;;
esac

case "$pm" in
  npm) npm run prepare ;;
  pnpm) pnpm run prepare ;;
  yarn) yarn prepare ;;
  bun) bun run prepare ;;
esac

chmod +x .husky/pre-push
echo "Husky pre-push gate installed."
