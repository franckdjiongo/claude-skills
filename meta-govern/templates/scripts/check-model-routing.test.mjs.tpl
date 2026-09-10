// check-model-routing.test.mjs — prouve le gate de routage des modèles.
//
// check-model-routing est un SCRIPT (pas un hook) : on l'invoque directement via
// spawnSync('node', [script]) plutôt que par le harnais runHook, en pointant
// CLAUDE_PROJECT_DIR sur une racine de fixtures jetable sous os.tmpdir().
//
// os.tmpdir() et NON <root>/.claude/tmp : le script balaie et EXCLUT tout chemin
// gitignored (git check-ignore, pour ne jamais faire échouer un run cloud sur un
// fichier restauré par navette et non commitable). Or `.claude/tmp/` est lui-même
// gitignored dans un projet réel — une fixture posée là hériterait du même
// verdict "ignoré" et le sweep testerait 0 fichier en silence (constat réel :
// la première version de ce test le faisait, RED en apparence PASS). os.tmpdir()
// est hors de tout dépôt git, donc `git check-ignore` y répond "not a git
// repository" (fail-open, rien n'est filtré) et le sweep porte vraiment sur les
// fixtures.
//
// Chaque garantie est prouvée DANS LES DEUX SENS (canon principe 13) : une
// release figée est attrapée, puis levée par le marqueur de dérogation ; un
// alias pinné est attrapé ; un chemin réel légitime (docs/architecture/opus-4-8/)
// n'est JAMAIS attrapé. Les fixtures sont créées puis supprimées à chaque test.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATH_PREFIX = '/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin';

const here = path.dirname(fileURLToPath(import.meta.url));      // <root>/.claude/scripts
const SCRIPT = path.join(here, 'check-model-routing.mjs');      // frère du test
const TMP_BASE = os.tmpdir();

let fixtureRoot;

const DEFAULT_REGISTRY = {
  schemaVersion: 1,
  lastReviewed: '2026-08-17',
  enforcement: 'error',
  allowPaths: [],
  current: {
    opus: { label: 'Claude Opus 5', apiId: 'claude-opus-5', role: 'flagship' },
    sonnet: { label: 'Claude Sonnet 5', apiId: 'claude-sonnet-5', role: 'workhorse' },
  },
  roles: {
    'test-role': { alias: 'sonnet', effort: 'medium', scope: 'fixture' },
  },
  agents: { 'test-agent': 'test-role' },
};

const AGENT_FRONTMATTER = (model, effort) => `---
name: test-agent
description: 'fixture'
tools: Read
model: ${model}
effort: ${effort}
---

Fixture agent body.
`;

// Écrit un registre (par défaut DEFAULT_REGISTRY, fusionné avec `registry`), un
// agent conforme, et un fichier de prose optionnel sous .claude/rules/.
function seed({ registry = {}, agentModel = 'sonnet', agentEffort = 'medium', proseContent, registryRaw } = {}) {
  fs.mkdirSync(path.join(fixtureRoot, '.claude', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, '.claude', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, '.claude', 'skills'), { recursive: true });

  if (registryRaw !== undefined) {
    fs.writeFileSync(path.join(fixtureRoot, '.claude', 'model-routing.json'), registryRaw);
  } else {
    const merged = { ...DEFAULT_REGISTRY, ...registry };
    fs.writeFileSync(path.join(fixtureRoot, '.claude', 'model-routing.json'), JSON.stringify(merged, null, 2));
  }

  fs.writeFileSync(
    path.join(fixtureRoot, '.claude', 'agents', 'test-agent.md'),
    AGENT_FRONTMATTER(agentModel, agentEffort),
  );

  if (proseContent !== undefined) {
    fs.writeFileSync(path.join(fixtureRoot, '.claude', 'rules', 'fixture.md'), proseContent);
  }
}

function run(args = []) {
  return spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${PATH_PREFIX}:${process.env.PATH || ''}`,
      CLAUDE_PROJECT_DIR: fixtureRoot,
    },
  });
}

describe('check-model-routing', () => {
  beforeEach(() => {
    fs.mkdirSync(TMP_BASE, { recursive: true });
    fixtureRoot = fs.mkdtempSync(path.join(TMP_BASE, 'model-routing-'));
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('SKIP : aucun registre = exit 0, non configuré', () => {
    // Pas de seed() : aucun .claude/model-routing.json.
    fs.mkdirSync(path.join(fixtureRoot, '.claude'), { recursive: true });
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SKIP');
  });

  it('BROKEN : registre JSON illisible = exit 2', () => {
    seed({ registryRaw: '{ not valid json' });
    const res = run();
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('BROKEN');
  });

  it('PASS : registre propre, agent conforme, aucune prose figée', () => {
    seed({ proseContent: 'Rien à signaler ici — utiliser l\'alias `sonnet`.\n' });
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS');
  });

  it('RED (error) : une release figée dans la prose gouvernée fait échouer le build', () => {
    seed({ proseContent: 'Ce projet tourne sur Opus 4.8 par défaut.\n' });
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Opus 4.8');
  });

  it('GREEN : le marqueur model-routing:allow lève la même violation', () => {
    seed({ proseContent: 'Ce projet tourne sur Opus 4.8 par défaut. model-routing:allow\n' });
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS');
  });

  it('WARN (shadow) : la même violation ne bloque JAMAIS en enforcement warn', () => {
    seed({
      registry: { enforcement: 'warn' },
      proseContent: 'Ce projet tourne sur Opus 4.8 par défaut.\n',
    });
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('WARN');
    expect(res.stdout).toContain('Opus 4.8');
  });

  it('no-space : "Opus5" est attrapé (ferme le contournement sans espace)', () => {
    seed({ proseContent: 'Compatible Opus5 et suivants.\n' });
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Opus5');
  });

  it('chemin réel : "docs/architecture/opus-4-8/" n\'est JAMAIS un faux positif', () => {
    seed({ proseContent: 'Voir docs/architecture/opus-4-8/ pour le detail.\n' });
    const res = run();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('PASS');
  });

  it('frontmatter : un agent pinné sur une release (pas un alias) fait échouer le build', () => {
    seed({ agentModel: 'claude-sonnet-5' });
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('pas une release figée');
  });

  it('frontmatter : un effort divergent du rôle enregistré fait échouer le build', () => {
    seed({ agentEffort: 'high' });
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('effort');
  });

  it('dérive du registre : un agent sur disque absent du registre fait échouer le build', () => {
    seed({});
    fs.writeFileSync(
      path.join(fixtureRoot, '.claude', 'agents', 'orphan-agent.md'),
      AGENT_FRONTMATTER('sonnet', 'medium'),
    );
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('désynchronisé');
  });

  it('--write : resynchronise le frontmatter en préservant un commentaire de fin de ligne', () => {
    seed({});
    const file = path.join(fixtureRoot, '.claude', 'agents', 'test-agent.md');
    fs.writeFileSync(
      file,
      AGENT_FRONTMATTER('sonnet', 'medium').replace('effort: medium', 'effort: high  # cheval de trait'),
    );
    const res = run(['--write']);
    expect(res.status).toBe(0);
    const rewritten = fs.readFileSync(file, 'utf8');
    expect(rewritten).toContain('effort: medium  # cheval de trait');
  });
});
