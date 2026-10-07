import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { evaluateProject, compareSemver, parseSemver, isConvexProject } from './projects-behind.mjs'

const SKILL_DIR = dirname(dirname(new URL(import.meta.url).pathname))
const BEHIND = join(SKILL_DIR, 'scripts/projects-behind.mjs')
const AUDIT = join(SKILL_DIR, 'scripts/audit-project.mjs')
const TODAY = new Date('2026-10-07T12:00:00Z')

const dirs = []
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'meta-govern-test-')); dirs.push(d); return d }
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

function project(root, name, { state, convex = false, files = {} } = {}) {
  const dir = join(root, name)
  mkdirSync(join(dir, '.claude'), { recursive: true })
  if (state) writeFileSync(join(dir, '.claude/.meta-govern.json'), JSON.stringify(state, null, 2) + '\n')
  if (convex) {
    mkdirSync(join(dir, 'convex'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, dependencies: { convex: '^1.0.0' } }))
  }
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true })
    writeFileSync(join(dir, rel), content)
  }
  return dir
}

const run = (script, args) => spawnSync('node', [script, ...args], { encoding: 'utf8' })

describe('SKILL.md budget (rule R1)', () => {
  const text = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
  test('at most 150 lines', () => expect(text.split('\n').length).toBeLessThanOrEqual(150))
  test('at most 1800 words', () => expect(text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(1800))
  test('description at most 300 characters', () => {
    const m = text.match(/^description:\s*(.*)$/m)
    expect(m[1].length).toBeLessThanOrEqual(300)
  })
  test('names no retired sub-agent and no create-subagent', () => {
    for (const name of ['architect', 'project-analyzer', 'source-of-truth-scaffolder', 'hook-generator', 'scaffolder', 'workflow-validator', 'governance-auditor', 'create-subagent']) {
      expect(new RegExp(`\\b${name}\\b`).test(text)).toBe(false)
    }
  })
})

describe('semver helpers', () => {
  test('compares numerically, not lexically', () => {
    expect(compareSemver(parseSemver('1.9.0'), parseSemver('1.18.0'))).toBe(-1)
    expect(compareSemver(parseSemver('1.18.0'), parseSemver('1.18.0'))).toBe(0)
  })
  test('rejects garbage', () => expect(parseSemver('latest')).toBeNull())
})

describe('evaluateProject', () => {
  test('older version is flagged, equal version is not', () => {
    const root = tmp()
    const old = project(root, 'old', { state: { metaGovernVersion: '1.14.0', lastAudit: '2026-10-01' } })
    const cur = project(root, 'cur', { state: { metaGovernVersion: '1.19.0', lastAudit: '2026-10-01' } })
    expect(evaluateProject(old, '1.19.0', TODAY).reasons).toEqual(['version-behind'])
    expect(evaluateProject(cur, '1.19.0', TODAY).reasons).toEqual([])
  })

  test('missing version counts as behind', () => {
    const dir = project(tmp(), 'p', { state: { lastAudit: '2026-10-01' } })
    expect(evaluateProject(dir, '1.19.0', TODAY).reasons).toContain('version-behind')
  })

  test('never-audited and audit-stale, parked projects exempt from staleness', () => {
    const root = tmp()
    const never = project(root, 'never', { state: { metaGovernVersion: '1.19.0', lastAudit: null } })
    const stale = project(root, 'stale', { state: { metaGovernVersion: '1.19.0', lastAudit: '2026-08-01' } })
    const fresh = project(root, 'fresh', { state: { metaGovernVersion: '1.19.0', lastAudit: '2026-09-20' } })
    const parked = project(root, 'parked', { state: { metaGovernVersion: '1.19.0', lastAudit: '2026-01-01', parked: true } })
    expect(evaluateProject(never, '1.19.0', TODAY).reasons).toEqual(['never-audited'])
    expect(evaluateProject(stale, '1.19.0', TODAY).reasons).toEqual(['audit-stale'])
    expect(evaluateProject(fresh, '1.19.0', TODAY).reasons).toEqual([])
    expect(evaluateProject(parked, '1.19.0', TODAY).reasons).toEqual([])
  })

  test('no state file means not governed: null', () => {
    expect(evaluateProject(project(tmp(), 'bare'), '1.19.0', TODAY)).toBeNull()
  })

  test('Convex project with no evidence of the cost checks is flagged, even with a recent audit', () => {
    const dir = project(tmp(), 'cx', { convex: true, state: { metaGovernVersion: '1.19.0', lastAudit: '2026-10-01' } })
    expect(evaluateProject(dir, '1.19.0', TODAY).reasons).toEqual(['convex-cost-checks-missing'])
  })

  test('Convex flag clears with auditChecks evidence or with an audit report that names the check', () => {
    const root = tmp()
    const stamped = project(root, 'stamped', { convex: true, state: { metaGovernVersion: '1.19.0', lastAudit: '2026-10-01', auditChecks: ['core', 'convex-frugality'] } })
    const documented = project(root, 'documented', {
      convex: true,
      state: { metaGovernVersion: '1.19.0', lastAudit: '2026-10-01' },
      files: { 'docs/audits/2026-10-01-meta-govern-audit.html': '<p>convex-frugality: 0 findings</p>' },
    })
    expect(evaluateProject(stamped, '1.19.0', TODAY).reasons).toEqual([])
    expect(evaluateProject(documented, '1.19.0', TODAY).reasons).toEqual([])
  })

  test('non-Convex project is never flagged for the Convex checks', () => {
    const dir = project(tmp(), 'plain', { state: { metaGovernVersion: '1.19.0', lastAudit: '2026-10-01' } })
    expect(isConvexProject(dir)).toBe(false)
    expect(evaluateProject(dir, '1.19.0', TODAY).reasons).toEqual([])
  })
})

describe('projects-behind CLI', () => {
  test('lists every governed child of --root, skips --exclude without opening it, exit 1 when flagged', () => {
    const root = tmp()
    project(root, 'behind', { state: { metaGovernVersion: '0.0.1', lastAudit: '2020-01-01' } })
    project(root, 'excluded', { state: { metaGovernVersion: '0.0.1', lastAudit: '2020-01-01' } })
    project(root, 'ungoverned')
    const r = run(BEHIND, ['--root', root, '--exclude', 'excluded', '--json'])
    expect(r.status).toBe(1)
    const out = JSON.parse(r.stdout)
    expect(out.projects.map((p) => p.name)).toEqual(['behind'])
    expect(out.projects[0].reasons).toContain('version-behind')
  })

  test('exit 0 when nothing is flagged', () => {
    const root = tmp()
    const today = new Date().toISOString().slice(0, 10)
    project(root, 'ok', { state: { metaGovernVersion: '99.0.0', lastAudit: today } })
    expect(run(BEHIND, ['--root', root]).status).toBe(0)
  })

  test('explicit path without a state file is reported as skipped, not flagged', () => {
    const dir = project(tmp(), 'bare')
    const r = run(BEHIND, [dir, '--json'])
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout).skipped).toEqual([dir])
  })

  test('exit 2 on an unknown option', () => {
    expect(run(BEHIND, ['--nope']).status).toBe(2)
  })
})

