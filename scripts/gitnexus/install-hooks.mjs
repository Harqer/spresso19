#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hookDir = path.join(root, '.githooks');
const hookNames = ['post-checkout', 'post-merge', 'post-rewrite', 'post-commit'];

let configured = '';
try {
  configured = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  if (error.status !== 1) throw error;
}

if (configured !== '.githooks' && path.resolve(root, configured || '.') !== hookDir) {
  console.error('GitNexus hooks are not active. Run: git config core.hooksPath .githooks');
  process.exit(2);
}

for (const name of hookNames) {
  const hookPath = path.join(hookDir, name);
  if (!fs.existsSync(hookPath)) throw new Error(`Missing GitNexus hook: ${hookPath}`);
  fs.chmodSync(hookPath, 0o755);
}

const status = spawnSync(process.execPath, [path.join(root, 'scripts/gitnexus/guard.mjs'), 'status'], {
  cwd: root,
  stdio: 'inherit',
});
if (status.error) throw status.error;
process.exit(status.status ?? 1);
