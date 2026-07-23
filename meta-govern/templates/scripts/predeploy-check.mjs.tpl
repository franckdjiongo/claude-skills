#!/usr/bin/env node
// predeploy-check.mjs — Barrière locale avant une synchro ou un déploiement de
// {{PROJECT_NAME}}.
//
// À lancer par L'UTILISATEUR, à la main, juste avant de pousser/synchroniser/
// déployer :
//   node .claude/scripts/predeploy-check.mjs
//
// Les agents ne l'appellent pas : c'est une porte que l'humain franchit
// délibérément (anti auto-appel). Un agent qui l'invoquerait lui-même
// contournerait le geste de décision qu'elle matérialise.
//
// Rôle dans la gouvernance : c'est la moitié « compensation locale » de la
// décision « pas de CI serveur » (leçon 7). L'autre moitié est le gate Stop
// durci (MG_HEADLESS_RUN) qui exige `{{VALIDATE_COMMAND}}` sur les runs
// autonomes. Ensemble, ils remplacent la vérification qu'un pipeline serveur
// aurait faite au push.
//
// Ce que la barrière vérifie, dans l'ordre :
//   1. Le worktree est propre (`git status --porcelain` vide) — on ne déploie
//      pas un état non commité, sinon le SHA enregistré ne décrit pas ce qui
//      part réellement.
//   2. `{{VALIDATE_COMMAND}}` passe (qualité + size-guard + docs + tests).
// Les deux réunis → écriture du sceau `.claude/tmp/predeploy-pass.json`
// ({ sha, date }), preuve horodatée que ce commit précis a franchi la porte.
//
// Codes de sortie :
//   0 — worktree propre ET validate OK (sceau écrit)
//   1 — worktree sale, ou validate en échec (barrière fermée)
//   2 — erreur interne (git indisponible, écriture du sceau impossible…) :
//       fail-soft, on n'affirme pas un succès qu'on n'a pas prouvé.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PATH_PREFIX = "/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin";
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ""}`;

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Lance git avec un tableau d'arguments (pas de shell) et renvoie stdout, ou
// `null` si l'appel échoue — l'appelant distingue alors « sortie vide » de
// « git indisponible » pour rester fail-soft.
function git(args) {
  const res = spawnSync('git', args, {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (res.error || res.status !== 0) return null;
  return res.stdout;
}

// 1. Worktree propre.
const porcelain = git(['status', '--porcelain']);
if (porcelain === null) {
  process.stderr.write('✗ predeploy: git indisponible ou hors dépôt — vérification impossible.\n');
  process.exit(2);
}
if (porcelain.trim() !== '') {
  process.stderr.write('✗ predeploy: worktree non propre. Committe ou remise tes changements avant de déployer :\n');
  process.stderr.write(porcelain);
  process.exit(1);
}

const sha = (git(['rev-parse', 'HEAD']) || '').trim();
if (!sha) {
  process.stderr.write('✗ predeploy: HEAD introuvable (dépôt sans commit ?) — vérification impossible.\n');
  process.exit(2);
}

// 2. Suite de validation. `{{VALIDATE_COMMAND}}` est une commande shell (ex.
// `npm run validate`) ; on la passe telle quelle à un shell et on hérite des
// flux pour que l'utilisateur voie le détail des checks.
process.stdout.write('› predeploy: worktree propre, lancement de `{{VALIDATE_COMMAND}}`…\n');
const validate = spawnSync('{{VALIDATE_COMMAND}}', {
  cwd: projectDir,
  stdio: 'inherit',
  shell: true,
});
if (validate.error) {
  process.stderr.write(`✗ predeploy: impossible de lancer la validation : ${validate.error.message}\n`);
  process.exit(2);
}
if (validate.status !== 0) {
  process.stderr.write('✗ predeploy: `{{VALIDATE_COMMAND}}` a échoué — barrière fermée, ne déploie pas.\n');
  process.exit(1);
}

// Sceau : preuve horodatée que ce commit a franchi la porte.
try {
  const tmpDir = path.join(projectDir, '.claude', 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const seal = { sha, date: new Date().toISOString() };
  fs.writeFileSync(path.join(tmpDir, 'predeploy-pass.json'), `${JSON.stringify(seal, null, 2)}\n`);
} catch (err) {
  process.stderr.write(`✗ predeploy: validation OK mais écriture du sceau impossible : ${err.message}\n`);
  process.exit(2);
}

process.stdout.write(`✓ predeploy: worktree propre + validation OK sur ${sha.slice(0, 12)}. Déploiement autorisé.\n`);
process.exit(0);
