#!/usr/bin/env node
/**
 * check-skillcount.mjs — recompute every skillCount in skills-app from the ACTUAL
 * skills[] data and flag (or, with --fix, print) any drift.
 *
 * Why this exists: scripts/sync-local-skills.py maintains
 * skills-app/src/data/skills.ts by INCREMENTING the declared counters by a delta
 * on each add/remove. A delta that ever misses (manual edit, aborted run, two
 * branches both bumping) silently drifts the declared skillCount away from the
 * real number of objects — with no self-correction. This guard recomputes the
 * truth from the objects themselves, so it can never drift, and doubles as a
 * reusable check (`--check` exits non-zero on any mismatch — wire it into CI or
 * a pre-commit hook).
 *
 * The declared counters live INSIDE skills.ts:
 *   - repositories[].skillCount   → must equal #skills with that repository
 *   - categories[].skillCount     → must equal #skills with that category id
 *   - the 'all' category          → must equal the total #skills
 *
 * Usage:
 *   node scripts/check-skillcount.mjs           # report drift, exit 0
 *   node scripts/check-skillcount.mjs --check    # report drift, exit 1 if any
 *   node scripts/check-skillcount.mjs --fix      # rewrite skills.ts with correct counts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_TS = path.resolve(HERE, '..', 'skills-app', 'src', 'data', 'skills.ts');

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const FIX = args.has('--fix');

/** Slice the body of `export const <name>: <Type>[] = [ ... ];` (bracket-balanced). */
function sliceArray(source, name) {
  const startMarker = new RegExp(`export const ${name}\\s*:[^=]*=\\s*\\[`);
  const m = startMarker.exec(source);
  if (!m) throw new Error(`skills.ts: array '${name}' not found`);
  let i = m.index + m[0].length; // just past the opening '['
  let depth = 1;
  for (; i < source.length && depth > 0; i++) {
    const ch = source[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
  }
  if (depth !== 0) throw new Error(`skills.ts: unbalanced brackets in '${name}'`);
  return source.slice(m.index + m[0].length, i - 1);
}

const src = readFileSync(SKILLS_TS, 'utf8');

const reposBody = sliceArray(src, 'repositories');
const catsBody = sliceArray(src, 'categories');
const skillsBody = sliceArray(src, 'skills');

// --- Real counts, straight from the skills[] objects (the source of truth) ---
// Each skill object carries exactly one `repository: '<id>'` and one
// `category: '<id>'`, so counting those occurrences in the skills[] body IS the
// object count — no object can be double-counted.
const realTotal = (skillsBody.match(/\brepository:\s*'[^']+'/g) || []).length;

const perRepo = new Map();
for (const mm of skillsBody.matchAll(/\brepository:\s*'([^']+)'/g)) {
  perRepo.set(mm[1], (perRepo.get(mm[1]) || 0) + 1);
}
const perCat = new Map();
for (const mm of skillsBody.matchAll(/\bcategory:\s*'([^']+)'/g)) {
  perCat.set(mm[1], (perCat.get(mm[1]) || 0) + 1);
}

// --- Declared counters ---
const declaredRepos = [];
for (const mm of reposBody.matchAll(/id:\s*'([^']+)'[\s\S]*?skillCount:\s*(\d+)/g)) {
  declaredRepos.push({ id: mm[1], declared: Number(mm[2]) });
}
const declaredCats = [];
for (const mm of catsBody.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?skillCount:\s*(\d+)[\s\S]*?\}/g)) {
  declaredCats.push({ id: mm[1], declared: Number(mm[2]) });
}

// --- Compare ---
const drift = [];
for (const r of declaredRepos) {
  const real = perRepo.get(r.id) || 0;
  if (real !== r.declared) drift.push({ kind: 'repository', id: r.id, declared: r.declared, real });
}
for (const c of declaredCats) {
  const real = c.id === 'all' ? realTotal : perCat.get(c.id) || 0;
  if (real !== c.declared) drift.push({ kind: 'category', id: c.id, declared: c.declared, real });
}

// --- Cross-checks (internal invariants) ---
const crossErrors = [];
const sumRepos = declaredRepos.reduce((s, r) => s + (perRepo.get(r.id) || 0), 0);
if (sumRepos !== realTotal) {
  crossErrors.push(`Σ per-repository (${sumRepos}) ≠ total skills (${realTotal}) — a skill has an unknown repository id`);
}
const sumCats = declaredCats.filter((c) => c.id !== 'all').reduce((s, c) => s + (perCat.get(c.id) || 0), 0);
if (sumCats !== realTotal) {
  crossErrors.push(`Σ per-category (${sumCats}) ≠ total skills (${realTotal}) — a skill has an unknown/missing category id`);
}
// Any skill category / repository not declared at all?
for (const id of perCat.keys()) {
  if (!declaredCats.some((c) => c.id === id)) crossErrors.push(`skills[] use category '${id}' but categories[] has no such entry`);
}
for (const id of perRepo.keys()) {
  if (!declaredRepos.some((r) => r.id === id)) crossErrors.push(`skills[] use repository '${id}' but repositories[] has no such entry`);
}

// --- Report ---
console.log(`skills.ts — ${realTotal} skill objects total\n`);
if (drift.length === 0 && crossErrors.length === 0) {
  console.log('✓ All skillCount counters match the real data.');
} else {
  if (drift.length) {
    console.log('Drifted counters (declared → real):');
    for (const d of drift) console.log(`  ${d.kind.padEnd(10)} ${d.id.padEnd(28)} ${d.declared} → ${d.real}`);
  }
  if (crossErrors.length) {
    console.log('\nCross-check errors:');
    for (const e of crossErrors) console.log(`  ✗ ${e}`);
  }
}

// --- Fix ---
if (FIX && drift.length) {
  let out = src;
  for (const d of drift) {
    if (d.kind === 'repository') {
      // repositories[] entries span multiple lines: id: '<id>' ... skillCount: N
      const re = new RegExp(`(id:\\s*'${d.id}'[\\s\\S]*?skillCount:\\s*)\\d+`);
      out = out.replace(re, `$1${d.real}`);
    } else {
      // categories[] entries are single-line: { id: '<id>', ..., skillCount: N, ... }
      const re = new RegExp(`(\\{\\s*id:\\s*'${d.id}'[^}]*?skillCount:\\s*)\\d+`);
      out = out.replace(re, `$1${d.real}`);
    }
  }
  if (out !== src) {
    writeFileSync(SKILLS_TS, out, 'utf8');
    console.log(`\n✎ Rewrote ${drift.length} counter(s) in skills.ts.`);
  }
}

if (CHECK && (drift.length || crossErrors.length)) process.exit(1);
