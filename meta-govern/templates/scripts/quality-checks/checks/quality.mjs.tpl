#!/usr/bin/env node
/**
 * Quality / antipattern checks for {{PROJECT_NAME}}.
 * - todo               MEDIUM:   TODO/FIXME/XXX/HACK markers — track in backlog instead.
 * - snapshot           CRITICAL: .toMatchSnapshot() — brittle and rarely reviewed.
 * - container-query    CRITICAL: container.querySelector — use Testing Library queries.
 * - effect-setstate    LOW:      useEffect that calls setX(...) — heuristic for prop-mirroring smells.
 *                                (only emitted if the project uses React — gated at scaffold time)
 * - dataverse-formatted-value HIGH: `_FormattedValue` reads from Dataverse Web API responses
 *                                in business logic — should stay in the presentation layer.
 *                                (only emitted for Power Platform projects — gated at scaffold time)
 */

// macOS hardening: see ../lib.mjs for the canonical PATH_PREFIX. Re-exported
// here so any subprocess this check might add can pick it up directly.
export const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

import { classify, iterateLines, readSafe } from '../lib.mjs';

export function todoMarkers(files) {
  const findings = [];
  const re = /\b(TODO|FIXME|XXX|HACK)\b/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind === 'external' || c.kind === 'other') continue;
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      const m = line.match(re);
      if (m) {
        findings.push({
          id: 'todo',
          severity: 'MEDIUM',
          file: c.rel,
          line: lineNo,
          message: `${m[1]} marker. Track in docs/backlog-deferred.html if real, or remove.`,
        });
      }
    }
  }
  return findings;
}

export function snapshotTests(files) {
  const findings = [];
  const re = /\.toMatchSnapshot\s*\(/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'test') continue;
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (re.test(line)) {
        findings.push({
          id: 'snapshot',
          severity: 'CRITICAL',
          file: c.rel,
          line: lineNo,
          message: `Snapshot test forbidden. Assert specific behaviour with explicit expectations.`,
        });
      }
    }
  }
  return findings;
}

export function containerQuery(files) {
  const findings = [];
  const re = /\bcontainer\.querySelector\s*\(/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'test') continue;
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (re.test(line)) {
        findings.push({
          id: 'container-query',
          severity: 'CRITICAL',
          file: c.rel,
          line: lineNo,
          message: `container.querySelector forbidden. Use Testing Library queries (getByRole, findByText).`,
        });
      }
    }
  }
  return findings;
}

{{IF_STACK_REACT}}
export function useEffectSetState(files) {
  const findings = [];
  const SET_RE = /\bset[A-Z]\w*\s*\(/;
  const FUNC_UPDATE_RE = /\bset[A-Z]\w*\s*\(\s*\(?(prev|previous|p)\b/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source' || !/\.(tsx|jsx)$/.test(c.rel)) continue;
    const text = readSafe(f);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/\buseEffect\s*\(/.test(lines[i])) continue;
      // Allow a reviewed effect to opt out: `// qc-allow effect-setstate` on the
      // useEffect line or the line above (genuine subscriptions / controlled inputs).
      const prev = i > 0 ? lines[i - 1] : '';
      if (/qc-allow[:\s]+effect-setstate/.test(lines[i]) || /qc-allow[:\s]+effect-setstate/.test(prev)) continue;
      const window = lines.slice(i, Math.min(i + 12, lines.length)).join('\n');
      if (SET_RE.test(window) && !FUNC_UPDATE_RE.test(window)) {
        findings.push({
          id: 'effect-setstate',
          severity: 'LOW',
          file: c.rel,
          line: i + 1,
          message: `useEffect calls setX(). Verify it's not prop-mirroring (prefer derived state, useMemo, or a lazy initial state).`,
        });
        break;
      }
    }
  }
  return findings;
}
{{/IF}}

{{IF_STACK_POWER_PLATFORM}}
export function dataverseFormattedValue(files) {
  const findings = [];
  // Reading `_field@OData.Community.Display.V1.FormattedValue` in code.
  // Allowed in i18n / formatter layers, banned in business logic.
  const re = /\['"][a-zA-Z0-9_]+@OData\.Community\.Display\.V1\.FormattedValue['"]\]|FormattedValue/;
  const ALLOWED = /^(formatters|presentation|i18n)\//;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source') continue;
    if (!/\.(ts|tsx|js|mjs)$/.test(c.rel)) continue;
    if (ALLOWED.test(c.rel)) continue;
    const text = readSafe(f);
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (line.trim().startsWith('//')) continue;
      if (re.test(line)) {
        findings.push({
          id: 'dataverse-formatted-value',
          severity: 'HIGH',
          file: c.rel,
          line: lineNo,
          message: `Dataverse @FormattedValue read in business logic. Move localization to the presentation layer.`,
        });
        break;
      }
    }
  }
  return findings;
}
{{/IF}}
