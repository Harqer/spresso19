#!/usr/bin/env node

import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GRAPH_COMMANDS = new Set([
  'impact', 'detect-changes', 'query', 'context', 'trace', 'cypher', 'explain',
  'pdg-query', 'check', 'route-map', 'shape-check', 'api-impact', 'tool-map',
  'group-list', 'group-sync', 'wiki',
]);
const INDEX_FILES = ['.gitnexus/meta.json', '.gitnexus/gitnexus.json'];
const LOCAL_RUNNER = path.join('.gitnexus', 'run.cjs');
const PNPM_ALLOW_BUILD = ['@ladybugdb/core', 'gitnexus', 'tree-sitter'];
const GITNEXUS_PACKAGE = 'gitnexus@latest';

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function resolveRepositoryRoot(cwd = process.cwd()) {
  return path.resolve(git(cwd, ['rev-parse', '--show-toplevel']));
}

export function readGitState(root) {
  const statusOutput = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const statusEntries = statusOutput.split('\0').filter(Boolean);
  const dirtyPaths = [];
  for (let index = 0; index < statusEntries.length; index += 1) {
    const entry = statusEntries[index];
    const status = entry.slice(0, 2);
    const rawPath = entry.slice(3);
    if (!rawPath) continue;
    if (status[0] === 'R' || status[0] === 'C' || status[1] === 'R' || status[1] === 'C') {
      const renamedPath = statusEntries[++index];
      dirtyPaths.push(renamedPath || rawPath);
    } else {
      dirtyPaths.push(rawPath);
    }
  }

  return {
    root,
    branch: git(root, ['branch', '--show-current']) || git(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    head: git(root, ['rev-parse', 'HEAD']),
    dirty: dirtyPaths.length > 0,
    dirtyPaths,
  };
}

function loadMetadata(root) {
  for (const relativePath of INDEX_FILES) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    try {
      return { metadata: JSON.parse(fs.readFileSync(absolutePath, 'utf8')), path: absolutePath };
    } catch (error) {
      return { error: `invalid index metadata at ${relativePath}: ${error.message}`, path: absolutePath };
    }
  }
  return { error: 'GitNexus index metadata is missing' };
}

function hashFile(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

export function evaluateIndex({ root, metadataResult, gitState }) {
  const metadata = metadataResult?.metadata;
  const identity = {
    repository: root,
    worktree: root,
    branch: gitState.branch,
    indexedBranch: metadata?.branch ?? null,
    currentCommit: gitState.head,
    indexedCommit: metadata?.lastCommit ?? null,
    workingTreeClean: !gitState.dirty,
    lastRefresh: metadata?.indexedAt ?? null,
  };

  if (!metadataResult || metadataResult.error) {
    return { status: 'unknown', fresh: false, reasons: [metadataResult?.error ?? 'GitNexus index metadata is missing'], identity };
  }
  if (!metadata.repoPath || !samePath(metadata.repoPath, root)) {
    return {
      status: 'wrong-repository',
      fresh: false,
      reasons: [`index repository ${metadata.repoPath ?? '<missing>'} does not match active worktree ${root}`],
      identity,
    };
  }

  const reasons = [];
  if (metadata.branch !== gitState.branch) {
    reasons.push(`indexed branch ${metadata.branch ?? '<missing>'} does not match active branch ${gitState.branch}`);
  }
  if (metadata.lastCommit !== gitState.head) {
    reasons.push(`indexed commit ${metadata.lastCommit ?? '<missing>'} does not match current commit ${gitState.head}`);
  }

  const hashes = metadata.fileHashes;
  if (!hashes || typeof hashes !== 'object' || Array.isArray(hashes)) {
    reasons.push('index file-hash manifest is missing');
  } else {
    for (const [relativePath, expectedHash] of Object.entries(hashes)) {
      if (hashFile(root, relativePath) !== expectedHash) {
        reasons.push(`indexed file is stale: ${relativePath}`);
      }
    }
    const indexedDirtyPaths = new Set(metadata.indexCoverage?.dirtyPaths ?? []);
    for (const relativePath of gitState.dirtyPaths) {
      if (!Object.prototype.hasOwnProperty.call(hashes, relativePath)) {
        reasons.push(`dirty path is not indexed: ${relativePath}`);
      } else if (!indexedDirtyPaths.has(relativePath)) {
        reasons.push(`dirty path is absent from index coverage: ${relativePath}`);
      }
    }
  }

  return reasons.length === 0
    ? { status: 'fresh', fresh: true, reasons: [], identity }
    : { status: 'stale', fresh: false, reasons, identity };
}

export function inspectIndex(root = resolveRepositoryRoot()) {
  return evaluateIndex({ root, metadataResult: loadMetadata(root), gitState: readGitState(root) });
}

export function formatStatus(report, json = false) {
  if (json) return JSON.stringify(report, null, 2);
  const { identity } = report;
  const lines = [
    `Repository: ${identity.repository}`,
    `Worktree: ${identity.worktree}`,
    `Branch: ${identity.branch}`,
    `Indexed branch: ${identity.indexedBranch ?? '<unknown>'}`,
    `Indexed commit: ${identity.indexedCommit ?? '<unknown>'}`,
    `Current commit: ${identity.currentCommit}`,
    `Working tree: ${identity.workingTreeClean ? 'clean' : 'dirty'}`,
    `Last refresh: ${identity.lastRefresh ?? '<unknown>'}`,
    `Status: ${report.status}`,
  ];
  if (report.reasons.length) lines.push(`Reasons:\n- ${report.reasons.join('\n- ')}`);
  return lines.join('\n');
}

function ensureCurrentTarget(root, args) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const isTarget = argument === '--repo' || argument === '--worktree';
    const hasInlineTarget = argument.startsWith('--repo=') || argument.startsWith('--worktree=');
    if (!isTarget && !hasInlineTarget) continue;
    const value = isTarget ? args[++index] : argument.slice(argument.indexOf('=') + 1);
    const resolvedValue = value ? path.resolve(root, value) : null;
    if (!resolvedValue || !samePath(resolvedValue, root)) {
      throw new Error(`graph target ${value ?? '<missing>'} is not the active worktree ${root}`);
    }
  }
}

