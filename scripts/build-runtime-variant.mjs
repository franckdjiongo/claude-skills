#!/usr/bin/env node
// build-runtime-variant.mjs — build the Claude Code or Codex variant of a skill
// from its single source folder.
//
// A skill opts into a Codex variant by shipping `runtimes/codex.json`. Without it
// the skill is not declared for Codex and the build exits 3 (the workstation rail
// then skips the Codex install). There is NO free-text "claude -> codex" rewrite:
// that kind of blind replace is what left 37 broken `.Codex/` paths in the old
// hand-made Codex copies. Every change is explicit and checked:
//
//   SKILL.md                 marks runtime-specific passages:
//                              <!-- runtime-slot:NAME -->
//                              ...Claude Code text...
//                              <!-- /runtime-slot:NAME -->
//   runtimes/codex.md        gives the Codex text for EVERY slot:
//                              <!-- slot:NAME -->
//                              ...Codex text...
//                              <!-- /slot:NAME -->
//   runtimes/codex.json      { "description": "<frontmatter description>",
//                              "replace": [{ "from", "to", "count" }],   exact count required
//                              "renameHeadings": { "<## old line>": "<## new line>" },
//                              "forbid":  ["<string that must not survive>", "/regex/flags"],  required, non-empty;
//                                         a plain string matches as a substring, an entry written /.../flags is a RegExp
//                              "allow":   { "<CLAUDE_ONLY id | forbid>": { "match": ["<exact string>"], "reason": "<why>" } },
//                              "dropFrontmatter": ["allowed-tools", ...],
//                              "slotSources": { "NAME": "<hash of the Claude text>" } }
//   A source with `disable-model-invocation: true` (Claude only) gets, in its Codex variant,
//   `agents/openai.yaml` with `policy.allow_implicit_invocation: false` — Codex's documented
//   equivalent (the skill stays out of the model context, `$skill` still works) — unless the
//   skill already ships its own agents/openai.yaml.
//   "description" is required. Unknown keys fail the build (a typo must not
//   silently switch a check off). On top of each skill's `forbid`, the built-in
//   CLAUDE_ONLY vocabulary below is refused unless `allow` exempts that exact string
//   with a reason. Built-in forbids (`.Codex/`, runtime-slot markers) are never exempt. An allow
//   under a CLAUDE_ONLY id exempts only that id's vocabulary; the allow id `forbid` exempts exact
//   strings from the skill's own `forbid` list only. Exact strings only: a second, different
//   occurrence still fails. A plain forbid string that itself starts and ends with `/` is read
//   as a regex: write a literal path as an escaped regex (e.g. `/\/usr\/local\//`).
//   The same checks run on every other file the variant ships whose extension is in
//   SCANNED_EXTENSIONS (`--check` included), case-insensitive, `.git` skipped at any depth. A symlink
//   is scanned through its target when its own name or its target has a scanned extension. A symlink
//   to the root SKILL.md is skipped (already checked). The variant must be self-contained: a symlink
//   into runtimes/ or outside the skill folder fails the build.
//
// `slotSources` pins the Claude text each Codex slot was written against: when a
// nightly improvement edits a slot's Claude text, the Codex build fails until a
// human updates runtimes/codex.md and re-stamps with `--stamp` (the rail never
// stamps). The build also fails (exit 1) on an unbalanced, malformed or unknown
// slot, a slot with no Codex text, a replacement whose match count differs from
// `count`, a forbidden string, a dated model name, a `.Codex/` path, or a `## `
// heading list that differs from the Claude variant (declared renames aside).
//
// Usage: node build-runtime-variant.mjs --skill <skillDir> --runtime codex|claude --out <dir>
//        node build-runtime-variant.mjs --skill <skillDir> --runtime codex|claude --check
//        node build-runtime-variant.mjs --skill <skillDir> --stamp
import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, cpSync, realpathSync, statSync } from 'node:fs'
import { join, basename, dirname, resolve, relative, isAbsolute, extname, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export class VariantError extends Error {}
export class NotDeclaredError extends Error {}

const SLOT_OPEN = /^<!-- runtime-slot:([a-z0-9-]+) -->\s*$/
const SLOT_CLOSE = /^<!-- \/runtime-slot:([a-z0-9-]+) -->\s*$/
const OVERRIDE_MARKER = /<!--\s*\/?slot:/
const REGEX_FORBID = /^\/(.+)\/([a-z]*)$/
const BUILTIN_FORBID = ['.Codex/', '<!-- runtime-slot', '<!-- /runtime-slot']
const DATED_MODEL = /\bgpt-?\d|\bo[1-9]-(mini|pro|preview)\b|\bclaude-(opus|sonnet|haiku|fable)-\d|\b(opus|sonnet|haiku|fable)-\d/i
const ALIAS = '(sonnet|opus|haiku|fable)'
const CONFIG_KEYS = ['description', 'replace', 'renameHeadings', 'forbid', 'allow', 'dropFrontmatter', 'slotSources']
// Claude Code-only vocabulary that misleads a Codex agent.
export const CLAUDE_ONLY = {
  'workflow-tool': /\bworkflow tool\b/i,
  ultracode: /ultracode/i,
  // Aliases only where they name a model, so "magnum opus" or "a fable" stay legal prose.
  'claude-model-alias': new RegExp(`['"\`]${ALIAS}['"\`]|\\b${ALIAS}\\s+(alias|effort|model|agents?|subagents?|tier)\\b|\\b(model|modèle)\\s*[:=]?\\s*['"\`]?${ALIAS}\\b|\\b(en|on|in)\\s+${ALIAS}\\b`, 'i'),
  'agent-tool': /`Agent`|\bAgent tool\b/,
  sendmessage: /\bSendMessage\b/,
  'resume-run': /\bresumeFromRunId\b/,
  schedulewakeup: /\bScheduleWakeup\b/,
  'spawn-task': /\bspawn_task\b/,
  'claude-env': /\bCLAUDE_(SKILL_DIR|CODE_[A-Z_]+)\b/,
  'claude-home': /~\/\.claude(\/|\.json)|(^|[\s`'"(])\.claude\//m,
  'shell-preprocessing': /^!`/m,
  'claude-tools': /\b(AskUserQuestion|TodoWrite|ExitPlanMode|EnterPlanMode)\b/,
}

const readText = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
export const slotHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16)

// Split SKILL.md into plain text and named slots. Slots never nest.
export function parseSlots(text) {
  const parts = []
  let current = null
  const seen = new Set()
  const fence = fenceTracker()
  text.split('\n').forEach((line, i) => {
    const inFence = fence(line)
    const open = inFence ? null : line.match(SLOT_OPEN)
    const close = inFence ? null : line.match(SLOT_CLOSE)
    if (open) {
      if (current) throw new VariantError(`line ${i + 1}: slot "${open[1]}" opens inside slot "${current.name}"`)
      if (seen.has(open[1])) throw new VariantError(`line ${i + 1}: slot "${open[1]}" appears twice`)
      seen.add(open[1])
      current = { name: open[1], lines: [] }
    } else if (close) {
      if (!current || current.name !== close[1]) throw new VariantError(`line ${i + 1}: unexpected close of slot "${close[1]}"`)
      parts.push({ slot: current.name, text: current.lines.join('\n') })
      current = null
    } else if (!inFence && /^\s*<!--\s*\/?\s*runtime-slot/.test(line)) {
      throw new VariantError(`line ${i + 1}: malformed runtime-slot marker: ${line.trim()}`)
    } else if (current) {
      current.lines.push(line)
    } else {
      parts.push({ text: line })
    }
  })
  if (current) throw new VariantError(`slot "${current.name}" is never closed`)
  return parts
}

export function parseOverrides(text) {
  const slots = new Map()
  const re = /<!-- slot:([a-z0-9-]+) -->\n([\s\S]*?)<!-- \/slot:\1 -->/g
  let m
  while ((m = re.exec(text))) {
    if (slots.has(m[1])) throw new VariantError(`runtimes/codex.md: slot "${m[1]}" defined twice`)
    if (OVERRIDE_MARKER.test(m[2])) throw new VariantError(`runtimes/codex.md: slot "${m[1]}" contains another slot marker`)
    slots.set(m[1], m[2].replace(/\n$/, ''))
  }
  if (OVERRIDE_MARKER.test(text.replace(re, ''))) throw new VariantError('runtimes/codex.md: stray or malformed slot marker')
  return slots
}

function join_(parts, pick) {
  const out = []
  for (const p of parts) {
    if (p.slot === undefined) out.push(p.text)
    else { const t = pick(p); if (t !== '') out.push(t) }
  }
  return out.join('\n')
}

// Returns a function line -> "is this line part of a fenced code block (fence lines
// included)?", following CommonMark: a fence opens with >= 3 backticks or tildes at
// <= 3 spaces of indent and closes only on the same character, at least as long,
// with nothing after it.
function fenceTracker() {
  let open = null
  return (line) => {
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (!open) {
      if (m && !(m[1][0] === '`' && m[2].includes('`'))) { open = m[1]; return true }
      return false
    }
    if (m && m[1][0] === open[0] && m[1].length >= open.length && !m[2].trim()) open = null
    return true
  }
}

// `## ` lines outside fenced code blocks.
export function headings(text) {
  const fence = fenceTracker()
  return text.split('\n').filter((l) => !fence(l) && /^## /.test(l))
}

const keyLine = (line, key) => new RegExp(`^["']?${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*:`).test(line)
// End (exclusive) of a top-level YAML key's value: continuation lines are blank,
// indented, or unindented sequence items ("- x").
function blockEnd(lines, start) {
  let end = start + 1
  while (end < lines.length && (!lines[end].trim() || /^\s/.test(lines[end]) || /^- /.test(lines[end]))) end++
  return end
}

function replaceDescription(skillMd, description) {
  const fm = skillMd.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fm) throw new VariantError('SKILL.md has no frontmatter')
  const lines = fm[1].split('\n')
  const start = lines.findIndex((l) => keyLine(l, 'description'))
  if (start < 0) throw new VariantError('frontmatter has no description')
  const end = blockEnd(lines, start)
  const folded = ['description: >-']
  let row = ' '
  for (const word of description.trim().split(/\s+/)) {
    if (row.length + word.length + 1 > 100 && row.trim()) { folded.push(row); row = ' ' }
    row += ' ' + word
  }
  if (row.trim()) folded.push(row)
  lines.splice(start, end - start, ...folded)
  return `---\n${lines.join('\n')}\n---\n` + skillMd.slice(fm[0].length)
}

function dropFrontmatterKeys(skillMd, keys) {
  if (!keys.length) return skillMd
  const fm = skillMd.match(/^---\n([\s\S]*?)\n---\n/)
  const lines = fm[1].split('\n')
  for (const key of keys) {
    const start = lines.findIndex((l) => keyLine(l, key))
    if (start < 0) throw new VariantError(`dropFrontmatter: no "${key}" key in the frontmatter`)
    const end = blockEnd(lines, start)
    lines.splice(start, end - start)
  }
  return `---\n${lines.join('\n')}\n---\n` + skillMd.slice(fm[0].length)
}

function readConfig(skillDir) {
  const configPath = join(skillDir, 'runtimes', 'codex.json')
  if (!existsSync(configPath)) throw new NotDeclaredError(`${basename(skillDir)} declares no Codex variant`)
  let config
  try { config = JSON.parse(readText(configPath)) } catch (err) { throw new VariantError(`runtimes/codex.json: ${err.message}`) }
  const unknown = Object.keys(config).filter((k) => !CONFIG_KEYS.includes(k))
  if (unknown.length) throw new VariantError(`runtimes/codex.json: unknown key(s) ${unknown.join(', ')}`)
  if (typeof config.description !== 'string' || !config.description.trim()) throw new VariantError('runtimes/codex.json: "description" is required')
  if (!Array.isArray(config.forbid) || !config.forbid.length || !config.forbid.every((f) => typeof f === 'string' && f)) {
    throw new VariantError('runtimes/codex.json: "forbid" must be a non-empty list of strings')
  }
  for (const f of config.forbid) {
    const m = f.match(REGEX_FORBID)
    if (m && !/^[imsu]*$/.test(m[2])) throw new VariantError(`runtimes/codex.json: forbid entry "${f}" has an unsupported flag (only i, m, s, u; g and y make the scan stateful)`)
    if (m) try { new RegExp(m[1], m[2]) } catch (err) { throw new VariantError(`runtimes/codex.json: forbid entry "${f}" is not a valid regular expression: ${err.message}`) }
  }
  for (const [id, entry] of Object.entries(config.allow ?? {})) {
    if (!(id in CLAUDE_ONLY) && id !== 'forbid') throw new VariantError(`runtimes/codex.json: allow names unknown vocabulary "${id}"`)
    const okMatch = Array.isArray(entry?.match) && entry.match.length && entry.match.every((m) => typeof m === 'string' && m)
    if (!okMatch || typeof entry.reason !== 'string' || entry.reason.trim().split(/\s+/).length < 4) {
      throw new VariantError(`runtimes/codex.json: allow "${id}" needs { "match": [exact strings], "reason": "<a sentence>" }`)
    }
  }
  for (const r of config.replace ?? []) {
    if (typeof r?.from !== 'string' || !r.from || typeof r.to !== 'string' || !Number.isInteger(r.count) || r.count < 1) {
      throw new VariantError(`runtimes/codex.json: each replace needs a non-empty "from", a string "to" and an integer "count" >= 1`)
    }
  }
  const froms = (config.replace ?? []).map((r) => r.from)
  for (const r of config.replace ?? []) {
    const clash = froms.find((f) => f !== r.from && r.to.includes(f))
    if (clash) throw new VariantError(`runtimes/codex.json: replace "to" contains a "from" ("${clash.slice(0, 40)}"), counts would depend on order`)
  }
  return config
}

// Returns the SKILL.md text for the runtime. Throws NotDeclaredError / VariantError.
// Exit 3 means "a real skill that simply declares no Codex variant": a missing folder or
// SKILL.md is a failure (exit 1), so a mistyped path never reads as "skip".
function assertDeclared(skillDir, runtime) {
  if (!existsSync(join(skillDir, 'SKILL.md'))) throw new VariantError(`no SKILL.md in ${skillDir}`)
  if (runtime === 'codex' && !existsSync(join(skillDir, 'runtimes', 'codex.json'))) {
    throw new NotDeclaredError(`${basename(skillDir)} declares no Codex variant`)
  }
}

// Refuses Claude-only content in a Codex text. Built-in forbids are scanned on the raw text and
// are never exempt. The skill's `forbid` list is scanned with only the exact strings of
// `allow.forbid.match` blanked. An allow under a CLAUDE_ONLY id blanks its exact strings for that
// id's vocabulary only. In every case a second, non-allowed occurrence still fails. A `forbid`
// entry written /pattern/flags is a RegExp, any other entry is an exact substring.
function checkCodexText(text, config, label) {
  for (const s of BUILTIN_FORBID) if (text.includes(s)) throw new VariantError(`${label}: forbidden string left in Codex variant: "${s}"`)
  let forbidScan = text
  for (const m of config.allow?.forbid?.match ?? []) forbidScan = forbidScan.split(m).join(' ')
  for (const s of config.forbid ?? []) {
    const re = s.match(REGEX_FORBID)
    if (re) {
      const hit = forbidScan.match(new RegExp(re[1], re[2]))
      if (hit) throw new VariantError(`${label}: forbidden pattern left in Codex variant: ${s} matched "${hit[0]}"`)
    } else if (forbidScan.includes(s)) throw new VariantError(`${label}: forbidden string left in Codex variant: "${s}"`)
  }
  if (OVERRIDE_MARKER.test(text)) throw new VariantError(`${label}: slot marker left in Codex variant`)
  for (const [id, re] of Object.entries(CLAUDE_ONLY)) {
    let scanned = text
    for (const m of config.allow?.[id]?.match ?? []) scanned = scanned.split(m).join(' ')
    const hit = scanned.match(re)
    if (hit) throw new VariantError(`${label}: Claude-only vocabulary "${id}" left in Codex variant: "${hit[0].trim()}" (rewrite it, or allow that exact string with a reason)`)
  }
  const dated = text.match(DATED_MODEL)
  if (dated) throw new VariantError(`${label}: dated model name left in Codex variant: "${dated[0]}"`)
}

export function buildSkillMd(skillDir, runtime, { ignoreStamps = false } = {}) {
  assertDeclared(skillDir, runtime)
  const parts = parseSlots(readText(join(skillDir, 'SKILL.md')))
  const claude = join_(parts, (p) => p.text)
  if (runtime === 'claude') return claude
  if (runtime !== 'codex') throw new VariantError(`unknown runtime "${runtime}"`)

  const config = readConfig(skillDir)
  const mdPath = join(skillDir, 'runtimes', 'codex.md')
  const overrides = existsSync(mdPath) ? parseOverrides(readText(mdPath)) : new Map()

  const slots = parts.filter((p) => p.slot !== undefined)
  for (const { slot } of slots) if (!overrides.has(slot)) throw new VariantError(`slot "${slot}" has no Codex text in runtimes/codex.md`)
  for (const name of overrides.keys()) if (!slots.some((p) => p.slot === name)) throw new VariantError(`runtimes/codex.md defines unknown slot "${name}"`)
  const pinned = config.slotSources ?? {}
  for (const { slot, text } of slots) {
    if (!ignoreStamps && pinned[slot] !== slotHash(text)) {
      throw new VariantError(`slot "${slot}": its Claude text changed since the Codex text was written (or was never stamped). A human must review runtimes/codex.md against the new Claude text and re-stamp; automation never stamps`)
    }
  }
  if (!ignoreStamps) for (const name of Object.keys(pinned)) if (!slots.some((p) => p.slot === name)) throw new VariantError(`slotSources names unknown slot "${name}"`)

  let out = join_(parts, (p) => overrides.get(p.slot))
  for (const { from, to, count } of config.replace ?? []) {
    const found = out.split(from).length - 1
    if (found !== count) throw new VariantError(`replace "${from.slice(0, 60)}": expected ${count} match(es), found ${found}`)
    out = out.split(from).join(to)
  }
  out = replaceDescription(out, config.description)
  out = dropFrontmatterKeys(out, config.dropFrontmatter ?? [])

  const renames = config.renameHeadings ?? {}
  const sourceHeadings = headings(claude)
  const targets = Object.values(renames)
  if (new Set(targets).size !== targets.length) throw new VariantError('renameHeadings: two headings renamed to the same title')
  for (const [from, to] of Object.entries(renames)) {
    if (!/^## /.test(from) || !/^## /.test(to)) throw new VariantError(`renameHeadings entries must be "## " lines: "${from}"`)
    if (to in renames || sourceHeadings.includes(to)) throw new VariantError(`renameHeadings target "${to}" is already a heading or a rename source`)
    const hits = sourceHeadings.filter((h) => h === from).length
    if (hits !== 1) throw new VariantError(`renameHeadings "${from}": expected 1 heading, found ${hits}`)
    const fence = fenceTracker()
    out = out.split('\n').map((l) => (!fence(l) && l === from ? to : l)).join('\n')
  }

  checkCodexText(out, config, 'SKILL.md')
  const a = sourceHeadings.map((h) => renames[h] ?? h), b = headings(out)
  if (a.join('\n') !== b.join('\n')) throw new VariantError(`section headings differ from the Claude variant:\n  claude: ${a.join(' | ')}\n  codex:  ${b.join(' | ')}`)
  return out
}

// Writes the complete skill folder for the runtime into `out` (which must be empty or absent).
function realOrResolved(path) {
  if (existsSync(path)) return realpathSync(path)
  return join(realOrResolved(dirname(resolve(path))), basename(path))
}

// Extensions of the shipped files scanned like SKILL.md (case-insensitive). The skill-root SKILL.md is
// checked by buildSkillMd instead.
export const SCANNED_EXTENSIONS = ['.md', '.markdown', '.mdx', '.html', '.htm', '.xhtml', '.txt', '.sh', '.json', '.yaml', '.yml']
const scanned = (name) => SCANNED_EXTENSIONS.includes(extname(name).toLowerCase())

// Every shipped file with a scanned extension besides the root SKILL.md. `base` is the realpath of the
// skill folder. Top-level runtimes/ is skipped (cpSync drops it), `.git` at any depth (cpSync filters it by name).
function shippedText(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return e.name === '.git' || (e.name === 'runtimes' && dir === base) ? [] : shippedText(p, base)
    if (p === join(base, 'SKILL.md')) return []
    if (e.isSymbolicLink()) {
      const rel = relative(base, p)
      let st
      try { st = statSync(p) } catch { throw new VariantError(`${rel}: broken symlink in a Codex variant cannot be scanned`) }
      if (st.isDirectory()) throw new VariantError(`${rel}: symlinked directory in a Codex variant cannot be scanned`)
      const real = realpathSync(p)
      // The shipped link resolves to the Codex SKILL.md, already checked by buildSkillMd.
      if (real === join(base, 'SKILL.md')) return []
      const inside = relative(base, real)
      if (inside.split(sep)[0] === 'runtimes') throw new VariantError(`${rel}: symlink into runtimes/ would dangle in the variant`)
      if (inside.startsWith('..') || isAbsolute(inside)) throw new VariantError(`${rel}: symlink pointing outside the skill folder`)
      // A link ships its target's text whatever its own name: match on either name.
      return scanned(e.name) || scanned(real) ? [p] : []
    }
    return e.isFile() && scanned(e.name) ? [p] : []
  })
}

// The full check of a variant: the SKILL.md build plus, for Codex, every other shipped text file.
export function checkVariant(skillDir, runtime) {
  assertDeclared(skillDir, runtime)
  const source = realpathSync(skillDir)
  const skillMd = buildSkillMd(source, runtime)
  if (runtime === 'codex') {
    const config = readConfig(source)
    for (const f of shippedText(source)) checkCodexText(readText(f), config, relative(source, f))
  }
  return skillMd
}

export function buildVariant(skillDir, runtime, out) {
  assertDeclared(skillDir, runtime)
  const source = realpathSync(skillDir)
  const skillMd = checkVariant(source, runtime)
  const target = realOrResolved(out)
  const rel = relative(source, target)
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new VariantError(`output dir must be outside the skill folder: ${out}`)
  if (existsSync(target) && readdirSync(target).length) throw new VariantError(`output dir is not empty: ${out}`)
  try {
    mkdirSync(target, { recursive: true })
    cpSync(source, target, {
      recursive: true,
      verbatimSymlinks: true,
      // Tests stay with the source: they check the Claude text and would fail against the variant.
      filter: (src) => !['.git', '.DS_Store'].includes(basename(src)) && src !== join(source, 'SKILL.md') && src !== join(source, 'runtimes')
        && !(runtime === 'codex' && /\.test\.[cm]?[jt]s$/.test(src)),
    })
    writeFileSync(join(target, 'SKILL.md'), skillMd)
    if (runtime === 'codex' && /^disable-model-invocation:\s*true\s*$/m.test(skillMd.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '')) {
      const yaml = join(target, 'agents', 'openai.yaml')
      if (!existsSync(yaml)) {
        mkdirSync(join(target, 'agents'), { recursive: true })
        writeFileSync(yaml, 'policy:\n  allow_implicit_invocation: false\n')
      }
    }
  } catch (err) {
    rmSync(target, { recursive: true, force: true })
    throw err
  }
}

// Records the current Claude text of every slot as the one the Codex text matches.
export function stamp(skillDir) {
  buildSkillMd(skillDir, 'codex', { ignoreStamps: true }) // every other check must pass first
  const config = readConfig(skillDir)
  const parts = parseSlots(readText(join(skillDir, 'SKILL.md')))
  config.slotSources = Object.fromEntries(parts.filter((p) => p.slot !== undefined).map((p) => [p.slot, slotHash(p.text)]))
  writeFileSync(join(skillDir, 'runtimes', 'codex.json'), JSON.stringify(config, null, 2) + '\n')
}

function main(argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const skill = arg('--skill'), runtime = arg('--runtime'), out = arg('--out')
  const stampMode = argv.includes('--stamp')
  if (stampMode && (runtime || out || argv.includes('--check'))) {
    process.stderr.write('--stamp cannot be combined with --runtime, --out or --check\n')
    return 2
  }
  if (!skill || (!stampMode && (!runtime || (!out && !argv.includes('--check'))))) {
    process.stderr.write('usage: build-runtime-variant.mjs --skill <dir> (--runtime codex|claude (--out <dir> | --check) | --stamp)\n')
    return 2
  }
  try {
    if (stampMode) { stamp(skill); process.stdout.write(`STAMPED ${basename(skill)}\n`); return 0 }
    if (out) buildVariant(skill, runtime, out)
    else checkVariant(skill, runtime)
    process.stdout.write(`OK ${runtime} variant of ${basename(skill)}${out ? ` -> ${out}` : ' (check only)'}\n`)
    return 0
  } catch (err) {
    if (err instanceof NotDeclaredError) { process.stderr.write(`NOT_DECLARED: ${err.message}\n`); return 3 }
    process.stderr.write(`FAILED: ${err?.message ?? err}\n`)
    return 1
  }
}

// Compare real paths: /tmp, /var or a symlinked skill folder must not turn the CLI into a silent no-op.
const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)) } catch { return false } }
if (isMain()) process.exit(main(process.argv.slice(2)))
