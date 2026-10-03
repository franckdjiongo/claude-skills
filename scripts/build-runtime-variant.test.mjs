import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildSkillMd, buildVariant, NotDeclaredError, VariantError } from './build-runtime-variant.mjs'

const SCRIPT = new URL('./build-runtime-variant.mjs', import.meta.url).pathname
const REAL_SKILL = new URL('../adversarial-pr-review', import.meta.url).pathname
const dirs = []
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'variant-test-')); dirs.push(d); return d }
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const SOURCE = `---
name: demo
description: >-
  Claude description.
---

# Demo

## Engine
<!-- runtime-slot:engine -->
Use the Workflow tool with model:'sonnet'.
<!-- /runtime-slot:engine -->

## Rest
Keep this line and \`.claude/agents/\` exactly.
`

function skill({ source = SOURCE, codexMd, codexJson } = {}) {
  const d = tmp()
  writeFileSync(join(d, 'SKILL.md'), source)
  mkdirSync(join(d, 'scripts'))
  writeFileSync(join(d, 'scripts', 'helper.mjs'), '// helper\n')
  if (codexMd !== undefined || codexJson !== undefined) mkdirSync(join(d, 'runtimes'))
  if (codexMd !== undefined) writeFileSync(join(d, 'runtimes', 'codex.md'), codexMd)
  if (codexJson !== undefined) writeFileSync(join(d, 'runtimes', 'codex.json'), JSON.stringify(codexJson))
  return d
}
const MD = '<!-- slot:engine -->\nUse spawn_agent.\n<!-- /slot:engine -->\n'
const JSON_OK = { description: 'Codex description.', forbid: ["'sonnet'"] }

describe('claude variant', () => {
  test('is the source with slot marker lines removed and nothing else changed', () => {
    const out = buildSkillMd(skill(), 'claude')
    expect(out).toBe(SOURCE.replace('<!-- runtime-slot:engine -->\n', '').replace('<!-- /runtime-slot:engine -->\n', ''))
  })
})

