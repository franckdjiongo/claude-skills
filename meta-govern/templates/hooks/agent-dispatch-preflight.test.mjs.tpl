// Template: templates/hooks/agent-dispatch-preflight.test.mjs.tpl
// (aucune variable de template — le rendu est une copie littérale)
//
// Rendu en `.claude/hooks/agent-dispatch-preflight.test.mjs` (frère du hook).
// Prouve le contrat PreToolUse du garde `agent-dispatch-preflight` :
//   POSITIF — un dispatch Agent vers un subagent_type ÉCRIVANT (implementer /
//             ui-implementer) pose/rafraîchit la sentinelle `.batch-in-flight` ;
//   NÉGATIF — un dispatch Agent vers un subagent_type LECTEUR (ex. reviewer)
//             ne pose RIEN (aucune sentinelle créée, aucun stdout).
// Le hook est fail-open structurel : jamais de permissionDecision/decision,
// toujours exit 0 sans stdout — ce test vérifie donc l'EFFET DE BORD fichier,
// pas une sortie JSON. Runner : vitest. Installé seulement si le projet a vitest.
//
// Contrairement à enforce-workflow.test.mjs (qui lit/consomme la sentinelle
// du VRAI `.claude/tmp/` du projet), ce hook ne fait qu'ÉCRIRE la sentinelle —
// pointer CLAUDE_PROJECT_DIR sur une racine projet FACTICE et jetable (créée
// sous le tmpdir OS) isole donc chaque run : aucun risque de courir en
// parallèle avec enforce-workflow.test.mjs sur le même fichier réel, et un
// test qui plante ne laisse ni sentinelle orpheline ni état corrompu dans la
// session vivante.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { PATH_PREFIX } from './lib/hook-utils.mjs';
import { runHook } from './lib/hook-test-util.mjs';

// Durcissement PATH macOS (Apple Silicon) — sinon le détecteur d'audit
// macos-hardening émet un finding HIGH sur ce test.
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

let fakeProjectDir;
let env;
let sentinelPath;

beforeEach(() => {
  fakeProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-dispatch-preflight-test-'));
  env = { CLAUDE_PROJECT_DIR: fakeProjectDir };
  sentinelPath = path.join(fakeProjectDir, '.claude', 'tmp', '.batch-in-flight');
});

afterEach(() => {
  fs.rmSync(fakeProjectDir, { recursive: true, force: true });
});

const dispatchEvent = (subagentType) => ({
  tool_name: 'Agent',
  tool_input: { subagent_type: subagentType, description: 'test dispatch' },
});

describe('agent-dispatch-preflight', () => {
  it('POSE la sentinelle .batch-in-flight pour un dispatch vers un subagent ÉCRIVANT (implementer)', () => {
    const res = runHook('agent-dispatch-preflight.mjs', dispatchEvent('implementer'), { env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout.trim()).toBe('');
    expect(fs.existsSync(sentinelPath)).toBe(true);
  });

  it('NE POSE RIEN pour un dispatch vers un subagent LECTEUR (reviewer)', () => {
    const res = runHook('agent-dispatch-preflight.mjs', dispatchEvent('reviewer'), { env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout.trim()).toBe('');
    expect(fs.existsSync(sentinelPath)).toBe(false);
  });

  it('écrit un JSON valide `{ startedAt, sessionId }` (une chaîne nue casserait un lecteur qui la reparserait)', () => {
    const res = runHook(
      'agent-dispatch-preflight.mjs',
      { ...dispatchEvent('implementer'), session_id: 'sess-shape-test' },
      { env }
    );
    expect(res.exitCode).toBe(0);
    const raw = fs.readFileSync(sentinelPath, 'utf8');
    // La régression consistait précisément en ceci : `JSON.parse(raw)` levait
    // parce que `raw` était `new Date().toISOString()` nu, sans guillemets ni
    // accolades — pas un JSON.
    let parsed;
    expect(() => { parsed = JSON.parse(raw); }).not.toThrow();
    expect(typeof parsed.startedAt).toBe('string');
    expect(Number.isFinite(Date.parse(parsed.startedAt))).toBe(true);
    expect(parsed.sessionId).toBe('sess-shape-test');
  });
});

// Preuve d'aller-retour bout-en-bout : ce que ce hook écrit doit être relu
// avec succès par le VRAI Stop hook `enforce-workflow.mjs` et effectivement
// downgrader en warn un gate qui bloquerait sinon. Un test qui vérifie
// seulement `existsSync(sentinelPath)` ne prouve pas grand-chose : une
// sentinelle malformée existerait aussi sur disque tout en ne satisfaisant
// pas un lecteur qui tenterait de reparser son contenu.
describe('agent-dispatch-preflight ↔ enforce-workflow — round-trip sentinelle', () => {
  it('la sentinelle posée par agent-dispatch-preflight est relue par enforce-workflow et downgrade le Stop gate en warn', () => {
    const sessionId = 'sess-roundtrip-test';

    // 1) Dispatch écrivant → pose la sentinelle dans le projet FACTICE.
    const dispatchRes = runHook(
      'agent-dispatch-preflight.mjs',
      { tool_name: 'Agent', tool_input: { subagent_type: 'implementer', description: 'x' }, session_id: sessionId },
      { env }
    );
    expect(dispatchRes.exitCode).toBe(0);
    expect(fs.existsSync(sentinelPath)).toBe(true);

    // 2) État de workflow "stale" (édition postérieure au dernier validate) :
    // la condition qui arme normalement le gate Stop.
    const workflowStatePath = path.join(fakeProjectDir, '.claude', 'tmp', 'workflow-state.json');
    fs.writeFileSync(workflowStatePath, JSON.stringify({
      lastEdit: Date.now(),
      lastEditPath: 'src/feature.ts',
      lastValidate: Date.now() - 10 * 60 * 1000,
      lastValidateCommand: '',
      lastUiEdit: 0,
      lastUiEditPath: '',
    }));

    // 3) Stop, même session_id, message de complétion → sans la sentinelle
    // fraîche ce serait `{decision:"block", …}` sur stdout ; avec elle,
    // enforce-workflow doit rester silencieux (warn journalisé, pas de block).
    const stopRes = runHook(
      'enforce-workflow.mjs',
      { last_assistant_message: "Voilà, c'est terminé.", session_id: sessionId },
      { env }
    );
    expect(stopRes.exitCode).toBe(0);
    expect(stopRes.stdoutJson).toBeNull();
    expect(stopRes.stdout.trim()).toBe('');

    // 4) Preuve positive (pas seulement l'absence de block) : le warn a bien
    // été journalisé par enforce-workflow, avec la mention batch-en-vol.
    const lastHookOutputPath = path.join(fakeProjectDir, '.claude', 'tmp', 'last-hook-output.json');
    const lastHookOutput = JSON.parse(fs.readFileSync(lastHookOutputPath, 'utf8'));
    expect(lastHookOutput.payload.decision).toBe('warn');
    expect(lastHookOutput.payload.reason).toMatch(/batch in flight/i);

    // 5) La sentinelle n'a pas été supprimée par le passage du Stop hook.
    expect(fs.existsSync(sentinelPath)).toBe(true);
  });
});
