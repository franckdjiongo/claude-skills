// Run: node --test scripts/lint-skills.test.mjs
// Fixtures are built in a temp HOME so the test never reads the real machine.
import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runLint, defaultConfig, extractSkillRefs, extractCatalogBullets, extractFileRefs, parseFrontmatter, isExcludedPath, loadAllowlist, formatReport } from './lint-skills.mjs'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'lint-skills.mjs')
const roots = []
afterEach(() => { while (roots.length) rmSync(roots.pop(), { recursive: true, force: true }) })

function put(root, rel, content) {
  const p = join(root, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
}

const FM = (name, extra = '') => `---\nname: ${name}\ndescription: Short description for ${name}.\nowner: claude-skills\nruntimes: claude, codex\nlast-review: 2026-10-07\n${extra}---\n\n# ${name}\n\nBody.\n`

/** A clean world: one skill on both runtimes, a catalog that names it, two projects. */
function world(opts = {}) {
  const base = mkdtempSync(join(tmpdir(), 'lint-skills-'))
  roots.push(base)
  const home = join(base, 'home')
  const repo = join(base, 'projects', 'claude-skills')
  const projects = join(base, 'projects')
  put(home, '.claude/skills/alpha/SKILL.md', FM('alpha'))
  put(home, '.agents/skills/alpha/SKILL.md', FM('alpha'))
  put(home, '.claude/settings.json', JSON.stringify({ skillOverrides: opts.overrides || {}, enabledPlugins: {} }))
  put(home, '.claude/agents/machine-architecte.md', opts.architecte || '| Plan | repo | skill `alpha` |\n')
  put(repo, 'alpha/SKILL.md', FM('alpha'))
  put(repo, 'CLAUDE.md', opts.claudeMd || '# Repo\n\n## Skill Categories\n\n**X**\n- `alpha` - does alpha\n\n## Creating New Skills\n- `not-a-skill` - ignored outside the section\n')
  put(repo, 'AGENTS.md', opts.agentsMd || '# Repo\n\n## Skill Categories\n\n- `alpha` - does alpha\n')
  put(repo, 'scripts/lint-skills.allowlist.json', JSON.stringify(opts.allowlist || {}))
  put(projects, 'app/CLAUDE.md', opts.projectMd || '# App\n\nUse skill `alpha` for this.\n')
  if (opts.files) for (const [rel, c] of Object.entries(opts.files)) put(base, rel, c)
  const cfg = defaultConfig({ home, repoRoot: repo, projectsRoot: projects, allowlistPath: join(repo, 'scripts', 'lint-skills.allowlist.json') })
  return { base, home, repo, projects, cfg }
}

const rules = (res) => res.findings.map((f) => f.rule)
const errors = (res) => res.findings.filter((f) => f.severity === 'error')

describe('clean world', () => {
  test('no finding at all', () => {
    const w = world()
    const res = runLint(w.cfg)
    assert.deepEqual(res.findings, [])
  })
})

describe('catalog references (R11)', () => {
  test('CAT-MISSING for a bullet whose skill does not exist, in both CLAUDE.md and AGENTS.md', () => {
    const w = world({
      claudeMd: '## Skill Categories\n- `alpha` - ok\n- `ghost` - gone\n',
      agentsMd: '## Skill Categories\n- `alpha` - ok\n- `ghost` - gone\n',
    })
    const res = runLint(w.cfg)
    const missing = res.findings.filter((f) => f.rule === 'CAT-MISSING')
    assert.equal(missing.length, 2)
    assert.ok(missing.every((f) => f.skill === 'ghost'))
  })

  test('bullets outside the Skill Categories section are not catalog entries', () => {
    const w = world({ claudeMd: '## Other\n- `ghost` - not a skill line\n## Skill Categories\n- `alpha` - ok\n' })
    assert.deepEqual(rules(runLint(w.cfg)), [])
  })

  test('CAT-DISABLED when skillOverrides switches the skill off', () => {
    const w = world({ overrides: { alpha: 'off' } })
    const res = runLint(w.cfg)
    const dis = res.findings.filter((f) => f.rule === 'CAT-DISABLED')
    assert.ok(dis.length >= 3, 'CLAUDE.md, AGENTS.md, architecte and project all name alpha')
  })

  test('machine-architecte: chain of skills, a wildcard with no match is missing', () => {
    const w = world({ architecte: '| a | b | skills `alpha`, `beta`, `gam-*` |\n| c | d | skill `alpha` (note) · `delta` |\n' })
    const res = runLint(w.cfg)
    const missing = res.findings.filter((f) => f.rule === 'CAT-MISSING').map((f) => f.skill).sort()
    assert.deepEqual(missing, ['beta', 'delta', 'gam-*'])
  })

  test('a wildcard that matches an installed skill resolves', () => {
    const w = world({ architecte: '| a | b | skills `alp*` |\n' })
    assert.deepEqual(rules(runLint(w.cfg)), [])
  })

  test('a library-only skill is not installed, so a project catalog naming it is CAT-MISSING', () => {
    const w = world({ projectMd: 'Use skill `libonly`.\n', files: { 'projects/claude-skills/libonly/SKILL.md': FM('libonly') } })
    const res = runLint(w.cfg)
    assert.ok(res.findings.some((f) => f.rule === 'CAT-MISSING' && f.skill === 'libonly'))
  })

  test('a project-local skill resolves a project catalog', () => {
    const w = world({ projectMd: 'See `.claude/skills/localone` and skill `alpha`.\n', files: { 'projects/app/.claude/skills/localone/SKILL.md': FM('localone'), 'projects/app/.agents/skills/localone/SKILL.md': FM('localone') } })
    assert.deepEqual(rules(runLint(w.cfg)), [])
  })

  test('hard-excluded repos are never read', () => {
    const bad = 'Use skill `phantom-skill`.\n'
    const w = world({ files: {
      'projects/groupe-gilbert/CLAUDE.md': bad,
      'projects/TempsChantier/CLAUDE.md': bad,
      'projects/temps-chantier-code-app/CLAUDE.md': bad,
      'projects/temps-chantier-code-app-qa-archive/CLAUDE.md': bad,
      'projects/gilbert-tools/CLAUDE.md': bad,
      'projects/groupe-gilbert/.claude/skills/big/SKILL.md': `---\nname: big\ndescription: x\n---\n${'word '.repeat(5000)}`,
    } })
    const res = runLint(w.cfg)
    assert.deepEqual(res.findings, [])
    assert.ok(!JSON.stringify(res).toLowerCase().includes('gilbert'))
  })

  test('isExcludedPath', () => {
    assert.ok(isExcludedPath('/x/groupe-gilbert'))
    assert.ok(isExcludedPath('/x/TempsChantier/a'))
    assert.ok(isExcludedPath('/x/temps-chantier-code-app-qa-archive'))
    assert.ok(!isExcludedPath('/x/temps-chantier-notes'))
    assert.ok(!isExcludedPath('/x/second-brain'))
  })
})

describe('extractors', () => {
  test('extractSkillRefs patterns', () => {
    const t = [
      'Le skill projet **`govern-claude`** audite.',
      'skill unifié `workstation`.',
      'Use `frontend-design` skill for UI.',
      'Skills de workflow : `.claude/skills/{brainstorm,write-plan}`',
      'skill `a` et `b`, puis `bun run test` (pas un skill)',
      'ordinary `code` word',
    ].join('\n')
    const names = extractSkillRefs(t).map((r) => r.name)
    for (const n of ['govern-claude', 'workstation', 'frontend-design', 'brainstorm', 'write-plan', 'a', 'b']) assert.ok(names.includes(n), n)
    assert.ok(!names.includes('code'))
    assert.ok(!names.includes('bun run test'))
  })

  test('extractCatalogBullets reads only the Skill Categories section', () => {
    const got = extractCatalogBullets('## A\n- `x` - no\n## Skill Categories\n**C**\n- `one` - d\n- `two` – d\n## B\n- `y` - no\n')
    assert.deepEqual(got.map((g) => g.name), ['one', 'two'])
  })

  test('extractFileRefs ignores globs, placeholders and absolute prefixes', () => {
    const t = 'See `references/a.md`, [x](./b.md), `scripts/<name>.sh`, `~/.claude/skills/z/scripts/q.py`, `${ROOT}/references/n.md`, `references/*.md`.'
    assert.deepEqual(extractFileRefs(t).sort(), ['./b.md', 'references/a.md'])
  })

  test('parseFrontmatter handles folded, literal and quoted values', () => {
    const fm = parseFrontmatter('---\nname: x\ndescription: >-\n  one two\n  three\nowner: me\nnote: "quoted"\n---\nbody')
    assert.equal(fm.fields.description, 'one two three')
    assert.equal(fm.fields.note, 'quoted')
    assert.ok(/owner/.test(fm.raw))
  })
})

describe('Codex path', () => {
  test('CODEX-PATH in a skill file', () => {
    const w = world({ files: { 'home/.agents/skills/alpha/references/x.md': 'cp .Codex/agents/a.md here' } })
    const res = runLint(w.cfg)
    assert.ok(res.findings.some((f) => f.rule === 'CODEX-PATH' && f.skill === 'alpha'))
  })
  test('CODEX-PATH in a catalog unless the allowlist gives a reason', () => {
    const md = '## Skill Categories\n- `alpha` - ok\nBug: left `.Codex/` paths.\n'
    const bad = runLint(world({ claudeMd: md }).cfg)
    assert.ok(bad.findings.some((f) => f.rule === 'CODEX-PATH'))
    const ok = runLint(world({ claudeMd: md, allowlist: { ignoreCodexPath: { 'CLAUDE.md': 'quoted on purpose' } } }).cfg)
    assert.ok(!ok.findings.some((f) => f.rule === 'CODEX-PATH'))
  })
})

describe('runtime parity', () => {
  test('RUNTIME-ONE-SIDE without a reason is an error, with a reason it passes', () => {
    const files = { 'home/.claude/skills/solo/SKILL.md': FM('solo') }
    const bad = runLint(world({ files }).cfg)
    assert.ok(bad.findings.some((f) => f.rule === 'RUNTIME-ONE-SIDE' && f.skill === 'solo'))
    const ok = runLint(world({ files, allowlist: { runtimeOnly: { solo: 'Claude-only by design' } } }).cfg)
    assert.ok(!ok.findings.some((f) => f.rule === 'RUNTIME-ONE-SIDE'))
  })

  test('an allowlist entry without a reason is itself an error', () => {
    const res = runLint(world({ files: { 'home/.claude/skills/solo/SKILL.md': FM('solo') }, allowlist: { runtimeOnly: { solo: '' } } }).cfg)
    assert.ok(res.findings.some((f) => f.rule === 'ALLOWLIST'))
    assert.ok(res.findings.some((f) => f.rule === 'RUNTIME-ONE-SIDE'), 'an empty reason does not exempt')
  })

  test('SCRIPT-DIFF when scripts differ, none when identical', () => {
    const same = runLint(world({ files: { 'home/.claude/skills/alpha/scripts/run.sh': 'echo 1', 'home/.agents/skills/alpha/scripts/run.sh': 'echo 1' } }).cfg)
    assert.ok(!same.findings.some((f) => f.rule === 'SCRIPT-DIFF'))
    const diff = runLint(world({ files: { 'home/.claude/skills/alpha/scripts/run.sh': 'echo 1', 'home/.agents/skills/alpha/scripts/run.sh': 'echo 2', 'home/.agents/skills/alpha/scripts/extra.sh': 'x' } }).cfg)
    const f = diff.findings.find((x) => x.rule === 'SCRIPT-DIFF')
    assert.ok(f && /run\.sh \(differs\)/.test(f.message) && /extra\.sh \(Codex only\)/.test(f.message))
  })

  test('a project that ships one runtime only yields one finding for the project', () => {
    const w = world({ files: { 'projects/app/.claude/skills/a/SKILL.md': FM('a'), 'projects/app/.claude/skills/b/SKILL.md': FM('b') } })
    const res = runLint(w.cfg)
    const hits = res.findings.filter((f) => f.rule === 'RUNTIME-ONE-SIDE')
    assert.equal(hits.length, 1)
    assert.equal(hits[0].where, 'project:app')
  })
})

describe('size and description limits (R1, R7)', () => {
  const long = (n) => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n')
  test('R1-LINES over 150 lines, R1-WORDS over 1800 words', () => {
    const lines = `${FM('alpha')}${long(160)}\n`
    const words = `${FM('alpha')}${'w '.repeat(1900)}\n`
    const a = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': lines, 'home/.agents/skills/alpha/SKILL.md': lines } }).cfg)
    assert.ok(a.findings.some((f) => f.rule === 'R1-LINES'))
    const b = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': words, 'home/.agents/skills/alpha/SKILL.md': words } }).cfg)
    assert.ok(b.findings.some((f) => f.rule === 'R1-WORDS'))
  })

  test('exactly 150 lines passes', () => {
    const head = FM('alpha')
    const n = 150 - head.split('\n').length + 1
    const body = `${head}${long(n)}\n`
    assert.equal(body.split('\n').length - 1, 150)
    const res = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': body, 'home/.agents/skills/alpha/SKILL.md': body } }).cfg)
    assert.ok(!res.findings.some((f) => f.rule === 'R1-LINES'))
  })

  test('a named exception gets its own cap', () => {
    const body = `${FM('alpha')}${long(175)}\n`
    const files = { 'home/.claude/skills/alpha/SKILL.md': body, 'home/.agents/skills/alpha/SKILL.md': body }
    const ok = runLint(world({ files, allowlist: { sizeExceptions: { alpha: { maxLines: 200, reason: 'scripts carry the procedure' } } } }).cfg)
    assert.ok(!ok.findings.some((f) => f.rule === 'R1-LINES'))
    const over = runLint(world({ files, allowlist: { sizeExceptions: { alpha: { maxLines: 180, reason: 'scripts carry the procedure' } } } }).cfg)
    assert.ok(over.findings.some((f) => f.rule === 'R1-LINES'))
  })

  test('R7-DESC over 300 characters, 300 exactly passes', () => {
    const mk = (n) => `---\nname: alpha\ndescription: ${'d'.repeat(n)}\nowner: o\nruntimes: r\nlast-review: x\n---\nbody\n`
    const bad = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': mk(301), 'home/.agents/skills/alpha/SKILL.md': mk(301) } }).cfg)
    assert.ok(bad.findings.some((f) => f.rule === 'R7-DESC'))
    const ok = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': mk(300), 'home/.agents/skills/alpha/SKILL.md': mk(300) } }).cfg)
    assert.ok(!ok.findings.some((f) => f.rule === 'R7-DESC'))
  })

  test('a folded description is measured after folding', () => {
    const md = `---\nname: alpha\ndescription: >-\n  ${'a'.repeat(150)}\n  ${'b'.repeat(151)}\nowner: o\nruntimes: r\nlast-review: x\n---\nbody\n`
    const res = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': md, 'home/.agents/skills/alpha/SKILL.md': md } }).cfg)
    const f = res.findings.find((x) => x.rule === 'R7-DESC')
    assert.ok(f && /302 chars/.test(f.message))
  })
})

describe('referenced files and owner fields', () => {
  test('REF-MISSING for a missing reference, none when it exists', () => {
    const md = `${FM('alpha')}Read \`references/guide.md\`.\n`
    const missing = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': md, 'home/.agents/skills/alpha/SKILL.md': md } }).cfg)
    assert.ok(missing.findings.some((f) => f.rule === 'REF-MISSING' && /references\/guide\.md/.test(f.message)))
    const present = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': md, 'home/.agents/skills/alpha/SKILL.md': md, 'home/.claude/skills/alpha/references/guide.md': 'x', 'home/.agents/skills/alpha/references/guide.md': 'x' } }).cfg)
    assert.ok(!present.findings.some((f) => f.rule === 'REF-MISSING'))
  })

  test('R9-OWNER is a warning and never fails the run', () => {
    const md = '---\nname: alpha\ndescription: short\n---\nbody\n'
    const res = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': md, 'home/.agents/skills/alpha/SKILL.md': md } }).cfg)
    const w = res.findings.find((f) => f.rule === 'R9-OWNER')
    assert.ok(w && w.severity === 'warning' && /owner, runtimes, last-review/.test(w.message))
    assert.equal(errors(res).length, 0)
  })

  test('owner fields nested under metadata count', () => {
    const md = '---\nname: alpha\ndescription: short\nmetadata:\n  owner: x\n  runtimes: both\n  last-review: 2026-10-07\n---\nbody\n'
    const res = runLint(world({ files: { 'home/.claude/skills/alpha/SKILL.md': md, 'home/.agents/skills/alpha/SKILL.md': md } }).cfg)
    assert.ok(!res.findings.some((f) => f.rule === 'R9-OWNER'))
  })
})

describe('CLI', () => {
  test('exit 0 on a clean world, 1 on an error, --json is parseable', () => {
    const clean = world()
    const args = (w) => [SCRIPT, '--home', w.home, '--repo', w.repo, '--projects', w.projects, '--allowlist', w.cfg.allowlistPath]
    const ok = spawnSync('node', args(clean), { encoding: 'utf8' })
    assert.equal(ok.status, 0, ok.stdout + ok.stderr)
    const dirty = world({ claudeMd: '## Skill Categories\n- `ghost` - gone\n' })
    const bad = spawnSync('node', [...args(dirty), '--json'], { encoding: 'utf8' })
    assert.equal(bad.status, 1)
    assert.ok(JSON.parse(bad.stdout).findings.some((f) => f.rule === 'CAT-MISSING'))
    const text = spawnSync('node', args(dirty), { encoding: 'utf8' })
    assert.match(text.stdout, /CAT-MISSING \[ERROR\]/)
  })

  test('loadAllowlist tolerates a missing file and formatReport summarises', () => {
    const a = loadAllowlist('/nonexistent/file.json')
    assert.deepEqual(a.runtimeOnly, {})
    const res = runLint(world().cfg)
    assert.match(formatReport(res), /0 error\(s\), 0 warning\(s\)/)
  })
})
