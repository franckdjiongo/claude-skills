#!/usr/bin/env node
// no-markdown-guard.mjs — GARDE PERMANENTE de l'invariant « corpus meta-govern = HTML ».
//
// Échoue (exit 1) si un fichier .md existe sous le skill HORS allowlist :
//   - SKILL.md (instructions runtime Claude, racine du skill),
//   - agents/*.md (instructions runtime des master sub-agents),
//   - templates/** (tout — templates .md.tpl produisant des fichiers runtime),
//   - scripts/** (README d'outillage éventuels).
// .git/ et node_modules/ sont ignorés. SANS dépendance.
//
// Usage : node scripts/docs-html/no-markdown-guard.mjs
import fs from 'node:fs';
import path from 'node:path';
import { skillRoot } from './template.mjs';

const ALLOW = [
  /^SKILL\.md$/,
  /^agents\/[^/]+\.md$/,
  /^templates\//,
  /^scripts\//,
];

function walkMd(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(abs, acc);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      acc.push(path.relative(skillRoot, abs).replace(/\\/g, '/'));
    }
  }
  return acc;
}

const stray = walkMd(skillRoot, []).filter((rel) => !ALLOW.some((re) => re.test(rel)));

if (stray.length) {
  console.error(`✗ no-markdown-guard : ${stray.length} fichier(s) Markdown hors allowlist (attendu : 0) —`);
  console.error('  le corpus meta-govern est 100 % HTML. Crée les nouveaux docs en .html via scripts/docs-html/scaffold.mjs. Fichiers fautifs :');
  for (const s of stray.slice(0, 30)) console.error(`    - ${s}`);
  if (stray.length > 30) console.error(`    … +${stray.length - 30} autres`);
  process.exit(1);
}

console.log('✓ no-markdown-guard : aucun .md hors allowlist (SKILL.md, agents/*.md, templates/**, scripts/**).');
