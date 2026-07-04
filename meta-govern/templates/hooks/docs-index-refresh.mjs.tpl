#!/usr/bin/env node
/**
 * docs-index-refresh — Hook Stop (sans dépendance).
 *
 * Garde le hub {{DOCS_ROOT}}/index.html à jour : si le nombre de documents HTML
 * sur le disque ne correspond plus au nombre de cartes (`hub-card`) listées dans
 * {{DOCS_ROOT}}/index.html, relance make-index.mjs. Comparaison CHEAP (deux
 * compteurs), pas de re-parse complet. Ne BLOQUE JAMAIS : sort toujours en 0.
 *
 * PARITÉ DE FILTRES STRICTE avec make-index.mjs (sinon le hook régénère à
 * chaque Stop) : exclut assets/, index.html / INDEX.html à la racine, et tout
 * basename contenant « _ ».
 *
 * Contrat : lit le JSON du hook sur stdin (ignoré ici), exit 0 quoi qu'il arrive.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Durcissement PATH macOS (Apple Silicon): les apps GUI ne voient pas /opt/homebrew/bin.
const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

// Lit (et jette) le payload stdin pour ne pas laisser le pipe ouvert.
try {
  fs.readFileSync(0, 'utf8');
} catch {
  /* pas de stdin : on continue */
}

const DOCS_ROOT = '{{DOCS_ROOT}}';
const hookDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(hookDir, '..', '..');
const docsDir = path.join(repoRoot, DOCS_ROOT);
const indexPath = path.join(docsDir, 'index.html');

// Compte les *.html que make-index.mjs listerait : récursif sous le dossier
// docs, en excluant assets/, index.html / INDEX.html à la racine, ET tout
// basename contenant « _ » (parité avec le filtre SKIP de make-index).
function countDocs(dir) {
  let n = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (abs === path.join(docsDir, 'assets')) continue;
      if (entry.name === 'node_modules' || entry.name === '.git') continue; // parité avec walk.mjs
      n += countDocs(abs);
    } else if (/\.html$/i.test(entry.name)) {
      // Exactement index.html / INDEX.html à la racine (parité stricte avec
      // la regex EXCLUDE de make-index, sensible à la casse sur ces deux noms).
      if (dir === docsDir && (entry.name === 'index.html' || entry.name === 'INDEX.html')) continue;
      if (entry.name.includes('_')) continue; // parité avec le filtre « _ » de make-index
      n += 1;
    }
  }
  return n;
}

// Une carte du hub = un `class="hub-card"` (les classes filles hub-card__*
// partagent le préfixe : on ancre sur la forme exacte pour ne compter qu'1/doc).
function countCards() {
  let html;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch {
    return -1; // pas d'index : forcera une régénération
  }
  return (html.match(/class="hub-card"/g) || []).length;
}

try {
  const onDisk = countDocs(docsDir);
  const listed = countCards();
  if (onDisk !== listed) {
    const makeIndex = path.join(hookDir, '..', 'scripts', 'docs-html', 'make-index.mjs');
    execFileSync('node', [makeIndex], { stdio: 'ignore' });
  }
} catch {
  /* régénération impossible : on n'échoue jamais un Stop */
}

process.exit(0);
