#!/usr/bin/env node
// rewrite-refs.mjs — Réécrit les RÉFÉRENCES aux docs migrés (.md → .html) dans
// tout l'écosystème de gouvernance/config, SANS jamais toucher au code applicatif.
//
// Remplacement par CHAÎNE EXACTE des chemins du manifest (et, en option, des
// basenames uniques). Comme on ne remplace que des chemins complets réels, on ne
// casse PAS les regex de logique (ex. `/\.md$/` dans un hook) ni les fixtures de
// test fictives (sample-plan.md, demo-plan.md — absents du manifest).
//
// Périmètre INCLUS (mono-runtime par défaut) : .claude/ CLAUDE.md
//   <DOCS_ROOT>/**/*.html <DOCS_ROOT>/**/*.json (manifests).
//   Ajoutez d'autres racines (.codex/, AGENTS.md…) dans ROOTS / ROOT_FILES si
//   votre projet a plusieurs runtimes.
// Périmètre EXCLU  : src/ (aucun code applicatif), node_modules, .git, .worktrees,
//   dist, coverage, <DOCS_ROOT>/**/*.md (supprimés ensuite), et
//   .claude/scripts/docs-html/ (l'outillage lui-même, qui contient des `.md` de logique).
//
// Usage:
//   node .claude/scripts/docs-html/rewrite-refs.mjs --dry   # aperçu
//   node .claude/scripts/docs-html/rewrite-refs.mjs         # applique
//   node .claude/scripts/docs-html/rewrite-refs.mjs --bare  # + basenames uniques
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS_ROOT } from './lib/docs-config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const manifestPath = path.join(scriptDir, 'docs-html-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('✗ Manifest absent. Lancez d’abord inventory.mjs.');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const DRY = process.argv.includes('--dry');
const BARE = process.argv.includes('--bare');

if (!manifest.entries?.length) {
  console.log('✓ rewrite-refs : manifest vide — rien à réécrire.');
  process.exit(0);
}

// Cartes de remplacement.
const fullMap = new Map(manifest.entries.map((e) => [e.source, e.target])); // chemins complets
const baseCount = {};
for (const e of manifest.entries) {
  const b = e.source.split('/').pop();
  baseCount[b] = (baseCount[b] ?? 0) + 1;
}
const baseMap = new Map();
for (const e of manifest.entries) {
  const b = e.source.split('/').pop();
  if (baseCount[b] === 1) baseMap.set(b, b.replace(/\.md$/i, '.html'));
}

// Roots à parcourir + fichiers racine. On inclut d'emblée les miroirs runtime /
// page d'accueil fréquents — AGENTS.md (miroir Codex, projets multi-runtime) et
// README.md (table des docs) — leur EXISTENCE est vérifiée plus bas avant
// lecture, donc lister un fichier absent est sans effet. La réécriture par
// chaîne EXACTE des chemins migrés rend leur inclusion sûre (aucun faux positif).
const ROOTS = ['.claude'];
const ROOT_FILES = ['CLAUDE.md', 'AGENTS.md', 'README.md'];
const DOCS_HTML_JSON = true; // <DOCS_ROOT>/**/*.html + <DOCS_ROOT>/**/*.json

const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.worktrees', 'dist', 'coverage']);
const TOOLKIT = path.join('.claude', 'scripts', 'docs-html'); // ne pas se réécrire soi-même
const TEXT_EXT = new Set(['.md', '.mjs', '.js', '.cjs', '.json', '.txt', '.toml', '.html', '.yml', '.yaml']);

function walk(absDir, acc) {
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(ent.name)) continue;
    const abs = path.join(absDir, ent.name);
    const rel = path.relative(repoRoot, abs);
    if (rel.startsWith(TOOLKIT)) continue; // skip l'outillage docs-html
    if (ent.isDirectory()) walk(abs, acc);
    else if (ent.isFile() && TEXT_EXT.has(path.extname(ent.name))) acc.push(abs);
  }
  return acc;
}

// Construit la liste des fichiers cibles.
const targets = [];
for (const r of ROOTS) {
  const abs = path.join(repoRoot, r);
  if (fs.existsSync(abs)) walk(abs, targets);
}
for (const f of ROOT_FILES) {
  const abs = path.join(repoRoot, f);
  if (fs.existsSync(abs)) targets.push(abs);
}
if (DOCS_HTML_JSON) {
  const docsAbs = path.join(repoRoot, DOCS_ROOT);
  if (fs.existsSync(docsAbs)) {
    for (const abs of walk(docsAbs, [])) {
      const ext = path.extname(abs);
      if (ext === '.html' || ext === '.json') targets.push(abs);
    }
  }
}

// Le remplacement par BASENAME nu n'est appliqué qu'aux fichiers de PROSE
// (.md/.html/.txt). Jamais aux scripts/JSON : un basename y est souvent de la
// LOGIQUE (regex, comparaison `=== 'README.md'`, glob) — le réécrire casserait
// le comportement. Les chemins COMPLETS, eux, sont sûrs partout.
const BARE_EXT = new Set(['.md', '.html', '.txt']);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Une seule regex de chemins complets (alternance), triée par longueur décroissante.
const fullKeys = [...fullMap.keys()].sort((a, b) => b.length - a.length);
const fullRe = new RegExp(fullKeys.map(escapeRe).join('|'), 'g');
const bareRe = BARE ? new RegExp('\\b(' + [...baseMap.keys()].map(escapeRe).join('|') + ')\\b', 'g') : null;

let filesChanged = 0;
let totalRepl = 0;
const perFile = [];
for (const abs of targets) {
  let txt = fs.readFileSync(abs, 'utf8');
  let n = 0;
  let out = txt.replace(fullRe, (m) => {
    n++;
    return fullMap.get(m) ?? m;
  });
  if (bareRe && BARE_EXT.has(path.extname(abs))) {
    out = out.replace(bareRe, (m, b) => {
      const t = baseMap.get(b);
      if (t && t !== m) { n++; return t; }
      return m;
    });
  }
  if (n > 0) {
    filesChanged++;
    totalRepl += n;
    perFile.push([path.relative(repoRoot, abs), n]);
    if (!DRY) fs.writeFileSync(abs, out, 'utf8');
  }
}

perFile.sort((a, b) => b[1] - a[1]);
console.log(`\n🔗 Réécriture des références .md → .html${DRY ? ' (DRY-RUN)' : ''}${BARE ? ' [+basenames]' : ''}`);
console.log(`   ${targets.length} fichiers scannés · ${filesChanged} modifiés · ${totalRepl} remplacement(s)\n`);
for (const [f, n] of perFile.slice(0, 40)) console.log(`   ${String(n).padStart(4)}  ${f}`);
if (perFile.length > 40) console.log(`   … +${perFile.length - 40} autres fichiers`);
if (DRY) console.log('\n   (DRY-RUN : aucun fichier écrit.)');
