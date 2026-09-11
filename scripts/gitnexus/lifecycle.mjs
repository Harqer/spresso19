#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reason = process.argv[2] || 'git-operation';
const command = spawnSync(process.execPath, [path.join(root, 'scripts/gitnexus/guard.mjs'), 'refresh', '--reason', reason], {
  cwd: root,
  stdio: 'inherit',
});

if (command.error) {
  console.error(`GitNexus refresh could not start after ${reason}: ${command.error.message}`);
  process.exit(0);
}
if (command.status !== 0) {
  console.error(`GitNexus remains blocked after ${reason}; graph queries will fail closed until refresh succeeds.`);
}
// A post-* hook must not roll back the Git operation. The guard is the enforcement
// point for graph queries, so a failed refresh is visible but non-destructive.
process.exit(0);
