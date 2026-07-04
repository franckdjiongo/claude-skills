#!/usr/bin/env node
/**
 * Quality-checks shared utilities for {{PROJECT_NAME}}.
 * Pure functions: file walking, path classification, severity ordering,
 * staged/changed file resolution, output formatting.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { execSync } from 'node:child_process';

export const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
export const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

// ---------- Path / kind classification ----------

const SOURCE_DIRS = [
  'app', 'src', 'components', 'pages', 'contexts', 'hooks', 'constants',
  'lib', 'services', 'utils', 'convex', 'data-layer', 'repositories',
  'features', 'modules', 'i18n',
];
const SOURCE_ROOT_FILES = ['App.tsx', 'index.tsx', 'main.tsx', 'main.ts', 'index.ts'];
const SOURCE_EXT = /\.(ts|tsx|jsx|js|mjs|cjs|css|html)$/;

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', 'public', '.git', '.claude',
  '.agents', '.agent', '.husky', '.next', '.cache', '.turbo', '.vercel',
  '.output', '.svelte-kit', 'out', '.parcel-cache',
]);

const TOKEN_FILES = new Set([
  'index.css', 'index.html', 'tokens.css',
  'tailwind.config.js', 'tailwind.config.cjs',
  'tailwind.config.ts', 'tailwind.config.mjs',
]);
const CONFIG_FILE_RE = /\.(config)\.(js|cjs|ts|mjs)$/;
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/;

/**
 * Classify a file into one of: source / test / token / config / external / other.
 * Returns { kind, rel } where `rel` is the project-relative posix path.
 */
export function classify(file) {
  const rel = relative(projectDir(), resolve(file)).split('\\').join('/');
  if (rel.startsWith('..') || rel.startsWith('/')) return { kind: 'external', rel };
  // Generated codegen (e.g. convex/_generated, *.gen.ts) is exempt from source
  // checks — same policy as dist/build artifacts in file-size-budget.
  if (/(^|\/)_generated\//.test(rel) || /\.gen\.(ts|tsx|js)$/.test(rel)) return { kind: 'other', rel };
  const base = rel.split('/').pop() || rel;
  if (TOKEN_FILES.has(rel) || TOKEN_FILES.has(base)) return { kind: 'token', rel };
  if (CONFIG_FILE_RE.test(rel)) return { kind: 'config', rel };
  if (rel.startsWith('tests/') || TEST_FILE_RE.test(rel)) return { kind: 'test', rel };
  if (SOURCE_ROOT_FILES.includes(rel) || SOURCE_ROOT_FILES.includes(base)) {
    return { kind: 'source', rel };
  }
  if (SOURCE_DIRS.some((d) => rel.startsWith(`${d}/`))) {
    if (SOURCE_EXT.test(rel)) return { kind: 'source', rel };
  }
  return { kind: 'other', rel };
}

// ---------- File walking ----------

/**
 * Recursively walk a directory, returning absolute paths to source-extension files.
 * Honors SKIP_DIRS and (best-effort) `.gitignore` at the project root.
 */
export function walkRepo(root = projectDir()) {
  const ignored = loadGitignorePatterns(root);
  const out = [];

  function isIgnored(absPath) {
    if (ignored.length === 0) return false;
    const rel = relative(root, absPath).split('\\').join('/');
    return ignored.some((pat) => matchesIgnore(rel, pat));
  }

  function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const path = join(dir, name);
      if (isIgnored(path)) continue;
      let st;
      try { st = statSync(path); } catch { continue; }
      if (st.isDirectory()) walk(path);
      else if (st.isFile() && SOURCE_EXT.test(name)) out.push(path);
    }
  }

  walk(root);
  return out;
}

function loadGitignorePatterns(root) {
  const gi = join(root, '.gitignore');
  if (!existsSync(gi)) return [];
  try {
    return readFileSync(gi, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('!'));
  } catch { return []; }
}

function reEsc(s) { return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); }

