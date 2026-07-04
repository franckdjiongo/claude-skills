#!/usr/bin/env node
/**
 * Code checks for {{PROJECT_NAME}}.
 * - file-size     HIGH at >300 lines, MEDIUM warn at >250 lines.
 * - ts-any        HIGH:    `: any` / `as any` outside eslint-disable.
 * - console       MEDIUM:  console.log/warn/error/info/debug in production code.
 * - secrets       CRITICAL: AWS/JWT/sk-/long literal credential patterns.
 * - direct-fetch  HIGH:    `fetch(` in components/pages — must route through data layer.
 *                  (only emitted if the project has a data-layer — gated at scaffold time)
 * - abs-path      HIGH:    hardcoded home-rooted absolute path (/Users/... or /home/...)
 *                  — breaks on every other machine (CI runner, teammate, cloud agent).
 * - dup-literal   MEDIUM:  distinctive literal (path/url/dotfile ≥12 chars, or an
 *                  UPPER_SNAKE = value) duplicated verbatim across ≥2 files of the
 *                  same directory — a shared constant that will drift.
 */

// macOS hardening: see ../lib.mjs for the canonical PATH_PREFIX. Re-exported
// here so any subprocess this check might add can pick it up directly.
export const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

import { classify, iterateLines, readSafe, countLines, stripComments, stripBlockComments } from '../lib.mjs';

const FILE_SIZE_HARD = 300;
const FILE_SIZE_WARN = 250;

export function fileSizeHard(files) {
  const findings = [];
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source' && c.kind !== 'test') continue;
    const text = readSafe(f);
    if (text.length === 0) continue;
    const lineCount = countLines(text);
    if (lineCount > FILE_SIZE_HARD) {
      findings.push({
        id: 'file-size',
        severity: 'HIGH',
        file: c.rel,
        line: null,
        message: `${lineCount} lines (cap ${FILE_SIZE_HARD}). Extract sub-components (dot-notation siblings).`,
      });
    } else if (lineCount > FILE_SIZE_WARN) {
      findings.push({
        id: 'file-size',
        severity: 'MEDIUM',
        file: c.rel,
        line: null,
        message: `${lineCount} lines (warn at ${FILE_SIZE_WARN}, hard cap ${FILE_SIZE_HARD}). Plan extraction.`,
      });
    }
  }
  return findings;
}

export function anyType(files) {
  const findings = [];
  // `any` used as a TS type in any position: annotation (`: any`), cast (`as any`),
  // union/intersection (`| any`, `& any`), generic arg (`<any>`, `, any>`), array
  // (`any[]`), or return (`=> any`). `\bany\b` + a type-position delimiter avoids
  // matching identifiers (company, many, anything) and prose.
  const re = /\bas\s+any\b|[:|&,<(]\s*any\b|\bany\s*[>|&,)\]]|\bany\[\]|=>\s*any\b/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source') continue;
    if (!/\.(ts|tsx)$/.test(c.rel)) continue;
    const text = stripBlockComments(readSafe(f));
    for (const { lineNo, text: line } of iterateLines(text)) {
      // Skip if line has an inline disable for the any rule.
      if (/eslint-disable.*no-explicit-any/.test(line)) continue;
      if (re.test(stripComments(line))) {
        findings.push({
          id: 'ts-any',
          severity: 'HIGH',
          file: c.rel,
          line: lineNo,
          message: '`any` type usage. Replace with a specific type or `unknown` + narrowing.',
        });
      }
    }
  }
  return findings;
}

export function consoleStmt(files) {
  const findings = [];
  const re = /\bconsole\.(log|warn|error|debug|info)\s*\(/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source') continue;
    if (!/\.(ts|tsx|js|mjs|cjs)$/.test(c.rel)) continue;
    const raw = readSafe(f);
    // File-level `/* eslint-disable no-console */` (e.g. the logger util) exempts the file.
    // Check the RAW text — stripBlockComments would blank that very directive.
    if (/eslint-disable(?!-)[^\n]*no-console/.test(raw.split('\n').slice(0, 5).join('\n'))) continue;
    for (const { lineNo, text: line } of iterateLines(stripBlockComments(raw))) {
      if (/eslint-disable.*no-console/.test(line)) continue;
      const m = stripComments(line).match(re);
      if (m) {
        findings.push({
          id: 'console',
          severity: 'MEDIUM',
          file: c.rel,
          line: lineNo,
          message: `\`console.${m[1]}\` in production code. Remove or guard with a debug flag (e.g. import.meta.env.DEV).`,
        });
      }
    }
  }
  return findings;
}