function executableOnPath(name) {
  return process.env.PATH?.split(path.delimiter).some((directory) => {
    const candidate = path.join(directory, name);
    try {
      return fs.statSync(candidate).isFile() && (process.platform === 'win32' || (fs.statSync(candidate).mode & 0o111) !== 0);
    } catch {
      return false;
    }
  }) ?? false;
}

function localRunnerIsUsable(root) {
  const runner = path.join(root, LOCAL_RUNNER);
  if (!fs.existsSync(runner)) return false;
  const content = fs.readFileSync(runner, 'utf8');
  return content.trim() !== '[BLOCKED]' && content.includes('gitnexus');
}

export function buildRunnerCommand(root, args) {
  if (localRunnerIsUsable(root)) {
    return { program: process.execPath, args: [path.join(root, LOCAL_RUNNER), ...args], cwd: root };
  }
  if (executableOnPath('gitnexus')) return { program: 'gitnexus', args, cwd: root };
  if (executableOnPath('pnpm')) {
    return { program: 'pnpm', args: [...PNPM_ALLOW_BUILD.map((name) => `--allow-build=${name}`), 'dlx', GITNEXUS_PACKAGE, ...args], cwd: root };
  }
  if (executableOnPath('bunx')) return { program: 'bunx', args: [GITNEXUS_PACKAGE, ...args], cwd: root };
  if (executableOnPath('npx')) return { program: 'npx', args: [GITNEXUS_PACKAGE, ...args], cwd: root };
  throw new Error('GitNexus runner unavailable: install GitNexus or provide gitnexus, pnpm, bunx, or npx on PATH');
}

function executeRunner(root, args) {
  const command = buildRunnerCommand(root, args);
  const result = spawnSync(command.program, command.args, { cwd: command.cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function assertFresh(root) {
  const report = inspectIndex(root);
  if (!report.fresh) throw new Error(`GitNexus graph query blocked.\n${formatStatus(report)}`);
  return report;
}

export function indexName(root, branch) {
  const base = path.basename(root).replace(/[^A-Za-z0-9_-]+/g, '-');
  const ref = branch.replace(/[^A-Za-z0-9_-]+/g, '-');
  const worktreeHash = crypto.createHash('sha256').update(root).digest('hex').slice(0, 12);
  return `${base}-${worktreeHash}-${ref}`;
}

function usage() {
  return `Usage:
  node scripts/gitnexus/guard.mjs status [--json]
  node scripts/gitnexus/guard.mjs analyze [GitNexus args...]
  node scripts/gitnexus/guard.mjs refresh [--reason <event>]
  node scripts/gitnexus/guard.mjs watch
  node scripts/gitnexus/guard.mjs <graph-command> [GitNexus args...]

Graph commands are blocked until repository, worktree, branch, commit, and indexed file hashes match.`;
}

export function classifyRefreshExit(exitCode, report) {
  return exitCode === 0 && report.fresh ? 'fresh' : 'blocked';
}

async function main(argv) {
  const root = resolveRepositoryRoot();
  const [command, ...rawArgs] = argv;
  if (!command || command === '--help' || command === '-h') {
    console.log(usage());
    return 0;
  }
  if (command === 'status') {
    const report = inspectIndex(root);
    console.log(formatStatus(report, rawArgs.includes('--json')));
    return report.fresh ? 0 : 2;
  }
  if (command === 'analyze' || command === 'refresh') {
    const args = command === 'refresh'
      ? ['analyze', '--index-only', '--name', indexName(root, readGitState(root).branch)]
      : ['analyze', ...rawArgs];
    const exitCode = executeRunner(root, args);
    if (exitCode !== 0) return exitCode;
    const report = inspectIndex(root);
    console.log(formatStatus(report));
    return classifyRefreshExit(exitCode, report) === 'fresh' ? 0 : 2;
  }
  if (command === 'watch') {
    const state = readGitState(root);
    return executeRunner(root, ['analyze', '--watch', '--index-only', '--name', indexName(root, state.branch), ...rawArgs]);
  }
  if (command === 'list') return executeRunner(root, ['list', ...rawArgs]);

  const graphArgs = command === 'graph' ? rawArgs : [command, ...rawArgs];
  if (!GRAPH_COMMANDS.has(graphArgs[0])) throw new Error(`unsupported GitNexus command: ${graphArgs[0] ?? '<missing>'}`);
  ensureCurrentTarget(root, graphArgs);
  assertFresh(root);
  return executeRunner(root, graphArgs);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((exitCode) => process.exit(exitCode)).catch((error) => {
    console.error(error.message);
    process.exit(2);
  });
}