describe('codex variant', () => {
  test('swaps slots, rewrites the description, keeps other text byte for byte', () => {
    const out = buildSkillMd(skill({ codexMd: MD, codexJson: JSON_OK }), 'codex')
    expect(out).toContain('Use spawn_agent.')
    expect(out).not.toContain('Workflow tool')
    expect(out).toContain('description: >-\n  Codex description.')
    expect(out).toContain('Keep this line and `.claude/agents/` exactly.')
  })

  test('a declared heading rename is applied and accepted by the heading check', () => {
    const out = buildSkillMd(skill({ codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## Engine': '## Moteur' } } }), 'codex')
    expect(out).toContain('\n## Moteur\n')
    expect(out).not.toContain('## Engine')
  })

  test('an undeclared skill is NotDeclared, never a blind copy', () => {
    expect(() => buildSkillMd(skill(), 'codex')).toThrow(NotDeclaredError)
  })

  const failures = [
    ['slot without Codex text', { codexMd: '', codexJson: JSON_OK }, 'has no Codex text'],
    ['unknown Codex slot', { codexMd: MD + '<!-- slot:ghost -->\nx\n<!-- /slot:ghost -->\n', codexJson: JSON_OK }, 'unknown slot "ghost"'],
    ['replace count mismatch', { codexMd: MD, codexJson: { ...JSON_OK, replace: [{ from: 'Keep this', to: 'K', count: 2 }] } }, 'expected 2 match(es), found 1'],
    ['forbidden string left', { codexMd: MD, codexJson: { ...JSON_OK, forbid: ['Keep this line'] } }, 'forbidden string'],
    ['dated model name', { codexMd: '<!-- slot:engine -->\nuse gpt-6-sol\n<!-- /slot:engine -->\n', codexJson: JSON_OK }, 'dated model name'],
    ['broken .Codex/ path', { codexMd: MD, codexJson: { ...JSON_OK, replace: [{ from: '.claude/', to: '.Codex/', count: 1 }] } }, '".Codex/"'],
    ['heading changed', { codexMd: '<!-- slot:engine -->\n## Extra\n<!-- /slot:engine -->\n', codexJson: JSON_OK }, 'headings differ'],
    ['heading rename that matches nothing', { codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## Nope': '## New' } } }, 'expected 1 heading, found 0'],
  ]
  for (const [name, opts, message] of failures) {
    test(`fails on ${name}`, () => {
      expect(() => buildSkillMd(skill(opts), 'codex')).toThrow(message)
    })
  }

  for (const [name, source, message] of [
    ['unclosed slot', '<!-- runtime-slot:a -->\nx\n', 'never closed'],
    ['nested slot', '<!-- runtime-slot:a -->\n<!-- runtime-slot:b -->\n', 'opens inside'],
    ['mismatched close', '<!-- runtime-slot:a -->\n<!-- /runtime-slot:b -->\n', 'unexpected close'],
    ['duplicate slot', '<!-- runtime-slot:a -->\n<!-- /runtime-slot:a -->\n<!-- runtime-slot:a -->\n<!-- /runtime-slot:a -->\n', 'appears twice'],
  ]) {
    test(`rejects ${name} in SKILL.md`, () => {
      expect(() => buildSkillMd(skill({ source }), 'claude')).toThrow(message)
    })
  }

  test('buildVariant copies the folder, drops runtimes/, writes the variant', () => {
    const out = join(tmp(), 'out')
    buildVariant(skill({ codexMd: MD, codexJson: JSON_OK }), 'codex', out)
    expect(readdirSync(out).sort()).toEqual(['SKILL.md', 'scripts'])
    expect(existsSync(join(out, 'scripts', 'helper.mjs'))).toBe(true)
    expect(readFileSync(join(out, 'SKILL.md'), 'utf8')).toContain('Use spawn_agent.')
  })

  test('buildVariant refuses a non-empty output dir', () => {
    const out = tmp()
    writeFileSync(join(out, 'x'), '')
    expect(() => buildVariant(skill({ codexMd: MD, codexJson: JSON_OK }), 'codex', out)).toThrow(VariantError)
  })
})

describe('CLI exit codes (the workstation rail relies on them)', () => {
  const run = (args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' })
  test('0 on success', () => {
    expect(run(['--skill', skill({ codexMd: MD, codexJson: JSON_OK }), '--runtime', 'codex', '--check']).status).toBe(0)
  })
  test('3 when the skill declares no Codex variant', () => {
    expect(run(['--skill', skill(), '--runtime', 'codex', '--check']).status).toBe(3)
  })
  test('1 on a validation failure', () => {
    const r = run(['--skill', skill({ codexMd: '', codexJson: JSON_OK }), '--runtime', 'codex', '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('FAILED:')
  })
  test('1 on invalid codex.json', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'runtimes', 'codex.json'), '{oops')
    expect(run(['--skill', d, '--runtime', 'codex', '--check']).status).toBe(1)
  })
  test('2 on missing arguments', () => {
    expect(run(['--runtime', 'codex']).status).toBe(2)
  })
})

describe('every skill of this repo that declares a Codex variant', () => {
  const root = new URL('..', import.meta.url).pathname
  const declared = readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(root, e.name, 'runtimes', 'codex.json')))
    .map((e) => e.name)

  test('includes the two skills ported so far', () => {
    expect(declared).toEqual(expect.arrayContaining(['adversarial-pr-review', 'brief-preflight']))
  })

  for (const name of declared) {
    test(`${name}: Codex variant builds; Claude variant is the source minus marker lines`, () => {
      const dir = join(root, name)
      expect(() => buildSkillMd(dir, 'codex')).not.toThrow()
      const source = readFileSync(join(dir, 'SKILL.md'), 'utf8')
      expect(buildSkillMd(dir, 'claude')).toBe(source.split('\n').filter((l) => !/^<!-- \/?runtime-slot:/.test(l)).join('\n'))
    })
  }
})

describe('adversarial-pr-review (real skill)', () => {

  test('Codex template runs with resolved roles pinned on every agent', async () => {
    const codex = buildSkillMd(REAL_SKILL, 'codex')
    let template = codex.match(/```js\n([\s\S]*?)\n```/)[1]
    template = template.replace('export const meta', 'const meta')
      .replace("const HUNTER = { model: '<review-hunter model>', effort: '<review-hunter effort>' }", "const HUNTER = { model: 'm-hunt', effort: 'medium' }")
      .replace("const VERIFIER = { model: '<review-verifier model>', effort: '<review-verifier effort>' }", "const VERIFIER = { model: 'm-verify', effort: 'high' }")
      .replace('const INVENTORY_COMPLETE = false', 'const INVENTORY_COMPLETE = true')
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const calls = []
    const finding = { title: 't', file: 'a.ts', line: '1', class: 'correctness', severity: 'P1', scenario: 's', suggestedFix: 'f' }
    const agent = async (prompt, options) => {
      calls.push(options)
      return options.phase === 'Hunt'
        ? { findings: [finding], sweeps: [{ target: 'x', sitesChecked: ['a.ts:1'], verdict: 'finding-filed', findingRef: 't' }], residualRisk: 'none' }
        : { mustFix: true, class: 'correctness', checksPerformed: ['c → o'], reasoning: 'r' }
    }
    const result = await new AsyncFunction('phase', 'pipeline', 'parallel', 'agent', template)(
      () => {},
      async (items, hunt, verify) => Promise.all(items.map(async (d) => verify(await hunt(d)))),
      (tasks) => Promise.all(tasks.map((t) => t())),
      agent,
    )
    expect(result.verdict).toBe('FINDINGS')
    const hunts = calls.filter((c) => c.phase === 'Hunt'), verifies = calls.filter((c) => c.phase === 'Verify')
    expect(hunts.length).toBeGreaterThan(0)
    expect(verifies.length).toBe(hunts.length)
    expect(hunts.every((c) => c.model === 'm-hunt' && c.effort === 'medium')).toBe(true)
    expect(verifies.every((c) => c.model === 'm-verify' && c.effort === 'high')).toBe(true)
  })
})
