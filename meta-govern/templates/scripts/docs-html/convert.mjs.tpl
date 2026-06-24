#!/usr/bin/env node
// convert.mjs — Conversion FIDÈLE Markdown → HTML, pilotée par le manifest.
//
// Pour chaque entrée du manifest : lit le .md, rend le corps via markdown-it,
// l'enrobe dans la coquille premium typée (template.mjs), écrit le .html cible.
// 100 % déterministe → aucune ré-écriture LLM, donc aucune perte de contenu.
//
// Cas « .md absent » : si la source markdown a été supprimée après migration
// mais que le HTML cible existe, on ne régénère pas le corps — on ré-émet le HTML
// en place et, pour les plans, on garantit les surcouches (docs-plan.css/js) via
// ensurePlanAssets (idempotent). Si le .md ET le .html manquent → erreur.
//
// Outillage de migration (dépend de markdown-it --no-save, cf. lib/render-md.mjs).
// Usage :
//   node .claude/scripts/docs-html/convert.mjs            # convertit tout
//   node .claude/scripts/docs-html/convert.mjs <chemin>   # un seul fichier
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from './lib/render-md.mjs';
import { renderPage, ensurePlanAssets } from './lib/template.mjs';
import { DOCS_ROOT } from './lib/docs-config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const manifestPath = path.join(scriptDir, 'docs-html-manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error('✗ Manifest absent. Lancez d’abord inventory.mjs.');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Préfixe docs paramétré (DOCS_ROOT) pour repérer les chemins de docs dans la prose.
const DOC_PATH_RE = new RegExp(escapeRe(DOCS_ROOT) + '\\/[^\\s"\'<>)\\]]+?\\.md\\b', 'g');

// Carte source(.md) → cible(.html) de TOUS les docs migrés : sert à réécrire
// les mentions de chemins <DOCS_ROOT>/*.md DANS le contenu (prose, code inline)
// pour que le HTML généré ne référence plus aucun .md.
const docPathMap = new Map(manifest.entries.map((e) => [e.source, e.target]));
// Basenames UNIQUES du manifest (pour réécrire les mentions nues sans préfixe
// docs, ex. `mon-doc-v1.md` dans du texte). Les noms ambigus sont exclus.
const baseCount = {};
for (const e of manifest.entries) {
  const b = e.source.split('/').pop();
  baseCount[b] = (baseCount[b] ?? 0) + 1;
}
const baseMap = new Map();
for (const e of manifest.entries) {
  const b = e.source.split('/').pop();
  if (baseCount[b] === 1) baseMap.set(b, b.replace(/\.md$/i, '.html'));
}
function rewriteDocPaths(html) {
  // 1. chemins complets <DOCS_ROOT>/…/x.md → cible exacte du manifest
  html = html.replace(DOC_PATH_RE, (p) => docPathMap.get(p) ?? p);
  // 2. basenames nus uniques (ex. <code>mon-doc-v1.md</code>) → .html
  html = html.replace(/\b([A-Za-z0-9][\w.-]*\.md)\b/g, (m, b) => baseMap.get(b) ?? m);
  return html;
}

// basename(.md) UNIQUE → cible .html COMPLÈTE (pour réparer les liens relatifs
// erronés / repo-root des sources markdown).
const baseToTarget = new Map();
for (const e of manifest.entries) {
  const b = e.source.split('/').pop();
  if (baseCount[b] === 1) baseToTarget.set(b, e.target);
}

// Résout/répare CHAQUE lien interne (href/src) d'une page vers le bon chemin
// RELATIF .html — uniquement pour les docs MIGRÉS. Les liens vers des fichiers
// non migrés (ex. src/**/CONTRACT.md), externes, ou ancres restent intacts.
function fixLinks(html, currentTargetRel) {
  const curDir = path.posix.dirname(currentTargetRel);
  return html.replace(/\b(href|src)="([^"]+)"/g, (full, attr, val) => {
    const cut = val.search(/[#?]/);
    const frag = cut >= 0 ? val.slice(cut) : '';
    const target = cut >= 0 ? val.slice(0, cut) : val;
    if (!target || /^(https?:|mailto:|tel:|data:|\/\/|#)/i.test(target)) return full;
    if (!/\.(md|html)$/i.test(target)) return full; // seulement les liens vers des docs
    const repoTarget = target.startsWith(DOCS_ROOT + '/')
      ? target
      : path.posix.normalize(path.posix.join(curDir, target));
    const base = repoTarget.replace(/\.(md|html)$/i, '');
    let finalTarget = null;
    if (docPathMap.has(base + '.md')) finalTarget = docPathMap.get(base + '.md');
    else {
      const bn = base.split('/').pop() + '.md';
      if (baseToTarget.has(bn)) finalTarget = baseToTarget.get(bn); // secours par basename unique
    }
    if (!finalTarget) return full; // non migré → on n'y touche pas
    const rel = path.posix.relative(curDir, finalTarget) || path.posix.basename(finalTarget);
    return `${attr}="${rel}${frag}"`;
  });
}

const only = process.argv[2] ? process.argv[2].replace(/\\/g, '/') : null;
const entries = only ? manifest.entries.filter((e) => e.source === only || e.target === only) : manifest.entries;
if (only && !entries.length) {
  console.error(`✗ Aucune entrée de manifest pour: ${only}`);
  process.exit(1);
}

let ok = 0;
let reemit = 0;
const errors = [];
for (const e of entries) {
  try {
    const srcAbs = path.join(repoRoot, e.source);
    const targetAbs = path.join(repoRoot, e.target);
    // Source .md DISPARUE mais HTML déjà rendu présent (cas des plans migrés dont
    // le .md a été supprimé) : on ne peut plus régénérer le corps depuis le
    // markdown, mais on garantit/réapplique en place les surcouches « plan »
    // (docs-plan.css + docs-plan.js) via ensurePlanAssets. Idempotent → rejouer
    // convert.mjs reproduit fidèlement ces fichiers. Si le .md ET le .html
    // manquent, c'est une vraie erreur.
    if (!fs.existsSync(srcAbs)) {
      if (!fs.existsSync(targetAbs)) {
        throw new Error('source .md et HTML cible absents — rien à régénérer');
      }
      const current = fs.readFileSync(targetAbs, 'utf8');
      const patched = e.type === 'plan' ? ensurePlanAssets(current) : current;
      if (patched !== current) fs.writeFileSync(targetAbs, patched, 'utf8');
      reemit++;
      continue;
    }
    const src = fs.readFileSync(srcAbs, 'utf8');
    const { bodyHtml } = renderMarkdown(src);
    const html = renderPage({
      title: e.title,
      type: e.type,
      sourceRel: e.target, // chemin canonique (.html) — plus aucune référence .md
      targetRel: e.target,
      bodyHtml: rewriteDocPaths(fixLinks(bodyHtml, e.target)),
    });
    fs.writeFileSync(targetAbs, html, 'utf8');
    ok++;
  } catch (err) {
    errors.push({ source: e.source, message: err.message });
  }
}

console.log(
  `\n🔁 Conversion: ${ok}/${entries.length} fichiers HTML rendus depuis .md` +
    (reemit ? ` · ${reemit} ré-émis en place (.md absent, surcouches plan garanties)` : '') +
    '.'
);
if (errors.length) {
  console.error(`\n✗ ${errors.length} erreur(s):`);
  for (const er of errors) console.error(`  - ${er.source}: ${er.message}`);
  process.exit(1);
}
console.log('✓ Aucune erreur de conversion.\n');
