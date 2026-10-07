import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, symlinkSync, lstatSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { installSkills, readSkip, repoState, digest, MARKER } from './install-skills.mjs'

const SCRIPT = new URL('./install-skills.mjs', import.meta.url).pathname
const dirs = []
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'install-test-')); dirs.push(d); return d }
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const sh = (cwd, ...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim() }
const put = (file, text) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, text) }
const fm = (name, body = 'body') => `---\nname: ${name}\ndescription: Demo ${name}.\n---\n\n# ${name}\n\n${body}\n`

// A committed repo on main: `plain` (Claude only), `both` (declares Codex), `bad` (broken Codex declaration).
function makeRepo() {
  const repo = tmp()
  sh(repo, 'init', '-q', '-b', 'main')
  sh(repo, 'config', 'user.email', 't@t.t'); sh(repo, 'config', 'user.name', 't')
  put(join(repo, 'plain', 'SKILL.md'), fm('plain'))
  put(join(repo, 'plain', 'scripts', 'run.sh'), 'echo run\n')
  put(join(repo, 'both', 'SKILL.md'), fm('both'))
  put(join(repo, 'both', 'runtimes', 'codex.json'), JSON.stringify({ description: 'Both for Codex.', forbid: ['zzz-never'] }))
  put(join(repo, 'bad', 'SKILL.md'), fm('bad'))
  put(join(repo, 'bad', 'runtimes', 'codex.json'), '{ not json')
  put(join(repo, 'manual', 'SKILL.md'), fm('manual'))
  put(join(repo, 'manual', 'runtimes', 'codex.json'), JSON.stringify({ description: 'Manual.', forbid: ['zzz-never'] }))
  sh(repo, 'add', '-A'); sh(repo, 'commit', '-qm', 'init')
  return repo
}
const setup = () => {
  const repo = makeRepo()
  const roots = { claude: tmp(), codex: tmp() }
  const backupDir = tmp()
  const run = (extra = {}) => installSkills({ repo, roots, backupDir, sha: sh(repo, 'rev-parse', 'HEAD'), ...extra })
  return { repo, roots, backupDir, run }
}
const status = (results, runtime, skill) => results.find((r) => r.runtime === runtime && r.skill === skill)

