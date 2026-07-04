#!/usr/bin/env node
// scaffold.mjs — Crée un NOUVEAU document HTML conforme au gabarit du projet.
//
// C'EST L'OUTIL que les skills/agents DOIVENT utiliser pour produire un nouveau
// doc (spec, plan, qa, audit, lexique…) — plus aucun .md. La coquille (CSS,
// accent, TOC, métadonnées) est garantie ; il ne reste qu'à remplir les sections.
//
// SANS dépendance (n'utilise PAS markdown-it). Permanent.
//
// Usage:
//   node .claude/scripts/docs-html/scaffold.mjs <type> <chemin-cible.html> "<Titre>"
//   node .claude/scripts/docs-html/scaffold.mjs spec \
//        docs/specs/2026-06-09-export-design.html "Design — Export"
//
// Types : voir DOC_TYPES dans lib/docs-config.mjs (spec plan qa audit lexique
//         synthese architecture adr playbook backlog generic par défaut).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderPage } from './lib/template.mjs';
import { starterBody } from './lib/starters.mjs';
import { docType, DOC_TYPES } from './lib/doc-types.mjs';
import { DOCS_ROOT } from './lib/docs-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
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
// Docs live ONLY under DOCS_ROOT/. Reject absolute paths and `..` escapes so
// scaffold can't silently write outside docs/ (path.resolve handles both).
const docsDir = path.join(repoRoot, DOCS_ROOT);
const abs = path.resolve(repoRoot, targetRel);
if (path.isAbsolute(target) || (abs !== docsDir && !abs.startsWith(docsDir + path.sep))) {
  console.error(`✗ La cible doit être sous ${DOCS_ROOT}/ : ${target}`);
  process.exit(1);
}
if (fs.existsSync(abs)) {
  console.error(`✗ Existe déjà: ${targetRel} (refus d'écraser).`);
  process.exit(1);
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

// Réindexe le hub index.html pour qu'il liste le nouveau doc. Une panne
// de make-index ne doit JAMAIS faire échouer la création (le doc est déjà écrit).
try {
  const makeIndex = path.join(path.dirname(fileURLToPath(import.meta.url)), 'make-index.mjs');
  execFileSync('node', [makeIndex], { stdio: 'ignore' });
  console.log('✓ hub réindexé');
} catch (err) {
  console.warn(`⚠ hub non réindexé (lancez « npm run docs:index ») : ${err.message}`);
}
