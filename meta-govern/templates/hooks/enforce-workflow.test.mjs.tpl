// Template: templates/hooks/enforce-workflow.test.mjs.tpl
// (aucune variable de template — le rendu est une copie littérale)
//
// Rendu en `.claude/hooks/enforce-workflow.test.mjs` (frère du hook).
// Prouve le gate Stop `enforce-workflow` :
//   POSITIF  — message FR de complétion (« c'est terminé ») + édition postérieure
//              au dernier validate → décision `block` ;
//   HEADLESS — sous MG_HEADLESS_RUN=1, un simple message de progrès + édition en
//              retard sur le validate → `block` INCONDITIONNEL (contrat §4) ;
//   NÉGATIF  — message de progrès, sans headless → aucun block (allow silencieux).
// Runner : vitest. L'état `.claude/tmp/workflow-state.json` (et la sentinelle
// `.batch-in-flight`) est sauvegardé puis restauré autour de chaque test pour ne
// pas polluer la session réelle.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { PATH_PREFIX } from './lib/hook-utils.mjs';
import { runHook, projectRoot } from './lib/hook-test-util.mjs';

// Durcissement PATH macOS (Apple Silicon) — sinon le détecteur d'audit
// macos-hardening émet un finding HIGH sur ce test.
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

const TMP_DIR = path.join(projectRoot, '.claude', 'tmp');
const STATE_PATH = path.join(TMP_DIR, 'workflow-state.json');
const SENTINEL_PATH = path.join(TMP_DIR, '.batch-in-flight');

const env = { CLAUDE_PROJECT_DIR: projectRoot };

// Snapshot/restore d'un fichier : capture le contenu (ou son absence) puis rend
// l'état d'origine, que le test l'ait créé, modifié ou supprimé.
function snapshot(file) {
  const existed = fs.existsSync(file);
  const content = existed ? fs.readFileSync(file, 'utf8') : null;
  return () => {
    if (content === null) { if (fs.existsSync(file)) fs.rmSync(file); }
    else fs.writeFileSync(file, content);
  };
}

let restoreState;
let restoreSentinel;

beforeEach(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  restoreState = snapshot(STATE_PATH);
  restoreSentinel = snapshot(SENTINEL_PATH);
  // Une sentinelle fraîche déclasserait un block en simple warning : on la retire
  // pour que le gate s'applique nominalement pendant le test.
  if (fs.existsSync(SENTINEL_PATH)) fs.rmSync(SENTINEL_PATH);
});

afterEach(() => {
  restoreState();
  restoreSentinel();
});

// Écrit un état où la dernière édition est plus récente que le dernier validate
// (la condition qui arme le gate).
function writeStaleState() {
  const now = Date.now();
  fs.writeFileSync(STATE_PATH, JSON.stringify({
    lastEdit: now,
    lastEditPath: 'src/feature.ts',
    lastValidate: now - 10 * 60 * 1000,
    lastValidateCommand: '',
    lastUiEdit: 0,
    lastUiEditPath: '',
  }, null, 2));
}

describe('enforce-workflow (gate Stop)', () => {
  it('BLOCK : message FR de complétion + édition en retard sur le validate', () => {
    writeStaleState();
    const res = runHook('enforce-workflow.mjs',
      { last_assistant_message: "Voilà, c'est terminé." }, { env });
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson?.decision).toBe('block');
    expect(typeof res.stdoutJson?.reason).toBe('string');
    expect(res.stdoutJson.reason.length).toBeGreaterThan(0);
  });

  it('BLOCK inconditionnel sous MG_HEADLESS_RUN, même sur un message de progrès', () => {
    writeStaleState();
    const res = runHook('enforce-workflow.mjs',
      { last_assistant_message: "J'avance sur la fonction, je continue." },
      { env: { ...env, MG_HEADLESS_RUN: '1' } });
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson?.decision).toBe('block');
  });

  it('ALLOW : message de progrès, sans headless → aucun block', () => {
    writeStaleState();
    const res = runHook('enforce-workflow.mjs',
      { last_assistant_message: "J'avance sur la fonction, je continue." }, { env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout.trim()).toBe('');
    expect(res.stdoutJson).toBeNull();
  });
});
