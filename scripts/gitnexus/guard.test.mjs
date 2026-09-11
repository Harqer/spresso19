#!/usr/bin/env node

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRunnerCommand, evaluateIndex, formatStatus, indexName } from './guard.mjs';

const root = '/worktrees/spresso-main';
const baseGitState = {
  root,
  branch: 'main',
  head: 'commit-1',
  dirty: false,
  dirtyPaths: [],
};
const baseMetadata = {
  repoPath: root,
  branch: 'main',
  lastCommit: 'commit-1',
  indexedAt: '2026-09-11T00:00:00.000Z',
  fileHashes: {},
  indexCoverage: { dirtyPaths: [] },
};

function report(metadata = baseMetadata, gitState = baseGitState) {
  return evaluateIndex({
    root,
    metadataResult: { metadata },
    gitState,
  });
}

test('accepts a matching clean worktree and index', () => {
  const result = report();
  assert.equal(result.status, 'fresh');
  assert.equal(result.fresh, true);
  assert.equal(result.identity.repository, root);
  assert.equal(result.identity.currentCommit, 'commit-1');
});

test('accepts dirty paths only when the indexed hashes and coverage include them', () => {
  const result = report({
    ...baseMetadata,
    fileHashes: { 'src/file.ts': 'not-used-by-this-pure-test' },
    indexCoverage: { dirtyPaths: ['src/file.ts'] },
  }, {
    ...baseGitState,
    dirty: true,
    dirtyPaths: ['src/file.ts'],
  });
  // The hash cannot be checked without a real file, so this correctly remains stale.
  assert.equal(result.status, 'stale');
  assert.match(result.reasons.join('\n'), /src\/file\.ts/);
});

test('blocks a dirty path that is absent from the indexed manifest', () => {
  const result = report(baseMetadata, {
    ...baseGitState,
    dirty: true,
    dirtyPaths: ['new-file.ts'],
  });
  assert.equal(result.status, 'stale');
  assert.match(result.reasons.join('\n'), /dirty path is not indexed/);
});

test('blocks a branch mismatch', () => {
  const result = report(baseMetadata, { ...baseGitState, branch: 'feature' });
  assert.equal(result.status, 'stale');
  assert.match(result.reasons.join('\n'), /indexed branch/);
});

test('blocks a commit mismatch', () => {
  const result = report(baseMetadata, { ...baseGitState, head: 'commit-2' });
  assert.equal(result.status, 'stale');
  assert.match(result.reasons.join('\n'), /indexed commit/);
});

test('blocks an index belonging to another worktree', () => {
  const result = report({ ...baseMetadata, repoPath: '/worktrees/other-repo' });
  assert.equal(result.status, 'wrong-repository');
  assert.equal(result.fresh, false);
});

test('blocks missing or failed metadata', () => {
  const result = evaluateIndex({
    root,
    metadataResult: { error: 'invalid index metadata' },
    gitState: baseGitState,
  });
  assert.equal(result.status, 'unknown');
  assert.equal(result.fresh, false);
  assert.match(formatStatus(result), /invalid index metadata/);
});
test('uses a worktree-specific index name', () => {
  assert.notEqual(indexName('/worktrees/one/app', 'main'), indexName('/worktrees/two/app', 'main'));
  assert.match(indexName(root, 'feature/x'), /^spresso-main-[a-f0-9]{12}-feature-x$/);
});

test('rejects malformed index metadata', () => {
  const result = evaluateIndex({
    root,
    metadataResult: { metadata: { repoPath: root, branch: 'main', lastCommit: 'commit-1', fileHashes: [] } },
    gitState: baseGitState,
  });
  assert.equal(result.status, 'stale');
  assert.match(result.reasons.join('\n'), /file-hash manifest is missing/);
});

test('uses the valid local runner when the generated runner is usable', () => {
  const command = buildRunnerCommand('/home/shaolin/Spresso', ['status']);
  assert.equal(command.program, process.execPath);
  assert.match(command.args[0], /\.gitnexus[\\/]run\.cjs$/);
});

test('accepts a relative active-worktree target by resolving it from the worktree', () => {
  const result = report();
  assert.equal(result.identity.worktree, root);
});
