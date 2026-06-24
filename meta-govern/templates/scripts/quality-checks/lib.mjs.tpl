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
  // Try main, fall back to master, fall back to local diff vs HEAD.
  const refs = ['origin/main', 'main', 'origin/master', 'master'];
  let out = null;
  for (const ref of refs) {
    out = git(`diff --name-only ${ref}...HEAD`);
    if (out !== null) break;
  }
  if (!out) out = git('diff --name-only HEAD') || '';
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
    .map((rel) => join(projectDir(), rel))
    .filter((p) => SOURCE_EXT.test(p));
}

// ---------- File reading helpers ----------

export function readSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

export function* iterateLines(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    yield { lineNo: i + 1, text: lines[i] };
  }
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

// ---------- Output formatting ----------

const COLOR = {
  reset: '\x1b[0m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m', bold: '\x1b[1m',
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
function paint(c, s) { return useColor ? `${c}${s}${COLOR.reset}` : s; }

function severityColor(sev) {
  if (sev === 'CRITICAL') return COLOR.red + COLOR.bold;
  if (sev === 'HIGH') return COLOR.red;
  if (sev === 'MEDIUM') return COLOR.yellow;
  if (sev === 'LOW') return COLOR.gray;
  return COLOR.cyan;
}

export function formatFindingHuman(f) {
  const where = f.line ? `${f.file}:${f.line}` : f.file;
  return `  ${paint(severityColor(f.severity), `[${f.id}]`)} ${where} - ${f.message}`;
}

export function formatFindingJson(f) {
  return {
    id: f.id,
    severity: f.severity,
    file: f.file,
    line: f.line ?? null,
    message: f.message,
  };
}

export function groupBy(findings, key) {
  const map = new Map();
  for (const f of findings) {
    const k = f[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(f);
  }
  return map;
}

export function formatHuman(findings, scope) {
  if (findings.length === 0) {
    return paint(COLOR.cyan, `Quality gate clean (${scope}).`) + '\n';
  }
  const bySev = groupBy(findings, 'severity');
  const lines = [paint(COLOR.bold, `Quality gate findings (scope: ${scope})`), ''];
  for (const sev of SEVERITY_ORDER) {
    const items = bySev.get(sev);
    if (!items || items.length === 0) continue;
    lines.push(paint(severityColor(sev), `### ${sev} (${items.length})`));
    for (const f of items) lines.push(formatFindingHuman(f));
    lines.push('');
  }
  lines.push(`Total: ${findings.length}`);
  lines.push(`Run \`{{PACKAGE_MANAGER}} run quality:check\` to re-scan.`);
  return lines.join('\n') + '\n';
}
