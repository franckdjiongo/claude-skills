import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, symlinkSync, readlinkSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildSkillMd, buildVariant, checkVariant, parseSlots, slotHash, NotDeclaredError, VariantError } from './build-runtime-variant.mjs'

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

  test('a /regex/ forbid entry matches on word boundaries, a plain string stays a substring', () => {
    const source = SOURCE.replace('exactly.', 'exactly. Monitoring continues.')
    const re = { ...JSON_OK, forbid: ['/\\bMonitor\\b/'] }
    expect(() => codex({ source, codexMd: MD, codexJson: re })).not.toThrow()
    expect(() => codex({ source: source.replace('Monitoring', 'Monitor the run'), codexMd: MD, codexJson: re })).toThrow('forbidden pattern left in Codex variant: /\\bMonitor\\b/ matched "Monitor"')
    expect(() => codex({ source, codexMd: MD, codexJson: { ...JSON_OK, forbid: ['Monitor'] } })).toThrow('forbidden string')
  })

  test('an allow under a CLAUDE_ONLY id never exempts built-in forbids or forbid terms', () => {
    const ok = { ...JSON_OK, forbid: ['Zeta'] }
    const a = SOURCE.replace('exactly.', 'exactly. See ~/.claude/x and .Codex/y.')
    const allowA = { 'claude-home': { match: ['~/.claude/x and .Codex/y'], reason: 'tries to hide a broken path' } }
    expect(() => codex({ source: a, codexMd: MD, codexJson: { ...ok, allow: allowA } })).toThrow('".Codex/"')
    const b = SOURCE.replace('exactly.', 'exactly. See ~/.claude/x and Zeta.')
    const allowB = { 'claude-home': { match: ['~/.claude/x and Zeta'], reason: 'tries to hide a forbid term' } }
    expect(() => codex({ source: b, codexMd: MD, codexJson: { ...ok, allow: allowB } })).toThrow('"Zeta"')
  })

  test('allow.forbid exempts an exact string from forbid only, a second occurrence still fails', () => {
    const source = SOURCE.replace('exactly.', 'exactly. Zeta is named here on purpose.')
    const allow = { forbid: { match: ['Zeta is named here on purpose'], reason: 'the template names both runtimes' } }
    const cfg = { ...JSON_OK, forbid: ['Zeta'], allow }
    expect(codex({ source, codexMd: MD, codexJson: cfg })).toContain('Zeta is named')
    expect(() => codex({ source: source + '\nAlso Zeta here.\n', codexMd: MD, codexJson: cfg })).toThrow('forbidden string')
    const claudeOnly = SOURCE.replace('exactly.', 'exactly. Ask the Agent tool.')
    const allowAgent = { forbid: { match: ['Ask the Agent tool.'], reason: 'does not cover claude-only vocabulary' } }
    expect(() => codex({ source: claudeOnly, codexMd: MD, codexJson: { ...JSON_OK, allow: allowAgent } })).toThrow('"agent-tool"')
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
    ['invalid regex forbid entry', { codexMd: MD, codexJson: { ...JSON_OK, forbid: ['/(unclosed/'] } }, 'forbid entry "/(unclosed/" is not a valid regular expression'],
    ['sticky regex flag y', { codexMd: MD, codexJson: { ...JSON_OK, forbid: ['/x/y'] } }, 'forbid entry "/x/y" has an unsupported flag'],
    ['global regex flag g', { codexMd: MD, codexJson: { ...JSON_OK, forbid: ['/x/g'] } }, 'forbid entry "/x/g" has an unsupported flag'],
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

  test('checkVariant scans shipped .html as well as .md', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    mkdirSync(join(d, 'assets'))
    writeFileSync(join(d, 'assets', 'page.html'), '<p>Ask the Agent tool.</p>\n')
    expect(() => checkVariant(d, 'codex')).toThrow('assets/page.html')
    expect(() => buildVariant(d, 'codex', join(tmp(), 'out'))).toThrow('assets/page.html')
    expect(checkVariant(d, 'claude')).toContain('# Demo')
  })

  test('shipped text is scanned whatever the extension case', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'HOW.MD'), 'Ask the Agent tool.\n')
    expect(() => checkVariant(d, 'codex')).toThrow('HOW.MD')
  })

  test('a symlinked .md is scanned through its target', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'bad.txt'), 'Ask the Agent tool.\n')
    symlinkSync('bad.txt', join(d, 'linked.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('linked.md')
    expect(checkVariant(d, 'claude')).toContain('# Demo')
  })

  test('a symlink named .md is scanned even when its target extension is not', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    mkdirSync(join(d, 'sub'), { recursive: true })
    writeFileSync(join(d, 'sub', 'notes.bin'), 'Ask the Agent tool.\n')
    symlinkSync('sub/notes.bin', join(d, 'alias.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('alias.md')
  })

  test('a symlink to a file the variant does not ship fails the Codex check', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    mkdirSync(join(d, 'sub', '.git'), { recursive: true })
    writeFileSync(join(d, 'sub', '.git', 'x.md'), 'Fine text.\n')
    symlinkSync('sub/.git/x.md', join(d, 'git-link.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('git-link.md: symlink to a file the variant does not ship')
    const e = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(e, 'scripts', 'a.test.mjs'), '// test\n')
    symlinkSync('scripts/a.test.mjs', join(e, 'test-link.md'))
    expect(() => checkVariant(e, 'codex')).toThrow('test-link.md: symlink to a file the variant does not ship')
    expect(checkVariant(e, 'claude')).toContain('# Demo')
    const f = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(f, '.DS_Store'), 'x')
    symlinkSync('.DS_Store', join(f, 'ds-link.md'))
    expect(() => checkVariant(f, 'codex')).toThrow('ds-link.md: symlink to a file the variant does not ship')
  })

  test('a link to a file whose name starts with two dots is inside the skill', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, '..foo.md'), 'Fine text.\n')
    symlinkSync('..foo.md', join(d, 'l.md'))
    expect(() => checkVariant(d, 'codex')).not.toThrow()
    buildVariant(d, 'codex', join(tmp(), 'out'))
    const e = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(e, '..sibling.md'), 'Fine text.\n')
    mkdirSync(join(e, 'sub'))
    symlinkSync('../..sibling.md', join(e, 'sub', 'up.md'))
    expect(() => checkVariant(e, 'codex')).not.toThrow()
  })

  test('a link to a file in the parent directory is outside the skill folder', () => {
    const parent = tmp()
    const d = join(parent, 'skill')
    mkdirSync(d)
    writeFileSync(join(d, 'SKILL.md'), SOURCE)
    mkdirSync(join(d, 'runtimes'))
    writeFileSync(join(d, 'runtimes', 'codex.md'), MD)
    writeFileSync(join(d, 'runtimes', 'codex.json'), JSON.stringify({ ...JSON_OK, slotSources: { engine: slotHash('Use the Workflow tool with model:\'sonnet\'.') } }))
    writeFileSync(join(parent, 'sibling.md'), 'Fine text.\n')
    symlinkSync('../sibling.md', join(d, 'up.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('up.md: symlink pointing outside the skill folder')
  })

  test('runtimes-extra/ is an ordinary folder, top-level runtimes/ is not', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    mkdirSync(join(d, 'runtimes-extra'))
    writeFileSync(join(d, 'runtimes-extra', 'x.md'), 'Fine text.\n')
    symlinkSync('runtimes-extra/x.md', join(d, 'ok.md'))
    expect(() => checkVariant(d, 'codex')).not.toThrow()
    symlinkSync('runtimes/codex.md', join(d, 'bad.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('bad.md: symlink into runtimes/ would dangle in the variant')
  })

  test('a symlink pointing outside the skill folder fails the Codex check', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    const outside = join(tmp(), 'outside.md')
    writeFileSync(outside, 'Fine text.\n')
    symlinkSync(relative(realpathSync(d), outside), join(d, 'linked.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('linked.md: symlink pointing outside the skill folder')
    expect(checkVariant(d, 'claude')).toContain('# Demo')
  })

  test('a symlink into runtimes/ fails the Codex check', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    symlinkSync('runtimes/codex.md', join(d, 'notes.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('notes.md: symlink into runtimes/ would dangle in the variant')
  })

  test('a symlink to the root SKILL.md is skipped and the variant builds', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    symlinkSync('SKILL.md', join(d, 'README.md'))
    expect(() => checkVariant(d, 'codex')).not.toThrow()
    buildVariant(d, 'codex', join(tmp(), 'out'))
  })

  test('shell, json, yaml, txt, htm and markdown files are scanned, case-insensitive', () => {
    for (const name of ['run.sh', 'data.json', 'cfg.yaml', 'cfg.YML', 'n.txt', 'p.HTM', 'x.xhtml', 'a.markdown', 'b.mdx']) {
      const d = skill({ codexMd: MD, codexJson: JSON_OK })
      writeFileSync(join(d, name), '# Ask the Agent tool.\n')
      expect(() => checkVariant(d, 'codex')).toThrow(name)
      expect(checkVariant(d, 'claude')).toContain('# Demo')
    }
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'logo.png'), 'Ask the Agent tool.\n')
    expect(() => checkVariant(d, 'codex')).not.toThrow()
  })

  test('a nested .git directory is not scanned, like the copy filter', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    mkdirSync(join(d, 'sub', '.git'), { recursive: true })
    writeFileSync(join(d, 'sub', '.git', 'x.md'), 'Ask the Agent tool.\n')
    expect(() => checkVariant(d, 'codex')).not.toThrow()
    const out = join(tmp(), 'out')
    buildVariant(d, 'codex', out)
    expect(existsSync(join(out, 'sub', '.git'))).toBe(false)
  })

  test('a symlinked directory or a broken symlink fails the Codex check', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    symlinkSync(tmp(), join(d, 'linkdir'))
    expect(() => checkVariant(d, 'codex')).toThrow('linkdir: symlinked directory in a Codex variant cannot be scanned')
    const e = skill({ codexMd: MD, codexJson: JSON_OK })
    symlinkSync(join(tmp(), 'missing.md'), join(e, 'dead.md'))
    expect(() => checkVariant(e, 'codex')).toThrow('dead.md: broken symlink')
  })

  test('an absolute symlink to a file inside the skill fails: the variant would point back at the source', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'real.md'), 'Fine text.\n')
    symlinkSync(join(realpathSync(d), 'real.md'), join(d, 'abs.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('abs.md: absolute symlink would point back at the source folder')
  })

  test('a chain through a hop the variant does not ship fails for Codex', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'real.md'), 'Fine text.\n')
    symlinkSync('real.md', join(d, 'hop.test.js'))
    symlinkSync('hop.test.js', join(d, 'chain.md'))
    expect(() => checkVariant(d, 'codex')).toThrow('chain.md: symlink to a file the variant does not ship')
  })

  test('a chain through shipped hops passes and builds', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'c.md'), 'Fine text.\n')
    symlinkSync('c.md', join(d, 'b.md'))
    symlinkSync('b.md', join(d, 'a.md'))
    expect(() => checkVariant(d, 'codex')).not.toThrow()
    const out = join(tmp(), 'out')
    buildVariant(d, 'codex', out)
    expect(readlinkSync(join(out, 'a.md'))).toBe('b.md')
  })

  test('a relative link to the root SKILL.md still passes and builds', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    symlinkSync('SKILL.md', join(d, 'ref.md'))
    expect(() => checkVariant(d, 'codex')).not.toThrow()
    const out = join(tmp(), 'out')
    buildVariant(d, 'codex', out)
    expect(readlinkSync(join(out, 'ref.md'))).toBe('SKILL.md')
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
  test('--check 1 on a bad shipped .md, not only --out', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'how.md'), 'Ask the Agent tool.\n')
    const r = run(['--skill', d, '--runtime', 'codex', '--check'])
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('how.md')
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
  test('runs (not a silent no-op) when invoked through a symlinked path', () => {
    const link = join(tmp(), 'gen.mjs')
    symlinkSync(SCRIPT, link)
    const out = join(tmp(), 'out')
    const r = spawnSync('node', [link, '--skill', skill({ codexMd: MD, codexJson: JSON_OK }), '--runtime', 'codex', '--out', out], { encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('OK codex variant')
    expect(existsSync(join(out, 'SKILL.md'))).toBe(true)
  })
  test('3 (not 1) for an undeclared skill even when its SKILL.md would not parse', () => {
    expect(run(['--skill', skill({ source: '<!--runtime-slot:a-->\n' }), '--runtime', 'codex', '--check']).status).toBe(3)
  })
  test('1 (not 3) for a missing folder or a folder without SKILL.md', () => {
    expect(run(['--skill', join(tmp(), 'typo'), '--runtime', 'codex', '--check']).status).toBe(1)
    expect(run(['--skill', tmp(), '--runtime', 'codex', '--check']).status).toBe(1)
  })
  test('disable-model-invocation becomes allow_implicit_invocation: false on Codex', () => {
    const source = SOURCE.replace('---\n\n# Demo', 'disable-model-invocation: true\n---\n\n# Demo')
    const out = join(tmp(), 'out')
    buildVariant(skill({ source, codexMd: MD, codexJson: JSON_OK }), 'codex', out)
    expect(readFileSync(join(out, 'agents', 'openai.yaml'), 'utf8')).toBe('policy:\n  allow_implicit_invocation: false\n')
    const plain = join(tmp(), 'plain')
    buildVariant(skill({ codexMd: MD, codexJson: JSON_OK }), 'codex', plain)
    expect(existsSync(join(plain, 'agents'))).toBe(false)
  })
  test('test files stay out of the Codex variant', () => {
    const d = skill({ codexMd: MD, codexJson: JSON_OK })
    writeFileSync(join(d, 'scripts', 'x.test.mjs'), '')
    const out = join(tmp(), 'out')
    buildVariant(d, 'codex', out)
    expect(existsSync(join(out, 'scripts', 'x.test.mjs'))).toBe(false)
    expect(existsSync(join(out, 'scripts', 'helper.mjs'))).toBe(true)
  })
  test('2 on missing arguments', () => {
    expect(run(['--runtime', 'codex']).status).toBe(2)
  })
})

