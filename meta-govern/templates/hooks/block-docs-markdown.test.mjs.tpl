// Template: templates/hooks/block-docs-markdown.test.mjs.tpl
// Variables used:
//   {{DOCS_ROOT}} — dossier docs verrouillé en HTML (ex. `docs`)
//
// Rendu en `.claude/hooks/block-docs-markdown.test.mjs` (frère du hook).
// Prouve le contrat PreToolUse du garde `block-docs-markdown` :
//   POSITIF — un Write d'un `.md` sous {{DOCS_ROOT}}/ est DENY ;
//   NÉGATIF — un Write d'un `.html` au même endroit passe (allow, aucun stdout).
// Runner : vitest.

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { runHook, projectRoot } from './lib/hook-test-util.mjs';

const DOCS_ROOT = '{{DOCS_ROOT}}';

// Le hook ancre la résolution sur CLAUDE_PROJECT_DIR ; on le fixe sur la racine
// du projet rendu pour que les chemins ci-dessous tombent bien sous {{DOCS_ROOT}}/.
const env = { CLAUDE_PROJECT_DIR: projectRoot };

// Un Write d'un fichier `file_path` sous {{DOCS_ROOT}}/ — chemin absolu ancré
// sur la racine projet (le hook canonicalise et re-relativise).
const writeEvent = (relFromRoot) => ({
  tool_name: 'Write',
  tool_input: { file_path: path.join(projectRoot, relFromRoot) },
});

describe('block-docs-markdown', () => {
  it('DENY : un .md sous docs/ est refusé', () => {
    const res = runHook('block-docs-markdown.mjs', writeEvent(`${DOCS_ROOT}/x.md`), { env });
    expect(res.exitCode).toBe(0);
    const out = res.stdoutJson?.hookSpecificOutput;
    expect(out?.hookEventName).toBe('PreToolUse');
    expect(out?.permissionDecision).toBe('deny');
    expect(typeof out?.permissionDecisionReason).toBe('string');
    expect(out.permissionDecisionReason.length).toBeGreaterThan(0);
  });

  it('ALLOW : un .html sous docs/ passe (aucun stdout)', () => {
    const res = runHook('block-docs-markdown.mjs', writeEvent(`${DOCS_ROOT}/x.html`), { env });
    expect(res.exitCode).toBe(0);
    expect(res.stdout.trim()).toBe('');
    expect(res.stdoutJson).toBeNull();
  });
});
