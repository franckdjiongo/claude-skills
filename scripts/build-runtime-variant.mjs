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
//                              "forbid":  ["<string that must not survive>"] }
//
// The build fails (exit 1) on an unbalanced or unknown slot, a slot with no Codex
// text, a replacement whose match count differs from `count`, a forbidden string
// left in the output, a dated model name, a `.Codex/` path, or a `## ` heading set
// that differs from the Claude variant.
//
// Usage: node build-runtime-variant.mjs --skill <skillDir> --runtime codex|claude --out <dir>
//        node build-runtime-variant.mjs --skill <skillDir> --runtime codex --check
import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, cpSync, mkdtempSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

export class VariantError extends Error {}
export class NotDeclaredError extends Error {}

const SLOT_OPEN = /^<!-- runtime-slot:([a-z0-9-]+) -->$/
const SLOT_CLOSE = /^<!-- \/runtime-slot:([a-z0-9-]+) -->$/
const BUILTIN_FORBID = ['.Codex/', 'runtime-slot']
const DATED_MODEL = /\bgpt-\d/i

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
    slots.set(m[1], m[2].replace(/\n$/, ''))
  }
  const leftover = text.replace(re, '').replace(/<!--(?!\s*slot)[\s\S]*?-->/g, '')
  if (/<!-- \/?slot:/.test(leftover)) throw new VariantError('runtimes/codex.md: malformed slot marker')
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

function headings(text) {
  return text.split('\n').filter((l) => /^## /.test(l))
}

function replaceDescription(skillMd, description) {
  const fm = skillMd.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fm) throw new VariantError('SKILL.md has no frontmatter')
  const lines = fm[1].split('\n')
  const start = lines.findIndex((l) => /^description:/.test(l))
  if (start < 0) throw new VariantError('frontmatter has no description')
  let end = start + 1
  while (end < lines.length && /^\s/.test(lines[end])) end++
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

// Returns the SKILL.md text for the runtime. Throws NotDeclaredError / VariantError.
export function buildSkillMd(skillDir, runtime) {
  const source = readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
  const parts = parseSlots(source)
  const claude = join_(parts, (p) => p.text)
  if (runtime === 'claude') return claude
  if (runtime !== 'codex') throw new VariantError(`unknown runtime "${runtime}"`)

  const configPath = join(skillDir, 'runtimes', 'codex.json')
  if (!existsSync(configPath)) throw new NotDeclaredError(`${basename(skillDir)} declares no Codex variant`)
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  const mdPath = join(skillDir, 'runtimes', 'codex.md')
  const overrides = existsSync(mdPath) ? parseOverrides(readFileSync(mdPath, 'utf8')) : new Map()

  const used = parts.filter((p) => p.slot !== undefined).map((p) => p.slot)
  for (const name of used) if (!overrides.has(name)) throw new VariantError(`slot "${name}" has no Codex text in runtimes/codex.md`)
  for (const name of overrides.keys()) if (!used.includes(name)) throw new VariantError(`runtimes/codex.md defines unknown slot "${name}"`)

  let out = join_(parts, (p) => overrides.get(p.slot))
  for (const { from, to, count } of config.replace ?? []) {
    const found = out.split(from).length - 1
    if (found !== count) throw new VariantError(`replace "${from.slice(0, 60)}": expected ${count} match(es), found ${found}`)
    out = out.split(from).join(to)
  }
  if (config.description) out = replaceDescription(out, config.description)
  const renames = config.renameHeadings ?? {}
  for (const [from, to] of Object.entries(renames)) {
    if (!/^## /.test(from) || !/^## /.test(to)) throw new VariantError(`renameHeadings entries must be "## " lines: "${from}"`)
    const lines = out.split('\n')
    const hits = lines.filter((l) => l === from).length
    if (hits !== 1) throw new VariantError(`renameHeadings "${from}": expected 1 heading, found ${hits}`)
    out = lines.map((l) => (l === from ? to : l)).join('\n')
  }

  for (const s of [...BUILTIN_FORBID, ...(config.forbid ?? [])]) {
    if (out.includes(s)) throw new VariantError(`forbidden string left in Codex variant: "${s}"`)
  }
  const dated = out.match(DATED_MODEL)
  if (dated) throw new VariantError(`dated model name left in Codex variant: "${dated[0]}…"`)
  const a = headings(claude).map((h) => renames[h] ?? h), b = headings(out)
  if (a.join('\n') !== b.join('\n')) throw new VariantError(`section headings differ from the Claude variant:\n  claude: ${a.join(' | ')}\n  codex:  ${b.join(' | ')}`)
  return out
}

// Writes the complete skill folder for the runtime into `out` (which must be empty or absent).
export function buildVariant(skillDir, runtime, out) {
  const skillMd = buildSkillMd(skillDir, runtime)
  if (existsSync(out) && readdirSync(out).length) throw new VariantError(`output dir is not empty: ${out}`)
  mkdirSync(out, { recursive: true })
  cpSync(skillDir, out, { recursive: true, filter: (src) => !['.git', '.DS_Store'].includes(basename(src)) })
  rmSync(join(out, 'runtimes'), { recursive: true, force: true })
  writeFileSync(join(out, 'SKILL.md'), skillMd)
}

function main(argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const skill = arg('--skill'), runtime = arg('--runtime'), out = arg('--out')
  if (!skill || !runtime || (!out && !argv.includes('--check'))) {
    process.stderr.write('usage: build-runtime-variant.mjs --skill <dir> --runtime codex|claude (--out <dir> | --check)\n')
    return 2
  }
  try {
    const target = out ?? mkdtempSync(join(tmpdir(), 'runtime-variant-'))
    buildVariant(skill, runtime, target)
    if (!out) rmSync(target, { recursive: true, force: true })
    process.stdout.write(`OK ${runtime} variant of ${basename(skill)}${out ? ` -> ${out}` : ' (check only)'}\n`)
    return 0
  } catch (err) {
    if (err instanceof NotDeclaredError) { process.stderr.write(`NOT_DECLARED: ${err.message}\n`); return 3 }
    if (err instanceof VariantError || err instanceof SyntaxError) { process.stderr.write(`FAILED: ${err.message}\n`); return 1 }
    throw err
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)))
