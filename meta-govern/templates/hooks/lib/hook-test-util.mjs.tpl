// Template: templates/hooks/lib/hook-test-util.mjs.tpl
// (aucune variable de template — le rendu est une copie littérale)
//
// Harnais de test des hooks. Rendu en `.claude/hooks/lib/hook-test-util.mjs`.
// Les fichiers `.claude/hooks/<nom>.test.mjs` (frères des hooks, un cran
// au-dessus de ce lib/) importent `runHook` d'ici pour piloter un hook
// EXACTEMENT comme le fait le harnais Claude Code : l'événement est sérialisé
// en JSON et poussé sur stdin, on relit stdout / exitCode. Pur node stdlib.
//
// Doctrine (calquée sur le fail-open des hooks eux-mêmes) : `runHook` ne throw
// jamais. Un spawn qui échoue renvoie `{ exitCode:-1, … }` plutôt que de faire
// planter la suite de tests — le test décide alors quoi asserter.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// PATH_PREFIX est la source de vérité du durcissement macOS partagée par tous
// les hooks ; le réimporter (plutôt que le redéclarer) garde le harnais aligné
// et durcit le PATH du process node exécutant CE fichier, donc celui hérité
// par le `spawnSync` de runHook ci-dessous.
// ATTENTION — ceci ne satisfait PAS à lui seul le détecteur d'audit
// `macos-hardening` (scripts/audit-project.mjs) : il lit le texte LITTÉRAL de
// chaque `.claude/hooks/*.test.mjs`, pas celui de ses imports transitifs. Un
// ancien commentaire ici affirmait le contraire — corrigé après que le défaut
// a fait passer 0 HIGH à 3 HIGH sur un audit réel dès que le harnais de tests
// a été installé. Chaque `<hook>.test.mjs` qui importe `runHook` d'ici pose
// donc sa PROPRE ligne `process.env.PATH = PATH_PREFIX + ':' + (process.env.PATH || '')`
// (voir bash-write-guard.test.mjs.tpl, block-docs-markdown.test.mjs.tpl,
// enforce-workflow.test.mjs.tpl, hooks-inventory.test.mjs.tpl). L'audit
// macos-hardening exclut en plus désormais les `*.test.mjs`/`*.sim.mjs` de son
// balayage (un fichier de test n'est pas un hook que le harnais exécute) — ce
// garde-fou par-fichier reste posé en ceinture-et-bretelles, pas comme seule
// ligne de défense.
import { PATH_PREFIX } from './hook-utils.mjs';

process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

// Ce lib/ est un cran SOUS `.claude/hooks/` ; les hooks (et leurs `.test.mjs`)
// vivent un cran AU-DESSUS. On résout donc la cible relativement au parent.
const HOOKS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Racine projet : `.claude/hooks/` → remonter de deux crans. Exposée pour que
// les tests puissent ancrer CLAUDE_PROJECT_DIR et sandboxer `.claude/tmp/`.
export const projectRoot = path.resolve(HOOKS_DIR, '..', '..');

// Un ALLOW/allow n'émet rien sur stdout ; un DENY / une décision `block`
// émet une unique ligne JSON. Parse tolérant : `null` si vide ou non-JSON.
function parseTolerant(stdout) {
  const trimmed = (stdout || '').trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

/**
 * Lance un hook comme le harnais Claude Code : `node <hook>` avec l'événement
 * JSON sur stdin. Ne throw jamais.
 *
 * @param {string} hookRelPath  nom du hook relatif à `.claude/hooks/`
 *                              (ex. 'block-docs-markdown.mjs', 'enforce-workflow.mjs')
 * @param {object} event        événement du harnais (PreToolUse / Stop / …) ;
 *                              ignoré si `opts.stdinOverride` est fourni.
 * @param {{ env?: Record<string,string>, stdinOverride?: string }} [opts]
 *   `env` surchargé pour ce run ; `stdinOverride` pousse une chaîne BRUTE sur
 *   stdin au lieu de `JSON.stringify(event)` — sert à prouver le fail-open
 *   sur un payload malformé (le hook lit `readFileSync(0)` puis `JSON.parse`,
 *   ce que `JSON.stringify` ne peut jamais produire d'invalide par construction).
 * @returns {{ exitCode:number, stdout:string, stdoutJson:*, stderr:string }}
 */
export function runHook(hookRelPath, event, opts = {}) {
  const absHook = path.resolve(HOOKS_DIR, hookRelPath);
  let res;
  try {
    res = spawnSync('node', [absHook], {
      input: opts.stdinOverride ?? JSON.stringify(event ?? {}),
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, ...(opts.env || {}) },
    });
  } catch (err) {
    return { exitCode: -1, stdout: '', stdoutJson: null, stderr: String(err) };
  }
  // spawnSync remonte les échecs (binaire introuvable, timeout) dans `res.error`
  // plutôt qu'en throw : on le normalise vers le même contrat -1.
  if (res.error) {
    return { exitCode: -1, stdout: '', stdoutJson: null, stderr: String(res.error) };
  }
  const stdout = res.stdout || '';
  return {
    exitCode: res.status ?? -1,
    stdout,
    stdoutJson: parseTolerant(stdout),
    stderr: res.stderr || '',
  };
}
