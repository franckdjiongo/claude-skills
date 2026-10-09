// Régressions de l'outillage MIGRATE/AUDIT et des templates (EVOLVE v1.20.0).
// Chaque fixture prend une forme que les projets d'origine du canon n'ont pas :
// projet bun, worktree lié, audit lancé depuis un cwd étranger, palier déclaré
// sans ses artefacts, code hors src/, copies Codex des hooks.
import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'
import { detectProject, pmRunPrefix, palierArtifactGaps } from './lib/project-detection.mjs'
import { renderToFile } from './lib/template-renderer.mjs'

const SKILL_DIR = dirname(dirname(new URL(import.meta.url).pathname))
const MIGRATE = join(SKILL_DIR, 'scripts/migrate-project.mjs')
const AUDIT = join(SKILL_DIR, 'scripts/audit-project.mjs')

const dirs = []
const tmp = () => { const d = realpathSync(mkdtempSync(join(tmpdir(), 'mg-tooling-'))); dirs.push(d); return d }
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

function write(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), content)
  }
}
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
function gitRepo(dir) {
  mkdirSync(dir, { recursive: true })
  git(dir, 'init', '-q', '-b', 'main')
  return dir
}

// Projet bootstrappé minimal : CLAUDE.md, 3 skills coeur, état déclaré.
function governed(root, { palier, extra = {}, pkg = null, lock = null } = {}) {
  const files = {
    'CLAUDE.md': '# p\n',
    '.claude/skills/brainstorm/SKILL.md': '---\nname: brainstorm\n---\n',
    '.claude/skills/write-plan/SKILL.md': '---\nname: write-plan\n---\n',
    '.claude/skills/execute-plan/SKILL.md': '---\nname: execute-plan\n---\n',
    '.claude/.meta-govern.json': JSON.stringify({ metaGovernVersion: '1.18.0', palier }),
    ...extra,
  }
  if (pkg) files['package.json'] = JSON.stringify(pkg, null, 2)
  if (lock) files[lock] = ''
  write(root, files)
  return root
}

describe('pmRunPrefix (une seule table gestionnaire → préfixe)', () => {
  test('bun, pnpm, yarn, npm et défaut', () => {
    expect(pmRunPrefix('bun')).toBe('bun run')
    expect(pmRunPrefix('pnpm')).toBe('pnpm')
    expect(pmRunPrefix('yarn')).toBe('yarn')
    expect(pmRunPrefix('npm')).toBe('npm run')
    expect(pmRunPrefix(undefined)).toBe('npm run')
  })
  test('bun.lockb détecté comme bun', () => {
    const dir = tmp()
    write(dir, { 'package.json': '{}', 'bun.lockb': '' })
    expect(detectProject(dir).stack.packageManager).toBe('bun')
  })
})

describe('D1 — migrate --target=model-routing préfixe validate selon le gestionnaire détecté', () => {
  const migrate = (dir) => spawnSync('node', [MIGRATE, dir, '--target=model-routing'], { encoding: 'utf8' })
  test('projet bun → bun run, relance idempotente', () => {
    const dir = governed(tmp(), {
      palier: 1, lock: 'bun.lock',
      pkg: { name: 'b', scripts: { validate: 'bun run typecheck && bun test', 'validate:fast': 'bun run typecheck' } },
    })
    expect(migrate(dir).status).toBe(0)
    const s1 = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts
    expect(s1.validate).toBe('bun run claude:model-routing:check && bun run typecheck && bun test')
    expect(s1['validate:fast']).toBe('bun run claude:model-routing:check && bun run typecheck')
    expect(migrate(dir).status).toBe(0)
    const s2 = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts
    expect(s2.validate).toBe(s1.validate)
  })
  test('projet npm → npm run', () => {
    const dir = governed(tmp(), {
      palier: 1, lock: 'package-lock.json',
      pkg: { name: 'n', scripts: { validate: 'npm test' } },
    })
    migrate(dir)
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts.validate)
      .toBe('npm run claude:model-routing:check && npm test')
  })
})

