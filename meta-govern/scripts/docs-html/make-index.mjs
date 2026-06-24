#!/usr/bin/env node
// make-index.mjs — Génère le hub premium index.html du corpus meta-govern.
//
// Walke <skill>/references/*.html + USER-GUIDE.html + BUILD-SUMMARY.html et
// produit une page d'accueil cherchable (cartes groupées par type, facettes,
// recherche client via assets/js/docs-hub.js). SANS dépendance.
// À relancer après ajout/suppression d'un document (scaffold.mjs le fait).
//
// Usage : node scripts/docs-html/make-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import {
  skillRoot,
  renderPage,
  escapeHtml,
  escapeAttr,
  DOC_TYPES,
  docType,
  typeForPath,
  walk,
  humanize,
} from './template.mjs';

// Dossiers non documentaires du skill : jamais indexés.
const EXCLUDE_DIRS = /^(assets|scripts|templates|agents)\//;
const EXCLUDE_FILES = /^(index\.html|INDEX\.html)$/;
const SKIP_UNDERSCORE = /_/; // basenames techniques (parité avec le toolkit TC)

function meta(html, name) {
  const m = new RegExp(`<meta name="${name}" content="([^"]*)"`).exec(html);
  return m ? m[1] : null;
}
// Les titres extraits du HTML sont DÉJÀ encodés en entités : on les décode en
// texte brut ; l'émission ré-encode UNE seule fois.
function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
function titleOf(html, file) {
  return decodeEntities(
    (
      meta(html, 'doc-title') ||
      (/(<title>)([^<]*?)(\s*·[^<]*)?<\/title>/.exec(html)?.[2]) ||
      (/<h1[^>]*>([^<]+)</.exec(html)?.[1]) ||
      humanize(path.basename(file))
    ).trim()
  );
}

const files = walk(skillRoot, (n) => n.toLowerCase().endsWith('.html'))
  .map((abs) => path.relative(skillRoot, abs).replace(/\\/g, '/'))
  .filter(
    (rel) =>
      !EXCLUDE_DIRS.test(rel) &&
      !EXCLUDE_FILES.test(rel) &&
      !SKIP_UNDERSCORE.test(path.basename(rel))
  );

const groups = new Map();
for (const rel of files) {
  const html = fs.readFileSync(path.join(skillRoot, rel), 'utf8');
  const type = meta(html, 'doc-type') || typeForPath(rel);
  if (!groups.has(type)) groups.set(type, []);
  groups.get(type).push({ rel, title: titleOf(html, rel) });
}

const orderedTypes = DOC_TYPES.map((t) => t.id).filter((id) => groups.has(id));
const total = files.length;

// Barre d'outils collante (recherche + facette type). Filtrage 100 % client
// (assets/js/docs-hub.js) ; ici seulement le markup. Pas de facette contexte
// pour le corpus meta-govern (un seul contexte).
function buildToolbar() {
  const typeChips = orderedTypes
    .map((id) => {
      const t = docType(id);
      const n = groups.get(id).length;
      return (
        `<button type="button" class="hub-chip" data-value="${escapeAttr(id)}" aria-pressed="false">` +
        `<span class="hub-chip__ico" style="color:${t.accent}" aria-hidden="true">${t.icon}</span>` +
        `<span class="hub-chip__label">${escapeHtml(t.label)}</span>` +
        `<span class="hub-chip__count">${n}</span></button>`
      );
    })
    .join('');
  return (
    `      <div class="hub-toolbar">\n` +
    `        <input class="hub-search" type="search" placeholder="Rechercher un document…" aria-label="Rechercher un document">\n` +
    `        <div class="hub-facets" data-facet="type" role="group" aria-label="Filtrer par type"><span class="hub-facets__label" aria-hidden="true">Type</span>${typeChips}</div>\n` +
    `        <p class="hub-result-count" aria-live="polite"></p>\n` +
    `      </div>\n`
  );
}

let body = `      <h1>Documentation meta-govern</h1>\n`;
body += `      <p class="hub-intro"><strong>${total}</strong> documents HTML, groupés par type. Le corpus meta-govern est 100 % HTML — créez une nouvelle référence via <code>node scripts/docs-html/scaffold.mjs</code>.</p>\n`;
body += buildToolbar();

for (const type of orderedTypes) {
  const t = docType(type);
  const items = groups.get(type).sort((a, b) => a.rel.localeCompare(b.rel));
  body += `      <section class="hub-section">\n`;
  body += `      <h2 id="${escapeAttr(type)}"><a class="header-anchor" href="#${escapeAttr(type)}" aria-hidden="true">#</a> <span class="hub-h2-ico" style="color:${t.accent}">${t.icon}</span> ${escapeHtml(t.label)} <span class="hub-count">${items.length}</span></h2>\n`;
  body += `      <div class="hub-grid">\n`;
  for (const it of items) {
    // index.html est à la racine du skill → liens relatifs à cette racine.
    const href = escapeAttr(it.rel);
    const search = escapeAttr(`${it.title} ${it.rel}`.toLowerCase());
    body += `        <a class="hub-card" href="${href}" style="--doc-accent:${t.accent}" data-type="${escapeAttr(type)}" data-search="${search}"><span class="hub-card__title">${escapeHtml(it.title)}</span><span class="hub-card__path">${escapeHtml(it.rel)}</span></a>\n`;
  }
  body += `      </div>\n      </section>\n`;
}

const html = renderPage({
  title: 'Documentation meta-govern',
  type: 'generic',
  sourceRel: 'index.html',
  targetRel: 'index.html',
  subtitle: `Hub de navigation — ${total} documents, ${orderedTypes.length} types`,
  bodyHtml: body,
  extraCss: ['css/docs-hub.css'],
  extraJs: ['js/docs-hub.js'],
});

fs.writeFileSync(path.join(skillRoot, 'index.html'), html, 'utf8');
console.log(`✓ index.html — ${total} docs, ${orderedTypes.length} types.`);
