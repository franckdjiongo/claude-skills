#!/usr/bin/env node
/**
 * Style checks for {{PROJECT_NAME}}.
 * - colors-hex     CRITICAL: hardcoded hex colors outside design tokens.
 * - colors-rgba    CRITICAL: hardcoded rgb/rgba colors.
{{IF_STACK_HAS_I18N}} * - i18n-ternary   CRITICAL: inline `language === 'en' ? ... : ...` bypass of i18n layer.
 *                  (only emitted if the project uses i18n — gated at scaffold time)
{{/IF}} */

// macOS hardening: see ../lib.mjs for the canonical PATH_PREFIX. Re-exported
// here so any subprocess this check might add can pick it up directly.
export const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

import { classify, iterateLines, readSafe, stripComments, stripBlockComments } from '../lib.mjs';

// Files where hardcoded color literals are EXPECTED (design tokens, Tailwind config).
const COLOR_TOKEN_FILES = new Set([
  'index.css',
  'tokens.css',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.ts',
  'tailwind.config.mjs',
]);

function isColorTokenFile(rel) {
  const base = rel.split('/').pop() || rel;
  return COLOR_TOKEN_FILES.has(rel) || COLOR_TOKEN_FILES.has(base);
}

export function hexColors(files) {
  const findings = [];
  // Match #RGB / #RRGGBB / #RRGGBBAA, but NOT HTML numeric entities like &#10003;
  // (a `#` preceded by `&` is part of an HTML entity, not a color).
  const re = /(?<!&)#[0-9a-fA-F]{3,8}\b/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source' || !/\.(ts|tsx|jsx|js|mjs)$/.test(c.rel)) continue;
    if (isColorTokenFile(c.rel)) continue;
    const text = stripBlockComments(readSafe(f));
    for (const { lineNo, text: line } of iterateLines(text)) {
      const m = stripComments(line).match(re);
      if (m) {
        findings.push({
          id: 'colors-hex',
          severity: 'CRITICAL',
          file: c.rel,
          line: lineNo,
          message: `Hardcoded hex color "${m[0]}". Move to tokens.css or tailwind.config.*.`,
        });
      }
    }
  }
  return findings;
}

export function rgbaColors(files) {
  const findings = [];
  const re = /\brgba?\s*\(\s*\d/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source' || !/\.(ts|tsx|jsx|js|mjs)$/.test(c.rel)) continue;
    if (isColorTokenFile(c.rel)) continue;
    const text = stripBlockComments(readSafe(f));
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (re.test(stripComments(line))) {
        findings.push({
          id: 'colors-rgba',
          severity: 'CRITICAL',
          file: c.rel,
          line: lineNo,
          message: `Hardcoded rgb/rgba color. Move to design tokens.`,
        });
      }
    }
  }
  return findings;
}

{{IF_STACK_HAS_I18N}}
export function languageTernary(files) {
  const findings = [];
  // Match: language === 'en' or language === "fr" — common JSX bypass pattern.
  const re = /\blanguage\s*===\s*['"](en|fr|es|de|it|pt|ja|zh|ko|ar|nl|sv)['"]/;
  for (const f of files) {
    const c = classify(f);
    if (c.kind !== 'source') continue;
    if (!/\.(ts|tsx|jsx|js|mjs)$/.test(c.rel)) continue;
    const text = stripBlockComments(readSafe(f));
    for (const { lineNo, text: line } of iterateLines(text)) {
      if (re.test(stripComments(line))) {
        findings.push({
          id: 'i18n-ternary',
          severity: 'CRITICAL',
          file: c.rel,
          line: lineNo,
          message: `Inline language ternary. Route text through your i18n layer (e.g. useContent() / t()).`,
        });
      }
    }
  }
  return findings;
}
{{/IF}}
