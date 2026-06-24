#!/usr/bin/env node
/**
 * Code checks for {{PROJECT_NAME}}.
 * - file-size     HIGH at >300 lines, MEDIUM warn at >250 lines.
 * - ts-any        HIGH:    `: any` / `as any` outside eslint-disable.
 * - console       MEDIUM:  console.log/warn/error/info/debug in production code.
 * - secrets       CRITICAL: AWS/JWT/sk-/long literal credential patterns.
 * - direct-fetch  HIGH:    `fetch(` in components/pages — must route through data layer.
 *                  (only emitted if the project has a data-layer — gated at scaffold time)
 */

// macOS hardening: see ../lib.mjs for the canonical PATH_PREFIX. Re-exported
// here so any subprocess this check might add can pick it up directly.
export const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

import { classify, iterateLines, readSafe } from '../lib.mjs';

const FILE_SIZE_HARD = 300;
const FILE_SIZE_WARN = 250;

export function fileSizeHard(files) {
  const findings = [];
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source' && c.kind !== 'test') continue;
    const text = readSafe(f);
    if (text.length === 0) continue;
    const lineCount = text.split('\n').length;
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
  // `:\s*any` (annotations) or `as any` (casts), excluding `any` inside identifiers.
  const re = /:\s*any\b|\bas\s+any\b/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source') continue;
    if (!/\.(ts|tsx)$/.test(c.rel)) continue;
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) continue;
      // Skip if line has an inline disable for the any rule.
      if (/eslint-disable.*no-explicit-any/.test(line)) continue;
      if (re.test(line)) {
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
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) continue;
      if (/eslint-disable.*no-console/.test(line)) continue;
      const m = line.match(re);
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
      re: /(api[_-]?key|secret|password|token|bearer)\s*[:=]\s*['"][A-Za-z0-9_\-+/=]{20,}['"]/i,
      label: 'long literal credential',
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
        if (p.re.test(line)) {
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
  // Restrict the check to UI surfaces.
  const UI = /^(components|pages|app|src\/components|src\/pages|src\/app)\//;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source') continue;
    if (!/\.(ts|tsx|jsx|js|mjs)$/.test(c.rel)) continue;
    if (ALLOWED.test(c.rel)) continue;
    if (!UI.test(c.rel)) continue;
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (line.trim().startsWith('//')) continue;
      if (re.test(line)) {
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
