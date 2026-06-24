// template.mjs — Moteur de gabarit HTML partagé (dépendance-free).
//
// `renderPage()` enrobe un CORPS HTML déjà rendu (depuis markdown-it pour la
// migration, ou un squelette pour scaffold.mjs) dans la coquille premium :
// bandeau typé + badge + breadcrumb + TOC sticky + pied + métadonnées machine.
//
// Tous les paramètres projet (nom, langue, dossier docs, clé de thème…)
// viennent de docs-config.mjs. Aucune dépendance : utilisé aussi bien par
// convert.mjs que scaffold.mjs.
import { docType } from './doc-types.mjs';
import { relAssetsPrefix } from './walk.mjs';
import {
  DOCS_ROOT,
  FOOTER_BRAND,
  GENERATOR,
  LANG,
  PROJECT_NAME,
  THEME_STORAGE_KEY,
  TITLE_SUFFIX,
} from './docs-config.mjs';

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
      .replace(/<a\b[^>]*class="[^"]*header-anchor[^"]*"[^>]*>[\s\S]*?<\/a>/g, '') // retire le lien d'ancre #
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) items.push({ level, id, text });
  }
  if (!items.length) {
    return '<p class="docs-toc__empty">Document court — pas de sommaire.</p>';
  }
  // it.id et it.text proviennent DÉJÀ du HTML rendu (id attribut sûr, texte aux
  // entités déjà encodées) → on les émet tels quels, SANS ré-échapper (sinon
  // `&amp;` deviendrait `&amp;amp;` dans un titre contenant « & »).
  let html = '<nav aria-label="Sommaire du document"><ul>';
  for (const it of items) {
    html += `<li class="lvl-${it.level}"><a href="#${it.id}">${it.text}</a></li>`;
  }
  html += '</ul></nav>';
  return html;
}

function breadcrumb(targetRel, relHub, type) {
  // targetRel ex: "docs/qa/x.html" → docs › qa › x (chaque segment cliquable).
  // Pas d'index par dossier : la racine pointe vers le hub, les dossiers
  // intermédiaires vers le groupe du TYPE dans le hub (#type), la feuille = page courante.
  const parts = targetRel.split('/');
  const file = parts[parts.length - 1].replace(/\.html$/i, '');
  const dirs = parts.slice(0, -1);
  const groupHref = `${relHub}#${encodeURIComponent(type)}`;
  const crumbs = dirs.map((d, i) => {
    const href = i === 0 ? relHub : groupHref;
    return `<a href="${escapeAttr(href)}">${escapeHtml(d)}</a>`;
  });
  crumbs.push(`<span aria-current="page">${escapeHtml(file)}</span>`);
  return crumbs.join('<span class="sep">›</span>');
}

