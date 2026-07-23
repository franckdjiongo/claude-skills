// Template: templates/hooks/bash-write-guard.test.mjs.tpl
// Rendu → .claude/hooks/bash-write-guard.test.mjs (frère du hook et du harnais).
//
// Prouve la politique du bash-write-guard (CONTRACTS §8) end-to-end via le
// harnais runHook, plus la table de vecteurs contre la lib PURE
// detectWriteTargets. Runner : vitest. Installé seulement si le projet a vitest.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PATH_PREFIX } from './lib/hook-utils.mjs';
import { runHook } from './lib/hook-test-util.mjs';
import { detectWriteTargets } from './lib/bash-write-detect.mjs';

// Durcissement PATH macOS (Apple Silicon) — sinon le détecteur d'audit
// macos-hardening émet un finding HIGH sur ce test.
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LOG_PATH = path.join(projectDir, '.claude', 'tmp', 'bash-write-guard.log');

// Fabrique l'event PreToolUse Bash attendu par le hook.
const bashEvent = (command) => ({ tool_name: 'Bash', tool_input: { command } });

// Sandbox du shadow-log : on part d'un état propre et on nettoie après, pour ne
// pas polluer la vraie session ni les autres tests.
function clearLog() {
  try { fs.rmSync(LOG_PATH, { force: true }); } catch {}
}
function readLog() {
  try {
    return fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

beforeEach(clearLog);
afterEach(clearLog);

describe('bash-write-guard — politique deny/shadow/allow', () => {
  it('REFUSE une écriture .md sous {{DOCS_ROOT}}/ (cas positif)', () => {
    const res = runHook('bash-write-guard.mjs', bashEvent('cat > {{DOCS_ROOT}}/x.md'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('LAISSE PASSER une écriture sous scratchpad/ (cas négatif)', () => {
    const res = runHook('bash-write-guard.mjs', bashEvent('echo hi > scratchpad/x'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
  });

  it('REFUSE un `git add -A` massif', () => {
    const res = runHook('bash-write-guard.mjs', bashEvent('git add -A'));
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('OBSERVE (shadow-log, pas de deny) une écriture sous src/** par défaut', () => {
    const res = runHook('bash-write-guard.mjs', bashEvent('echo x > src/app.ts'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
    const log = readLog();
    expect(log.length).toBe(1);
    expect(log[0]).toMatchObject({ target: 'src/app.ts', vector: 'redirect', mode: 'shadow' });
  });

  it('PROMEUT src/** en refus quand BASH_WRITE_GUARD_ENFORCE=1', () => {
    const res = runHook('bash-write-guard.mjs', bashEvent('echo x > src/app.ts'), {
      env: { BASH_WRITE_GUARD_ENFORCE: '1' },
    });
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
    // Un refus n'écrit pas de ligne shadow.
    expect(readLog().length).toBe(0);
  });

  it('LAISSE PASSER une commande sans cible d’écriture', () => {
    const res = runHook('bash-write-guard.mjs', bashEvent('ls -la && grep foo src/app.ts'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
  });
});

describe('detectWriteTargets — table de vecteurs', () => {
  const cases = [
    { name: 'sed -i', cmd: "sed -i 's/a/b/' src/app.ts", vector: 'sed-i', path: 'src/app.ts' },
    { name: 'tee', cmd: 'echo hi | tee -a build.log', vector: 'tee', path: 'build.log' },
    { name: 'node -e', cmd: `node -e 'require("fs").writeFileSync("out.txt","x")'`, vector: 'node-e', path: 'out.txt' },
    { name: 'heredoc', cmd: 'cat > {{DOCS_ROOT}}/x.md <<EOF\nhi\nEOF', vector: 'heredoc', path: '{{DOCS_ROOT}}/x.md' },
  ];
  for (const c of cases) {
    it(`détecte le vecteur ${c.name}`, () => {
      const targets = detectWriteTargets(c.cmd);
      expect(targets).toContainEqual({ path: c.path, vector: c.vector });
    });
  }

  it('exclut /dev/null', () => {
    expect(detectWriteTargets('echo x > /dev/null')).toEqual([]);
  });

  it('retourne [] sur commande vide ou non-écrivante', () => {
    expect(detectWriteTargets('')).toEqual([]);
    expect(detectWriteTargets('ls -la')).toEqual([]);
  });
});
