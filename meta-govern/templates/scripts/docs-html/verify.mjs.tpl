#!/usr/bin/env node
// verify.mjs — GATE DÉTERMINISTE DE FIDÉLITÉ Markdown → HTML.
//
// Garantie « contenu conforme à 100 % » exigée : pour chaque paire (.md, .html),
// vérifie que CHAQUE token significatif présent dans le Markdown survit dans le
// HTML (vérification de multiset, unidirectionnelle : md ⊆ html). Le chrome
// ajouté par le gabarit (badge, TOC, pied) est du texte EN PLUS → toléré.
//
// SANS dépendance (ne ré-utilise PAS markdown-it) → contrôle INDÉPENDANT du
// convertisseur, donc capable de détecter une vraie perte/troncature.
//
// Usage:
//   node .claude/scripts/docs-html/verify.mjs            # tout le manifest
//   node .claude/scripts/docs-html/verify.mjs <source.md>
//   node .claude/scripts/docs-html/verify.mjs --json     # sortie JSON
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(scriptDir, 'docs-html-manifest.json'), 'utf8'));

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

// Normalisation appliquée AUX DEUX côtés avant tokenisation, pour neutraliser
// les différences ATTENDUES (non des pertes) :
//  - réécriture des liens .md → .html (on retire l'extension des deux côtés) ;
//  - autres extensions de fichiers fréquentes citées en chemins.
function normalizeForCompare(text) {
  return text
    .replace(/\.(md|html)\b/gi, '')
    // emphase markdown `__mot__` → `mot` (les `__` sont mangés au rendu, comme
    // sur GitHub) : on les retire des DEUX côtés pour comparer le mot, pas le balisage.
    .replace(/__+/g, '');
}

// Tokens significatifs : MOTS ATOMIQUES (lettres/chiffres unicode), ≥2 car.
// On compare au niveau du MOT, pas du token composé : un chemin `a/b/c` ou
// `Foo.tsx` se décompose en mots. Ainsi une phrase/cellule supprimée perd ses
// mots (→ détecté), tandis qu'un chemin scindé par une emphase markdown (ex.
// `__tests__` rendu en gras) garde tous ses mots (→ pas de faux échec).
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

// --- Extraction texte depuis le Markdown (en retirant les marqueurs structurels
//     qui ne produisent PAS de texte dans le HTML : numéros de liste, cases). ---
function mdToText(md) {
  // retire un front-matter YAML éventuel
  md = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, (block) => (/:/.test(block) ? '' : block));
  // commentaires HTML : invisibles en md ET en html → non comptés
  md = md.replace(/<!--[\s\S]*?-->/g, ' ');
  // info-string des clôtures de code (```ts, ~~~css…) : marqueur, pas du texte rendu
  md = md.replace(/^(\s*)(`{3,}|~{3,})[^\n`~]*$/gm, '$1$2');
  // balises HTML/MDX brutes (<Note>, <Step title=…>…) : noms de
  // balise/attribut, retirés à l'identique côté HTML → on les retire ici aussi.
  md = md.replace(/<\/?[A-Za-z][^>]*>/g, ' ');
  // URL de lien markdown `[texte](url)` : la cible n'est PAS du texte visible et
  // est résolue en chemin relatif par fixLinks → on ne compte que le texte visible.
  md = md.replace(/\]\([^)]*\)/g, ']');
  return md
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*\d+[.)]\s+/, ' ') // numéro de liste ordonnée (CSS ::marker en HTML)
        .replace(/^\s*[-*+]\s+/, ' ') // puce
        .replace(/\[[ xX]\]/g, ' ') // case à cocher (input HTML, pas de texte)
    )
    .join('\n');
}

// --- Extraction texte visible + valeurs d'attributs (alt/title/meta) du HTML. ---
function htmlToText(html) {
  // ne garder que le corps de document (évite le doublon TOC + le <style>/<script>)
  html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // On NE compare PAS href/src (cibles de navigation, réécrites en relatif par
  // fixLinks) — seulement le texte visible + alt/title/meta.
  const attrs = [];
  const re = /\b(?:alt|title|content)="([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) attrs.push(m[1]);
  const visible = html.replace(/<[^>]+>/g, ' ');
  return decodeEntities(visible + ' ' + attrs.join(' '));
}

function verifyOne(entry) {
  const mdAbs = path.join(repoRoot, entry.source);
  const htmlAbs = path.join(repoRoot, entry.target);
  if (!fs.existsSync(htmlAbs)) return { ...entry, status: 'FAIL', reason: 'HTML cible absent', deficits: [] };

  const md = fs.readFileSync(mdAbs, 'utf8');
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
  // tolérance : 0 (gate strict). Tri par manque décroissant.
  deficits.sort((a, b) => b.md - b.html - (a.md - a.html));

  // contrôle secondaire : nb de titres ## / ### hors blocs de code ET hors
  // commentaires HTML (un titre commenté n'est PAS du contenu visible).
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

let entries = manifest.entries;
if (only) {
  const key = only.replace(/\\/g, '/');
  entries = entries.filter((e) => e.source === key || e.target === key);
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
