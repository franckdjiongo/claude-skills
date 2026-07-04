#!/usr/bin/env node
// make-index.mjs — Génère la page d'accueil premium <DOCS_ROOT>/index.html
// (+ INDEX.html) : un hub de navigation listant TOUS les documents HTML,
// groupés par type. SANS dépendance. À relancer après ajout/suppression de docs.
//
// Facettes : la facette « type » est toujours émise ; la facette « contexte »
// ne l'est QUE si CONTEXT_BUCKETS (lib/docs-config.mjs) est non vide.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, escapeHtml, escapeAttr } from './lib/template.mjs';
import { DOC_TYPES, docType, typeForPath } from './lib/doc-types.mjs';
import { walk, humanize } from './lib/walk.mjs';
import { CONTEXT_BUCKETS, DOCS_ROOT, HUB_TITLE } from './lib/docs-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const docsDir = path.join(repoRoot, DOCS_ROOT);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// MÊMES exclusions que le hook docs-index-refresh (parité stricte) :
// assets/, index.html / INDEX.html à la racine, basenames contenant « _ ».
const EXCLUDE = new RegExp('^' + escapeRe(DOCS_ROOT) + '/(assets/|index\\.html$|INDEX\\.html$)');
const DOCS_PREFIX_RE = new RegExp('^' + escapeRe(DOCS_ROOT) + '/');
const SKIP_UNDERSCORE = /_/;

function meta(html, name) {
  const m = new RegExp(`<meta name="${name}" content="([^"]*)"`).exec(html);
  return m ? m[1] : null;
}
// Les titres extraits du HTML (meta / <title> / <h1>) sont DÉJÀ encodés en
// entités. On les décode en texte brut ; l'émission ré-encode une seule fois
// (sinon « & » deviendrait « &amp; » affiché littéralement — bug observé).
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

// Rattache un doc à un bucket de contexte (1er bucket dont une sous-chaîne
// `match` apparaît dans le chemin). '' si aucun bucket / facette désactivée.
function contextBucket(relPath) {
  const p = relPath.replace(/\\/g, '/').toLowerCase();
  for (const b of CONTEXT_BUCKETS) {
    const needles = (b.match && b.match.length ? b.match : ['/' + b.id + '/']).map((n) => String(n).toLowerCase());
    if (needles.some((n) => p.includes(n))) return b.id;
  }
  return '';
}

// Barre d'outils collante (recherche + facettes type/contexte). Le filtrage est
// 100 % client (assets/js/docs-hub.js) ; ici on émet seulement le markup.
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
  let ctxFacet = '';
  if (CONTEXT_BUCKETS.length) {
    const ctxChips = CONTEXT_BUCKETS.filter((b) => contextCounts.get(b.id))
      .map((b) => {
        const n = contextCounts.get(b.id) || 0;
        return (
          `<button type="button" class="hub-chip" data-value="${escapeAttr(b.id)}" aria-pressed="false">` +
          `<span class="hub-chip__label">${escapeHtml(b.label)}</span>` +
          `<span class="hub-chip__count">${n}</span></button>`
        );
      })
      .join('');
    ctxFacet = `        <div class="hub-facets" data-facet="context" role="group" aria-label="Filtrer par contexte"><span class="hub-facets__label" aria-hidden="true">Contexte</span>${ctxChips}</div>\n`;
  }
  return (
    `      <div class="hub-toolbar">\n` +
    `        <input class="hub-search" type="search" placeholder="Rechercher un document…" aria-label="Rechercher un document">\n` +
    `        <div class="hub-facets" data-facet="type" role="group" aria-label="Filtrer par type"><span class="hub-facets__label" aria-hidden="true">Type</span>${typeChips}</div>\n` +
    ctxFacet +
    `        <p class="hub-result-count" aria-live="polite"></p>\n` +
    `      </div>\n`
  );
}