function matchesIgnore(relPath, pattern) {
  const norm = pattern.replace(/^\//, '').replace(/\/$/, '');
  if (!norm) return false;
  if (relPath === norm || relPath.startsWith(`${norm}/`)) return true;
  if (norm.startsWith('**/')) {
    const tail = norm.slice(3);
    return relPath.endsWith(tail) || relPath.includes(`/${tail}`);
  }
  if (norm.endsWith('/**')) {
    const head = norm.slice(0, -3);
    return relPath === head || relPath.startsWith(`${head}/`);
  }
  if (norm.includes('*')) {
    const re = new RegExp('^' + norm.split('*').map(reEsc).join('.*') + '$');
    return re.test(relPath) || re.test(relPath.split('/').pop() || '');
  }
  return false;
}

// ---------- Git resolvers ----------

function git(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: projectDir(),
      env: { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH || ''}` },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch { return null; }
}

export function stagedFiles() {
  const raw = git('diff --cached --name-only --diff-filter=ACMR');
  if (!raw) return [];
  return raw.split('\n').map((s) => s.trim()).filter(Boolean)
    .map((rel) => join(projectDir(), rel))
    .filter((p) => SOURCE_EXT.test(p));
}

export function changedFiles() {
  const names = new Set();
  const add = (raw) => {
    if (!raw) return;
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (t) names.add(t);
    }
  };
  // Committed changes vs the base branch (merge-base...HEAD); try main then master.
  const refs = ['origin/main', 'main', 'origin/master', 'master'];
  let baseResolved = false;
  for (const ref of refs) {
    const out = git(`diff --name-only ${ref}...HEAD`);
    if (out !== null) { add(out); baseResolved = true; break; }
  }
  // No base ref in this clone (e.g. a shallow / single-branch CI checkout) means we
  // CANNOT compute the PR diff. FAIL CLOSED: scan the whole repo rather than return
  // an empty set that index.mjs would treat as "nothing changed" and pass vacuously.
  if (!baseResolved) {
    process.stderr.write(
      'quality-checks: no base ref (origin/main|main|origin/master|master) found — ' +
        'scanning the FULL repo. Fetch the base branch (e.g. `git fetch origin main`, ' +
        'or actions/checkout fetch-depth:0) to scope to changed files.\n',
    );
    return walkRepo(projectDir());
  }
  // ALWAYS fold in UNCOMMITTED work so a dirty tree with new violations can't pass
  // `{{VALIDATE_COMMAND}}` (the Stop hook tells agents to validate before claiming done).
  add(git('diff --name-only HEAD'));                 // staged + unstaged (tracked)
  add(git('ls-files --others --exclude-standard'));  // new untracked files
  return [...names]
    .map((rel) => join(projectDir(), rel))
    .filter((p) => SOURCE_EXT.test(p));
}

// ---------- File reading helpers ----------

// Content source: 'worktree' (disk, default) or 'index' (the staged blob).
// Staged-scope runs read the INDEXED content so a file fixed locally but not
// re-staged can't slip a violating staged blob past the gate (the working tree
// and the index can diverge).
let CONTENT_MODE = 'worktree';
export function setContentMode(mode) {
  CONTENT_MODE = mode === 'index' ? 'index' : 'worktree';
}

export function readSafe(path) {
  if (CONTENT_MODE === 'index') {
    const rel = relative(projectDir(), resolve(path)).split('\\').join('/');
    const staged = git(`show ":${rel}"`);
    if (staged !== null) return staged; // null = not in index → fall back to disk
  }
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

export function* iterateLines(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    yield { lineNo: i + 1, text: lines[i] };
  }
}

// Logical line count. A trailing newline terminates the last line — it is not an
// extra empty line — so `split('\n').length` over-counts newline-terminated files
// by one (a 300-line file would read as 301). Matches file-size-growth-guard.
export function countLines(text) {
  if (text.length === 0) return 0;
  const newlines = (text.match(/\n/g) || []).length;
  return text.endsWith('\n') ? newlines : newlines + 1;
}

// Strip comments before token-matching so a trailing `// ...` or inline `/* ... */`
// that merely MENTIONS a flagged token (`as any`, `console.log`, `#fff`) is not a
// false positive. Conservative: the line-comment strip ignores `//` that is part
// of `://` (URLs in string literals). Secrets intentionally skip this — a
// credential pasted into a comment is still a leak worth flagging.
export function stripComments(line) {
  return line.replace(/\/\*.*?\*\//g, '').replace(/(^|[^:])\/\/.*$/, '$1');
}

// Blank out /* ... */ block comments across the WHOLE text (they can span lines,
// which a per-line strip cannot handle) while PRESERVING newlines so line numbers
// stay accurate. Apply to a file's text before iterating lines; combine with the
// per-line stripComments() for trailing `//` comments.
export function stripBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// ---------- Severity helpers ----------

export function severityRank(s) {
  const idx = SEVERITY_ORDER.indexOf(String(s).toUpperCase());
  return idx === -1 ? SEVERITY_ORDER.length : idx;
}

export function maxSeverity(findings) {
  let max = null;
  for (const f of findings) {
    if (max === null || severityRank(f.severity) < severityRank(max)) max = f.severity;
  }
  return max;
}

export function exitCodeFor(findings, failLevel) {
  const failIdx = severityRank(failLevel);
  const maxIdx = findings.reduce(
    (acc, f) => Math.min(acc, severityRank(f.severity)),
    SEVERITY_ORDER.length,
  );
  if (maxIdx >= SEVERITY_ORDER.length) return 0;
  if (maxIdx === 0) return 2; // CRITICAL always exits 2
  if (maxIdx <= failIdx) return 1;
  return 0;
}

// Output formatting (human + JSON renderers) lives in ./format.mjs to keep this
// module under the file-size budget.
