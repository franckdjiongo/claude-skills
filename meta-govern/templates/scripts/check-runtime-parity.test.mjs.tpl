// check-runtime-parity.test.mjs — prouve la garde de parité runtime.
//
// check-runtime-parity est un SCRIPT (pas un hook) : on l'invoque directement via
// spawnSync('node', [script]) plutôt que par le harnais runHook, en pointant
// CLAUDE_PROJECT_DIR sur une racine de fixtures jetable sous .claude/tmp.
//
// Cas RED : une paire "exact" divergente → exit 1. Cas GREEN : après resync des
// deux fichiers → exit 0. Les fixtures sont créées puis supprimées à chaque test.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin';

const here = path.dirname(fileURLToPath(import.meta.url));   // <root>/.claude/scripts
const SCRIPT = path.join(here, 'check-runtime-parity.mjs');  // frère du test
const PROJECT_ROOT = path.resolve(here, '..', '..');         // <root>
const TMP_BASE = path.join(PROJECT_ROOT, '.claude', 'tmp');

let fixtureRoot;

// Écrit le manifest + une paire de fichiers miroir dans la racine de fixtures.
function seed({ claudeContent, agentsContent, sync = 'exact', reason }) {
  const claudeRel = '.claude/scripts/a.mjs';
  const agentsRel = '.agents/scripts/a.mjs';
  fs.mkdirSync(path.join(fixtureRoot, '.claude', 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, '.agents', 'scripts'), { recursive: true });
  if (claudeContent !== null) fs.writeFileSync(path.join(fixtureRoot, claudeRel), claudeContent);
  if (agentsContent !== null) fs.writeFileSync(path.join(fixtureRoot, agentsRel), agentsContent);
  const pair = { claudePath: claudeRel, agentsPath: agentsRel, sync };
  if (reason !== undefined) pair.reason = reason;
  const manifest = { version: 1, pairs: [pair], roots: [] };
  fs.writeFileSync(
    path.join(fixtureRoot, '.claude', 'runtime-parity.json'),
    JSON.stringify(manifest, null, 2),
  );
}

function run() {
  return spawnSync('node', [SCRIPT], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${PATH_PREFIX}:${process.env.PATH || ''}`,
      CLAUDE_PROJECT_DIR: fixtureRoot,
    },
  });
}

describe('check-runtime-parity', () => {
  beforeEach(() => {
    fs.mkdirSync(TMP_BASE, { recursive: true });
    fixtureRoot = fs.mkdtempSync(path.join(TMP_BASE, 'runtime-parity-'));
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('RED: signale une paire exacte divergente (exit 1)', () => {
    seed({ claudeContent: 'export const x = 1;\n', agentsContent: 'export const x = 2;\n' });
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Divergence');
  });

  it('GREEN: passe après resync des deux fichiers (exit 0)', () => {
    const content = 'export const x = 1;\n';
    seed({ claudeContent: content, agentsContent: content });
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('alignée');
  });

  it('CRLF: une différence de fin de ligne seule ne compte pas comme divergence', () => {
    seed({ claudeContent: 'export const x = 1;\r\n', agentsContent: 'export const x = 1;\n' });
    const res = run();
    expect(res.status).toBe(0);
  });

  it('un fichier présent d’un seul côté est un finding (exit 1)', () => {
    seed({ claudeContent: 'export const x = 1;\n', agentsContent: null });
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('manquant');
  });

  it('divergence documentée avec raison est ignorée (exit 0)', () => {
    seed({
      claudeContent: 'export const x = 1;\n',
      agentsContent: 'export const x = 2;\n',
      sync: 'documented-divergence',
      reason: 'Divergence assumée et tracée.',
    });
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('ignorée');
  });

  it('manifest absent = no-op vert (exit 0)', () => {
    // Pas de seed : aucune `.claude/runtime-parity.json`.
    const res = run();
    expect(res.status).toBe(0);
  });
});