describe('every skill of this repo that declares a Codex variant', () => {
  const declared = readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(REPO_ROOT, e.name, 'runtimes', 'codex.json')))
    .map((e) => e.name)

  test('includes the skills ported so far', () => {
    expect(declared).toEqual(expect.arrayContaining(['adversarial-pr-review', 'brief-chantier', 'brief-preflight', 'create-subagent']))
  })

  for (const name of declared) {
    test(`${name}: Codex variant builds; Claude variant is the source minus marker lines`, () => {
      const dir = join(REPO_ROOT, name)
      expect(() => checkVariant(dir, 'codex')).not.toThrow()
      const source = readFileSync(join(dir, 'SKILL.md'), 'utf8')
      expect(buildSkillMd(dir, 'claude')).toBe(source.split('\n').filter((l) => !/^<!-- \/?runtime-slot:/.test(l)).join('\n'))
    })
  }
})

describe('create-subagent (real skill)', () => {
  test('every Codex agent TOML example parses with the keys codex-cli requires and no model name', () => {
    const dir = join(REPO_ROOT, 'create-subagent')
    const text = buildSkillMd(dir, 'codex') + '\n' + readFileSync(join(dir, 'references', 'codex-agents.md'), 'utf8')
    const blocks = [...text.matchAll(/^```toml\n([\s\S]*?)^```$/gm)].map((m) => m[1])
    expect(blocks.length).toBe(5)
    for (const block of blocks) {
      const agent = Bun.TOML.parse(block)
      for (const key of ['name', 'description', 'developer_instructions']) expect(String(agent[key] ?? '').trim()).not.toBe('')
      expect(agent.model).toBeUndefined()
    }
  })
})

describe('adversarial-pr-review (real skill)', () => {
  test('Codex template runs with resolved roles pinned on every agent', async () => {
    // The template ships verbatim to Codex as references/workflow-template.js; Codex overwrites the
    // HUNTER/VERIFIER defaults with the roles resolved by resolve-codex-models.mjs.
    let template = readFileSync(join(REAL_SKILL, 'references/workflow-template.js'), 'utf8')
    template = template.replace('export const meta', 'const meta')
      .replace("const HUNTER = { model: 'sonnet', effort: 'medium' }", "const HUNTER = { model: 'm-hunt', effort: 'medium' }")
      .replace("const VERIFIER = { model: 'sonnet', effort: 'high' }", "const VERIFIER = { model: 'm-verify', effort: 'high' }")
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
