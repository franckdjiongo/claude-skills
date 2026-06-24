// template.mjs — Moteur de gabarit HTML du corpus meta-govern (dépendance-free).
//
// Version AUTO-SCOPÉE au skill : la racine documentaire est le dossier du skill
// (~/.claude/skills/meta-govern), les assets vivent dans <skill>/assets/.
// `renderPage()` enrobe un CORPS HTML déjà rendu dans la coquille premium :
// bandeau typé + badge + breadcrumb + TOC sticky + pied + métadonnées machine.
//
// Porté depuis le toolkit Temps Chantier (.claude/scripts/docs-html/lib/) —
// adaptations : projet « meta-govern », clé localStorage 'mg-docs-theme',
// registre DOC_TYPES propre au corpus (reference / guide / journal / synthese).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Racine du skill meta-govern (= racine documentaire du corpus). */
export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Clé localStorage du thème — DOIT égaler celle d'assets/js/docs-toc.js. */
export const THEME_STORAGE_KEY = 'mg-docs-theme';

// ---------------------------------------------------------------------------
// Registre des types de documents du corpus meta-govern.
// ---------------------------------------------------------------------------

/** @typedef {{ id:string, label:string, icon:string, accent:string, blurb:string }} DocType */

/** @type {DocType[]} */
export const DOC_TYPES = [
  { id: 'reference', label: 'Référence',  icon: '▤', accent: '#6D28D9', blurb: 'Référence canonique meta-govern (doctrine, patterns, stacks)' },
  { id: 'guide',     label: 'Guide',      icon: '✦', accent: '#2563EB', blurb: "Guide d'utilisation du skill meta-govern" },
  { id: 'journal',   label: 'Journal',    icon: '✎', accent: '#B45309', blurb: 'Journal append-only des leçons apprises' },
  { id: 'synthese',  label: 'Synthèse',   icon: '❖', accent: '#0F766E', blurb: 'Synthèse / rapport de construction' },
  { id: 'generic',   label: 'Document',   icon: '○', accent: '#041E3D', blurb: 'Document meta-govern' },
];

const BY_ID = new Map(DOC_TYPES.map((t) => [t.id, t]));

/** @param {string} id @returns {DocType} */
export function docType(id) {
  return BY_ID.get(id) ?? BY_ID.get('generic');
}

/**
 * Mappe un chemin relatif à la racine du skill vers un id de DOC_TYPES.
 * @param {string} relPath ex. 'references/lessons-log.html'
 * @returns {string}
 */
export function typeForPath(relPath) {
  const p = relPath.replace(/\\/g, '/').replace(/\.(md|html)$/i, '');
  if (p === 'references/lessons-log') return 'journal';
  if (p.startsWith('references/')) return 'reference';
  if (p === 'USER-GUIDE') return 'guide';
  if (p === 'BUILD-SUMMARY') return 'synthese';
  return 'generic';
}

// ---------------------------------------------------------------------------
// Utilitaires de parcours / titres (portés de lib/walk.mjs).
// ---------------------------------------------------------------------------

/**
 * Liste récursivement tous les fichiers de `dir` correspondant au filtre.
 * @param {string} dir chemin absolu
 * @param {(name:string)=>boolean} match test sur le nom de fichier
 * @returns {string[]} chemins absolus, triés
 */
export function walk(dir, match) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, match));
    else if (entry.isFile() && match(entry.name)) out.push(abs);
  }
  return out.sort();
}