describe('install', () => {
  test('replaces a differing installed copy, keeps the old one in the backup, writes the marker', () => {
    const { repo, roots, backupDir, run } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), fm('plain', 'old body'))
    put(join(roots.claude, 'plain', 'extra.txt'), 'leftover')
    const r = run()
    expect(status(r, 'claude', 'plain').status).toBe('installed')
    expect(readFileSync(join(roots.claude, 'plain', 'SKILL.md'), 'utf8')).toBe(fm('plain'))
    expect(existsSync(join(roots.claude, 'plain', 'extra.txt'))).toBe(false)
    expect(JSON.parse(readFileSync(join(roots.claude, 'plain', MARKER), 'utf8')).sha).toBe(sh(repo, 'rev-parse', 'HEAD'))
    const [stamp] = readdirSync(backupDir)
    expect(readFileSync(join(backupDir, stamp, 'claude', 'plain', 'extra.txt'), 'utf8')).toBe('leftover')
    expect(readdirSync(roots.claude).filter((n) => n.startsWith('.'))).toEqual([])
  })

  test('is idempotent: a second run changes nothing and makes no backup', () => {
    const { roots, backupDir, run } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    put(join(roots.codex, 'both', 'SKILL.md'), 'stale')
    run()
    const before = [...digest(join(roots.claude, 'plain'))]
    const markerBefore = readFileSync(join(roots.claude, 'plain', MARKER), 'utf8')
    const r = run()
    expect(r.every((x) => ['current', 'skip'].includes(x.status))).toBe(true)
    expect([...digest(join(roots.claude, 'plain'))]).toEqual(before)
    expect(readFileSync(join(roots.claude, 'plain', MARKER), 'utf8')).toBe(markerBefore)
    expect(readdirSync(backupDir)).toHaveLength(1)
  })

  test('never installs a skill that is not installed yet', () => {
    const { roots, run } = setup()
    run()
    expect(readdirSync(roots.claude)).toEqual([])
    expect(readdirSync(roots.codex)).toEqual([])
  })

  test('builds each runtime from the same source: Codex gets its variant, Claude the plain one', () => {
    const { roots, run } = setup()
    put(join(roots.claude, 'both', 'SKILL.md'), 'stale')
    put(join(roots.codex, 'both', 'SKILL.md'), 'stale')
    run()
    expect(readFileSync(join(roots.claude, 'both', 'SKILL.md'), 'utf8')).toContain('description: Demo both.')
    expect(readFileSync(join(roots.codex, 'both', 'SKILL.md'), 'utf8')).toContain('Both for Codex.')
    expect(existsSync(join(roots.codex, 'both', MARKER))).toBe(true)
    expect(existsSync(join(roots.claude, 'both', MARKER))).toBe(true)
  })

  test('content already current but marker missing: only the marker is written', () => {
    const { roots, run } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    run()
    rmSync(join(roots.claude, 'plain', MARKER))
    const r = run()
    expect(status(r, 'claude', 'plain').status).toBe('marker')
    expect(existsSync(join(roots.claude, 'plain', MARKER))).toBe(true)
  })

  test('OS noise in the installed copy is not a difference', () => {
    const { roots, run } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    run()
    put(join(roots.claude, 'plain', '.DS_Store'), 'x')
    put(join(roots.claude, 'plain', 'scripts', '__pycache__', 'a.pyc'), 'x')
    expect(status(run(), 'claude', 'plain').status).toBe('current')
  })

  test('bytecode caches and .DS_Store from the source checkout are not installed', () => {
    const { repo, roots, run } = setup()
    put(join(repo, 'plain', 'scripts', '__pycache__', 'a.pyc'), 'x')
    put(join(repo, 'plain', '.DS_Store'), 'x')
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    run()
    expect(existsSync(join(roots.claude, 'plain', 'scripts', '__pycache__'))).toBe(false)
    expect(existsSync(join(roots.claude, 'plain', '.DS_Store'))).toBe(false)
    expect(existsSync(join(roots.claude, 'plain', 'scripts', 'run.sh'))).toBe(true)
  })

  test('dry run reports the plan and writes nothing', () => {
    const { roots, backupDir, run } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    const r = run({ dryRun: true })
    expect(status(r, 'claude', 'plain').status).toBe('installed')
    expect(readFileSync(join(roots.claude, 'plain', 'SKILL.md'), 'utf8')).toBe('stale')
    expect(existsSync(join(roots.claude, 'plain', MARKER))).toBe(false)
    expect(readdirSync(backupDir)).toEqual([])
  })
})

describe('what it leaves alone', () => {
  test('symlinks, git clones, skipped entries and skills this repo does not own', () => {
    const { roots, run } = setup()
    const elsewhere = tmp()
    put(join(elsewhere, 'SKILL.md'), 'linked original')
    symlinkSync(elsewhere, join(roots.claude, 'plain'))
    put(join(roots.claude, 'both', 'SKILL.md'), 'clone')
    mkdirSync(join(roots.claude, 'both', '.git'))
    put(join(roots.codex, 'manual', 'SKILL.md'), 'hand written')
    put(join(roots.claude, 'foreign', 'SKILL.md'), 'not ours')
    const r = run({ skip: { 'codex:manual': 'hand written' } })
    expect(status(r, 'claude', 'plain')).toMatchObject({ status: 'skip', detail: 'symlink' })
    expect(status(r, 'claude', 'both').status).toBe('skip')
    expect(status(r, 'codex', 'manual')).toMatchObject({ status: 'skip', detail: 'hand written' })
    expect(status(r, 'claude', 'foreign')).toBeUndefined()
    expect(readFileSync(join(elsewhere, 'SKILL.md'), 'utf8')).toBe('linked original')
    expect(readFileSync(join(roots.claude, 'both', 'SKILL.md'), 'utf8')).toBe('clone')
    expect(readFileSync(join(roots.codex, 'manual', 'SKILL.md'), 'utf8')).toBe('hand written')
  })

  test('a skill with no Codex declaration is skipped on Codex', () => {
    const { roots, run } = setup()
    put(join(roots.codex, 'plain', 'SKILL.md'), 'hand written')
    const r = run()
    expect(status(r, 'codex', 'plain').status).toBe('skip')
    expect(readFileSync(join(roots.codex, 'plain', 'SKILL.md'), 'utf8')).toBe('hand written')
  })

  test('the shipped skip list keeps meta-govern off Codex', () => {
    const skip = readSkip(new URL('..', import.meta.url).pathname)
    expect(Object.keys(skip)).toContain('codex:meta-govern')
  })

  test('a skip entry without a reason is an error', () => {
    const repo = tmp()
    put(join(repo, 'scripts', 'install-skills.skip.json'), JSON.stringify({ 'codex:x': ' ' }))
    expect(() => readSkip(repo)).toThrow(/no reason/)
  })
})

