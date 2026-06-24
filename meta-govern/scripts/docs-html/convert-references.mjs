#!/usr/bin/env node
// convert-references.mjs — Conversion ONE-SHOT du corpus meta-govern Markdown → HTML.
//
// Convertit references/*.md (28) + USER-GUIDE.md + BUILD-SUMMARY.md vers les
// mêmes basenames en .html, enrobés dans la coquille premium (template.mjs).
// markdown-it est importé via createRequire depuis le node_modules du projet
// Temps Chantier (kit de migration UNIQUEMENT — aucune dépendance permanente).
//
// Fixes de fidélité portés de TC lib/render-md.mjs :
//   - tables GFM (pipes protégés dans les code-spans, en-têtes élargis),
//   - linkify désactivé (chemins de fichiers ≠ URLs),
//   - sauts durs entre lignes « **Champ :** valeur » consécutives (fence-aware),
//   - front-matter YAML → table de métadonnées (rien n'est perdu).
//
// Réécrit les liens INTRA-CORPUS (references/*.md → *.html) hors blocs de code
// — les blocs <pre><code> restent byte-identiques à la source (gate verify.mjs).
//
// CAS SPÉCIAL references/lessons-log.md → format journal :
//   chaque entrée = <section class="lesson" data-date="YYYY-MM-DD"
//   id="lesson-YYYY-MM-DD-N"> avec h2 « YYYY-MM-DD — <titre> » ; le marqueur
//   <!-- LESSONS:APPEND --> est inséré juste avant la fermeture de .docs-content.
//
// Usage : node scripts/docs-html/convert-references.mjs
// NE SUPPRIME PAS les .md — la suppression vient APRÈS verify.mjs (30/30 PASS).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  skillRoot,
  renderPage,
  typeForPath,
  extractTitle,
  humanize,
  CORPUS_ENTRIES,
} from './template.mjs';

// --- markdown-it via le node_modules de Temps Chantier (kit migration) -------
const TC_ROOT = '/Users/elmabi/Desktop/my-projets/temps-chantier-code-app';
const tcRequire = createRequire(path.join(TC_ROOT, 'package.json'));
const MarkdownIt = tcRequire('markdown-it');
const anchor = tcRequire('markdown-it-anchor');
const taskLists = tcRequire('markdown-it-task-lists');
const footnote = tcRequire('markdown-it-footnote');

const md = new MarkdownIt({
  html: true, // conserve le HTML brut présent dans les .md
  // linkify DÉSACTIVÉ : les références citent des chemins (types.test.ts…) dont
  // l'extension ressemble à un TLD — linkify fabriquait de faux liens.
  linkify: false,
  typographer: false, // fidélité maximale (pas de réécriture typographique)
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

// --- Fixes de fidélité (portés de TC lib/render-md.mjs) ----------------------

// Sauts durs entre lignes « **Champ :** valeur » consécutives — FENCE-AWARE
// (amélioration vs TC : ne touche jamais une ligne à l'intérieur d'un bloc de
// code, pour garder les <pre><code> byte-identiques à la source).
function hardBreakFieldRuns(body) {
  const lines = body.split(/\r?\n/);
  const isField = (l) => /^\*\*[^*].*?\*\*/.test(l.trim());
  let inFence = false;
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (isField(lines[i]) && isField(lines[i + 1]) && !/ {2}$/.test(lines[i])) {
      lines[i] += '  ';
    }
  }
  return lines.join('\n');
}

// Sentinelle pour les pipes protégés à l'intérieur des code-spans de tableaux.
const PIPE_SENTINEL = String.fromCharCode(1); // U+0001, restauré en '|' après rendu

function countCells(line) {
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return s.split(/(?<!\\)\|/).length;
}

function protectCodeSpanPipes(line) {
  return line.replace(/(`+)([^`]*?)\1/g, (m, ticks, inner) =>
    inner.includes('|') ? ticks + inner.replace(/\|/g, PIPE_SENTINEL) + ticks : m
  );
}

const isSepRow = (l) => l != null && /^\s*\|?[\s:]*-{2,}[\s:|-]*\|?\s*$/.test(l) && /-/.test(l);

