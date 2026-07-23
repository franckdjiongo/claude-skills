#!/usr/bin/env node
/**
 * Diff-coverage gate for {{PROJECT_NAME}}.
 * Measures the % of ADDED/MODIFIED source lines (merge-base...HEAD) that the test
 * suite actually executes, and fails when that share drops below THRESHOLD (85%).
 * Whole-repo coverage can sit flat while a new feature ships untested; this reads
 * only the lines the current change introduced, so fresh code is what gets graded.
 *
 * Reads coverage/coverage-final.json (istanbul JSON, produced by `test --coverage`)
 * and cross-references it with `git diff --unified=0 <base>...HEAD` over src files
 * (tests, type decls and generated code excluded). computeDiffCoverage is exported
 * PURE so the pairing logic is unit-testable without git or a coverage run.
 *
 * Gating placement: a NEW-bootstrap project wires this into `{{VALIDATE_COMMAND}}`
 * from day one; on an EXISTING project it stays opt-in until MIGRATE promotes it.
 * That wiring (package.json step + threshold calibration) lives in S8 — this file
 * is only the measurement.
 *
 * Base ref: DIFF_COVERAGE_BASE env → origin/HEAD → main → master (first that
 * resolves). The three-dot `<base>...HEAD` diffs from the merge-base automatically.
 *
 * Fail-soft: no coverage file, no resolvable base, or an empty diff → exit 0 (the
 * gate observes, it never blocks a change it cannot measure). Exit 1 only when a
 * real, measured diff coverage is below THRESHOLD.
 *
 * Exit codes: 0 — pass or nothing to measure · 1 — diff coverage below threshold.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin';
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

const THRESHOLD = 85;

// Source files only. Tests, type-only declarations and generated code carry no
// meaningful runtime coverage, so their changed lines are dropped before scoring.
const SRC_RE = /(^|\/)src\/.*\.(ts|tsx|jsx|js|mjs|cjs)$/;
const EXCLUDE_RE = /(\.test\.|\.spec\.|\.d\.ts$|(^|\/)(__generated__|generated|__mocks__)\/)/;

/**
 * PURE. Score the added/modified lines against istanbul statement coverage.
 *
 * @param {object} coverageMap  istanbul coverage-final.json:
 *   { [file]: { path?, statementMap: { id: { start: { line } } }, s: { id: count } } }
 * @param {object} diffRanges   { [file]: number[] | Set<number> } — changed line numbers.
 * @returns {{ total:number, covered:number, pct:number,
 *             files: Array<{ file:string, total:number, covered:number, uncovered:number[] }> }}
 *   `total` counts only changed lines that carry an executable statement; a diff of
 *   pure blanks/comments yields total 0 and pct 100 (nothing to cover).
 */
export function computeDiffCoverage(coverageMap, diffRanges) {
  const entries = Object.entries(coverageMap || {}).map(([key, data]) => ({
    key,
    path: (data && data.path) || key,
    data: data || {},
  }));

  // Pair a diff path to its coverage entry by exact match or shared suffix — the
  // istanbul key is usually absolute while the diff path is repo-relative.
  const matchEntry = (file) => {
    const norm = String(file).replace(/^\.\//, '');
    let hit = entries.find((e) => e.path === file || e.key === file);
    if (hit) return hit;
    hit = entries.find((e) => e.path.endsWith(`/${norm}`) || e.key.endsWith(`/${norm}`));
    return hit || null;
  };

  const files = [];
  let total = 0;
  let covered = 0;

  for (const [file, rawLines] of Object.entries(diffRanges || {})) {
    const diffSet = rawLines instanceof Set ? rawLines : new Set(rawLines || []);
    if (diffSet.size === 0) continue;
    const entry = matchEntry(file);
    if (!entry) continue; // no coverage for this file (e.g. never imported by a test) — skip, not counted

    const statementMap = entry.data.statementMap || {};
    const hits = entry.data.s || {};

    // Collapse statements onto their start line: a line is covered when any
    // statement starting there executed at least once.
    const lineHit = new Map();
    for (const [id, meta] of Object.entries(statementMap)) {
      const line = meta && meta.start && meta.start.line;
      if (!line || !diffSet.has(line)) continue;
      const isHit = (hits[id] || 0) > 0;
      lineHit.set(line, (lineHit.get(line) || false) || isHit);
    }

    if (lineHit.size === 0) continue;
    const uncovered = [];
    let fileCovered = 0;
    for (const [line, isHit] of lineHit) {
      if (isHit) fileCovered += 1;
      else uncovered.push(line);
    }
    uncovered.sort((a, b) => a - b);
    total += lineHit.size;
    covered += fileCovered;
    files.push({ file, total: lineHit.size, covered: fileCovered, uncovered });
  }

  const pct = total === 0 ? 100 : (covered / total) * 100;
  return { total, covered, pct, files };
}

// --- git plumbing (impure, main-only) --------------------------------------

const ROOT =
  process.env.CLAUDE_PROJECT_DIR ||
  (git(['rev-parse', '--show-toplevel']) || '').trim() ||
  process.cwd();

function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null; // any git failure is a fail-soft signal, not an error
  }
}

