// render-md.mjs — Rendu Markdown → HTML (OUTILLAGE DE MIGRATION UNIQUEMENT).
//
// Dépend de markdown-it + plugins, à installer SANS les persister dans
// package.json, le temps de la migration uniquement :
//   npm i --no-save markdown-it markdown-it-anchor markdown-it-task-lists markdown-it-footnote
// Les checkers PERMANENTS (verify/inventory/no-markdown-guard/scaffold) restent
// eux 100 % sans dépendance. Rendu CommonMark fidèle : tables GFM, task-lists,
// footnotes, HTML brut conservé, ancres de titres pour la TOC.
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';

const md = new MarkdownIt({
  html: true, // conserve le HTML brut présent dans les .md
  // linkify DÉSACTIVÉ : ces docs regorgent de chemins de fichiers (types.test.ts,
  // build.sh…) dont l'extension ressemble à un TLD (.ts = Tuvalu) — linkify les
  // transformait en faux liens et cassait les tokens. Les vraies URL restent en
  // syntaxe markdown [texte](url) ou <url>. Fidélité > autolink des URL nues.
  linkify: false,
  typographer: false, // ne réécrit pas les guillemets/tirets → fidélité maximale
  breaks: false,
})
  .use(anchor, {
    level: [2, 3, 4],
    permalink: anchor.permalink.linkInsideHeader({
      symbol: '#',
      placement: 'before',
      class: 'header-anchor',
      ariaHidden: true,
    }),
  })
  .use(taskLists, { label: true })
  .use(footnote);

// Les en-têtes de doc empilent des lignes « **Champ :** valeur » sans ligne
// vide entre elles. En CommonMark (breaks:false, requis pour ne PAS casser les
// paragraphes hard-wrappés), elles fusionneraient en une ligne. On insère un
// saut dur (2 espaces) UNIQUEMENT entre deux lignes « champ » consécutives —
// la prose enveloppée n'est jamais touchée. Aucun texte modifié (fidélité).
function hardBreakFieldRuns(body) {
  const lines = body.split(/\r?\n/);
  const isField = (l) => /^\*\*[^*].*?\*\*/.test(l.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (isField(lines[i]) && isField(lines[i + 1]) && !/ {2}$/.test(lines[i])) {
      lines[i] += '  ';
    }
  }
  return lines.join('\n');
}

// Sentinelle pour les pipes protégés à l'intérieur des code-spans de tableaux.
const PIPE_SENTINEL = String.fromCharCode(1); // U+0001, restauré en '|' après rendu

// Compte les cellules d'une ligne de tableau (pipes NON échappés, hors sentinelle).
function countCells(line) {
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return s.split(/(?<!\\)\|/).length;
}

// Protège les pipes situés DANS un code-span inline (`a|b`) : GitHub respecte les
// code-spans dans les tableaux, pas markdown-it. On remplace ces `|` par une
// sentinelle pour empêcher le découpage de cellule, restaurée après rendu.
function protectCodeSpanPipes(line) {
  return line.replace(/(`+)([^`]*?)\1/g, (m, ticks, inner) =>
    inner.includes('|') ? ticks + inner.replace(/\|/g, PIPE_SENTINEL) + ticks : m
  );
}

const isSepRow = (l) => l != null && /^\s*\|?[\s:]*-{2,}[\s:|-]*\|?\s*$/.test(l) && /-/.test(l);

// Normalise les tableaux GFM AVANT rendu :
//  1. protège les pipes dans les code-spans (sinon cellule coupée + contenu perdu) ;
//  2. élargit l'en-tête aux lignes plus larges (sinon GFM tronque les cellules
//     excédentaires — ex. colonne « [ ] » de statut absente de l'en-tête).
// 100 % préservation de contenu (aucun texte modifié, seulement des cellules
// d'en-tête vides ajoutées + des pipes neutralisés temporairement).
function normalizeTables(src) {
  const lines = src.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/\|/.test(lines[i]) && isSepRow(lines[i + 1])) {
      // bloc de tableau : header = i, separateur = i+1, corps = i+2…
      const rowIdx = [i];
      let j = i + 2;
      while (j < lines.length && lines[j].trim() !== '' && /\|/.test(lines[j]) && !/^\s*(```|~~~)/.test(lines[j])) {
        rowIdx.push(j);
        j++;
      }
      // 1. protéger les code-spans sur header + corps
      for (const k of rowIdx) lines[k] = protectCodeSpanPipes(lines[k]);
      // 2. élargir l'en-tête si une ligne est plus large
      const maxCols = Math.max(...rowIdx.map((k) => countCells(lines[k])));
      const headerCols = countCells(lines[i]);
      if (maxCols > headerCols) {
        const add = maxCols - headerCols;
        lines[i] = lines[i].replace(/\s*$/, '') + ' |'.repeat(add);
        lines[i + 1] = lines[i + 1].replace(/\s*$/, '') + ' --- |'.repeat(add);
      }
      i = j - 1;
    }
  }
  return lines.join('\n');
}

/** Sépare un éventuel front-matter YAML du corps. */
export function splitFrontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (m && /:/.test(m[1])) {
    return { frontMatter: m[1], body: src.slice(m[0].length) };
  }
  return { frontMatter: null, body: src };
}

/** Rend le front-matter (rare) en table de métadonnées pour ne RIEN perdre. */
function frontMatterHtml(fm) {
  const rows = fm
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      if (i === -1) return `<tr><td colspan="2">${escape(l)}</td></tr>`;
      return `<tr><th>${escape(l.slice(0, i).trim())}</th><td>${escape(l.slice(i + 1).trim())}</td></tr>`;
    })
    .join('');
  return `<table class="front-matter"><tbody>${rows}</tbody></table>`;
}
function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Rewrite les liens internes relatifs .md → .html (préserve #ancre, http(s), mailto). */
export function rewriteMdLinks(html) {
  return html.replace(/(href|src)="([^"]+?)\.md(#[^"]*)?"/g, (full, attr, base, frag) => {
    if (/^(https?:|mailto:|#|\/\/)/i.test(base)) return full; // externes/ancres : inchangés
    return `${attr}="${base}.html${frag || ''}"`;
  });
}

/**
 * @param {string} src markdown brut
 * @returns {{ bodyHtml:string }}
 */
export function renderMarkdown(src) {
  const { frontMatter, body } = splitFrontMatter(src);
  const prepared = normalizeTables(hardBreakFieldRuns(body));
  let html = md.render(prepared);
  html = html.split(PIPE_SENTINEL).join('|'); // restaure les pipes des code-spans
  // NB : la réécriture/résolution des liens internes est faite (de façon
  // manifest-aware) par convert.mjs, qui connaît l'emplacement du fichier et la
  // liste des docs migrés — voir fixLinks(). On ne touche PAS aveuglément les .md ici.
  if (frontMatter) html = frontMatterHtml(frontMatter) + '\n' + html;
  return { bodyHtml: html };
}
