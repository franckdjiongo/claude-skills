#!/usr/bin/env node
/**
 * Output formatting for quality-checks — human (colored) + JSON finding renderers.
 * Split out of lib.mjs to keep that module under the file-size budget.
 */

import { SEVERITY_ORDER } from './lib.mjs';

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