// Normalise les tableaux GFM AVANT rendu (protection code-spans + en-tête élargi).
function normalizeTables(src) {
  const lines = src.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/\|/.test(lines[i]) && isSepRow(lines[i + 1])) {
      const rowIdx = [i];
      let j = i + 2;
      while (j < lines.length && lines[j].trim() !== '' && /\|/.test(lines[j]) && !/^\s*(```|~~~)/.test(lines[j])) {
        rowIdx.push(j);
        j++;
      }
      for (const k of rowIdx) lines[k] = protectCodeSpanPipes(lines[k]);
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
function splitFrontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (m && /:/.test(m[1])) {
    return { frontMatter: m[1], body: src.slice(m[0].length) };
  }
  return { frontMatter: null, body: src };
}

function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Rend le front-matter (rare) en table de métadonnées pour ne RIEN perdre. */
function frontMatterHtml(fm) {
  const rows = fm
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      if (i === -1) return `<tr><td colspan="2">${escapeText(l)}</td></tr>`;
      return `<tr><th>${escapeText(l.slice(0, i).trim())}</th><td>${escapeText(l.slice(i + 1).trim())}</td></tr>`;
    })
    .join('');
  return `<table class="front-matter"><tbody>${rows}</tbody></table>`;
}

/** Rendu markdown → HTML de corps, avec restauration des pipes protégés. */
function renderMarkdown(src) {
  const { frontMatter, body } = splitFrontMatter(src);
  const prepared = normalizeTables(hardBreakFieldRuns(body));
  let html = md.render(prepared);
  html = html.split(PIPE_SENTINEL).join('|');
  if (frontMatter) html = frontMatterHtml(frontMatter) + '\n' + html;
  return html;
}

// --- Réécriture des liens intra-corpus (.md → .html), hors blocs de code -----

// 'baseline' est EXCLU de la règle générique : les mentions nues de
// `baseline.md` désignent l'ARTEFACT PAR PROJET (.claude/skills/govern-claude/
// references/baseline.md, rendu depuis governance-baseline.md.tpl) qui RESTE
// Markdown. Seule la forme `references/baseline.md` non précédée de
// `govern-claude/` désigne la référence du corpus.
const CORPUS_BASENAMES = CORPUS_ENTRIES.map((e) => e.split('/').pop()).filter((b) => b !== 'baseline');
// Lookbehind : refuse un caractère de mot ou '-' juste avant le basename
// (governance-baseline.md, *-baseline.md… ne matchent pas). Lookahead : refuse
// un '.' juste après (les templates *.md.tpl restent .md.tpl).
const CORPUS_LINK_RE = new RegExp(`(?<![\\w-])(${CORPUS_BASENAMES.join('|')})\\.md\\b(?!\\.)`, 'g');
const BASELINE_CORPUS_RE = /(?<!govern-claude\/)\breferences\/baseline\.md\b(?!\.)/g;
// Dans BUILD-SUMMARY uniquement : la liste des 28 références cite `baseline.md`
// nu — c'est bien la référence du corpus (aucune mention par-projet dans ce doc).
const BASELINE_BARE_RE = /(?<![\w\-/])baseline\.md\b(?!\.)/g;

/** @returns {{ text:string, count:number }} */
function rewriteCorpusLinks(mdSrc, sourceRel) {
  const lines = mdSrc.split(/\r?\n/);
  let inFence = false;
  let count = 0;
  const bump = (replacement) => { count++; return replacement; };
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue; // blocs de code : byte-identiques à la source
    lines[i] = lines[i]
      .replace(CORPUS_LINK_RE, (m, base) => bump(`${base}.html`))
      .replace(BASELINE_CORPUS_RE, () => bump('references/baseline.html'));
    if (sourceRel === 'BUILD-SUMMARY.md') {
      lines[i] = lines[i].replace(BASELINE_BARE_RE, () => bump('baseline.html'));
    }
  }
  return { text: lines.join('\n'), count };
}

// --- CAS SPÉCIAL : lessons-log → format journal -------------------------------

const LESSON_H2_RE = /^<h2\b[^>]*>(?:<a\b[^>]*class="[^"]*header-anchor[^"]*"[^>]*>[\s\S]*?<\/a>\s*)?\s*(\d{4}-\d{2}-\d{2})\s*[—-]/;

/**
 * Transforme le markdown du journal : promeut chaque entrée `### YYYY-MM-DD — …`
 * en h2 (fence-aware), rend en UNE passe (ancres dédupliquées), puis enrobe
 * chaque chunk d'entrée dans <section class="lesson" data-date id>.
 */
function renderLessonsJournal(mdSrc) {
  const lines = mdSrc.split(/\r?\n/);
  let inFence = false;
  const prepared = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; prepared.push(line); continue; }
    if (inFence) { prepared.push(line); continue; }
    const m = /^###\s+(\d{4}-\d{2}-\d{2}\s+—\s+.*)$/.exec(line);
    if (m) line = `## ${m[1]}`;
    // Un séparateur `---` collé sous une ligne de texte serait parsé en h2
    // setext (quirk CommonMark) et casserait le découpage en sections : on
    // insère une ligne vide pour qu'il reste un <hr> (aucun token modifié).
    if (line.trim() === '---' && prepared.length && prepared[prepared.length - 1].trim() !== '') {
      prepared.push('');
    }
    prepared.push(line);
  }
  const html = renderMarkdown(prepared.join('\n'));

  // Découpe au début de chaque <h2> (jamais dans un <pre> : le contenu y est
  // échappé en entités, donc aucun '<h2' littéral possible).
  const chunks = html.split(/(?=<h2\b)/);
  const dateCounts = new Map();
  let out = '';
  for (const chunk of chunks) {
    const m = LESSON_H2_RE.exec(chunk);
    if (m) {
      const date = m[1];
      const n = (dateCounts.get(date) ?? 0) + 1;
      dateCounts.set(date, n);
      out += `<section class="lesson" data-date="${date}" id="lesson-${date}-${n}">\n${chunk.replace(/\s*$/, '\n')}</section>\n`;
    } else {
      out += chunk;
    }
  }
  // Protocole d'append : insérer toute nouvelle <section class="lesson"> AVANT
  // ce marqueur (qui reste juste avant la fermeture de .docs-content).
  out = out.replace(/\s*$/, '\n');
  out += '<!-- LESSONS:APPEND -->\n';
  return out;
}

// --- Boucle de conversion ------------------------------------------------------

let converted = 0;
let skipped = 0;
let linksRewritten = 0;

for (const base of CORPUS_ENTRIES) {
  const sourceRel = `${base}.md`;
  const targetRel = `${base}.html`;
  const sourceAbs = path.join(skillRoot, sourceRel);
  const targetAbs = path.join(skillRoot, targetRel);

  if (!fs.existsSync(sourceAbs)) {
    console.log(`  – ignoré (source .md absente, déjà convertie ?) : ${sourceRel}`);
    skipped++;
    continue;
  }

  const raw = fs.readFileSync(sourceAbs, 'utf8');
  const { text: rewritten, count } = rewriteCorpusLinks(raw, sourceRel);
  linksRewritten += count;

  const title = extractTitle(raw) || humanize(path.basename(sourceRel));
  const type = typeForPath(targetRel);
  const bodyHtml = type === 'journal' ? renderLessonsJournal(rewritten) : renderMarkdown(rewritten);

  const page = renderPage({ title, type, sourceRel, targetRel, bodyHtml });
  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  fs.writeFileSync(targetAbs, page, 'utf8');
  console.log(`  ✓ ${sourceRel} → ${targetRel} (${type}${count ? `, ${count} lien(s) réécrits` : ''})`);
  converted++;
}

console.log(`\n✓ Conversion : ${converted} fichier(s), ${skipped} ignoré(s), ${linksRewritten} lien(s) intra-corpus réécrits .md → .html.`);
console.log('  Prochaine étape : node scripts/docs-html/verify.mjs (30/30 PASS attendu) AVANT toute suppression de .md.');