describe('D2 — nom de projet depuis un worktree lié', () => {
  test('racine du worktree → nom du dépôt principal ; sous-dossier inchangé', () => {
    const repo = gitRepo(join(tmp(), 'my-app'))
    write(repo, { 'README.md': 'x\n', 'pkg/sub/.keep': '' })
    git(repo, 'add', '.')
    git(repo, 'commit', '-qm', 'init')
    git(repo, 'worktree', 'add', '-q', '.worktrees/feature-x', '-b', 'feat/x')
    expect(detectProject(repo).projectName).toBe('my-app')
    expect(detectProject(join(repo, '.worktrees/feature-x')).projectName).toBe('my-app')
    expect(detectProject(join(repo, '.worktrees/feature-x/pkg/sub')).projectName).toBe('sub')
  })
  test('bootstrap --dry-run depuis le worktree nomme les docs d’après le dépôt principal', () => {
    const repo = gitRepo(join(tmp(), 'my-app'))
    write(repo, { 'README.md': 'x\n' })
    git(repo, 'add', '.')
    git(repo, 'commit', '-qm', 'init')
    git(repo, 'worktree', 'add', '-q', '.worktrees/feat-z', '-b', 'feat/z')
    const r = spawnSync('node', [join(SKILL_DIR, 'scripts/bootstrap-project.mjs'), join(repo, '.worktrees/feat-z'), '--dry-run'], { encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout + r.stderr).toContain('my-app-spec.html')
    expect(r.stdout + r.stderr).not.toContain('feat-z-spec.html')
  })
  test('dossier hors git → nom du dossier', () => {
    const dir = join(tmp(), 'plain-dir')
    mkdirSync(dir)
    expect(detectProject(dir).projectName).toBe('plain-dir')
  })
})

describe('D3 — écart entre palier déclaré et artefacts sur disque', () => {
  const p5 = (root) => governed(root, {
    palier: 5,
    extra: {
      '.claude/scripts/predeploy-check.mjs': '',
      '.claude/scripts/check-runtime-parity.mjs': '',
    },
  })
  test('palierArtifactGaps nomme les paliers 2 et 3 manquants', () => {
    const gaps = palierArtifactGaps(detectProject(p5(tmp())))
    expect(gaps.map((g) => g.palier)).toEqual([2, 3])
  })
  test('escalier detectPalier inchangé (palier inféré)', () => {
    const dir = governed(tmp(), {
      palier: 4,
      extra: { '.claude/hooks/plan-closeout-guard.mjs': '', '.github/workflows/ci.yml': 'on: push\n' },
    })
    expect(detectProject(dir).inferredPalier).toBe(2)
  })
  test('--target=vX.Y.Z --dry-run ajoute une étape manual qui nomme les marqueurs absents', () => {
    const dir = p5(tmp())
    const r = spawnSync('node', [MIGRATE, dir, '--target=v1.20.0', '--dry-run'], { encoding: 'utf8' })
    const out = r.stdout + r.stderr
    expect(out).toContain('plan-closeout-guard')
    expect(out).toContain('agent-dispatch-preflight')
    expect(out).not.toContain('check-runtime-parity.mjs.tpl')
  })
  test('palier déclaré 1 → aucune étape d’écart', () => {
    const dir = governed(tmp(), { palier: 1 })
    const r = spawnSync('node', [MIGRATE, dir, '--target=v1.20.0', '--dry-run'], { encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('Version migration')
    expect(r.stdout + r.stderr).not.toContain('artefact marqueur absent')
  })
  test('palier 4 prouvé par une compensation locale déclarée', () => {
    const dir = governed(tmp(), { palier: 4, extra: { '.claude/hooks/plan-closeout-guard.mjs': '', '.claude/hooks/agent-dispatch-preflight.mjs': '' } })
    const state = { metaGovernVersion: '1.18.0', palier: 4, ciPolicy: 'local-compensation' }
    write(dir, { '.claude/.meta-govern.json': JSON.stringify(state) })
    expect(palierArtifactGaps(detectProject(dir))).toEqual([])
    write(dir, { '.claude/.meta-govern.json': JSON.stringify({ ...state, ciPolicy: 'server-ci' }) })
    expect(palierArtifactGaps(detectProject(dir)).map((g) => g.palier)).toEqual([4])
  })
  test('paliers 2-3 couverts par un inventaire lean-by-design consigné', () => {
    const dir = governed(tmp(), { palier: 3 })
    write(dir, { '.claude/.meta-govern.json': JSON.stringify({ metaGovernVersion: '1.18.0', palier: 3, inventoryPolicy: 'lean-by-design' }) })
    expect(palierArtifactGaps(detectProject(dir))).toEqual([])
  })
})

describe('D4 — chemins des constats d’audit relatifs au projet, pas au cwd', () => {
  test('delta-protocol et budget CLAUDE.md depuis un cwd étranger', () => {
    const dir = gitRepo(join(tmp(), 'proj'))
    write(dir, {
      'CLAUDE.md': Array.from({ length: 130 }, (_, i) => `line ${i}`).join('\n') + '\n',
      'docs/x-spec.html': '<html><body>FUNC-01</body></html>\n',
      '.claude/.meta-govern.json': '{}',
    })
    git(dir, 'add', '.')
    git(dir, 'commit', '-qm', 'update spec')
    const elsewhere = tmp()
    const r = spawnSync('node', [AUDIT, dir], { encoding: 'utf8', cwd: elsewhere })
    expect(r.stdout).toContain('(docs/x-spec.html)')
    expect(r.stdout).toContain('(CLAUDE.md)')
    expect(r.stdout).not.toContain('../')
  })
})

describe('D10 — quality-checks exclut les dossiers de runtime agent dans tous les modes', () => {
  test('dup-literal ne signale ni .claude/ ni .codex/, en full comme en changed', () => {
    const dir = gitRepo(join(tmp(), 'qc'))
    write(dir, { 'README.md': 'r\n' })
    git(dir, 'add', '.')
    git(dir, 'commit', '-qm', 'init')
    git(dir, 'checkout', '-qb', 'feat')
    for (const f of ['index', 'lib', 'format', 'checks', 'checks/style', 'checks/code', 'checks/quality']) {
      renderToFile(join(SKILL_DIR, `templates/scripts/quality-checks/${f}.mjs.tpl`),
        join(dir, `.claude/scripts/quality-checks/${f}.mjs`),
        { VALIDATE_COMMAND: 'bun run validate', PACKAGE_MANAGER: 'bun' }, {}, { overwrite: true })
    }
    const lit = "export const LOG_FILE = '.claude/tmp/some-log-file.jsonl'\n"
    for (const d of ['.codex/hooks', '.claude/hooks', 'src/lib']) write(dir, { [`${d}/a.mjs`]: lit, [`${d}/b.mjs`]: lit })
    for (const scope of ['full', 'changed']) {
      const r = spawnSync('node', ['.claude/scripts/quality-checks/index.mjs', '--scope', scope],
        { cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } })
      const dup = (r.stdout + r.stderr).split('\n').filter((l) => l.includes('[dup-literal]'))
      expect(dup.some((l) => l.includes('src/lib/a.mjs'))).toBe(true)
      expect(dup.filter((l) => /\.(claude|codex)\//.test(l.split(' - ')[0]))).toEqual([])
    }
  })
})

describe('D6/D11 — bash-write-guard rendu : racines configurables, runtime neutre', () => {
  function renderGuard() {
    const dir = tmp()
    const files = [
      ['templates/hooks/bash-write-guard.mjs.tpl', '.claude/hooks/bash-write-guard.mjs'],
      ['templates/hooks/lib/hook-utils.mjs.tpl', '.claude/hooks/lib/hook-utils.mjs'],
      ['templates/hooks/lib/bash-write-detect.mjs.tpl', '.claude/hooks/lib/bash-write-detect.mjs'],
      ['templates/hooks/lib/bash-write-detect.vectors.mjs.tpl', '.claude/hooks/lib/bash-write-detect.vectors.mjs'],
    ]
    for (const [from, to] of files) renderToFile(join(SKILL_DIR, from), join(dir, to), { DOCS_ROOT: 'docs' }, {}, { overwrite: true })
    return dir
  }
  const run = (dir, event, env = {}) => {
    const r = spawnSync('node', [join(dir, '.claude/hooks/bash-write-guard.mjs')], {
      input: JSON.stringify(event), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir, BASH_WRITE_GUARD_ENFORCE: '', ...env },
    })
    return r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput.permissionDecision : null
  }
  const log = (dir) => { try { return readFileSync(join(dir, '.claude/tmp/bash-write-guard.log'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).target) } catch { return [] } }
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } })

  test('racines lues dans risk-tiers.json : convex/ observé, src/ ignoré, enforce refuse', () => {
    const dir = renderGuard()
    write(dir, { '.claude/risk-tiers.json': JSON.stringify({ bashWriteGuard: { watchedRoots: ['convex'] } }) })
    expect(run(dir, bash('echo x > convex/a.ts'))).toBeNull()
    expect(run(dir, bash('echo x > src/b.ts'))).toBeNull()
    expect(log(dir)).toEqual(['convex/a.ts'])
    expect(run(dir, bash('echo x > convex/a.ts'), { BASH_WRITE_GUARD_ENFORCE: '1' })).toBe('deny')
  })
  test('sans risk-tiers.json : défaut src/', () => {
    const dir = renderGuard()
    run(dir, bash('echo x > src/b.ts'))
    expect(log(dir)).toEqual(['src/b.ts'])
  })
  test('payload Codex et chemins protégés Codex', () => {
    const dir = renderGuard()
    expect(run(dir, { tool_name: 'exec_command', tool_input: { cmd: 'cat > docs/x.md' } })).toBe('deny')
    for (const script of ['echo x > CLAUDE.md', 'tee CLAUDE.md', 'cp a docs/x.md', 'git add -A']) {
      expect(run(dir, { tool_name: 'exec_command', tool_input: { cmd: ['bash', '-lc', script] } })).toBe('deny')
    }
    expect(run(dir, { tool_name: 'exec_command', tool_input: { cmd: ['echo', 'a > CLAUDE.md'] } })).toBeNull()
    expect(run(dir, { tool_name: 'exec_command', tool_input: { cmd: ['touch', 'docs/my file.md'] } })).toBe('deny')
    mkdirSync(join(dir, 'sub'))
    expect(run(dir, { tool_name: 'exec_command', tool_input: { cmd: 'echo x > ../AGENTS.md', workdir: join(dir, 'sub') } })).toBe('deny')
    expect(run(dir, { tool_name: 'exec_command', tool_input: { cmd: 'echo x > AGENTS.md', workdir: 'sub' } })).toBeNull()
    expect(run(dir, bash('echo x > AGENTS.md'))).toBe('deny')
    expect(run(dir, bash('echo {} > .codex/hooks.json'))).toBe('deny')
    expect(run(dir, { tool_name: 'Read', tool_input: { command: 'echo x > CLAUDE.md' } })).toBeNull()
  })
})
