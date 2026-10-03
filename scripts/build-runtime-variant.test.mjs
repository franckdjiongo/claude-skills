import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, symlinkSync, readlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildSkillMd, buildVariant, parseSlots, slotHash, NotDeclaredError, VariantError } from './build-runtime-variant.mjs'

const SCRIPT = new URL('./build-runtime-variant.mjs', import.meta.url).pathname
const REPO_ROOT = new URL('..', import.meta.url).pathname
const REAL_SKILL = join(REPO_ROOT, 'adversarial-pr-review')
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
Keep this line and \`docs/agents/\` exactly.
`
const MD = '<!-- slot:engine -->\nUse spawn_agent.\n<!-- /slot:engine -->\n'
const JSON_OK = { description: 'Codex description.', forbid: ['model:'] }

// A skill folder; codex.json gets the stamps of the current SKILL.md unless `stamp: false`.
function skill({ source = SOURCE, codexMd, codexJson, stamp = true } = {}) {
  const d = tmp()
  writeFileSync(join(d, 'SKILL.md'), source)
  mkdirSync(join(d, 'scripts'))
  writeFileSync(join(d, 'scripts', 'helper.mjs'), '// helper\n')
  if (codexMd !== undefined || codexJson !== undefined) mkdirSync(join(d, 'runtimes'))
  if (codexMd !== undefined) writeFileSync(join(d, 'runtimes', 'codex.md'), codexMd)
  if (codexJson !== undefined) {
    let config = codexJson
    if (stamp && typeof codexJson === 'object') {
      let slotSources = {}
      try { slotSources = Object.fromEntries(parseSlots(source.replace(/\r\n/g, '\n')).filter((p) => p.slot).map((p) => [p.slot, slotHash(p.text)])) } catch {}
      config = { slotSources, ...codexJson }
    }
    writeFileSync(join(d, 'runtimes', 'codex.json'), typeof config === 'string' ? config : JSON.stringify(config))
  }
  return d
}
const codex = (opts) => buildSkillMd(skill(opts), 'codex')

describe('claude variant', () => {
  test('is the source with slot marker lines removed and nothing else changed', () => {
    expect(buildSkillMd(skill(), 'claude')).toBe(SOURCE.replace('<!-- runtime-slot:engine -->\n', '').replace('<!-- /runtime-slot:engine -->\n', ''))
  })
  test('CRLF sources are normalised, markers never leak', () => {
    const out = buildSkillMd(skill({ source: SOURCE.replace(/\n/g, '\r\n') }), 'claude')
    expect(out).not.toContain('runtime-slot')
    expect(out).not.toContain('\r')
  })
  test('a marker with trailing spaces is still a marker', () => {
    const out = buildSkillMd(skill({ source: SOURCE.replace('engine -->\n', 'engine -->  \n') }), 'claude')
    expect(out).not.toContain('runtime-slot')
  })
})