export function secretsLike(files) {
  const findings = [];
  const patterns = [
    { re: /AKIA[0-9A-Z]{16}/, label: 'AWS access key' },
    { re: /\bsk-[A-Za-z0-9]{32,}\b/, label: 'OpenAI/Anthropic-style secret (sk-...)' },
    { re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/, label: 'JWT token' },
    { re: /\bgh[ps]_[A-Za-z0-9]{36,}\b/, label: 'GitHub token' },
    { re: /\bxox[abp]-[A-Za-z0-9-]{20,}\b/, label: 'Slack token' },
    {
      re: /\b(api[_-]?key|secret|password|token|bearer)\s*[:=]\s*['"]([A-Za-z0-9_\-+/=]{20,})['"]/i,
      label: 'long literal credential',
      heuristic: true, // value-shape gated below to avoid kebab/class-name false positives
    },
  ];
  for (const f of files) {
    const c = classify(f);
    if (c.kind === 'external') continue;
    if (c.rel.includes('.env')) continue;
    if (/\b(test|spec|fixture|mock)s?\b/i.test(c.rel)) continue; // test data is not a real secret
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      // Skip obvious placeholders.
      if (/(EXAMPLE|PLACEHOLDER|YOUR[_-]?KEY|XXXX|<your)/i.test(line)) continue;
      for (const p of patterns) {
        const m = line.match(p.re);
        if (!m) continue;
        // Heuristic 'long literal credential': skip a value that is only lowercase
        // letters + hyphens (CSS class strings, kebab-case ids, slugs). Real
        // secrets carry entropy — uppercase, digits, or base64 chars (+/=) — so
        // those still flag; the structured AKIA/sk-/eyJ/gh_/xox patterns are unaffected.
        if (p.heuristic && /^[a-z-]+$/.test(m[2] || '')) continue;
        findings.push({
          id: 'secrets',
          severity: 'CRITICAL',
          file: c.rel,
          line: lineNo,
          message: `Possible ${p.label} committed. Rotate immediately and move to .env.local.`,
        });
      }
    }
  }
  return findings;
}

{{IF_STACK_HAS_DATA_LAYER}}
export function directFetch(files) {
  const findings = [];
  // `fetch(` not preceded by a word-character or `.` (so not `someObj.fetch(` or `prefetch(`).
  const re = /(?<![\w.])fetch\s*\(/;
  // Allowed in data-layer / repositories / services / convex (server functions).
  const ALLOWED = /^(data-layer|repositories|services|convex|server|api)\//;
  // Restrict the check to UI surfaces — `components/`, `pages/`, `app/` anywhere
  // in the tree (e.g. `src/react-app/pages/`, `src/react-app/components/`, `apps/web/src/app/`).
  const UI = /(^|\/)(components|pages|app)\//;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source') continue;
    if (!/\.(ts|tsx|jsx|js|mjs)$/.test(c.rel)) continue;
    if (ALLOWED.test(c.rel)) continue;
    if (!UI.test(c.rel)) continue;
    const text = stripBlockComments(readSafe(f));
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (re.test(stripComments(line))) {
        findings.push({
          id: 'direct-fetch',
          severity: 'HIGH',
          file: c.rel,
          line: lineNo,
          message: `Direct fetch() in UI. Route through your data layer (repository/hook/query).`,
        });
      }
    }
  }
  return findings;
}
{{/IF}}

