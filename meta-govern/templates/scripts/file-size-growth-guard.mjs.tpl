#!/usr/bin/env node
/**
 * Pre-commit growth guard for {{PROJECT_NAME}}.
 * Blocks commits that GROW an already-over-budget file.
 *
 * Logic:
 *   For each staged source file:
 *     stagedLines  = `git show :0:<file>` line count
 *     headLines    = `git show HEAD:<file>` line count (0 if not in HEAD)
 *     If stagedLines > BUDGET and stagedLines > headLines → BLOCK.
 *
 * New files going over budget are caught by quality-checks `file-size`,
 * not here. This guard is specifically for "no growth on over-budget files".
 *
 * Allowlist via SIZE_ALLOWLIST below — keep tiny.
 *
 * Wired in `.husky/pre-commit`:
 *   node .claude/scripts/file-size-growth-guard.mjs || exit 1
 *
 * Exit codes:
 *   0 — no violations (or no staged source files)
 *   1 — at least one violation (commit blocked)
 *   2 — script error
 */

import { execSync } from 'node:child_process';

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

function git(args) {
  try {
    return execSync(`git ${args}`, {
      env: { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH || ''}` },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function stagedSourceFiles() {
  const out = git('diff --cached --name-only --diff-filter=ACMR');
  if (!out) return [];
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((f) => SOURCE_RE.test(f))
    .filter((f) => !SKIP_RE.test(f))
    .filter((f) => !GENERATED_RE.test(`/${f}`))
    .filter((f) => !SIZE_ALLOWLIST.has(f))
    .filter((f) => !SIZE_ALLOWLIST.has(f.split('/').pop()));
}

function lineCount(ref, file) {
  const content = git(`show ${ref}:${file}`);
  if (content === null) return 0;
  if (content.length === 0) return 0;
  // line count = number of newlines (final newline counts as separator, not extra line)
  const newlines = (content.match(/\n/g) || []).length;
  return content.endsWith('\n') ? newlines : newlines + 1;
}

function main() {
  let files;
  try {
    files = stagedSourceFiles();
  } catch (err) {
    process.stderr.write(`file-size-growth-guard: ${err.message}\n`);
    process.exit(2);
  }

  if (files.length === 0) {
    process.exit(0);
  }

  const violations = [];
  for (const file of files) {
    // Skip dot-notation extracted children — they're the split target, not the problem.
    if (DOT_EXTRACTED_RE.test(`/${file}`)) continue;

    const stagedLines = lineCount(':0', file);
    const headLines = lineCount('HEAD', file);
    if (stagedLines > BUDGET && stagedLines > headLines) {
      violations.push({
        file,
        headLines,
        stagedLines,
        growth: stagedLines - headLines,
      });
    }
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  process.stderr.write('\nFile-size growth guard BLOCKED commit\n\n');
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
