#!/usr/bin/env node
/**
 * Pre-commit growth guard for {{PROJECT_NAME}}.
 * Blocks commits that GROW an already-over-budget file.
 *
 * Logic (staged): for each staged source file, compare the staged blob's line
 * count to its HEAD line count (resolving renames to the OLD path), and BLOCK if
 * staged > BUDGET and staged > base. New files going over budget are caught by
 * quality-checks `file-size`, not here — this guard is "no growth on over-budget
 * files". Allowlist via SIZE_ALLOWLIST (keep tiny).
 *
 * Scopes:
 *   (default / --scope staged)  staged blob (`:0`) vs HEAD (rename-aware) — husky pre-commit.
 *   --scope changed             working tree vs the recorded baseline sizes — the
 *                               `{{VALIDATE_COMMAND}}` / CI path, where the index is empty
 *                               so the staged scope would be a no-op. Reads
 *                               quality-checks/file-size-baseline.json (no-op if absent).
 *
 * Robustness: git runs via execFileSync with an ARGS ARRAY (no shell), so paths
 * with spaces/metachars are safe; all paths resolve against an explicit repo ROOT
 * (CLAUDE_PROJECT_DIR → git toplevel → cwd), so the guard works from any cwd.
 *
 * Exit codes: 0 — no violations · 1 — at least one violation (blocked) · 2 — error.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

const BUDGET = 300;

// Files exempt from the growth guard (use sparingly).
// Don't allowlist over-budget files — split them instead (see .claude/rules/file-size-budget.md).
const SIZE_ALLOWLIST = new Set({{SIZE_ALLOWLIST}});

const SOURCE_RE = /\.(ts|tsx|jsx|js|mjs|cjs|css)$/;
const SKIP_RE = /(^|\/)(node_modules|dist|build|coverage|\.next|\.cache)(\/|$)/;

// Generated / vendored, not project-authored → exempt per file-size-budget rule
// (stylesheets + generated codegen). docs/assets/** is the meta-govern docs-html
// theme (rendered from .tpl, naturally long); .claude/scripts/docs-html/** is the
// vendored toolkit. Without this, the docs-html payload's own CSS trips the guard.
const GENERATED_RE = /(^|\/)(docs\/assets|\.claude\/scripts\/docs-html)\//;

// Dot-notation extracted siblings: <Parent>.<childName>.tsx
// These ARE the recommended split target — exempt from growth check for the
// child files (the parent is still budgeted normally).
const DOT_EXTRACTED_RE = /\/[A-Z][A-Za-z0-9]+\.[A-Z][A-Za-z0-9]+\.(ts|tsx|jsx|js|mjs|cjs)$/;

const GIT_ENV = { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH || ''}` };

// Run git with an ARGS ARRAY via execFileSync (no shell) so a path containing a
// space or shell metachar is passed verbatim. Returns stdout, or null on failure
// (callers distinguish a git failure from a genuinely empty file).
function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      env: GIT_ENV,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

// Repo root: harness anchor → git toplevel → cwd. Worktree reads and every git
// invocation resolve against this, so the guard is correct from any working dir.
const ROOT =
  process.env.CLAUDE_PROJECT_DIR ||
  (git(['rev-parse', '--show-toplevel'], process.cwd()) || '').trim() ||
  process.cwd();

function keepSource(list) {
  return list
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((f) => SOURCE_RE.test(f))
    .filter((f) => !SKIP_RE.test(f))
    .filter((f) => !GENERATED_RE.test(`/${f}`))
    .filter((f) => !SIZE_ALLOWLIST.has(f))
    .filter((f) => !SIZE_ALLOWLIST.has(f.split('/').pop()));
}

function countText(content) {
  if (content == null || content.length === 0) return 0;
  const newlines = (content.match(/\n/g) || []).length;
  return content.endsWith('\n') ? newlines : newlines + 1;
}

function lineCountWorktree(file) {
  try { return countText(readFileSync(path.join(ROOT, file), 'utf8')); } catch { return 0; }
}

// Line count of <ref>:<file>. null (path absent at ref — e.g. a new/renamed file
// not in HEAD) → 0 lines.
function lineCountRef(ref, file) {
  return countText(git(['show', `${ref}:${file}`], ROOT));
}

// Recorded accepted sizes (re-anchored at a cleanup commit) for --scope changed.
// Optional: absent in a fresh scaffold → {} → the changed scope is a no-op.
function loadBaselineLines() {
  try {
    const raw = readFileSync(new URL('./quality-checks/file-size-baseline.json', import.meta.url), 'utf8');
    return JSON.parse(raw).baselineLines || {};
  } catch {
    return {};
  }
}

// Staged source files + a rename map (new path -> old path), so a pure rename of
// an over-budget file is compared against the OLD path's HEAD size instead of
// being mis-read as a brand-new over-budget file.
function stagedScope() {
  const out = git(['diff', '--cached', '--name-status', '-M', '--diff-filter=ACMR'], ROOT);
  if (!out) return { files: [], renameMap: new Map() };
  const files = [];
  const renameMap = new Map();
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const status = parts[0];
    if ((status.startsWith('R') || status.startsWith('C')) && parts.length >= 3) {
      const oldPath = parts[1];
      const newPath = parts[2];
      files.push(newPath);
      renameMap.set(newPath, oldPath);
    } else {
      files.push(parts[parts.length - 1]);
    }
  }
  return { files: keepSource(files), renameMap };
}

function main() {
  const argv = process.argv.slice(2);
  const scopeIdx = argv.indexOf('--scope');
  const scope = scopeIdx !== -1 ? String(argv[scopeIdx + 1] || '').toLowerCase() : 'staged';

  let files;
  let currentLines;  // (file) => number — the candidate state
  let baselineLines; // (file) => number — what it must not grow beyond
  try {
    if (scope === 'changed') {
      const recorded = loadBaselineLines();
      files = Object.keys(recorded);                   // the re-anchored over-budget set
      currentLines = (f) => lineCountWorktree(f);      // working tree (catches committed + dirty growth)
      baselineLines = (f) => recorded[f] ?? 0;         // accepted size at re-anchor time
    } else {
      const { files: staged, renameMap } = stagedScope();
      files = staged;
      currentLines = (f) => {
        const raw = git(['show', `:0:${f}`], ROOT);    // staged blob (index)
        if (raw === null) throw new Error(`cannot read staged blob for "${f}"`); // fail closed
        return countText(raw);
      };
      baselineLines = (f) => lineCountRef('HEAD', renameMap.get(f) ?? f); // rename → old path
    }
  } catch (err) {
    process.stderr.write(`file-size-growth-guard: ${err.message}\n`);
    process.exit(2);
  }

  if (files.length === 0) {
    process.exit(0);
  }

  const violations = [];
  try {
    for (const file of files) {
      // Skip dot-notation extracted children — they're the split target, not the problem.
      if (DOT_EXTRACTED_RE.test(`/${file}`)) continue;

      const current = currentLines(file);
      const base = baselineLines(file);
      if (current > BUDGET && current > base) {
        violations.push({ file, headLines: base, stagedLines: current, growth: current - base });
      }
    }
  } catch (err) {
    process.stderr.write(`file-size-growth-guard: ${err.message}\n`);
    process.exit(2);
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  process.stderr.write('\nFile-size growth guard BLOCKED (over-budget file grew)\n\n');
  process.stderr.write(`   Cap: ${BUDGET} lines.\n`);
  process.stderr.write('   Files over the cap cannot grow. Extract sub-components first.\n\n');
  for (const v of violations) {
    const prev = v.headLines === 0 ? '(new file)' : `${v.headLines}`;
    process.stderr.write(`   ${v.file}\n     ${prev} -> ${v.stagedLines} (+${v.growth})\n\n`);
  }
  process.stderr.write('   Pattern: dot-notation siblings.\n');
  process.stderr.write(
    '     pages/QuotePage.tsx -> pages/QuotePage.ServiceStep.tsx, pages/QuotePage.DetailsStep.tsx\n',
  );
  process.stderr.write('   See .claude/rules/file-size-budget.md.\n\n');
  process.exit(1);
}

try {
  main();
} catch (err) {
  process.stderr.write(`file-size-growth-guard crashed: ${err.message}\n`);
  process.exit(2);
}
