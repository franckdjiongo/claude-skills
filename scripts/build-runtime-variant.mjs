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
//                              "forbid":  ["<string that must not survive>"],      required, non-empty
//                              "allow":   { "<CLAUDE_ONLY id>": "<why it is right on Codex>" },
//                              "dropFrontmatter": ["allowed-tools", ...],
//                              "slotSources": { "NAME": "<hash of the Claude text>" } }
//   "description" is required. Unknown keys fail the build (a typo must not
//   silently switch a check off). On top of each skill's `forbid`, the built-in
//   CLAUDE_ONLY vocabulary below is refused case-insensitively unless `allow`
//   names it with a reason.
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
import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, cpSync } from 'node:fs'
import { join, basename, resolve, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export class VariantError extends Error {}
export class NotDeclaredError extends Error {}

const SLOT_OPEN = /^<!-- runtime-slot:([a-z0-9-]+) -->\s*$/
const SLOT_CLOSE = /^<!-- \/runtime-slot:([a-z0-9-]+) -->\s*$/
const OVERRIDE_MARKER = /<!--\s*\/?slot:/
const BUILTIN_FORBID = ['.Codex/', 'runtime-slot']
const DATED_MODEL = /\bgpt-?\d|\bo[1-9](-mini|-pro)?\b|\bclaude-[a-z]+-\d|\b(opus|sonnet|haiku|fable)-\d/i
const CONFIG_KEYS = ['description', 'replace', 'renameHeadings', 'forbid', 'allow', 'dropFrontmatter', 'slotSources']
// Claude Code-only vocabulary that misleads a Codex agent.
export const CLAUDE_ONLY = {
  'workflow-tool': /\bworkflow tool\b/i,
  ultracode: /ultracode/i,
  'claude-model-alias': /\b(sonnet|opus|haiku|fable)\b/i,
  'agent-tool': /`Agent`|\bAgent tool\b/,
  sendmessage: /\bSendMessage\b/,
  'resume-run': /\bresumeFromRunId\b/,
  schedulewakeup: /\bScheduleWakeup\b/,
  'spawn-task': /\bspawn_task\b/,
  'claude-env': /\bCLAUDE_(SKILL_DIR|CODE_[A-Z_]+)\b/,
  'claude-home': /~\/\.claude\//,
  'shell-preprocessing': /^!`/m,
}

const readText = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
export const slotHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16)

// Split SKILL.md into plain text and named slots. Slots never nest.
export function parseSlots(text) {
  const parts = []
  let current = null
  const seen = new Set()
  text.split('\n').forEach((line, i) => {
    const open = line.match(SLOT_OPEN)
    const close = line.match(SLOT_CLOSE)
    if (open) {
      if (current) throw new VariantError(`line ${i + 1}: slot "${open[1]}" opens inside slot "${current.name}"`)
      if (seen.has(open[1])) throw new VariantError(`line ${i + 1}: slot "${open[1]}" appears twice`)
      seen.add(open[1])
      current = { name: open[1], lines: [] }
    } else if (close) {
      if (!current || current.name !== close[1]) throw new VariantError(`line ${i + 1}: unexpected close of slot "${close[1]}"`)
      parts.push({ slot: current.name, text: current.lines.join('\n') })
      current = null
    } else if (line.includes('runtime-slot')) {
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

// `## ` lines outside fenced code blocks.
export function headings(text) {
  let fenced = false
  const out = []
  for (const l of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(l)) fenced = !fenced
    else if (!fenced && /^## /.test(l)) out.push(l)
  }
  return out
}

function replaceDescription(skillMd, description) {
  const fm = skillMd.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fm) throw new VariantError('SKILL.md has no frontmatter')
  const lines = fm[1].split('\n')
  const start = lines.findIndex((l) => /^description:/.test(l))
  if (start < 0) throw new VariantError('frontmatter has no description')
  let end = start + 1
  while (end < lines.length && !/^\S/.test(lines[end])) end++
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
    const start = lines.findIndex((l) => l.startsWith(`${key}:`))
    if (start < 0) throw new VariantError(`dropFrontmatter: no "${key}" key in the frontmatter`)
    let end = start + 1
    while (end < lines.length && !/^\S/.test(lines[end])) end++
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
  for (const [id, why] of Object.entries(config.allow ?? {})) {
    if (!(id in CLAUDE_ONLY)) throw new VariantError(`runtimes/codex.json: allow names unknown vocabulary "${id}"`)
    if (typeof why !== 'string' || why.trim().length < 10) throw new VariantError(`runtimes/codex.json: allow "${id}" needs a reason`)
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
export function buildSkillMd(skillDir, runtime) {
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
    if (pinned[slot] !== slotHash(text)) {
      throw new VariantError(`slot "${slot}": its Claude text changed since the Codex text was written (or was never stamped) — update runtimes/codex.md, then run --stamp`)
    }
  }
  for (const name of Object.keys(pinned)) if (!slots.some((p) => p.slot === name)) throw new VariantError(`slotSources names unknown slot "${name}"`)

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
  for (const [from, to] of Object.entries(renames)) {
    if (!/^## /.test(from) || !/^## /.test(to)) throw new VariantError(`renameHeadings entries must be "## " lines: "${from}"`)
    if (to in renames || sourceHeadings.includes(to)) throw new VariantError(`renameHeadings target "${to}" is already a heading or a rename source`)
    const lines = out.split('\n')
    const hits = lines.filter((l) => l === from).length
    if (hits !== 1) throw new VariantError(`renameHeadings "${from}": expected 1 heading, found ${hits}`)
    out = lines.map((l) => (l === from ? to : l)).join('\n')
  }

  for (const s of [...BUILTIN_FORBID, ...(config.forbid ?? [])]) {
    if (out.includes(s)) throw new VariantError(`forbidden string left in Codex variant: "${s}"`)
  }
  if (OVERRIDE_MARKER.test(out)) throw new VariantError('slot marker left in Codex variant')
  for (const [id, re] of Object.entries(CLAUDE_ONLY)) {
    if (config.allow?.[id]) continue
    const hit = out.match(re)
    if (hit) throw new VariantError(`Claude-only vocabulary "${id}" left in Codex variant: "${hit[0]}" (rewrite it, or allow it with a reason)`)
  }
  const dated = out.match(DATED_MODEL)
  if (dated) throw new VariantError(`dated model name left in Codex variant: "${dated[0]}…"`)
  const a = sourceHeadings.map((h) => renames[h] ?? h), b = headings(out)
  if (a.join('\n') !== b.join('\n')) throw new VariantError(`section headings differ from the Claude variant:\n  claude: ${a.join(' | ')}\n  codex:  ${b.join(' | ')}`)
  return out
}

// Writes the complete skill folder for the runtime into `out` (which must be empty or absent).
export function buildVariant(skillDir, runtime, out) {
  const skillMd = buildSkillMd(skillDir, runtime)
  const rel = relative(resolve(skillDir), resolve(out))
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new VariantError(`output dir must be outside the skill folder: ${out}`)
  if (existsSync(out) && readdirSync(out).length) throw new VariantError(`output dir is not empty: ${out}`)
  mkdirSync(out, { recursive: true })
  cpSync(skillDir, out, { recursive: true, verbatimSymlinks: true, filter: (src) => !['.git', '.DS_Store'].includes(basename(src)) })
  rmSync(join(out, 'runtimes'), { recursive: true, force: true })
  writeFileSync(join(out, 'SKILL.md'), skillMd)
}

// Records the current Claude text of every slot as the one the Codex text matches.
export function stamp(skillDir) {
  const config = readConfig(skillDir)
  const parts = parseSlots(readText(join(skillDir, 'SKILL.md')))
  config.slotSources = Object.fromEntries(parts.filter((p) => p.slot !== undefined).map((p) => [p.slot, slotHash(p.text)]))
  writeFileSync(join(skillDir, 'runtimes', 'codex.json'), JSON.stringify(config, null, 2) + '\n')
}

function main(argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const skill = arg('--skill'), runtime = arg('--runtime'), out = arg('--out')
  const stampMode = argv.includes('--stamp')
  if (!skill || (!stampMode && (!runtime || (!out && !argv.includes('--check'))))) {
    process.stderr.write('usage: build-runtime-variant.mjs --skill <dir> (--runtime codex|claude (--out <dir> | --check) | --stamp)\n')
    return 2
  }
  try {
    if (stampMode) { stamp(skill); process.stdout.write(`STAMPED ${basename(skill)}\n`); return 0 }
    if (out) buildVariant(skill, runtime, out)
    else buildSkillMd(skill, runtime)
    process.stdout.write(`OK ${runtime} variant of ${basename(skill)}${out ? ` -> ${out}` : ' (check only)'}\n`)
    return 0
  } catch (err) {
    if (err instanceof NotDeclaredError) { process.stderr.write(`NOT_DECLARED: ${err.message}\n`); return 3 }
    process.stderr.write(`FAILED: ${err?.message ?? err}\n`)
    return 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)))