describe('audit-project.mjs Convex cost checks', () => {
  const state = { metaGovernVersion: '1.19.0', lastAudit: '2026-10-01' }
  const audit = (dir) => JSON.parse(run(AUDIT, [dir, '--json', '--fail-level', 'critical']).stdout).findings.filter((f) => f.area === 'convex-frugality')

  test('cron without cost-justified is MEDIUM, with the marker it passes', () => {
    const bad = project(tmp(), 'bad', { convex: true, state, files: { 'convex/crons.ts': 'crons.interval("sync", { hours: 1 }, internal.x.y);\n' } })
    const good = project(tmp(), 'good', { convex: true, state, files: { 'convex/crons.ts': '// cost-justified: design 3.2\ncrons.interval("sync", { hours: 1 }, internal.x.y);\n' } })
    expect(audit(bad).map((f) => f.severity)).toEqual(['MEDIUM'])
    expect(audit(good)).toEqual([])
  })

  test('test file using ConvexHttpClient without convex-test is HIGH, with convex-test it passes', () => {
    const http = `import { ConvexHttpClient } from "convex/browser";\ntest("x", () => {});\n`
    const bad = project(tmp(), 'bad', { convex: true, state, files: { 'src/a.test.ts': http } })
    const good = project(tmp(), 'good', { convex: true, state, files: { 'src/a.test.ts': `import { convexTest } from "convex-test";\n` + http } })
    expect(audit(bad).map((f) => f.severity)).toEqual(['HIGH'])
    expect(audit(good)).toEqual([])
  })

  test('a non-Convex project gets no convex-frugality finding', () => {
    const dir = project(tmp(), 'plain', { state, files: { 'convex/crons.ts': 'crons.interval("sync", {}, x);\n' } })
    expect(audit(dir)).toEqual([])
  })
})

describe('audit-project.mjs --stamp', () => {
  const state = { metaGovernVersion: '1.19.0', lastAudit: '2026-01-01', palier: 3, custom: { keep: true } }
  const read = (dir) => JSON.parse(readFileSync(join(dir, '.claude/.meta-govern.json'), 'utf8'))
  const version = JSON.parse(readFileSync(join(SKILL_DIR, 'version.json'), 'utf8')).version

  test('records the audit for a Convex project, preserves other keys, clears the BEHIND flag', () => {
    const dir = project(tmp(), 'cx', { convex: true, state, files: { 'convex/crons.ts': '// cost-justified: d\ncrons.interval("s", {}, x);\n' } })
    expect(evaluateProject(dir, version, TODAY).reasons).toContain('convex-cost-checks-missing')
    run(AUDIT, [dir, '--stamp', '--fail-level', 'critical'])
    const after = read(dir)
    expect(after.lastAudit).toBe(new Date().toISOString().slice(0, 10))
    expect(after.lastAuditVersion).toBe(version)
    expect(after.auditChecks).toEqual(['core', 'convex-frugality'])
    expect(after.palier).toBe(3)
    expect(after.custom).toEqual({ keep: true })
    expect(evaluateProject(dir, version, new Date()).reasons).not.toContain('convex-cost-checks-missing')
  })

  test('a non-Convex project is stamped without the Convex check', () => {
    const dir = project(tmp(), 'plain', { state })
    run(AUDIT, [dir, '--stamp', '--fail-level', 'critical'])
    expect(read(dir).auditChecks).toEqual(['core'])
  })

  test('without a state file it writes nothing and exits 2', () => {
    const dir = project(tmp(), 'bare')
    const r = run(AUDIT, [dir, '--stamp'])
    expect(r.status).toBe(2)
    expect(existsSync(join(dir, '.claude/.meta-govern.json'))).toBe(false)
  })

  test('without --stamp the state file is untouched', () => {
    const dir = project(tmp(), 'plain', { state })
    const before = readFileSync(join(dir, '.claude/.meta-govern.json'), 'utf8')
    run(AUDIT, [dir, '--fail-level', 'critical'])
    expect(readFileSync(join(dir, '.claude/.meta-govern.json'), 'utf8')).toBe(before)
  })
})
