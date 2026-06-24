#!/usr/bin/env node
// verify.mjs — GATE DÉTERMINISTE DE FIDÉLITÉ Markdown → HTML (corpus meta-govern).
//
// Pour chaque paire (.md, .html) du corpus (28 references + USER-GUIDE +
// BUILD-SUMMARY), vérifie que CHAQUE token significatif du Markdown survit dans
// le HTML (multiset, unidirectionnel : md ⊆ html). Le chrome du gabarit (badge,
// TOC, pied) est du texte EN PLUS → toléré.
//
// SANS dépendance markdown-it → contrôle INDÉPENDANT du convertisseur.
// Source .md : le fichier sur disque s'il existe encore, SINON la baseline git
// (commit 900c654) — le gate reste re-jouable après suppression des .md.
//
// Usage :
//   node scripts/docs-html/verify.mjs            # tout le corpus
//   node scripts/docs-html/verify.mjs references/baseline.md
//   node scripts/docs-html/verify.mjs --json     # sortie JSON
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { skillRoot, CORPUS_ENTRIES } from './template.mjs';

const BASELINE_COMMIT = '900c654';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const only = args.find((a) => !a.startsWith('--'));

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', times: '×', check: '✓', deg: '°', eacute: 'é',
};
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => (name.toLowerCase() in NAMED ? NAMED[name.toLowerCase()] : m));
}

// Normalisation appliquée AUX DEUX côtés avant tokenisation : neutralise les
// différences ATTENDUES (réécriture .md → .html des liens intra-corpus).
function normalizeForCompare(text) {
  return text
    .replace(/\.(md|html)\b/gi, '')
    // emphase markdown `__mot__` → `mot` : retirée des DEUX côtés.
    .replace(/__+/g, '');
}

// Tokens significatifs : MOTS ATOMIQUES (lettres/chiffres unicode), ≥2 car.
const TOKEN_RE = /[\p{L}\p{N}]+/gu;
function tokenize(text) {
  const counts = new Map();
  const m = normalizeForCompare(text).toLowerCase().matchAll(TOKEN_RE);
  for (const x of m) {
    const tok = x[0];
    if (tok.length < 2) continue;
    counts.set(tok, (counts.get(tok) ?? 0) + 1);
  }
  return counts;
}

// --- Extraction texte depuis le Markdown (marqueurs structurels retirés). ---
function mdToText(md) {
  md = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, (block) => (/:/.test(block) ? '' : block));
  md = md.replace(/<!--[\s\S]*?-->/g, ' ');
  md = md.replace(/^(\s*)(`{3,}|~{3,})[^\n`~]*$/gm, '$1$2');
  md = md.replace(/<\/?[A-Za-z][^>]*>/g, ' ');
  md = md.replace(/\]\([^)]*\)/g, ']');
  return md
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*\d+[.)]\s+/, ' ') // numéro de liste ordonnée (::marker en HTML)
        .replace(/^\s*[-*+]\s+/, ' ') // puce
        .replace(/\[[ xX]\]/g, ' ') // case à cocher (input HTML, pas de texte)
    )
    .join('\n');
}

// --- Extraction texte visible + attributs (alt/title/content) du HTML. ---
function htmlToText(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const attrs = [];
  const re = /\b(?:alt|title|content)="([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) attrs.push(m[1]);
  const visible = html.replace(/<[^>]+>/g, ' ');
  return decodeEntities(visible + ' ' + attrs.join(' '));
}

/** Source markdown : disque si présent, sinon baseline git. */
function readMarkdownSource(sourceRel) {
  const abs = path.join(skillRoot, sourceRel);
  if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
  try {
    return execFileSync('git', ['-C', skillRoot, 'show', `${BASELINE_COMMIT}:${sourceRel}`], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function verifyOne(entry) {
  const htmlAbs = path.join(skillRoot, entry.target);
  if (!fs.existsSync(htmlAbs)) return { ...entry, status: 'FAIL', reason: 'HTML cible absent', deficits: [] };

  const md = readMarkdownSource(entry.source);
  if (md == null) {
    return { ...entry, status: 'FAIL', reason: `source .md introuvable (disque + git ${BASELINE_COMMIT})`, deficits: [] };
  }
  const html = fs.readFileSync(htmlAbs, 'utf8');

  const mdTokens = tokenize(mdToText(md));
  const htmlTokens = tokenize(htmlToText(html));

  const deficits = [];
  let missingTotal = 0;
  for (const [tok, n] of mdTokens) {
    const h = htmlTokens.get(tok) ?? 0;
    if (h < n) {
      deficits.push({ token: tok, md: n, html: h });
      missingTotal += n - h;
    }
  }
  deficits.sort((a, b) => b.md - b.html - (a.md - a.html));

  // contrôle secondaire : nb de titres ## / ### hors blocs de code et commentaires.
  const mdHeads = (
    md
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .match(/^#{2,3}\s/gm) || []
  ).length;
  const htmlHeads = (html.match(/<h[23]\b/g) || []).length;

  const status = missingTotal === 0 ? 'PASS' : 'FAIL';
  return { ...entry, status, missingTotal, deficits: deficits.slice(0, 25), mdHeads, htmlHeads };
}

let entries = CORPUS_ENTRIES.map((base) => ({ source: `${base}.md`, target: `${base}.html` }));
if (only) {
  const key = only.replace(/\\/g, '/').replace(/\.(md|html)$/i, '');
  entries = entries.filter((e) => e.source === `${key}.md` || e.target === `${key}.html`);
}

const results = entries.map(verifyOne);
const failed = results.filter((r) => r.status === 'FAIL');

if (asJson) {
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

console.log(`\n🔍 Vérification de fidélité — ${results.length} fichiers\n`);
for (const r of failed) {
  console.log(`  ✗ ${r.source}`);
  if (r.reason) console.log(`      ${r.reason}`);
  else {
    console.log(`      ${r.missingTotal} occurrence(s) de token absentes (titres md=${r.mdHeads} html=${r.htmlHeads})`);
    console.log(
      '      manquants: ' + r.deficits.map((d) => `${d.token}(${d.md}→${d.html})`).slice(0, 12).join(', ')
    );
  }
}
const passed = results.length - failed.length;
console.log(`\n  ${passed}/${results.length} PASS, ${failed.length} FAIL\n`);
process.exit(failed.length ? 1 : 0);
