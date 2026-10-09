// Template: templates/hooks/bash-write-guard.test.mjs.tpl
// Rendu → .claude/hooks/bash-write-guard.test.mjs (frère du hook et du harnais).
//
// Prouve la politique du bash-write-guard (CONTRACTS §8) end-to-end via le
// harnais runHook, plus la table de vecteurs contre la lib PURE
// detectWriteTargets. Runner : vitest. Installé seulement si le projet a vitest.
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PATH_PREFIX } from './lib/hook-utils.mjs';
import { runHook } from './lib/hook-test-util.mjs';
import { detectWriteTargets } from './lib/bash-write-detect.mjs';

// Durcissement PATH macOS (Apple Silicon) — sinon le détecteur d'audit
// macos-hardening émet un finding HIGH sur ce test.
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

// Bac à sable : le garde lit .claude/risk-tiers.json du projet (racines
// observées). Chaque cas tourne avec CLAUDE_PROJECT_DIR sur un dossier
// temporaire, pour que la configuration de l'hôte ne change pas le résultat.
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), 'bwg-'));
const LOG_PATH = path.join(SANDBOX, '.claude', 'tmp', 'bash-write-guard.log');
const TIERS_PATH = path.join(SANDBOX, '.claude', 'risk-tiers.json');
const guard = (event, opts = {}) =>
  runHook('bash-write-guard.mjs', event, {
    ...opts,
    env: { CLAUDE_PROJECT_DIR: SANDBOX, BASH_WRITE_GUARD_ENFORCE: '', ...(opts.env || {}) },
  });
function setTiers(content) {
  fs.mkdirSync(path.dirname(TIERS_PATH), { recursive: true });
  if (content === null) fs.rmSync(TIERS_PATH, { force: true });
  else fs.writeFileSync(TIERS_PATH, typeof content === 'string' ? content : JSON.stringify(content));
}
afterAll(() => fs.rmSync(SANDBOX, { recursive: true, force: true }));

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
afterEach(() => { clearLog(); setTiers(null); });

