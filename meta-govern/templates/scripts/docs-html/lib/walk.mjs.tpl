// walk.mjs — Utilitaires de parcours du dossier docs (dépendance-free, ESM Node pur).
import fs from 'node:fs';
import path from 'node:path';

/**
 * Liste récursivement tous les fichiers de `dir` correspondant au filtre d'extension.
 * @param {string} dir  chemin absolu
 * @param {(name:string)=>boolean} match  test sur le nom de fichier
 * @returns {string[]} chemins absolus, triés
 */
export function walk(dir, match) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, match));
    else if (entry.isFile() && match(entry.name)) out.push(abs);
  }
  return out.sort();
}

/** Extrait le 1er titre H1 markdown (`# ...`), en ignorant un éventuel front-matter YAML. */
export function extractTitle(md) {
  const lines = md.split(/\r?\n/);
  let i = 0;
  // Saute un front-matter YAML `--- ... ---`.
  if (lines[0]?.trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    i++; // dépasse le --- de fermeture
  }
  for (; i < lines.length; i++) {
    const m = /^#\s+(.+?)\s*#*\s*$/.exec(lines[i]);
    if (m) return m[1].replace(/`/g, '').trim();
  }
  return null;
}

/** Transforme un nom de fichier en titre lisible (fallback quand pas de H1). */
export function humanize(filename) {
  return filename
    .replace(/\.(md|html)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Profondeur d'un chemin relatif sous le dossier docs → nb de `../` pour atteindre assets/. */
export function relAssetsPrefix(relFromDocs) {
  // relFromDocs ex: "qa/x.html" ou "specs/05/x.html"
  const depth = relFromDocs.split('/').length - 1; // nb de dossiers
  return depth === 0 ? 'assets/' : '../'.repeat(depth) + 'assets/';
}
