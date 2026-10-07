#!/usr/bin/env node
// scripts/projects-behind.mjs
// Read-only "which projects are behind" report.
//
// Usage:
//   node projects-behind.mjs [--root <dir>] [--exclude <name>]... [--json] [<project-path>...]
//
// Projects: the explicit <project-path> arguments, or every immediate child of
// --root (default ~/Desktop/my-projets) that has .claude/.meta-govern.json.
// --exclude <name> skips a child of --root by directory name (repeatable).
// Excluded projects are never opened.
//
// A project is flagged for any of:
//   version-behind             metaGovernVersion older than this skill's version.json (or missing)
//   never-audited              lastAudit null or missing
//   audit-stale                lastAudit older than STALE_DAYS (parked projects exempt)
//   convex-cost-checks-missing Convex project with no evidence the Convex cost checks ran:
//                              no 'convex-frugality' in auditChecks and none in docs/audits/
//
// Exit codes: 0 nothing flagged / 1 at least one flagged / 2 error.
// Standalone on purpose (node:* only) so the Claude and Codex copies are identical.
// Current version: version.json sourceCanon.version when present (Codex build), else version.json version.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STALE_DAYS = 28;
export const CONVEX_CHECK = 'convex-frugality';

export function parseSemver(v) {
  const m = typeof v === 'string' ? v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/) : null;
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function compareSemver(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

// Same signal as lib/project-detection.mjs: convex dependency, convex/schema.ts or convex/_generated.
export function isConvexProject(dir) {
  const pkg = readJson(path.join(dir, 'package.json')) || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  return Boolean(deps.convex)
    || fs.existsSync(path.join(dir, 'convex/schema.ts'))
    || fs.existsSync(path.join(dir, 'convex/_generated'));
}

function auditDocsMention(dir, needle) {
  const auditsDir = path.join(dir, 'docs/audits');
  let entries;
  try { entries = fs.readdirSync(auditsDir, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    if (!e.isFile() || !/\.(html|md)$/.test(e.name)) continue;
    try {
      if (fs.readFileSync(path.join(auditsDir, e.name), 'utf8').includes(needle)) return true;
    } catch { /* unreadable file counts as no evidence */ }
  }
  return false;
}

export function evaluateProject(dir, currentVersion, today = new Date()) {
  const state = readJson(path.join(dir, '.claude/.meta-govern.json'));
  if (!state) return null;
  const reasons = [];
  const version = typeof state.metaGovernVersion === 'string' ? state.metaGovernVersion : null;
  const cur = parseSemver(currentVersion);
  const have = parseSemver(version);
  if (!have || (cur && compareSemver(have, cur) < 0)) reasons.push('version-behind');

  const lastAudit = typeof state.lastAudit === 'string' && state.lastAudit ? state.lastAudit : null;
  let ageDays = null;
  if (!lastAudit) {
    reasons.push('never-audited');
  } else {
    const t = Date.parse(lastAudit);
    if (Number.isNaN(t)) reasons.push('never-audited');
    else {
      ageDays = Math.floor((today.getTime() - t) / 86400000);
      if (ageDays > STALE_DAYS && !state.parked) reasons.push('audit-stale');
    }
  }

  const convex = isConvexProject(dir);
  if (convex) {
    const stamped = Array.isArray(state.auditChecks) && state.auditChecks.includes(CONVEX_CHECK);
    if (!stamped && !auditDocsMention(dir, CONVEX_CHECK)) reasons.push('convex-cost-checks-missing');
  }

  return {
    name: path.basename(dir),
    path: dir,
    version,
    lastAudit,
    ageDays,
    palier: state.palier ?? null,
    parked: Boolean(state.parked),
    convex,
    reasons,
  };
}

export function collectProjectDirs({ root, excludes, explicit }) {
  if (explicit.length) return explicit.map((p) => path.resolve(p));
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return null; }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !excludes.has(e.name))
    .map((e) => path.join(root, e.name))
    .filter((d) => fs.existsSync(path.join(d, '.claude/.meta-govern.json')));
}

function main(argv) {
  const explicit = [];
  const excludes = new Set();
  let root = path.join(os.homedir(), 'Desktop/my-projets');
  let asJson = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') asJson = true;
    else if (a === '--root' && argv[i + 1]) root = path.resolve(argv[++i]);
    else if (a === '--exclude' && argv[i + 1]) excludes.add(argv[++i]);
    else if (a.startsWith('--')) { process.stderr.write(`Unknown option: ${a}\n`); return 2; }
    else explicit.push(a);
  }

  const skillDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  // A Codex build carries its own version and names the Claude canon it mirrors in
  // sourceCanon.version. Projects record the canon version, so compare against that.
  const versionFile = readJson(path.join(skillDir, 'version.json'));
  const current = versionFile?.sourceCanon?.version ?? versionFile?.version;
  if (!parseSemver(current)) { process.stderr.write(`Cannot read meta-govern version from ${skillDir}/version.json\n`); return 2; }

  const dirs = collectProjectDirs({ root, excludes, explicit });
  if (!dirs) { process.stderr.write(`Cannot read root ${root}\n`); return 2; }

  const skipped = [];
  const projects = [];
  for (const d of dirs) {
    const result = evaluateProject(d, current);
    if (result) projects.push(result); else skipped.push(d);
  }
  projects.sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name));
  const flagged = projects.filter((p) => p.reasons.length > 0);

  if (asJson) {
    process.stdout.write(JSON.stringify({ current, projects, skipped }, null, 2) + '\n');
  } else {
    const lines = [`# meta-govern: projects behind (current ${current})`, `Projects read: ${projects.length}, flagged: ${flagged.length}`, ''];
    for (const p of projects) {
      const status = p.reasons.length ? p.reasons.join(', ') : 'up to date';
      const audit = p.lastAudit ? `${p.lastAudit} (${p.ageDays}d)` : 'never';
      lines.push(`- ${p.name}: ${status} | version ${p.version ?? '?'} | audit ${audit}${p.convex ? ' | convex' : ''}${p.parked ? ' | parked' : ''}`);
    }
    for (const d of skipped) lines.push(`- ${path.basename(d)}: no .claude/.meta-govern.json, skipped`);
    process.stdout.write(lines.join('\n') + '\n');
  }
  return flagged.length > 0 ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}