export function absolutePaths(files) {
  const findings = [];
  // Home-rooted absolute path at a string/token start: `/Users/<name>/...` (macOS,
  // case-sensitive — `/users/` API routes don't match) or `/home/<name>/...` with at
  // least one more segment (so a `/home/index` web route stays clean).
  const re = /(?:^|['"`(=\s])\/(?:Users\/[A-Za-z0-9_.-]+|home\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind === 'external') continue;
    if (!/\.(ts|tsx|jsx|js|mjs|cjs)$/.test(c.rel)) continue;
    if (/\b(test|spec|fixture|mock)s?\b/i.test(c.rel)) continue; // test data may pin sample paths
    const text = stripBlockComments(readSafe(f));
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (/(EXAMPLE|PLACEHOLDER|<your|qc-allow[:\s]+abs-path)/i.test(line)) continue;
      if (re.test(stripComments(line))) {
        findings.push({
          id: 'abs-path',
          severity: 'HIGH',
          file: c.rel,
          line: lineNo,
          message: `Hardcoded home-rooted absolute path. Derive from process.env.HOME, import.meta.url, or the project root — this breaks on every other machine.`,
        });
      }
    }
  }
  return findings;
}

export function duplicateDirLiteral(files) {
  const findings = [];
  // Distinctive literal = a quoted path/url/dotfile string (contains `/` or starts
  // with `.`, ≥12 chars) or an `UPPER_SNAKE = <value>` assignment. Duplicated
  // verbatim across ≥2 files of the SAME directory it is a shared constant that
  // will drift — extract it into one module and import it.
  const STOPLIST = new Set(['use client', 'use strict', 'utf8', 'utf-8', 'application/json']);
  const STRING_RE = /['"`]([^'"`\n]{12,})['"`]/g;
  const CONST_RE = /\bconst\s+([A-Z][A-Z0-9_]{2,})\s*=\s*([^;\n]{4,})/;
  const seen = new Map(); // `${dir}\0${literal}` -> [{file, line}]
  for (const f of files) {
    const c = classify(f);
    if (c.kind === 'external') continue;
    if (!/\.(ts|tsx|jsx|js|mjs|cjs)$/.test(c.rel)) continue;
    if (/\.d\.ts$/.test(c.rel)) continue; // declaration files repeat specifiers by design
    if (/\b(test|spec|fixture|mock)s?\b/i.test(c.rel)) continue;
    const dir = c.rel.split('/').slice(0, -1).join('/');
    const text = stripBlockComments(readSafe(f));
    for (const { lineNo, text: rawLine } of iterateLines(text)) {
      const line = stripComments(rawLine);
      // Import/require/module specifiers are legitimately repeated across siblings —
      // including the closing `} from '...'` line of a multi-line import.
      if (/^\s*(import\b|export\s.*\bfrom\b)/.test(line)) continue;
      if (/\bfrom\s+['"]/.test(line) || /\b(require|import)\s*\(\s*['"]/.test(line)) continue;
      if (/qc-allow[:\s]+dup-literal/.test(rawLine)) continue;
      const candidates = [];
      for (const m of line.matchAll(STRING_RE)) {
        const v = m[1].trim();
        if (STOPLIST.has(v)) continue;
        if (/\s/.test(v)) continue; // paths/urls carry no whitespace (kills class strings)
        if (/\/\d{1,3}$/.test(v)) continue; // Tailwind opacity token (bg-black/60)
        if (v.includes('/') || v.startsWith('.')) candidates.push(`"${v}"`);
      }
      const cm = line.match(CONST_RE);
      if (cm) candidates.push(`${cm[1]} = ${cm[2].trim()}`);
      for (const lit of candidates) {
        const key = `${dir}\0${lit}`;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push({ file: c.rel, line: lineNo });
      }
    }
  }
  for (const [key, sites] of seen) {
    const distinctFiles = [...new Set(sites.map((s) => s.file))];
    if (distinctFiles.length < 2) continue;
    const lit = key.split('\0')[1];
    findings.push({
      id: 'dup-literal',
      severity: 'MEDIUM',
      file: sites[0].file,
      line: sites[0].line,
      message: `Literal ${lit.length > 60 ? lit.slice(0, 57) + '...' : lit} duplicated verbatim in ${distinctFiles.length} files of the same directory (${distinctFiles.join(', ')}). Extract into one module and import it.`,
    });
  }
  return findings;
}
