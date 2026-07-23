#!/usr/bin/env node
// check-runtime-parity.mjs — Garde anti-dérive de la parité runtime `.claude/` ↔ `.agents/`.
//
// Lit le manifest `.claude/runtime-parity.json` et, pour chaque paire déclarée :
//   - sync:"exact"                → compare les DEUX fichiers après normalisation
//                                   CRLF→LF ; toute différence est un finding.
//   - sync:"documented-divergence" → paire ignorée par la comparaison ; sa `reason`
//                                     (requise) est journalisée sur stdout.
// Un fichier présent d'un seul côté d'une paire "exact" est un finding listé (jamais
// inventé). Quand le manifest déclare des `roots` (paires de dossiers), tout fichier
// trouvé sur disque non couvert par une paire est une erreur explicite (« fichier
// miroir non déclaré ») — la vraie détection de dérive du palier 5.
//
// L'inventaire réel se peuple au palier 5 (migrate-project) via `diff -rq`. Tant que
// `pairs` est vide, ce script est un no-op vert.
//
// Fail-soft : toute I/O est en try/catch ; une erreur interne sort en exit 2 (jamais
// un crash silencieux). Manifest absent = rien à vérifier = exit 0.
//
// Exit codes : 0 — parité OK (ou rien à vérifier) · 1 — divergence(s) / finding(s) · 2 — erreur interne.
//
// Usage: node .claude/scripts/check-runtime-parity.mjs
import fs from 'node:fs';
import path from 'node:path';

const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin';
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

// Racine du repo : ancre du harnais → cwd. Tous les chemins du manifest (relatifs)
// se résolvent contre elle en absolu, donc le script est correct depuis n'importe quel cwd.
const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MANIFEST = path.join(ROOT, '.claude', 'runtime-parity.json');

// Lecture d'un fichier texte normalisée CRLF→LF. Retourne null si absent/illisible
// (l'appelant distingue « absent » de « présent mais différent »).
function readNormalized(abs) {
  try {
    return fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return null;
  }
}

// Liste récursive des fichiers (chemins relatifs à `baseAbs`, séparateur `/`) sous
// un dossier. Retourne [] si le dossier est absent/illisible.
function listFilesRel(baseAbs) {
  const out = [];
  function walk(dirAbs, relPrefix) {
    let entries;
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = relPrefix ? `${relPrefix}/${e.name}` : e.name;
      const abs = path.join(dirAbs, e.name);
      if (e.isDirectory()) walk(abs, rel);
      else if (e.isFile()) out.push(rel);
    }
  }
  walk(baseAbs, '');
  return out;
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    // Parité non configurée sur ce projet : rien à vérifier.
    console.log('✓ parité runtime: aucun manifest `.claude/runtime-parity.json` — rien à vérifier.');
    process.exit(0);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (err) {
    console.error(`✗ .claude/runtime-parity.json illisible (JSON invalide): ${err.message}`);
    process.exit(2);
  }

  const pairs = Array.isArray(manifest.pairs) ? manifest.pairs : [];
  const roots = Array.isArray(manifest.roots) ? manifest.roots : [];

  const findings = []; // divergences / fichiers uni-latéraux / entrées malformées / roots non déclarés
  let checkedExact = 0;
  let ignoredDivergences = 0;

  // Ensembles des chemins déclarés (pour la garde `roots` « fichier non déclaré »).
  const declaredClaude = new Set();
  const declaredAgents = new Set();

  for (const pair of pairs) {
    const claudePath = pair && typeof pair.claudePath === 'string' ? pair.claudePath : null;
    const agentsPath = pair && typeof pair.agentsPath === 'string' ? pair.agentsPath : null;
    const sync = pair && typeof pair.sync === 'string' ? pair.sync : 'exact';

    // Entrée malformée : erreur explicite (jamais silencieuse).
    if (!claudePath || !agentsPath) {
      findings.push(`Entrée de paire malformée (claudePath/agentsPath manquant): ${JSON.stringify(pair)}`);
      continue;
    }
    declaredClaude.add(claudePath);
    declaredAgents.add(agentsPath);

    if (sync === 'documented-divergence') {
      const reason = pair && typeof pair.reason === 'string' ? pair.reason.trim() : '';
      if (!reason) {
        // La raison est requise pour une divergence documentée.
        findings.push(`Divergence documentée sans \`reason\` — ${claudePath} ↔ ${agentsPath}`);
        continue;
      }
      ignoredDivergences += 1;
      console.log(`↷ divergence documentée ignorée — ${claudePath} ↔ ${agentsPath}\n    raison: ${reason}`);
      continue;
    }

    if (sync !== 'exact') {
      findings.push(`Valeur \`sync\` inconnue "${sync}" — ${claudePath} ↔ ${agentsPath} (attendu: "exact" ou "documented-divergence")`);
      continue;
    }

    // Paire "exact" : comparer les deux fichiers, normalisés CRLF→LF.
    const claudeAbs = path.join(ROOT, claudePath);
    const agentsAbs = path.join(ROOT, agentsPath);
    const claudeContent = readNormalized(claudeAbs);
    const agentsContent = readNormalized(agentsAbs);

    if (claudeContent === null && agentsContent === null) {
      findings.push(`Paire absente des DEUX côtés — ${claudePath} ↔ ${agentsPath}`);
      continue;
    }
    if (claudeContent === null) {
      findings.push(`Présent uniquement côté .agents — manquant: ${claudePath}`);
      continue;
    }
    if (agentsContent === null) {
      findings.push(`Présent uniquement côté .claude — manquant: ${agentsPath}`);
      continue;
    }

    checkedExact += 1;
    if (claudeContent !== agentsContent) {
      findings.push(`Divergence — ${claudePath} ≠ ${agentsPath}`);
    }
  }

  // Mode strict optionnel : tout fichier sous un `roots` non couvert par une paire
  // est une erreur explicite (« fichier miroir non déclaré »).
  for (const root of roots) {
    const claudeDir = root && typeof root.claudeDir === 'string' ? root.claudeDir : null;
    const agentsDir = root && typeof root.agentsDir === 'string' ? root.agentsDir : null;
    if (!claudeDir || !agentsDir) {
      findings.push(`Entrée \`roots\` malformée (claudeDir/agentsDir manquant): ${JSON.stringify(root)}`);
      continue;
    }
    for (const rel of listFilesRel(path.join(ROOT, claudeDir))) {
      const declared = `${claudeDir}/${rel}`;
      if (!declaredClaude.has(declared)) {
        findings.push(`Fichier miroir non déclaré (côté .claude): ${declared}`);
      }
    }
    for (const rel of listFilesRel(path.join(ROOT, agentsDir))) {
      const declared = `${agentsDir}/${rel}`;
      if (!declaredAgents.has(declared)) {
        findings.push(`Fichier miroir non déclaré (côté .agents): ${declared}`);
      }
    }
  }

  if (findings.length) {
    console.error(`✗ parité runtime: ${findings.length} finding(s):`);
    for (const f of findings) console.error(`  - ${f}`);
    process.exit(1);
  }

  const parts = [`${checkedExact} paire(s) exacte(s) alignée(s)`];
  if (ignoredDivergences) parts.push(`${ignoredDivergences} divergence(s) documentée(s) ignorée(s)`);
  console.log(`✓ parité runtime: ${parts.join(', ')}.`);
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(`check-runtime-parity: erreur interne — ${err.message}`);
  process.exit(2);
}