// Préfixe DOCS_ROOT échappé pour calculer le chemin relatif d'une page sous docs/.
const DOCS_PREFIX_RE = new RegExp('^' + DOCS_ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/');

/**
 * @param {object} o
 * @param {string} o.title
 * @param {string} o.type        id de DOC_TYPES
 * @param {string} o.sourceRel   chemin source d'origine (ex. docs/qa/x.md)
 * @param {string} o.targetRel   chemin HTML cible (ex. docs/qa/x.html)
 * @param {string} o.bodyHtml    corps HTML rendu (depuis le markdown)
 * @param {string} [o.subtitle]  sous-titre optionnel (sinon blurb du type)
 * @param {string[]} [o.extraCss] hrefs CSS relatifs aux assets (ex. ['css/docs-hub.css'])
 * @param {string[]} [o.extraJs]  hrefs JS relatifs aux assets (ex. ['js/docs-hub.js'])
 * @returns {string} document HTML complet
 */
export function renderPage(o) {
  const t = docType(o.type);
  const relFromDocs = o.targetRel.replace(DOCS_PREFIX_RE, '');
  const assets = relAssetsPrefix(relFromDocs);
  const relHub = assets.replace(/assets\/$/, '') + 'index.html'; // hub d'accueil, relatif
  const body = wrapTables(o.bodyHtml);
  const toc = buildToc(body);
  const subtitle = o.subtitle || t.blurb;

  // Assets supplémentaires par page + auto-injection des améliorations « plan ».
  // Dédupliqués pour ne jamais émettre deux fois le même href.
  const cssHrefs = dedupe([
    ...(o.extraCss || []),
    ...(o.type === 'plan' ? [PLAN_CSS_HREF] : []),
  ]);
  const jsHrefs = dedupe([
    ...(o.extraJs || []),
    ...(o.type === 'plan' ? [PLAN_JS_HREF] : []),
  ]);
  const extraCssHtml = cssHrefs
    .map((href) => `\n  <link rel="stylesheet" href="${assets}${href}">`)
    .join('');
  const extraJsHtml = jsHrefs
    .map((href) => `\n  <script src="${assets}${href}" defer></script>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeAttr(LANG)}" data-doc-type="${escapeAttr(o.type)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(o.title)}${escapeHtml(TITLE_SUFFIX)}</title>
  <meta name="doc-type" content="${escapeAttr(o.type)}">
  <meta name="doc-type-label" content="${escapeAttr(t.label)}">
  <meta name="doc-title" content="${escapeAttr(o.title)}">
  <meta name="doc-source" content="${escapeAttr(o.sourceRel)}">
  <meta name="generator" content="${escapeAttr(GENERATOR)}">
  <meta name="description" content="${escapeAttr(subtitle)}">
  <link rel="stylesheet" href="${assets}css/docs-theme.css">${extraCssHtml}
  <style>:root{--doc-accent:${t.accent};--doc-glyph:${JSON.stringify(t.icon)};}</style>
  <script>(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
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
            <span><b>Projet</b> · ${escapeHtml(PROJECT_NAME)}</span>
          </div>
        </header>
        <div class="docs-content">
${body}
        </div>
      </article>
      <footer class="docs-footer">
        <span class="brand">${escapeHtml(FOOTER_BRAND)}</span>
        <span>${escapeHtml(t.label)} · <code>${escapeHtml(o.targetRel)}</code></span>
      </footer>
    </div>
  </div>
  <script src="${assets}js/docs-toc.js" defer></script>${extraJsHtml}
</body>
</html>
`;
}

// Assets auto-injectés pour les docs de type « plan » (source de vérité UNIQUE,
// consommée par renderPage au rendu depuis .md ET par ensurePlanAssets pour le
// re-emit in-place des plans déjà migrés dont le .md a disparu — voir la branche
// « .md absent » de convert.mjs, son unique appelant).
// Chemins relatifs au dossier assets/ (préfixés par relAssetsPrefix au rendu).
export const PLAN_CSS_HREF = 'css/docs-plan.css';
export const PLAN_JS_HREF = 'js/docs-plan.js';

/**
 * Réinjecte les références plan (docs-plan.css / docs-plan.js) dans un HTML de
 * plan DÉJÀ rendu dont la source .md n'existe plus (convert.mjs ne peut plus le
 * régénérer depuis le markdown). Appelée par convert.mjs quand une entrée du
 * manifest n'a plus de .md mais conserve son HTML cible. Idempotent : si les
 * références sont déjà présentes, le HTML est renvoyé tel quel. Le préfixe
 * assets/ est déduit du lien docs-theme.css existant pour rester correct quelle
 * que soit la profondeur du fichier.
 * @param {string} html  document HTML complet d'un plan
 * @returns {string} HTML avec les deux références garanties présentes
 */
export function ensurePlanAssets(html) {
  // Déduit le préfixe assets/ (ex. "../../../assets/") du lien docs-theme.css.
  const themeMatch = html.match(/href="([^"]*assets\/)css\/docs-theme\.css"/);
  if (!themeMatch) return html; // pas une page premium → ne rien toucher
  const assets = themeMatch[1];
  let out = html;
  // CSS : juste après le lien docs-theme.css (ordre = thème puis surcouche plan).
  if (!out.includes(`${assets}${PLAN_CSS_HREF}`)) {
    out = out.replace(
      `<link rel="stylesheet" href="${assets}css/docs-theme.css">`,
      `<link rel="stylesheet" href="${assets}css/docs-theme.css">\n  <link rel="stylesheet" href="${assets}${PLAN_CSS_HREF}">`
    );
  }
  // JS : juste après le <script> docs-toc.js (docs-plan.js dépend de la TOC posée).
  if (!out.includes(`${assets}${PLAN_JS_HREF}`)) {
    out = out.replace(
      `<script src="${assets}js/docs-toc.js" defer></script>`,
      `<script src="${assets}js/docs-toc.js" defer></script>\n  <script src="${assets}${PLAN_JS_HREF}" defer></script>`
    );
  }
  return out;
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