describe('failures', () => {
  test('a broken build is reported, the other skills still install, the broken one is untouched', () => {
    const { roots, run } = setup()
    put(join(roots.codex, 'bad', 'SKILL.md'), 'keep me')
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    put(join(roots.codex, 'both', 'SKILL.md'), 'stale')
    const r = run()
    expect(status(r, 'codex', 'bad').status).toBe('error')
    expect(readFileSync(join(roots.codex, 'bad', 'SKILL.md'), 'utf8')).toBe('keep me')
    expect(status(r, 'claude', 'plain').status).toBe('installed')
    expect(status(r, 'codex', 'both').status).toBe('installed')
  })
})

describe('swap failure', () => {
  test('an unwritable backup dir leaves the installed copy intact and no staging dir behind', () => {
    const { roots, run } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    const notADir = join(tmp(), 'file')
    writeFileSync(notADir, 'x')
    const r = run({ backupDir: notADir })
    expect(status(r, 'claude', 'plain').status).toBe('error')
    expect(readFileSync(join(roots.claude, 'plain', 'SKILL.md'), 'utf8')).toBe('stale')
    expect(readdirSync(roots.claude)).toEqual(['plain'])
  })
})

describe('repo guards and CLI', () => {
  const cli = (repo, roots, backupDir, ...extra) => spawnSync(process.execPath, [SCRIPT, '--repo', repo, '--claude-root', roots.claude, '--codex-root', roots.codex, '--backup-dir', backupDir, ...extra], { encoding: 'utf8' })

  test('repoState flags a feature branch and uncommitted changes', () => {
    const { repo } = setup()
    expect(repoState(repo).problems).toEqual([])
    writeFileSync(join(repo, 'plain', 'SKILL.md'), 'edited')
    expect(repoState(repo).problems.join()).toMatch(/uncommitted/)
    sh(repo, 'checkout', '-q', '-b', 'feat/x')
    expect(repoState(repo).problems.join()).toMatch(/not main/)
  })

  test('a real run on a dirty repo exits 2 and installs nothing, --allow-unclean proceeds', () => {
    const { repo, roots, backupDir } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    writeFileSync(join(repo, 'plain', 'SKILL.md'), fm('plain', 'edited'))
    const refused = cli(repo, roots, backupDir)
    expect(refused.status).toBe(2)
    expect(readFileSync(join(roots.claude, 'plain', 'SKILL.md'), 'utf8')).toBe('stale')
    const forced = cli(repo, roots, backupDir, '--allow-unclean')
    expect(forced.status).toBe(0)
    expect(readFileSync(join(roots.claude, 'plain', 'SKILL.md'), 'utf8')).toContain('edited')
  })

  test('--dry-run on a dirty repo prints the plan and a note, exit 0, no change', () => {
    const { repo, roots, backupDir } = setup()
    put(join(roots.claude, 'plain', 'SKILL.md'), 'stale')
    writeFileSync(join(repo, 'plain', 'SKILL.md'), fm('plain', 'edited'))
    const r = cli(repo, roots, backupDir, '--dry-run')
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/NOTE a real run would refuse/)
    expect(r.stdout).toMatch(/INSTALLED claude plain/)
    expect(readFileSync(join(roots.claude, 'plain', 'SKILL.md'), 'utf8')).toBe('stale')
  })

  test('exit 1 when a skill fails', () => {
    const { repo, roots, backupDir } = setup()
    put(join(roots.codex, 'bad', 'SKILL.md'), 'x')
    expect(cli(repo, roots, backupDir).status).toBe(1)
  })
})