// First base ref that resolves. origin/HEAD tracks the remote default branch.
function resolveBase() {
  const candidates = [
    process.env.DIFF_COVERAGE_BASE,
    'origin/HEAD',
    'origin/main',
    'main',
    'master',
  ].filter(Boolean);
  for (const ref of candidates) {
    if (git(['rev-parse', '--verify', '--quiet', ref]) !== null) return ref;
  }
  return null;
}

// Parse `git diff --unified=0` into { relPath: Set<addedLine> }. Only the +hunk
// side matters (added/modified lines); removed lines have no coverage to score.
function collectDiffRanges(base) {
  const out = git(['diff', '--unified=0', '--no-color', `${base}...HEAD`]);
  if (!out) return {};
  const ranges = {};
  let current = null;
  for (const line of out.split('\n')) {
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      const f = fileMatch[1];
      current = SRC_RE.test(`/${f}`) && !EXCLUDE_RE.test(f) ? f : null;
      continue;
    }
    if (!current) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk) continue;
    const start = parseInt(hunk[1], 10);
    const count = hunk[2] === undefined ? 1 : parseInt(hunk[2], 10);
    if (count === 0) continue; // pure deletion hunk — nothing added on the +side
    const set = ranges[current] || (ranges[current] = new Set());
    for (let i = 0; i < count; i += 1) set.add(start + i);
  }
  return ranges;
}

function loadCoverage() {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, 'coverage', 'coverage-final.json'), 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const coverageMap = loadCoverage();
  if (!coverageMap) {
    process.stdout.write('diff-coverage: no coverage/coverage-final.json — skipped (run tests with --coverage).\n');
    process.exit(0);
  }

  const base = resolveBase();
  if (!base) {
    process.stdout.write('diff-coverage: no base ref resolved — skipped.\n');
    process.exit(0);
  }

  const diffRanges = collectDiffRanges(base);
  if (Object.keys(diffRanges).length === 0) {
    process.stdout.write(`diff-coverage: no changed source lines vs ${base} — skipped.\n`);
    process.exit(0);
  }

  const { total, covered, pct, files } = computeDiffCoverage(coverageMap, diffRanges);
  if (total === 0) {
    process.stdout.write('diff-coverage: no executable changed lines to score — skipped.\n');
    process.exit(0);
  }

  const rounded = Math.round(pct * 10) / 10;
  process.stdout.write(`diff-coverage: ${covered}/${total} changed lines covered (${rounded}%, floor ${THRESHOLD}%).\n`);

  if (pct < THRESHOLD) {
    process.stdout.write('\nUncovered changed lines:\n');
    for (const f of files) {
      if (f.uncovered.length === 0) continue;
      process.stdout.write(`   ${f.file}: ${f.uncovered.join(', ')}\n`);
    }
    process.stdout.write('\nAdd tests for the new lines, or split unreachable code out of the change.\n');
    process.exit(1);
  }

  process.exit(0);
}

// Run main only when executed directly; importing the module (e.g. a unit test of
// computeDiffCoverage) leaves the pure export untouched. Guard against a runtime
// surprise in git/coverage plumbing degrading into a hard failure of validate:
// measurement problems fail soft (exit 0), only a below-threshold result blocks.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  try {
    main();
  } catch (err) {
    process.stdout.write(`diff-coverage: skipped (${err.message}).\n`);
    process.exit(0);
  }
}
