#!/usr/bin/env node
// inventory.mjs — TRACKER ANTI-OUBLI de la migration Markdown → HTML.
//
// Scanne le dossier docs (DOCS_ROOT de lib/docs-config.mjs) pour TOUS les
// fichiers .md, en déduit le type, le titre et le chemin HTML cible (même
// tronc + .html), puis écrit le manifest docs-html-manifest.json à côté de ce
// script. Ce manifest est la source unique pour convert.mjs / verify.mjs /
// no-markdown-guard.mjs.
//
// Affiche un tableau récapitulatif par type + le total. Exit 0 toujours
// (lecture seule). Usage: node .claude/scripts/docs-html/inventory.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk, extractTitle, humanize } from './lib/walk.mjs';
import { typeForPath, docType } from './lib/doc-types.mjs';
import { DOCS_ROOT } from './lib/docs-config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const docsDir = path.join(repoRoot, DOCS_ROOT);
const manifestPath = path.join(scriptDir, 'docs-html-manifest.json');

const mdFiles = walk(docsDir, (n) => n.toLowerCase().endsWith('.md'));

/** @type {Array<{source:string,target:string,type:string,typeLabel:string,title:string,bytes:number}>} */
const entries = [];
for (const abs of mdFiles) {
  const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
  const content = fs.readFileSync(abs, 'utf8');
  const type = typeForPath(rel);
  const title = extractTitle(content) ?? humanize(path.basename(rel));
  entries.push({
    source: rel,
    target: rel.replace(/\.md$/i, '.html'),
    type,
    typeLabel: docType(type).label,
    title,
    bytes: Buffer.byteLength(content, 'utf8'),
  });
}

const byType = {};
for (const e of entries) byType[e.type] = (byType[e.type] ?? 0) + 1;

const manifest = {
  _comment:
    'Manifest de migration Markdown → HTML (généré par inventory.mjs). NE PAS éditer à la main. ' +
    'Chaque entrée: source .md → target .html, type, titre. Utilisé par convert/verify/guard.',
  generatedFrom: DOCS_ROOT + '/',
  total: entries.length,
  byType,
  entries,
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// --- Rapport console ---
console.log(`\n📋 Inventaire ${DOCS_ROOT}/ — ${entries.length} fichiers Markdown détectés\n`);
const order = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);
const pad = (s, n) => String(s).padEnd(n);
console.log(`  ${pad('TYPE', 16)} ${pad('LIBELLÉ', 30)} COUNT`);
console.log(`  ${'-'.repeat(16)} ${'-'.repeat(30)} -----`);
for (const t of order) {
  console.log(`  ${pad(t, 16)} ${pad(docType(t).label, 30)} ${byType[t]}`);
}
console.log(`\n  → manifest écrit: ${path.relative(repoRoot, manifestPath)}`);
console.log(`  → ${entries.length} cibles .html à produire\n`);
