// Template: templates/hooks/hooks-inventory.test.mjs.tpl
// (aucune variable de template — le rendu est une copie littérale)
//
// Rendu en `.claude/hooks/hooks-inventory.test.mjs`. Preuve d'inventaire :
//   (a) chaque `.claude/hooks/*.mjs` (hors `lib/` et `*.test.mjs`) est référencé
//       dans `settings.json` OU dans un frontmatter `.claude/agents/*.md`
//       — ZÉRO hook orphelin ;
//   (b) chaque matcher présent dans `settings.json` est une chaîne non vide ;
//   (c) si `.claude/hooks/README.{md,html}` existe, il mentionne chaque hook
//       (le canon n'en livre pas → skip gracieux sinon).
// Runner : vitest.

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { projectRoot } from './lib/hook-test-util.mjs';

const HOOKS_DIR = path.join(projectRoot, '.claude', 'hooks');
const AGENTS_DIR = path.join(projectRoot, '.claude', 'agents');

// Hooks réels : `.mjs` directement sous hooks/, hors fichiers de test. `lib/`
// (utilitaires partagés) est un sous-dossier, donc jamais listé par readdir ici.
function listHooks() {
  return fs.readdirSync(HOOKS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.mjs') && !e.name.endsWith('.test.mjs'))
    .map((e) => e.name)
    .sort();
}

// Concatène toutes les commandes déclarées dans settings.json / settings.local.json
// et collecte les matchers présents (pour la vérif (b)).
function readSettings() {
  const commands = [];
  const matchers = [];
  for (const name of ['settings.json', 'settings.local.json']) {
    const file = path.join(projectRoot, '.claude', name);
    if (!fs.existsSync(file)) continue;
    let json;
    try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    for (const groups of Object.values(json.hooks || {})) {
      for (const group of groups || []) {
        if ('matcher' in group) matchers.push(group.matcher);
        for (const h of group.hooks || []) {
          if (typeof h.command === 'string') commands.push(h.command);
        }
      }
    }
  }
  return { commands, matchers };
}

// Corps concaténé de tous les frontmatters d'agents — certains hooks (ex.
// subagent-plan-edit-guard) ne sont câblés que là, pas dans settings.json.
function readAgentsText() {
  if (!fs.existsSync(AGENTS_DIR)) return '';
  return fs.readdirSync(AGENTS_DIR)
    .filter((n) => n.endsWith('.md'))
    .map((n) => fs.readFileSync(path.join(AGENTS_DIR, n), 'utf8'))
    .join('\n');
}

describe('hooks-inventory', () => {
  const hooks = listHooks();
  const { commands, matchers } = readSettings();
  const agentsText = readAgentsText();
  const wired = commands.join('\n') + '\n' + agentsText;

  it('aucun hook orphelin : chaque .mjs est câblé dans settings.json ou un agent', () => {
    const orphans = hooks.filter((name) => !wired.includes(name));
    expect(orphans).toEqual([]);
  });

  it('chaque matcher de settings.json est une chaîne non vide', () => {
    for (const m of matchers) {
      expect(typeof m).toBe('string');
      expect(m.trim().length).toBeGreaterThan(0);
    }
  });

  const readme = ['README.md', 'README.html']
    .map((n) => path.join(HOOKS_DIR, n))
    .find((p) => fs.existsSync(p));

  (readme ? it : it.skip)('README hooks/ mentionne chaque hook', () => {
    const text = fs.readFileSync(readme, 'utf8');
    const missing = hooks.filter((name) => !text.includes(name));
    expect(missing).toEqual([]);
  });
});
