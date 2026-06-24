#!/usr/bin/env node
// check-docs-map.mjs — Garde anti-drift du manifest <DOCS_ROOT>/docs-map.json.
// Vérifie que chaque chemin déclaré (sourcesOfTruth, artifactDirs, templates de
// conventions) existe réellement sur disque. C'est ce qui rend le manifest
// "dynamique" : déplacez un doc, mettez à jour SON entrée ici, relancez ce
// script — il signale toute référence cassée. Exit 1 si un chemin manque.
//
// Règles 1-3 : toujours actives (fichiers, dossiers, templates de conventions).
// Règles 4-5 : symétrie des sous-dossiers NN-theme entre specs/ et plans/ et
// interdiction des fichiers datés à la racine — actives UNIQUEMENT si
// `conventions.themedSubfolders` vaut true dans docs-map.json.
//
// Usage: node .claude/scripts/check-docs-map.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Le dossier docs vient de la config du toolkit (lib/docs-config.mjs) ; repli
// sûr sur 'docs' si le toolkit n'est pas installé.
let docsRoot = 'docs';
try {
  const cfg = await import('./docs-html/lib/docs-config.mjs');
  if (cfg.DOCS_ROOT) docsRoot = cfg.DOCS_ROOT;
} catch {
  /* toolkit absent : repli 'docs' */
}

const mapPath = path.join(repoRoot, docsRoot, 'docs-map.json');

if (!fs.existsSync(mapPath)) {
  console.error(`✗ Manifest introuvable: ${docsRoot}/docs-map.json`);
  process.exit(1);
}

let map;
try {
  map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
} catch (err) {
  console.error(`✗ ${docsRoot}/docs-map.json illisible (JSON invalide): ${err.message}`);
  process.exit(1);
}

const problems = [];

function checkFile(label, rel) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    problems.push(`FICHIER manquant — ${label}: ${rel}`);
  }
}
function checkDir(label, rel) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    problems.push(`DOSSIER manquant — ${label}: ${rel}`);
  }
}

// 1. Sources of truth = des fichiers.
for (const [key, rel] of Object.entries(map.sourcesOfTruth ?? {})) {
  if (key.startsWith('_')) continue;
  checkFile(`sourcesOfTruth.${key}`, rel);
}

// 2. Artifact dirs = des dossiers.
for (const [key, rel] of Object.entries(map.artifactDirs ?? {})) {
  if (key.startsWith('_')) continue;
  checkDir(`artifactDirs.${key}`, rel);
}

// 3. Templates référencés dans les conventions.
for (const conv of ['specFile', 'planFile']) {
  const tpl = map.conventions?.[conv]?.templateInterne;
  if (tpl) checkFile(`conventions.${conv}.templateInterne`, tpl);
}

// Règles 4-5 : convention « sous-dossiers thématiques NN-theme » (opt-in).
const themedSubfolders = map.conventions?.themedSubfolders === true;
const specsDir = map.artifactDirs?.specs;
const plansDir = map.artifactDirs?.plans;

if (themedSubfolders) {
  // 4. Cohérence specs/plans : mêmes sous-dossiers thématiques.
  if (specsDir && plansDir) {
    const sub = (d) => {
      const abs = path.join(repoRoot, d);
      return fs.existsSync(abs)
        ? fs.readdirSync(abs).filter((e) => fs.statSync(path.join(abs, e)).isDirectory()).sort()
        : [];
    };
    const sSpecs = sub(specsDir);
    const sPlans = sub(plansDir);
    const onlySpecs = sSpecs.filter((x) => !sPlans.includes(x));
    const onlyPlans = sPlans.filter((x) => !sSpecs.includes(x));
    if (onlySpecs.length) problems.push(`Sous-dossiers présents dans specs/ mais pas plans/: ${onlySpecs.join(', ')}`);
    if (onlyPlans.length) problems.push(`Sous-dossiers présents dans plans/ mais pas specs/: ${onlyPlans.join(', ')}`);
  }

  // 5. Aucun fichier daté ne doit traîner À LA RACINE de specs/ ou plans/.
  for (const [label, dir] of [['specs', specsDir], ['plans', plansDir]]) {
    if (!dir) continue;
    const abs = path.join(repoRoot, dir);
    if (!fs.existsSync(abs)) continue;
    const loose = fs.readdirSync(abs).filter((e) => {
      const p = path.join(abs, e);
      return fs.statSync(p).isFile() && /\.html$/.test(e) && e !== 'README.html';
    });
    if (loose.length) problems.push(`Fichiers à la racine de ${label}/ (doivent aller dans un sous-dossier NN-theme): ${loose.join(', ')}`);
  }
}

if (problems.length) {
  console.error(`✗ docs-map: ${problems.length} problème(s) détecté(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  themedSubfolders
    ? '✓ docs-map: tous les chemins déclarés existent, specs/ et plans/ cohérents, aucune racine polluée.'
    : '✓ docs-map: tous les chemins déclarés existent.'
);