describe('bash-write-guard — politique deny/shadow/allow', () => {
  it('REFUSE une écriture .md sous {{DOCS_ROOT}}/ (cas positif)', () => {
    const res = guard(bashEvent('cat > {{DOCS_ROOT}}/x.md'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('LAISSE PASSER une écriture sous scratchpad/ (cas négatif)', () => {
    const res = guard(bashEvent('echo hi > scratchpad/x'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
  });

  it('REFUSE un `git add -A` massif', () => {
    const res = guard(bashEvent('git add -A'));
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('OBSERVE (shadow-log, pas de deny) une écriture sous src/** par défaut', () => {
    const res = guard(bashEvent('echo x > src/app.ts'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
    const log = readLog();
    expect(log.length).toBe(1);
    expect(log[0]).toMatchObject({ target: 'src/app.ts', vector: 'redirect', mode: 'shadow' });
  });

  it('PROMEUT src/** en refus quand BASH_WRITE_GUARD_ENFORCE=1', () => {
    const res = guard(bashEvent('echo x > src/app.ts'), {
      env: { BASH_WRITE_GUARD_ENFORCE: '1' },
    });
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
    // Un refus n'écrit pas de ligne shadow.
    expect(readLog().length).toBe(0);
  });

  it('LAISSE PASSER une commande sans cible d’écriture', () => {
    const res = guard(bashEvent('ls -la && grep foo src/app.ts'));
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
  });

  it('OBSERVE les racines déclarées dans risk-tiers.json, plus src/ quand non listé', () => {
    setTiers({ bashWriteGuard: { watchedRoots: ['convex', 'app/src/'] } });
    expect(guard(bashEvent('echo x > convex/a.ts')).stdoutJson).toBeNull();
    expect(guard(bashEvent('echo x > app/src/b.ts')).stdoutJson).toBeNull();
    expect(guard(bashEvent('echo x > src/c.ts')).stdoutJson).toBeNull();
    expect(readLog().map((e) => e.target)).toEqual(['convex/a.ts', 'app/src/b.ts']);
  });

  it('PROMEUT une racine déclarée en refus sous BASH_WRITE_GUARD_ENFORCE=1', () => {
    setTiers({ bashWriteGuard: { watchedRoots: ['convex'] } });
    const res = guard(bashEvent('echo x > convex/a.ts'), { env: { BASH_WRITE_GUARD_ENFORCE: '1' } });
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecisionReason).toContain('convex/**');
  });

  it('retombe sur src/ quand risk-tiers.json est illisible', () => {
    setTiers('{not json');
    guard(bashEvent('echo x > src/app.ts'));
    expect(readLog().map((e) => e.target)).toEqual(['src/app.ts']);
  });

  it("n'observe rien quand watchedRoots est vide", () => {
    setTiers({ bashWriteGuard: { watchedRoots: [] } });
    guard(bashEvent('echo x > src/app.ts'));
    expect(readLog()).toEqual([]);
  });

  it('REFUSE une écriture shell vers AGENTS.md et .codex/hooks.json', () => {
    for (const cmd of ['echo x > AGENTS.md', 'echo {} > .codex/hooks.json']) {
      expect(guard(bashEvent(cmd)).stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
    }
  });

  it("agit sur l'outil shell Codex (exec_command, cmd en chaîne ou en argv)", () => {
    const a = guard({ tool_name: 'exec_command', tool_input: { cmd: 'cat > {{DOCS_ROOT}}/x.md' } });
    expect(a.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
    for (const script of ['echo x > CLAUDE.md', 'tee CLAUDE.md', 'git add -A']) {
      const b = guard({ tool_name: 'exec_command', tool_input: { cmd: ['bash', '-lc', script] } });
      expect(b.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
    }
    // argv hors shell : un « > » littéral dans un argument n'est pas une redirection.
    expect(guard({ tool_name: 'exec_command', tool_input: { cmd: ['echo', 'a > CLAUDE.md'] } }).stdoutJson).toBeNull();
  });

  it('ancre une cible relative sur le workdir Codex', () => {
    fs.mkdirSync(path.join(SANDBOX, 'sub'), { recursive: true });
    const up = guard({ tool_name: 'exec_command', tool_input: { cmd: 'echo x > ../CLAUDE.md', workdir: path.join(SANDBOX, 'sub') } });
    expect(up.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
    const local = guard({ tool_name: 'exec_command', tool_input: { cmd: 'echo x > CLAUDE.md', workdir: 'sub' } });
    expect(local.stdoutJson).toBeNull();
  });

  it("ignore un outil qui n'est pas un shell", () => {
    const res = guard({ tool_name: 'Read', tool_input: { command: 'echo x > CLAUDE.md' } });
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
  });

  it('FAIL-OPEN sur un stdin malformé (exit 0, pas de deny)', () => {
    const res = guard(undefined, {
      stdinOverride: '{not json',
    });
    expect(res.exitCode).toBe(0);
    expect(res.stdoutJson).toBeNull();
  });
});

// Réfutation adversariale : le détecteur de redirection scannait le texte brut
// sans conscience des guillemets d'une commande enveloppante. Pour
// `bash -c 'cat > {{DOCS_ROOT}}/x.md'`, la branche cible-non-quotée avalait le
// guillemet fermant de l'enveloppe et produisait `{{DOCS_ROOT}}/x.md'` — une
// chaîne qui échoue les comparaisons exactes de isDocsMarkdown()/PROTECTED_PATHS,
// donc allow() silencieux. Symétriquement, un `>` d'affichage pur dans un
// `echo "…"` était lu comme une vraie redirection (faux positif). Ces cas
// prouvent la fermeture des deux trous, plus la couverture install/dd.
describe('bash-write-guard — enveloppes shell, install/dd, faux positif (réfutation)', () => {
  it('REFUSE `bash -c \'cat > {{DOCS_ROOT}}/x.md\'` (enveloppe simple-quote)', () => {
    const res = guard(bashEvent("bash -c 'cat > {{DOCS_ROOT}}/x.md'"));
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('REFUSE `sh -c "echo x > CLAUDE.md"` (enveloppe double-quote, chemin protégé)', () => {
    const res = guard(bashEvent('sh -c "echo x > CLAUDE.md"'));
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('REFUSE `bash -c "cd /tmp && cat > {{DOCS_ROOT}}/y.md"` (enveloppe + `&&` interne)', () => {
    const res = guard(bashEvent('bash -c "cd /tmp && cat > {{DOCS_ROOT}}/y.md"'));
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('REFUSE `install -m 644 /tmp/a.md {{DOCS_ROOT}}/b.md` (vecteur install)', () => {
    const res = guard(bashEvent('install -m 644 /tmp/a.md {{DOCS_ROOT}}/b.md'));
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('REFUSE `dd if=/tmp/a of={{DOCS_ROOT}}/c.md` (vecteur dd)', () => {
    const res = guard(bashEvent('dd if=/tmp/a of={{DOCS_ROOT}}/c.md'));
    expect(res.stdoutJson?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('LAISSE PASSER un `>` purement affiché dans un echo quoté (faux positif)', () => {
    const res = guard(bashEvent('echo "Tip: redirect output > {{DOCS_ROOT}}/notes.md and check the result"')
    );
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
    { name: 'install', cmd: 'install -m 644 /tmp/a.md {{DOCS_ROOT}}/b.md', vector: 'install', path: '{{DOCS_ROOT}}/b.md' },
    { name: 'dd of=', cmd: 'dd if=/tmp/a of={{DOCS_ROOT}}/c.md', vector: 'dd', path: '{{DOCS_ROOT}}/c.md' },
    { name: 'rsync', cmd: 'rsync -av /tmp/src/ {{DOCS_ROOT}}/dest/', vector: 'rsync', path: '{{DOCS_ROOT}}/dest/' },
    { name: 'ln', cmd: 'ln -s /tmp/target {{DOCS_ROOT}}/link', vector: 'ln', path: '{{DOCS_ROOT}}/link' },
    { name: 'truncate', cmd: 'truncate -s 0 {{DOCS_ROOT}}/x.md', vector: 'truncate', path: '{{DOCS_ROOT}}/x.md' },
    {
      name: 'bash -c (enveloppe simple-quote)',
      cmd: "bash -c 'cat > {{DOCS_ROOT}}/x.md'",
      vector: 'redirect',
      path: '{{DOCS_ROOT}}/x.md',
    },
    {
      name: 'sh -c (enveloppe double-quote)',
      cmd: 'sh -c "echo x > CLAUDE.md"',
      vector: 'redirect',
      path: 'CLAUDE.md',
    },
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

  it('ignore un `>` purement textuel à l’intérieur d’un guillemet (faux positif)', () => {
    expect(
      detectWriteTargets('echo "Tip: redirect output > {{DOCS_ROOT}}/notes.md and check the result"')
    ).toEqual([]);
  });

  it('retourne [] sur commande vide ou non-écrivante', () => {
    expect(detectWriteTargets('')).toEqual([]);
    expect(detectWriteTargets('ls -la')).toEqual([]);
  });
});
