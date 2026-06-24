#!/usr/bin/env node
// scaffold.mjs — Crée un NOUVEAU document HTML conforme au gabarit meta-govern.
//
// C'EST L'OUTIL à utiliser pour produire une nouvelle référence du corpus —
// plus aucun .md. La coquille (CSS, accent, TOC, métadonnées) est garantie ;
// il ne reste qu'à remplir les sections. SANS dépendance. Permanent.
//
// Usage :
//   node scripts/docs-html/scaffold.mjs <type> <chemin-cible.html> "<Titre>"
//   node scripts/docs-html/scaffold.mjs reference references/stack-django.html "Stack Pack — Django"
//
// Types : reference guide journal synthese generic
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { skillRoot, renderPage, docType, DOC_TYPES, escapeHtml } from './template.mjs';

const [type, target, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ').replace(/^["']|["']$/g, '');

if (!type || !target || !title) {
  console.error('Usage: scaffold.mjs <type> <chemin-cible.html> "<Titre>"');
  console.error('Types: ' + DOC_TYPES.map((t) => t.id).join(' '));
  process.exit(1);
}
if (!DOC_TYPES.some((t) => t.id === type)) {
  console.error(`✗ Type inconnu: ${type}. Types valides: ${DOC_TYPES.map((t) => t.id).join(' ')}`);
  process.exit(1);
}
const targetRel = target.replace(/\\/g, '/').replace(/^\.\//, '');
if (!targetRel.endsWith('.html')) {
  console.error('✗ La cible doit se terminer par .html (plus de .md).');
  process.exit(1);
}
const abs = path.join(skillRoot, targetRel);
if (fs.existsSync(abs)) {
  console.error(`✗ Existe déjà: ${targetRel} (refus d'écraser).`);
  process.exit(1);
}

/** Corps de démarrage par type — h2 avec id (sinon TOC vide). */
function starterBody(typeId, docTitle) {
  const h2 = (id, label) =>
    `<h2 id="${id}"><a class="header-anchor" href="#${id}" aria-hidden="true">#</a> ${escapeHtml(label)}</h2>`;
  if (typeId === 'journal') {
    return [
      `<p><strong>Discipline</strong> : journal append-only. Ne jamais réécrire — insérer chaque nouvelle entrée <code>&lt;section class="lesson"&gt;</code> AVANT le marqueur <code>&lt;!-- LESSONS:APPEND --&gt;</code>.</p>`,
      `<section class="lesson" data-date="AAAA-MM-JJ" id="lesson-AAAA-MM-JJ-1">`,
      h2('premiere-entree', 'AAAA-MM-JJ — <titre de la leçon>'),
      `<p><!-- Contexte, cause racine, action prise, leçon généralisée. --></p>`,
      `</section>`,
      `<!-- LESSONS:APPEND -->`,
    ].join('\n');
  }
  return [
    h2('quand-utiliser', 'Quand utiliser ce document'),
    `<p><!-- Pour quel mode (BOOTSTRAP / AUDIT / MIGRATE / EVOLVE / ADVISE), quel déclencheur. --></p>`,
    h2('contenu', 'Contenu'),
    `<p><!-- Corps du document « ${escapeHtml(docTitle)} ». Tous les h2/h3 doivent porter un id. --></p>`,
    h2('voir-aussi', 'Voir aussi'),
    `<ul><li><!-- Liens relatifs vers les autres documents .html du corpus. --></li></ul>`,
  ].join('\n');
}

fs.mkdirSync(path.dirname(abs), { recursive: true });
const html = renderPage({
  title,
  type,
  sourceRel: targetRel, // pas de source markdown : le doc est natif HTML
  targetRel,
  bodyHtml: starterBody(type, title),
});
fs.writeFileSync(abs, html, 'utf8');
console.log(`✓ Créé (${docType(type).label}): ${targetRel}`);
console.log('  → Remplissez les sections <!-- … -->. Ne touchez pas à la coquille.');

// Réindexe le hub index.html. Une panne de make-index ne doit JAMAIS faire
// échouer la création (le doc est déjà écrit).
try {
  const makeIndex = path.join(path.dirname(fileURLToPath(import.meta.url)), 'make-index.mjs');
  execFileSync('node', [makeIndex], { stdio: 'ignore' });
  console.log('✓ hub réindexé');
} catch (err) {
  console.warn(`⚠ hub non réindexé (relancez « node scripts/docs-html/make-index.mjs ») : ${err.message}`);
}
