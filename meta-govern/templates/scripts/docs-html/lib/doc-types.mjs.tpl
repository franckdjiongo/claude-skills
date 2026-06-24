// doc-types.mjs — Accès au registre des TYPES de documents (piloté par docs-config).
//
// Le registre lui-même (DOC_TYPES), la map dossier→type (TYPE_FOLDERS) et les
// overrides manuels par basename (TYPE_FILES) vivent dans docs-config.mjs —
// l'UNIQUE module paramétré par projet. Ici on fournit les helpers de résolution.
// Dépendance-free (ESM pur Node : fs/path/url uniquement).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_TYPES, TYPE_FILES, TYPE_FOLDERS, DOCS_ROOT } from './docs-config.mjs';

export { DOC_TYPES };

const BY_ID = new Map(DOC_TYPES.map((t) => [t.id, t]));

/**
 * @param {string} id
 * @returns {import('./docs-config.mjs').DocType} le type, ou `generic` en repli
 */
export function docType(id) {
  return BY_ID.get(id) ?? BY_ID.get('generic');
}

function basenameNoExt(p) {
  return p.replace(/\\/g, '/').split('/').pop().replace(/\.(html|md)$/i, '');
}

// Les sources de vérité canoniques (spec, modèle de données, catalogue) sont
// souvent rangées à la RACINE de DOCS_ROOT : non classables par dossier, elles
// tomberaient en `generic`. On dérive donc leur type du registre docs-map.json
// (sourcesOfTruth) — spec→'spec', dataModel & catalog→'lexique' — pour qu'elles
// portent leur badge propre sans configuration par projet. Lecture unique au
// chargement, repli silencieux sur {} si le registre est absent/illisible.
// L'override manuel TYPE_FILES (docs-config) reste prioritaire.
const SOT_TYPE = { spec: 'spec', dataModel: 'lexique', catalog: 'lexique' };
const sotTypeByBasename = (() => {
  try {
    const libDir = path.dirname(fileURLToPath(import.meta.url));
    // lib → docs-html → scripts → .claude → racine repo
    const repoRoot = path.resolve(libDir, '..', '..', '..', '..');
    const map = JSON.parse(fs.readFileSync(path.join(repoRoot, DOCS_ROOT, 'docs-map.json'), 'utf8'));
    const out = {};
    for (const [key, rel] of Object.entries(map.sourcesOfTruth || {})) {
      if (!SOT_TYPE[key] || typeof rel !== 'string') continue;
      out[basenameNoExt(rel)] = SOT_TYPE[key];
    }
    return out;
  } catch {
    return {};
  }
})();

/**
 * Mappe un chemin relatif (depuis la racine repo, ex. "docs/qa/x.html") vers un
 * id de DOC_TYPES. Ordre de résolution :
 *   1. override manuel TYPE_FILES (docs-config) par basename,
 *   2. sources de vérité dérivées de docs-map.json (spec / lexique à la racine),
 *   3. 1er dossier sous DOCS_ROOT (TYPE_FOLDERS),
 *   4. sinon `generic`.
 * @param {string} relPath
 * @returns {string} id de DOC_TYPES
 */
export function typeForPath(relPath) {
  const p = relPath.replace(/\\/g, '/');
  const prefix = DOCS_ROOT.replace(/\/+$/, '') + '/';
  if (!p.startsWith(prefix)) return 'generic';
  const segments = p.slice(prefix.length).split('/');
  const base = basenameNoExt(segments[segments.length - 1]);
  if (Object.prototype.hasOwnProperty.call(TYPE_FILES, base)) return TYPE_FILES[base];
  if (Object.prototype.hasOwnProperty.call(sotTypeByBasename, base)) return sotTypeByBasename[base];
  if (segments.length < 2) return 'generic'; // autre fichier à la racine de DOCS_ROOT
  const folder = segments[0];
  return Object.prototype.hasOwnProperty.call(TYPE_FOLDERS, folder) ? TYPE_FOLDERS[folder] : 'generic';
}
