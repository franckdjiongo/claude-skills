#!/usr/bin/env node
// no-markdown-guard.mjs — GARDE PERMANENTE de l'invariant « docs = HTML only ».
//
// Échoue (exit 1) si UN SEUL fichier .md subsiste sous le dossier docs
// (DOCS_ROOT de lib/docs-config.mjs). C'est le filet de sécurité « rien n'a été
// oublié » de la migration : à brancher dans la CI / le pipeline de validation.
// SANS dépendance.
//
// Usage: node .claude/scripts/docs-html/no-markdown-guard.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS_ROOT } from './lib/docs-config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const docsDir = path.join(repoRoot, DOCS_ROOT);

function walkMd(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(abs, acc);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) acc.push(path.relative(repoRoot, abs));
  }
  return acc;
}

const stray = fs.existsSync(docsDir) ? walkMd(docsDir, []) : [];

if (stray.length) {
  console.error(`✗ docs-html guard : ${stray.length} fichier(s) Markdown encore présent(s) sous ${DOCS_ROOT}/ (attendu : 0) —`);
  console.error(`  ${DOCS_ROOT}/ doit être 100 % HTML. Convertis-les via .claude/scripts/docs-html/convert.mjs`);
  console.error('  ou crée les nouveaux docs en .html via scaffold.mjs. Fichiers fautifs :');
  for (const s of stray.slice(0, 30)) console.error(`    - ${s}`);
  if (stray.length > 30) console.error(`    … +${stray.length - 30} autres`);
  process.exit(1);
}

// Vérifie aussi que les cibles attendues existent (si le manifest est présent).
const manifestPath = path.join(scriptDir, 'docs-html-manifest.json');
let missing = [];
if (fs.existsSync(manifestPath)) {
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  missing = m.entries.filter((e) => !fs.existsSync(path.join(repoRoot, e.target))).map((e) => e.target);
}
if (missing.length) {
  console.error(`✗ docs-html guard : ${missing.length} cible(s) HTML attendue(s) absente(s) :`);
  for (const s of missing.slice(0, 30)) console.error(`    - ${s}`);
  process.exit(1);
}

console.log(`✓ docs-html guard : ${DOCS_ROOT}/ est 100 % HTML, aucune cible manquante.`);