describe('codex variant', () => {
  test('swaps slots, rewrites the description, keeps other text byte for byte', () => {
    const out = codex({ codexMd: MD, codexJson: JSON_OK })
    expect(out).toContain('Use spawn_agent.')
    expect(out).not.toContain('Workflow tool')
    expect(out).toContain('description: >-\n  Codex description.')
    expect(out).toContain('Keep this line and `docs/agents/` exactly.')
  })

  test('an undeclared skill is NotDeclared, never a blind copy', () => {
    expect(() => buildSkillMd(skill(), 'codex')).toThrow(NotDeclaredError)
  })

  test('a declared heading rename is applied and accepted by the heading check', () => {
    const out = codex({ codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## Engine': '## Moteur' } } })
    expect(out).toContain('\n## Moteur\n')
    expect(out).not.toContain('## Engine')
  })

  test('dropFrontmatter removes Claude-only keys and their continuation lines', () => {
    const source = SOURCE.replace('---\n\n# Demo', 'allowed-tools:\n  - Bash(x)\nargument-hint: "<a>"\n---\n\n# Demo')
    const out = codex({ source, codexMd: MD, codexJson: { ...JSON_OK, dropFrontmatter: ['allowed-tools', 'argument-hint'] } })
    expect(out).not.toContain('allowed-tools')
    expect(out).not.toContain('argument-hint')
    expect(out).toContain('name: demo')
  })

  test('a multi-paragraph source description is replaced entirely', () => {
    const source = SOURCE.replace('  Claude description.\n', '  Claude description.\n\n  Second paragraph.\n')
    const out = codex({ source, codexMd: MD, codexJson: JSON_OK })
    expect(out).not.toContain('Second paragraph')
  })

  test('an allowed Claude-only term passes when a reason is given', () => {
    const source = SOURCE.replace('exactly.', 'exactly, see ~/.claude/x.json.')
    expect(() => codex({ source, codexMd: MD, codexJson: JSON_OK })).toThrow('"claude-home"')
    const allow = { 'claude-home': { match: ['~/.claude/x.json'], reason: 'the script writes this real path' } }
    expect(codex({ source, codexMd: MD, codexJson: { ...JSON_OK, allow } })).toContain('~/.claude/x.json')
    // the exemption covers that exact string only, not every ~/.claude/ mention
    const more = source.replace('exactly,', 'exactly, and ~/.claude/settings.json,')
    expect(() => codex({ source: more, codexMd: MD, codexJson: { ...JSON_OK, allow } })).toThrow('"claude-home"')
  })

  test('model aliases are refused only where they name a model', () => {
    const prose = SOURCE.replace('exactly.', 'exactly; a magnum opus, a fable, a haiku poem, step o1.')
    expect(() => codex({ source: prose, codexMd: MD, codexJson: JSON_OK })).not.toThrow()
    for (const bad of ["use 'opus' here", 'run it on sonnet', 'modèle haiku', 'the sonnet alias']) {
      expect(() => codex({ source: SOURCE.replace('exactly.', bad), codexMd: MD, codexJson: JSON_OK })).toThrow('"claude-model-alias"')
    }
  })

  test('Claude Code tool names are refused', () => {
    expect(() => codex({ source: SOURCE.replace('exactly.', 'then call AskUserQuestion.'), codexMd: MD, codexJson: JSON_OK })).toThrow('"claude-tools"')
  })

  test('a prose mention of runtime-slot, or a marker inside a code fence, is not a marker', () => {
    const source = SOURCE.replace('exactly.', 'exactly; runtime-slot markers.\n```\n<!-- runtime-slot:x -->\n```')
    expect(buildSkillMd(skill({ source }), 'claude')).toContain('<!-- runtime-slot:x -->')
  })

  test('dropFrontmatter handles unindented sequences and quoted keys', () => {
    const source = SOURCE.replace('---\n\n# Demo', 'allowed-tools:\n- Read\n- Bash\n"argument-hint": x\n---\n\n# Demo')
    const out = codex({ source, codexMd: MD, codexJson: { ...JSON_OK, dropFrontmatter: ['allowed-tools', 'argument-hint'] } })
    expect(out).not.toContain('- Read')
    expect(out).not.toContain('argument-hint')
  })

  test('heading check follows CommonMark fences (longer fences, tildes, indented code)', () => {
    const extra = '\n````md\n```\n## inside\n```\n````\n~~~\n## also inside\n~~~\n    ```\n## real\n'
    const source = SOURCE + extra
    expect(() => codex({ source, codexMd: MD, codexJson: JSON_OK })).not.toThrow()
    // a real heading after an indented ``` must still count: renaming it is a declared change
    const out = codex({ source, codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## real': '## vrai' } } })
    expect(out).toContain('\n## vrai\n')
    expect(out).toContain('## inside')
  })

  test('stale slot: Claude text edited after the Codex text was written fails the build', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'SKILL.md'), SOURCE.replace("model:'sonnet'.", "model:'sonnet'. NEW RULE."))
    expect(() => buildSkillMd(d, 'codex')).toThrow('its Claude text changed')
  })

  const failures = [
    ['slot never stamped', { codexMd: MD, codexJson: JSON_OK, stamp: false }, 'never stamped'],
    ['slot without Codex text', { codexMd: '', codexJson: JSON_OK }, 'has no Codex text'],
    ['unknown Codex slot', { codexMd: MD + '<!-- slot:ghost -->\nx\n<!-- /slot:ghost -->\n', codexJson: JSON_OK }, 'unknown slot "ghost"'],
    ['duplicate Codex slot', { codexMd: MD + MD, codexJson: JSON_OK }, 'defined twice'],
    ['stray close marker in codex.md', { codexMd: MD + '<!-- /slot:zzz -->\n', codexJson: JSON_OK }, 'stray or malformed'],
    ['slot marker inside a Codex slot', { codexMd: '<!-- slot:engine -->\na\n<!-- slot:b -->\n<!-- /slot:engine -->\n', codexJson: JSON_OK }, 'contains another slot marker'],
    ['replace count mismatch', { codexMd: MD, codexJson: { ...JSON_OK, replace: [{ from: 'Keep this', to: 'K', count: 2 }] } }, 'expected 2 match(es), found 1'],
    ['replace with an empty from', { codexMd: MD, codexJson: { ...JSON_OK, replace: [{ from: '', to: 'x', count: 1 }] } }, 'non-empty "from"'],
    ['replace whose to contains another from', { codexMd: MD, codexJson: { ...JSON_OK, replace: [{ from: 'Keep', to: 'Rest', count: 1 }, { from: 'Rest', to: 'R', count: 1 }] } }, 'contains a "from"'],
    ['forbidden string left', { codexMd: MD, codexJson: { ...JSON_OK, forbid: ['Keep this line'] } }, 'forbidden string'],
    ['Claude-only vocabulary left', { codexMd: '<!-- slot:engine -->\nask the Agent tool\n<!-- /slot:engine -->\n', codexJson: JSON_OK }, '"agent-tool"'],
    ['dated model name', { codexMd: '<!-- slot:engine -->\nuse gpt-6-sol\n<!-- /slot:engine -->\n', codexJson: JSON_OK }, 'dated model name'],
    ['dated model name without dash', { codexMd: '<!-- slot:engine -->\nuse gpt5\n<!-- /slot:engine -->\n', codexJson: JSON_OK }, 'dated model name'],
    ['broken .Codex/ path', { source: SOURCE.replace('docs/agents/', '.claude/agents/'), codexMd: MD, codexJson: { ...JSON_OK, replace: [{ from: '.claude/', to: '.Codex/', count: 1 }] } }, '".Codex/"'],
    ['heading changed', { codexMd: '<!-- slot:engine -->\n## Extra\n<!-- /slot:engine -->\n', codexJson: JSON_OK }, 'headings differ'],
    ['heading rename that matches nothing', { codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## Nope': '## New' } } }, 'expected 1 heading, found 0'],
    ['heading rename onto an existing heading', { codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## Engine': '## Rest' } } }, 'already a heading'],
    ['two headings renamed to one title', { codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## Engine': '## X', '## Rest': '## X' } } }, 'same title'],
    ['heading rename whose source is only inside a fence', { source: SOURCE + '\n```\n## Z\n```\n', codexMd: MD, codexJson: { ...JSON_OK, renameHeadings: { '## Z': '## Q' } } }, 'expected 1 heading, found 0'],
    ['unknown config key (typo)', { codexMd: MD, codexJson: { ...JSON_OK, forbids: ['x'] } }, 'unknown key(s) forbids'],
    ['missing description', { codexMd: MD, codexJson: { forbid: ['x'] } }, '"description" is required'],
    ['empty forbid list', { codexMd: MD, codexJson: { ...JSON_OK, forbid: [] } }, '"forbid" must be a non-empty list'],
    ['allow without a reason', { codexMd: MD, codexJson: { ...JSON_OK, allow: { ultracode: { match: ['x'], reason: 'xxxxxxxxxx' } } } }, 'needs { "match"'],
    ['allow without exact strings', { codexMd: MD, codexJson: { ...JSON_OK, allow: { ultracode: 'a long enough reason here' } } }, 'needs { "match"'],
    ['allow of unknown vocabulary', { codexMd: MD, codexJson: { ...JSON_OK, allow: { nope: { match: ['x'], reason: 'a long enough reason here' } } } }, 'unknown vocabulary'],
    ['dropFrontmatter of a missing key', { codexMd: MD, codexJson: { ...JSON_OK, dropFrontmatter: ['nope'] } }, 'no "nope" key'],
  ]
  for (const [name, opts, message] of failures) {
    test(`fails on ${name}`, () => {
      expect(() => codex(opts)).toThrow(message)
    })
  }

  for (const [name, source, message] of [
    ['unclosed slot', '<!-- runtime-slot:a -->\nx\n', 'never closed'],
    ['nested slot', '<!-- runtime-slot:a -->\n<!-- runtime-slot:b -->\n', 'opens inside'],
    ['mismatched close', '<!-- runtime-slot:a -->\n<!-- /runtime-slot:b -->\n', 'unexpected close'],
    ['duplicate slot', '<!-- runtime-slot:a -->\n<!-- /runtime-slot:a -->\n<!-- runtime-slot:a -->\n<!-- /runtime-slot:a -->\n', 'appears twice'],
    ['malformed marker', '<!--runtime-slot:a-->\n', 'malformed runtime-slot marker'],
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

  test('a symlinked SKILL.md is never written through: the source stays byte for byte', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    const real = join(tmp(), 'real-SKILL.md')
    writeFileSync(real, SOURCE)
    rmSync(join(d, 'SKILL.md'))
    symlinkSync(real, join(d, 'SKILL.md'))
    buildVariant(d, 'codex', join(tmp(), 'out'))
    expect(readFileSync(real, 'utf8')).toBe(SOURCE)
  })

  test('a skill folder given through a symlink builds', () => {
    const link = join(tmp(), 'link')
    symlinkSync(skill({ codexMd: MD, codexJson: JSON_OK }), link)
    const out = join(tmp(), 'out')
    buildVariant(link, 'codex', out)
    expect(readFileSync(join(out, 'SKILL.md'), 'utf8')).toContain('Use spawn_agent.')
  })

  test('other shipped .md files get the same Codex checks', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    mkdirSync(join(d, 'references'))
    writeFileSync(join(d, 'references', 'how.md'), 'Ask the Agent tool.\n')
    const out = join(tmp(), 'out')
    expect(() => buildVariant(d, 'codex', out)).toThrow('references/how.md')
    expect(existsSync(out)).toBe(false)
  })

  test('buildVariant keeps relative symlinks relative', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    symlinkSync('helper.mjs', join(d, 'scripts', 'link.mjs'))
    const out = join(tmp(), 'out')
    buildVariant(d, 'codex', out)
    expect(readlinkSync(join(out, 'scripts', 'link.mjs'))).toBe('helper.mjs')
  })

  test('buildVariant refuses a non-empty output dir and one inside the skill', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    const full = tmp()
    writeFileSync(join(full, 'x'), '')
    expect(() => buildVariant(d, 'codex', full)).toThrow('not empty')
    expect(() => buildVariant(d, 'codex', join(d, 'dist'))).toThrow('outside the skill folder')
  })
})

describe('CLI (the workstation rail relies on exit codes)', () => {
  const run = (args) => spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' })
  test('0 on success', () => {
    expect(run(['--skill', skill({ codexMd: MD, codexJson: JSON_OK }), '--runtime', 'codex', '--check']).status).toBe(0)
  })
  test('3 when the skill declares no Codex variant', () => {
    expect(run(['--skill', skill(), '--runtime', 'codex', '--check']).status).toBe(3)
  })
  test('1 with a FAILED line on a validation failure', () => {
    const r = run(['--skill', skill({ codexMd: '', codexJson: JSON_OK }), '--runtime', 'codex', '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('FAILED:')
  })
  test('1 with a FAILED line on invalid codex.json', () => {
    const r = run(['--skill', skill({ codexMd: MD, codexJson: '{oops' }), '--runtime', 'codex', '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('FAILED: runtimes/codex.json')
  })
  test('1 with a FAILED line, not a stack trace, on a missing skill folder', () => {
    const r = run(['--skill', join(tmp(), 'absent'), '--runtime', 'claude', '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toStartWith('FAILED:')
  })
  test('--stamp records the current Claude text so a stale build passes again', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK, stamp: false })
    expect(run(['--skill', d, '--runtime', 'codex', '--check']).status).toBe(1)
    expect(run(['--skill', d, '--stamp']).status).toBe(0)
    expect(run(['--skill', d, '--runtime', 'codex', '--check']).status).toBe(0)
  })
  test('--stamp refuses when other checks fail, and cannot be combined with a build', () => {
    expect(run(['--skill', skill({ codexMd: '', codexJson: JSON_OK, stamp: false }), '--stamp']).status).toBe(1)
    expect(run(['--skill', skill({ codexMd: MD, codexJson: JSON_OK }), '--stamp', '--runtime', 'codex', '--check']).status).toBe(2)
  })
  test('2 on missing arguments', () => {
    expect(run(['--runtime', 'codex']).status).toBe(2)
  })
})

describe('every skill of this repo that declares a Codex variant', () => {
  const declared = readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(REPO_ROOT, e.name, 'runtimes', 'codex.json')))
    .map((e) => e.name)

  test('includes the two skills ported so far', () => {
    expect(declared).toEqual(expect.arrayContaining(['adversarial-pr-review', 'brief-preflight']))
  })

  for (const name of declared) {
    test(`${name}: Codex variant builds; Claude variant is the source minus marker lines`, () => {
      const dir = join(REPO_ROOT, name)
      expect(() => buildSkillMd(dir, 'codex')).not.toThrow()
      const source = readFileSync(join(dir, 'SKILL.md'), 'utf8')
      expect(buildSkillMd(dir, 'claude')).toBe(source.split('\n').filter((l) => !/^<!-- \/?runtime-slot:/.test(l)).join('\n'))
    })
  }
})

describe('adversarial-pr-review (real skill)', () => {
  test('Codex template runs with resolved roles pinned on every agent', async () => {
    let template = buildSkillMd(REAL_SKILL, 'codex').match(/```js\n([\s\S]*?)\n```/)[1]
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
