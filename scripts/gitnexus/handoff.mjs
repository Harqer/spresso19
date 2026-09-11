#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
const dirtyPaths = output.split('\n').filter(Boolean);
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const lastCommit = execFileSync('git', ['log', '-1', '--oneline'], { cwd: root, encoding: 'utf8' }).trim();

const result = {
  baseCommit: process.env.GITNEXUS_BASE_COMMIT || null,
  resultCommit: head,
  workingTreeClean: dirtyPaths.length === 0,
  dirtyPaths,
  lastCommit,
  gitnexusRefreshed: false,
};

const statusResult = (() => {
  try {
    return {
      exitCode: 0,
      stdout: execFileSync(
        process.execPath,
        [path.join(root, 'scripts/gitnexus/guard.mjs'), 'status', '--json'],
        { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    };
  } catch (error) {
    return { exitCode: error.status ?? 2, stdout: error.stdout?.toString() ?? '', stderr: error.stderr?.toString() ?? '' };
  }
})();

try {
  const status = JSON.parse(statusResult.stdout);
  result.gitnexusRefreshed = status.status === 'fresh';
  result.gitnexus = status;
} catch {
  result.gitnexus = {
    status: 'unknown',
    exitCode: statusResult.exitCode,
    raw: statusResult.stdout.trim(),
    error: statusResult.stderr.trim(),
  };
}

console.log(JSON.stringify(result, null, 2));
if (!result.workingTreeClean) {
  console.error('Handoff blocked: working tree is dirty. Commit only owned, coherent paths before handoff.');
  process.exit(2);
}
if (!result.gitnexusRefreshed) {
  console.error('Handoff blocked: GitNexus is not fresh for this repository/worktree.');
  process.exit(2);
}