const files = walk(docsDir, (n) => n.toLowerCase().endsWith('.html'))
  .map((abs) => path.relative(repoRoot, abs).replace(/\\/g, '/'))
  .filter((rel) => !EXCLUDE.test(rel) && !SKIP_UNDERSCORE.test(path.basename(rel)));

// Every counted doc must land in a group that the render loop emits, else `total`
// (all files) exceeds the rendered hub-cards (only DOC_TYPES ids) and the
// docs-index-refresh Stop hook re-runs make-index forever. So coerce an unknown
// doc-type (typo / legacy / externally-authored) to 'generic', mirroring the
// typeForPath fallback. Same normalization docType() does for unknown ids.
const KNOWN_TYPE_IDS = new Set(DOC_TYPES.map((t) => t.id));
const groups = new Map();
const contextCounts = new Map(); // bucketId -> nombre de docs
for (const rel of files) {
  const html = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  const rawType = meta(html, 'doc-type') || typeForPath(rel);
  const type = KNOWN_TYPE_IDS.has(rawType) ? rawType : 'generic';
  const bucket = contextBucket(rel);
  if (!groups.has(type)) groups.set(type, []);
  groups.get(type).push({ rel, title: titleOf(html, rel), bucket });
  if (bucket) contextCounts.set(bucket, (contextCounts.get(bucket) || 0) + 1);
}

const orderedTypes = DOC_TYPES.map((t) => t.id).filter((id) => groups.has(id));
const total = files.length;

let body = `      <h1>${escapeHtml(HUB_TITLE)}</h1>\n`;
body += `      <p class="hub-intro"><strong>${total}</strong> documents HTML, groupés par type. Tout <code>${escapeHtml(DOCS_ROOT)}/</code> est en HTML — créez un nouveau doc via <code>scaffold.mjs</code> (voir <code>.claude/scripts/docs-html/</code>).</p>\n`;
body += buildToolbar();

for (const type of orderedTypes) {
  const t = docType(type);
  const items = groups.get(type).sort((a, b) => a.rel.localeCompare(b.rel));
  body += `      <section class="hub-section">\n`;
  body += `      <h2 id="${escapeAttr(type)}"><a class="header-anchor" href="#${escapeAttr(type)}" aria-hidden="true">#</a> <span class="hub-h2-ico" style="color:${t.accent}">${t.icon}</span> ${escapeHtml(t.label)} <span class="hub-count">${items.length}</span></h2>\n`;
  body += `      <div class="hub-grid">\n`;
  for (const it of items) {
    // index est à <DOCS_ROOT>/index.html → liens relatifs au dossier docs
    const href = escapeAttr(it.rel.replace(DOCS_PREFIX_RE, ''));
    const search = escapeAttr(`${it.title} ${it.rel}`.toLowerCase());
    body += `        <a class="hub-card" href="${href}" style="--doc-accent:${t.accent}" data-type="${escapeAttr(type)}" data-context="${escapeAttr(it.bucket)}" data-search="${search}"><span class="hub-card__title">${escapeHtml(it.title)}</span><span class="hub-card__path">${escapeHtml(it.rel)}</span></a>\n`;
  }
  body += `      </div>\n      </section>\n`;
}

const html = renderPage({
  title: HUB_TITLE,
  type: 'generic',
  sourceRel: `${DOCS_ROOT}/index.html`,
  targetRel: `${DOCS_ROOT}/index.html`,
  subtitle: `Hub de navigation — ${total} documents, ${orderedTypes.length} types`,
  bodyHtml: body,
  extraCss: ['css/docs-hub.css'],
  extraJs: ['js/docs-hub.js'],
});

fs.writeFileSync(path.join(docsDir, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(docsDir, 'INDEX.html'), html, 'utf8'); // satisfait les liens ../INDEX.html
console.log(`✓ ${DOCS_ROOT}/index.html (+ INDEX.html) — ${total} docs, ${orderedTypes.length} types.`);