/** Extrait le 1er titre H1 markdown (`# ...`), en ignorant un front-matter YAML. */
export function extractTitle(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  if (lines[0]?.trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    i++;
  }
  for (; i < lines.length; i++) {
    const m = /^#\s+(.+?)\s*#*\s*$/.exec(lines[i]);
    if (m) return m[1].replace(/`/g, '').trim();
  }
  return null;
}

/** Transforme un nom de fichier en titre lisible (fallback sans H1). */
export function humanize(filename) {
  return filename
    .replace(/\.(md|html)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Profondeur d'un chemin relatif à la racine du skill → préfixe vers assets/. */
export function relAssetsPrefix(relFromRoot) {
  const depth = relFromRoot.split('/').length - 1; // nb de dossiers
  return depth === 0 ? 'assets/' : '../'.repeat(depth) + 'assets/';
}

// ---------------------------------------------------------------------------
// Rendu de page (porté de lib/template.mjs).
// ---------------------------------------------------------------------------

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
export function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/** Enrobe chaque <table> dans un conteneur scrollable (responsive). */
export function wrapTables(bodyHtml) {
  return bodyHtml.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
}

/** Construit la TOC (h2 + h3) à partir du HTML de corps rendu (avec id d'ancre). */
export function buildToc(bodyHtml) {
  const re = /<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  const items = [];
  let m;
  while ((m = re.exec(bodyHtml)) !== null) {
    const level = Number(m[1]);
    const id = m[2];
    const text = m[3]
      .replace(/<a\b[^>]*class="[^"]*header-anchor[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) items.push({ level, id, text });
  }
  if (!items.length) {
    return '<p class="docs-toc__empty">Document court — pas de sommaire.</p>';
  }
  // it.id et it.text proviennent DÉJÀ du HTML rendu → émis tels quels, SANS
  // ré-échapper (sinon `&amp;` deviendrait `&amp;amp;`).
  let html = '<nav aria-label="Sommaire du document"><ul>';
  for (const it of items) {
    html += `<li class="lvl-${it.level}"><a href="#${it.id}">${it.text}</a></li>`;
  }
  html += '</ul></nav>';
  return html;
}

function breadcrumb(targetRel, relHub, type) {
  // targetRel ex: "references/x.html" → meta-govern › references › x.
  const parts = targetRel.split('/');
  const file = parts[parts.length - 1].replace(/\.html$/i, '');
  const dirs = parts.slice(0, -1);
  const groupHref = `${relHub}#${encodeURIComponent(type)}`;
  const crumbs = [`<a href="${escapeAttr(relHub)}">meta-govern</a>`];
  for (const d of dirs) {
    crumbs.push(`<a href="${escapeAttr(groupHref)}">${escapeHtml(d)}</a>`);
  }
  crumbs.push(`<span aria-current="page">${escapeHtml(file)}</span>`);
  return crumbs.join('<span class="sep">›</span>');
}

/**
 * @param {object} o
 * @param {string} o.title
 * @param {string} o.type        id de DOC_TYPES
 * @param {string} o.sourceRel   chemin source d'origine (ex. references/x.md)
 * @param {string} o.targetRel   chemin HTML cible relatif au skill (ex. references/x.html)
 * @param {string} o.bodyHtml    corps HTML rendu
 * @param {string} [o.subtitle]  sous-titre optionnel (sinon blurb du type)
 * @param {string[]} [o.extraCss] hrefs CSS relatifs aux assets (ex. ['css/docs-hub.css'])
 * @param {string[]} [o.extraJs]  hrefs JS relatifs aux assets (ex. ['js/docs-hub.js'])
 * @returns {string} document HTML complet
 */
export function renderPage(o) {
  const t = docType(o.type);
  const assets = relAssetsPrefix(o.targetRel);
  const relHub = assets.replace(/assets\/$/, '') + 'index.html';
  const body = wrapTables(o.bodyHtml);
  const toc = buildToc(body);
  const subtitle = o.subtitle || t.blurb;

  const extraCssHtml = dedupe(o.extraCss || [])
    .map((href) => `\n  <link rel="stylesheet" href="${assets}${href}">`)
    .join('');
  const extraJsHtml = dedupe(o.extraJs || [])
    .map((href) => `\n  <script src="${assets}${href}" defer></script>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr" data-doc-type="${escapeAttr(o.type)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(o.title)} · meta-govern</title>
  <meta name="doc-type" content="${escapeAttr(o.type)}">
  <meta name="doc-type-label" content="${escapeAttr(t.label)}">
  <meta name="doc-title" content="${escapeAttr(o.title)}">
  <meta name="doc-source" content="${escapeAttr(o.sourceRel)}">
  <meta name="generator" content="meta-govern docs-html">
  <meta name="description" content="${escapeAttr(subtitle)}">
  <link rel="stylesheet" href="${assets}css/docs-theme.css">${extraCssHtml}
  <style>:root{--doc-accent:${t.accent};--doc-glyph:${JSON.stringify(t.icon)};}</style>
  <script>(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-doc-type="${escapeAttr(o.type)}">
  <div class="docs-progress" aria-hidden="true"></div>
  <div class="docs-controls">
    <a class="docs-iconbtn docs-home" href="${escapeAttr(relHub)}" aria-label="Accueil — index de la documentation" title="Accueil de la documentation">⌂</a>
    <button class="docs-iconbtn docs-theme-toggle" type="button" aria-label="Basculer le thème">◐</button>
    <button class="docs-iconbtn docs-top" type="button" aria-label="Revenir en haut">↑</button>
  </div>
  <div class="docs-shell">
    <aside class="docs-toc" id="docs-toc">
      <p class="docs-toc__label">Sur cette page</p>
      ${toc}
    </aside>
    <div class="docs-main">
      <button class="docs-toc-toggle" type="button" aria-controls="docs-toc">☰ Sommaire</button>
      <article class="docs-article">
        <header class="docs-header">
          <nav class="docs-breadcrumb" aria-label="Fil d'Ariane">${breadcrumb(o.targetRel, relHub, o.type)}</nav>
          <span class="docs-badge"><span class="ico" aria-hidden="true">${t.icon}</span>${escapeHtml(t.label)}</span>
          <h1 class="docs-title">${escapeHtml(o.title)}</h1>
          <p class="docs-blurb">${escapeHtml(subtitle)}</p>
          <div class="docs-meta">
            <span><b>Type</b> · ${escapeHtml(t.label)}</span>
            <span><b>Source</b> · <code>${escapeHtml(o.sourceRel)}</code></span>
            <span><b>Projet</b> · meta-govern</span>
          </div>
        </header>
        <div class="docs-content">
${body}
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">meta-govern — Documentation</span>
        <span>${escapeHtml(t.label)} · <code>${escapeHtml(o.targetRel)}</code></span>
      </footer>
    </div>
  </div>
  <script src="${assets}js/docs-toc.js" defer></script>${extraJsHtml}
</body>
</html>
`;
}

/**
 * Retourne un tableau sans doublons ni valeurs vides, ordre préservé.
 * @param {string[]} hrefs
 * @returns {string[]}
 */
function dedupe(hrefs) {
  const seen = new Set();
  const out = [];
  for (const href of hrefs) {
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push(href);
  }
  return out;
}

/** Basenames (sans extension) des 30 documents du corpus converti — partagé
 *  par convert-references.mjs (réécriture des liens) et verify.mjs (paires). */
export const CORPUS_ENTRIES = [
  'references/anti-pattern-catalog',
  'references/architecture-patterns',
  'references/baseline',
  'references/ddd-scorecard',
  'references/ddd-strategic',
  'references/ddd-tactical',
  'references/decision-trees',
  'references/engineering-principles',
  'references/evolution-roadmap',
  'references/four-tier-architecture',
  'references/governance-cadence',
  'references/hook-canonical-patterns',
  'references/lessons-log',
  'references/macos-hook-conventions',
  'references/opus-4-7-defaults',
  'references/project-archetypes',
  'references/session-management',
  'references/seven-primitives',
  'references/skill-canonical-structure',
  'references/stack-convex',
  'references/stack-monorepo',
  'references/stack-nextjs',
  'references/stack-power-platform',
  'references/stack-react-vite',
  'references/stack-sveltekit',
  'references/subagent-canonical-structure',
  'references/tooling-architecture-checks',
  'references/workflow-blueprint',
  'USER-GUIDE',
  'BUILD-SUMMARY',
];
