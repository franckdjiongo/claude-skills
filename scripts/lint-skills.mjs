#!/usr/bin/env node
// lint-skills.mjs — parity and lint check for skills and skill catalogs (rule R11,
// docs/skill-design-rules.md). Read-only: it never writes anything.
//
// Usage:  node scripts/lint-skills.mjs [--json] [--verbose]
//                [--home <dir>] [--repo <dir>] [--projects <dir>] [--allowlist <file>]
// Exit:   0 = no error (warnings allowed), 1 = at least one error.
//
// Dormant skills: a skill switched off in ~/.claude/settings.json skillOverrides AND
// (disabled in ~/.codex/config.toml [[skills.config]] OR without a Codex user-scope
// copy) is reported once as an info line and skipped for R1, R7, REF-MISSING and
// CODEX-PATH. A skill still loaded on one runtime is never dormant.
//
// Runtimes: Claude Code user scope = <home>/.claude/skills, Codex user scope =
// <home>/.agents/skills. Project scope = <project>/.claude/skills and
// <project>/.agents/skills. The hard-excluded repos (Gilbert, Temps Chantier) are
// never read.

import { readFileSync, readdirSync, existsSync, statSync, realpathSync, lstatSync } from 'node:fs'
import { join, resolve, basename, dirname, relative } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const MAX_LINES = 150
export const MAX_WORDS = 1800
export const MAX_DESC = 300
// A dated model release (ported from meta-govern 1.20.0). A line carrying `model-routing:allow` is exempt.
const MODEL_PIN_RE = /\b(?:Claude[\s-]+)?(?:Opus|Sonnet|Haiku|Fable|Mythos)\s*\d+(?:\.\d+)?\b|\bclaude-(?:opus|sonnet|haiku|fable|mythos)-\d[\w.-]*/gi

const TEXT_EXT = new Set(['.md', '.mdx', '.txt', '.json', '.yaml', '.yml', '.toml', '.mjs', '.js', '.cjs', '.ts', '.sh', '.py', '.html', '.htm', '.cs'])
const SKIP_DIRS = new Set(['node_modules', '.git', '.worktrees', 'dist', '.system', 'synced', '__pycache__', '.DS_Store'])
const GENERIC_NOT_SKILLS = new Set(['name', 'description', 'skill', 'skills'])

// ---------------------------------------------------------------- exclusions

export function isExcludedPath(p) {
  const low = String(p).toLowerCase()
  if (low.includes('gilbert')) return true
  return low.split(/[\\/]/).some((seg) => seg === 'tempschantier' || seg.startsWith('temps-chantier-code-app'))
}

// ---------------------------------------------------------------- fs helpers

function safeReal(p) {
  try { return realpathSync(p) } catch { return null }
}
function isDir(p) { try { return statSync(p).isDirectory() } catch { return false } }
function isFile(p) { try { return statSync(p).isFile() } catch { return false } }
function readText(p) { try { return readFileSync(p, 'utf8') } catch { return null } }
function sha(buf) { return createHash('sha256').update(buf).digest('hex') }

function listDir(p) {
  try { return readdirSync(p, { withFileTypes: true }) } catch { return [] }
}

/** Skill directories (with a SKILL.md) directly under `root`, symlinks followed. */
export function skillDirsIn(root) {
  const out = new Map()
  for (const e of listDir(root)) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue
    const p = join(root, e.name)
    if (!isDir(p)) continue
    const real = safeReal(p)
    if (!real || isExcludedPath(real) || isExcludedPath(p)) continue
    if (isFile(join(p, 'SKILL.md'))) out.set(e.name, p)
  }
  return out
}

/** Every SKILL.md up to `depth` levels below `root` (plugin containers included). */
function nestedSkillDirs(root, depth = 3) {
  const out = []
  const walk = (dir, d) => {
    if (d > depth) return
    for (const e of listDir(dir)) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name) || e.name === 'skills-app' || e.name === 'plans') continue
      const p = join(dir, e.name)
      if (!isDir(p)) continue
      if (isFile(join(p, 'SKILL.md'))) out.push(p)
      else walk(p, d + 1)
    }
  }
  walk(root, 1)
  return out
}

function walkFiles(dir, acc = [], maxFiles = 4000) {
  for (const e of listDir(dir)) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = join(dir, e.name)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walkFiles(p, acc, maxFiles)
    else if (st.isFile() && acc.length < maxFiles) acc.push(p)
  }
  return acc
}

// ---------------------------------------------------------------- frontmatter

/** Minimal frontmatter reader: top-level scalars, block scalars (> | >- |-), plain/quoted multi-line. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (!m) return { present: false, raw: '', fields: {} }
  const raw = m[1]
  const lines = raw.split(/\r?\n/)
  const fields = {}
  for (let i = 0; i < lines.length; i++) {
    const km = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i])
    if (!km) continue
    const key = km[1]
    let rest = km[2].trim()
    const cont = []
    let j = i + 1
    while (j < lines.length && (/^\s+\S/.test(lines[j]) || lines[j].trim() === '')) { cont.push(lines[j]); j++ }
    while (cont.length && cont[cont.length - 1].trim() === '') cont.pop()
    if (/^[>|][+-]?$/.test(rest)) {
      const folded = rest[0] === '>'
      const body = cont.map((l) => l.trim())
      fields[key] = folded ? body.filter((l, idx) => l !== '' || body[idx - 1] !== '').join(' ').replace(/\s+/g, ' ').trim() : body.join('\n').trim()
    } else if (rest === '') {
      fields[key] = cont.map((l) => l.trim()).filter(Boolean).join(' ')
    } else {
      const q = rest[0]
      if ((q === '"' || q === "'") && !(rest.length > 1 && rest.endsWith(q))) {
        fields[key] = [rest, ...cont.map((l) => l.trim())].join(' ').replace(/^["']|["']$/g, '')
      } else if (q === '"' || q === "'") {
        fields[key] = rest.slice(1, -1)
      } else {
        fields[key] = [rest, ...cont.map((l) => l.trim())].filter(Boolean).join(' ')
      }
    }
    i = j - 1
  }
  return { present: true, raw, fields }
}

function hasKey(raw, re) { return re.test(raw) }

// ---------------------------------------------------------------- allowlist

export function loadAllowlist(path) {
  const empty = { runtimeOnly: {}, sizeExceptions: {}, ignoreRefs: {}, ignoreCatalogRefs: {}, ignoreCodexPath: {} }
  const text = path ? readText(path) : null
  if (text == null) return { ...empty, _problems: [] }
  let data
  try { data = JSON.parse(text) } catch (e) { return { ...empty, _problems: [`allowlist is not valid JSON: ${e.message}`] } }
  const problems = []
  const out = { ...empty }
  for (const k of Object.keys(empty)) {
    out[k] = data[k] && typeof data[k] === 'object' ? data[k] : {}
    for (const [name, v] of Object.entries(out[k])) {
      const reason = typeof v === 'string' ? v : v && v.reason
      if (!reason || !String(reason).trim()) problems.push(`allowlist ${k}.${name} has no reason`)
    }
  }
  return { ...out, _problems: problems }
}

const reasonOf = (v) => (typeof v === 'string' ? v : v && v.reason)

// ---------------------------------------------------------------- universe

function readJson(p) {
  const t = readText(p)
  if (t == null) return null
  try { return JSON.parse(t) } catch { return null }
}

/**
 * Everything that can resolve a skill name.
 * Returns entries { name, source, plugin?, path }.
 */
export function buildUniverse(cfg) {
  const entries = []
  const add = (name, source, path, plugin) => entries.push({ name, source, path, plugin })

  for (const [n, p] of skillDirsIn(join(cfg.home, '.claude', 'skills'))) add(n, 'claude-user', p)
  for (const [n, p] of skillDirsIn(join(cfg.home, '.agents', 'skills'))) add(n, 'codex-user', p)

  // claude.ai synced skills (bucket dirs), read-only universe
  const synced = join(cfg.home, '.claude', 'skills', 'synced')
  for (const b of listDir(synced)) {
    if (!b.isDirectory() || b.name.startsWith('.')) continue
    for (const [n, p] of skillDirsIn(join(synced, b.name))) add(n, 'synced', p, 'anthropic-skills')
  }

  // library repo
  for (const p of nestedSkillDirs(cfg.repoRoot)) add(basename(p), 'library', p)
  for (const [n, p] of skillDirsIn(join(cfg.repoRoot, '.claude', 'skills'))) add(n, 'library', p)
  const mk = readJson(join(cfg.repoRoot, '.claude-plugin', 'marketplace.json'))
  for (const pl of (mk && mk.plugins) || []) if (pl && pl.name) add(pl.name, 'library-plugin', cfg.repoRoot, pl.name)

  // installed plugins
  const installed = readJson(join(cfg.home, '.claude', 'plugins', 'installed_plugins.json'))
  for (const [key, arr] of Object.entries((installed && installed.plugins) || {})) {
    const pluginName = key.split('@')[0]
    for (const inst of Array.isArray(arr) ? arr : []) {
      const root = inst && inst.installPath
      if (!root || !isDir(root)) continue
      for (const p of nestedSkillDirs(root, 3)) add(basename(p), 'plugin', p, pluginName)
    }
  }
  return entries
}

/** Per-project local skill names (.claude/skills, .agents/skills). */
function projectLocalNames(projectDir) {
  const s = new Set()
  for (const sub of ['.claude/skills', '.agents/skills', '.codex/skills']) for (const n of skillDirsIn(join(projectDir, sub)).keys()) s.add(n)
  return s
}

// ---------------------------------------------------------------- catalog extraction

const NAME_RE = /^[a-z0-9][a-z0-9_-]*(?::[a-z0-9][a-z0-9_-]*)?\*?$/
const FIRST_GAP_RE = /^[\s:]*(?:(?:projet|unifi\u00e9|user|racine|global)\s+)?$/i
const SEP_RE = /^\s*(?:\([^)]*\)\s*)?(?:(?:,|\/|·|\+|&|et|and|ou|or)\s*)?$/

function expandBraces(s) {
  const m = /^(.*)\{([^}]+)\}(.*)$/.exec(s)
  if (!m) return [s]
  return m[2].split(',').map((x) => `${m[1]}${x.trim()}${m[3]}`)
}

/** Skill names mentioned in free text (project CLAUDE.md, agents). Returns [{name, line}] */
export function extractSkillRefs(text) {
  const refs = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    const push = (n) => { n = n.replace(/\*\*/g, '').trim(); if (NAME_RE.test(n) && !GENERIC_NOT_SKILLS.has(n)) refs.push({ name: n, line: lineNo }) }

    // "skill `a`, `b`" chains (also bold **`a`**)
    const clean = line.replace(/\*\*(`[^`]+`)\*\*/g, '$1')
    const kw = /\b[Ss]kills?\b/g
    let km
    while ((km = kw.exec(clean))) {
      let pos = km.index + km[0].length
      let first = true
      for (;;) {
        const mm = /^([^`]{0,12})`([^`\n]+)`/.exec(clean.slice(pos))
        if (!mm) break
        const gap = mm[1]
        if (first ? !FIRST_GAP_RE.test(gap) : !SEP_RE.test(gap)) break
        push(mm[2])
        pos += mm[0].length
        // allow a trailing parenthetical then a connector before next token
        const par = /^\s*(\([^)]*\))/.exec(clean.slice(pos))
        if (par) {
          const after = clean.slice(pos + par[0].length)
          if (/^\s*(?:,|\/|·|\+|&|et\b|and\b|ou\b|or\b)\s*`/.test(after)) pos += par[0].length
        }
        first = false
      }
    }
    // "`name` skill"
    const post = /`([^`\n]+)`\s+skill\b/g
    let pm
    while ((pm = post.exec(clean))) push(pm[1])
    // .claude/skills/<name> or .agents/skills/{a,b}
    const pth = /\.(?:claude|agents|codex)\/skills\/(\{[^}]+\}|[A-Za-z0-9_-]+)/g
    let hm
    while ((hm = pth.exec(clean))) for (const n of expandBraces(hm[1])) push(n)
  })
  return refs
}

/** Catalog bullets of the library: "## Skill Categories" section, lines "- `name` - ...". */
export function extractCatalogBullets(text) {
  const out = []
  const lines = text.split(/\r?\n/)
  let inSection = false
  lines.forEach((line, idx) => {
    if (/^##\s+/.test(line)) inSection = /^##\s+Skill Categories\b/.test(line)
    if (!inSection) return
    const m = /^\s*-\s+`([^`]+)`\s+[-\u2013\u2014:]/.exec(line)
    if (m) out.push({ name: m[1], line: idx + 1 })
  })
  return out
}

// ---------------------------------------------------------------- resolution

function resolveRef(ref, universe, overrides, enabledPlugins, localNames, installedOnly = false) {
  let { name } = ref
  let plugin = null
  if (name.includes(':')) [plugin, name] = name.split(':')
  const wildcard = name.endsWith('*')
  const prefix = wildcard ? name.slice(0, -1) : null
  const match = (e) => (wildcard ? e.name.startsWith(prefix) : e.name === name)
  let hits = universe.filter(match)
  if (installedOnly) hits = hits.filter((e) => e.source !== 'library' && e.source !== 'library-plugin')
  if (plugin) hits = hits.filter((e) => e.plugin === plugin || e.source === 'library' || e.source === 'claude-user')
  const local = [...localNames].filter((n) => (wildcard ? n.startsWith(prefix) : n === name))
  if (!hits.length && !local.length) return { status: 'missing', name: ref.name }
  const names = new Set([...hits.map((e) => e.name), ...local])
  // enabled?
  const live = [...names].filter((n) => overrides[n] !== 'off')
  if (!live.length) return { status: 'off', name: ref.name }
  // plugin-only skills of a disabled plugin
  if (!local.length) {
    const enabledHit = hits.some((e) => {
      if (overrides[e.name] === 'off') return false
      if (e.source !== 'plugin' && e.source !== 'library-plugin') return true
      const key = Object.keys(enabledPlugins).find((k) => k.split('@')[0] === e.plugin)
      return key ? enabledPlugins[key] === true : true
    })
    if (!enabledHit) return { status: 'plugin-off', name: ref.name }
  }
  return { status: 'ok', name: ref.name }
}

// ---------------------------------------------------------------- skill checks

export function countWords(text) {
  const m = text.match(/\S+/g)
  return m ? m.length : 0
}

const REF_TOKEN = /(?<![\w./~$\-{<}])((?:references|scripts|templates|assets|agents|runtimes)\/[\w.\-/]+\.[A-Za-z0-9]{1,6})(?![\w/{<])/g
const LINK_RE = /\]\((?!https?:|mailto:|#|\/|~|\$)(\.{0,2}\/?[^)\s#]+\.[A-Za-z0-9]{1,6})(?:#[^)]*)?\)/g

export function extractFileRefs(text) {
  const out = new Set()
  let m
  while ((m = REF_TOKEN.exec(text))) out.add(m[1])
  while ((m = LINK_RE.exec(text))) if (!/^[a-z]+:/i.test(m[1]) && !m[1].includes('<')) out.add(m[1])
  return [...out]
}

/** Test files are never shipped to the Codex variant (build-runtime-variant.mjs), so they cannot count as drift. */
export const TEST_FILE_RE = /\.test\.[cm]?[jt]s$/

function treeHash(dir) {
  const out = new Map()
  for (const f of walkFiles(dir)) {
    if (TEST_FILE_RE.test(basename(f))) continue
    try { out.set(relative(dir, f), sha(readFileSync(f))) } catch { /* unreadable */ }
  }
  return out
}

/** Lint one SKILL.md. Returns findings (without the file key dedupe). */
export function lintSkillDir(dir, label, allow, projectRoot = null) {
  const findings = []
  const skillMd = join(dir, 'SKILL.md')
  const text = readText(skillMd)
  if (text == null) return findings
  const name = basename(dir)
  const lines = text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0)
  const words = countWords(text)
  const exc = allow.sizeExceptions[name]
  const maxLines = exc && typeof exc === 'object' && exc.maxLines ? exc.maxLines : MAX_LINES
  const maxWords = exc && typeof exc === 'object' && exc.maxWords ? exc.maxWords : MAX_WORDS
  const f = (rule, severity, message) => findings.push({ rule, severity, skill: name, where: label, message })
  if (lines > maxLines) f('R1-LINES', 'error', `${lines} lines (limit ${maxLines})`)
  if (words > maxWords) f('R1-WORDS', 'error', `${words} words (limit ${maxWords})`)

  const fm = parseFrontmatter(text)
  if (!fm.present) f('R7-DESC', 'error', 'no frontmatter')
  else {
    const d = fm.fields.description
    if (d == null || d === '') f('R7-DESC', 'error', 'no description')
    else if (d.length > MAX_DESC) f('R7-DESC', 'error', `description is ${d.length} chars (limit ${MAX_DESC})`)
    const missing = []
    if (!hasKey(fm.raw, /^\s*owner\s*:/m)) missing.push('owner')
    if (!hasKey(fm.raw, /^\s*runtimes\s*:/m)) missing.push('runtimes')
    if (!hasKey(fm.raw, /^\s*last[-_]?review(?:ed)?\s*:/m)) missing.push('last-review')
    if (missing.length) f('R9-OWNER', 'warning', `missing ${missing.join(', ')}`)
  }

  const realDir = safeReal(dir) || dir
  for (const ref of extractFileRefs(text)) {
    if (allow.ignoreRefs[`${name}/${ref}`] || allow.ignoreRefs[`${name}/*`] || allow.ignoreRefs[ref]) continue
    if (existsSync(resolve(realDir, ref)) || existsSync(resolve(dir, ref))) continue
    if (projectRoot && existsSync(resolve(projectRoot, ref))) continue
    f('REF-MISSING', 'error', `references ${ref}, which does not exist`)
  }
  for (const file of [skillMd, ...walkFiles(join(dir, 'references')).filter((r) => TEXT_EXT.has(r.slice(r.lastIndexOf('.')).toLowerCase()))]) {
    const pins = new Set()
    for (const line of (readText(file) ?? '').split('\n')) if (!line.includes('model-routing:allow')) for (const m of line.matchAll(MODEL_PIN_RE)) pins.add(m[0])
    if (pins.size) f('MODEL-PIN', 'warning', `${relative(dir, file)} names a dated model release (${[...pins].join(', ')}): name the alias (opus, sonnet, haiku)`)
  }
  return findings
}

function codexPathFindings(dir, label) {
  const out = []
  for (const f of walkFiles(dir, [], 1500)) {
    const ext = f.slice(f.lastIndexOf('.')).toLowerCase()
    if (!TEXT_EXT.has(ext)) continue
    let st
    try { st = statSync(f) } catch { continue }
    if (st.size > 1_000_000) continue
    const t = readText(f)
    if (t && t.includes('.Codex/')) out.push({ rule: 'CODEX-PATH', severity: 'error', skill: basename(dir), where: label, message: `${relative(dir, f)} contains a ".Codex/" path` })
  }
  return out
}

function compareRuntimes(claudeDir, agentsDir, scope, allow, skip = {}) {
  const findings = []
  const c = skillDirsIn(claudeDir)
  const a = skillDirsIn(agentsDir)
  if (scope !== 'user' && (!isDir(claudeDir) || !isDir(agentsDir)) && (c.size || a.size)) {
    // The project ships one runtime only: one finding for the project, not one per skill.
    const reason = reasonOf(allow.runtimeOnly[scope]) || reasonOf(allow.runtimeOnly[scope.replace(/^project:/, '')])
    if (!reason) {
      const side = c.size ? 'Claude (.claude/skills)' : 'Codex (.agents/skills)'
      findings.push({ rule: 'RUNTIME-ONE-SIDE', severity: 'error', skill: `${c.size || a.size} skills`, where: scope, message: `project has skills on ${side} only, no reason in the allowlist` })
    }
    return findings
  }
  const names = new Set([...c.keys(), ...a.keys()])
  for (const n of [...names].sort()) {
    const key = scope === 'user' ? n : `${scope}/${n}`
    const inC = c.has(n), inA = a.has(n)
    if (inC !== inA) {
      const reason = reasonOf(allow.runtimeOnly[key]) || reasonOf(allow.runtimeOnly[n])
      if (!reason) findings.push({ rule: 'RUNTIME-ONE-SIDE', severity: 'error', skill: n, where: scope, message: `only on ${inC ? 'Claude (.claude/skills)' : 'Codex (.agents/skills)'}, no reason in the allowlist` })
      continue
    }
    const rc = safeReal(c.get(n)), ra = safeReal(a.get(n))
    if (rc && ra && rc === ra) continue
    if (scope === 'user' && reasonOf(skip[`codex:${n}`])) continue // hand-written Codex variant, reason stated in install-skills.skip.json
    const sc = join(c.get(n), 'scripts'), sa = join(a.get(n), 'scripts')
    const hc = isDir(sc) ? treeHash(sc) : new Map()
    const ha = isDir(sa) ? treeHash(sa) : new Map()
    const diff = []
    for (const k of new Set([...hc.keys(), ...ha.keys()])) {
      if (!hc.has(k)) diff.push(`${k} (Codex only)`)
      else if (!ha.has(k)) diff.push(`${k} (Claude only)`)
      else if (hc.get(k) !== ha.get(k)) diff.push(`${k} (differs)`)
    }
    if (diff.length) findings.push({ rule: 'SCRIPT-DIFF', severity: 'error', skill: n, where: scope, message: `scripts differ between runtimes: ${diff.sort().join(', ')}` })
  }
  return findings
}

// ---------------------------------------------------------------- main run

/** Common git dir of a checkout (main checkout or linked worktree), or null. */
function gitCommonDir(dir) {
  const g = join(dir, '.git')
  try {
    if (statSync(g).isDirectory()) return safeReal(g)
    const m = /^gitdir:\s*(.+)$/m.exec(readFileSync(g, 'utf8'))
    if (!m) return null
    const gd = resolve(dir, m[1].trim())
    const common = readText(join(gd, 'commondir'))
    return safeReal(common ? resolve(gd, common.trim()) : gd)
  } catch { return null }
}

function sameRepo(a, b) {
  if (safeReal(a) && safeReal(a) === safeReal(b)) return true
  const ca = gitCommonDir(a), cb = gitCommonDir(b)
  return Boolean(ca && cb && ca === cb)
}

export function defaultConfig(over = {}) {
  const home = over.home || homedir()
  const here = dirname(fileURLToPath(import.meta.url))
  const repoRoot = over.repoRoot || resolve(here, '..')
  return {
    home,
    repoRoot,
    projectsRoot: over.projectsRoot || join(home, 'Desktop', 'my-projets'),
    allowlistPath: over.allowlistPath || join(repoRoot, 'scripts', 'lint-skills.allowlist.json'),
    ...over,
  }
}

/** install-skills.skip.json: { "<runtime>:<skill>": "<reason>" }. Entries without a reason are returned as problems. */
export function loadSkipReasons(repoRoot) {
  const file = join(repoRoot, 'scripts', 'install-skills.skip.json')
  const text = readText(file)
  if (text == null) return { skip: {}, problems: [] }
  let data
  try { data = JSON.parse(text) } catch (e) { return { skip: {}, problems: [`install-skills.skip.json is not valid JSON: ${e.message}`] } }
  const skip = {}
  const problems = []
  for (const [k, v] of Object.entries(data && typeof data === 'object' ? data : {})) {
    if (typeof v === 'string' && v.trim()) skip[k] = v
    else problems.push(`install-skills.skip.json "${k}" has no reason`)
  }
  return { skip, problems }
}

/** Skill names disabled in ~/.codex/config.toml ([[skills.config]] blocks with enabled = false). */
export function codexDisabledSkills(home) {
  const text = readText(join(home, '.codex', 'config.toml'))
  const out = new Set()
  if (text == null) return out
  for (const block of text.split(/^\s*\[\[skills\.config\]\]\s*$/m).slice(1)) {
    const body = block.split(/^\s*\[/m)[0]
    const en = /^\s*enabled\s*=\s*(true|false)\s*$/m.exec(body)
    const pm = /^\s*path\s*=\s*(?:'([^']*)'|"([^"]*)")\s*$/m.exec(body)
    if (!en || en[1] !== 'false' || !pm) continue
    const path = pm[1] ?? pm[2]
    out.add(basename(basename(path) === 'SKILL.md' ? dirname(path) : path))
  }
  return out
}

/** Dormant = off on Claude AND (disabled on Codex OR no Codex user-scope copy). */
export function dormantSkills(home, overrides) {
  const codexOff = codexDisabledSkills(home)
  const codexCopies = skillDirsIn(join(home, '.agents', 'skills'))
  const out = new Set()
  for (const [n, v] of Object.entries(overrides)) {
    if (v !== 'off') continue
    if (codexOff.has(n) || !codexCopies.has(n)) out.add(n)
  }
  return out
}

export function runLint(cfg) {
  const findings = []
  const notes = []
  const allow = loadAllowlist(cfg.allowlistPath)
  for (const p of allow._problems) findings.push({ rule: 'ALLOWLIST', severity: 'error', skill: '-', where: cfg.allowlistPath, message: p })

  const settings = readJson(join(cfg.home, '.claude', 'settings.json')) || {}
  const overrides = settings.skillOverrides && typeof settings.skillOverrides === 'object' ? settings.skillOverrides : {}
  const enabledPlugins = settings.enabledPlugins && typeof settings.enabledPlugins === 'object' ? settings.enabledPlugins : {}
  const universe = buildUniverse(cfg)
  const dormant = dormantSkills(cfg.home, overrides)
  const { skip, problems: skipProblems } = loadSkipReasons(cfg.repoRoot)
  for (const p of skipProblems) findings.push({ rule: 'ALLOWLIST', severity: 'error', skill: '-', where: join(cfg.repoRoot, 'scripts', 'install-skills.skip.json'), message: p })

  // ---- catalogs
  const checkRefs = (refs, file, localNames, stats, installedOnly) => {
    const seen = new Set()
    for (const r of refs) {
      const k = `${file}:${r.name}`
      if (seen.has(k)) continue
      seen.add(k)
      if (allow.ignoreCatalogRefs[r.name]) continue
      const res = resolveRef(r, universe, overrides, enabledPlugins, localNames, installedOnly)
      if (res.status === 'ok') continue
      const rule = res.status === 'missing' ? 'CAT-MISSING' : 'CAT-DISABLED'
      const why = { missing: 'does not exist', off: 'is switched off in skillOverrides', 'plugin-off': 'only exists in a disabled plugin' }[res.status]
      findings.push({ rule, severity: 'error', skill: r.name, where: `${file}:${r.line}`, message: `catalog names "${r.name}", which ${why}` })
    }
    stats.checked += seen.size
  }
  const stats = { checked: 0, catalogs: 0 }

  for (const f of ['CLAUDE.md', 'AGENTS.md']) {
    const p = join(cfg.repoRoot, f)
    const t = readText(p)
    if (t == null) continue
    stats.catalogs++
    checkRefs(extractCatalogBullets(t), p, new Set(), stats)
    if (t.includes('.Codex/') && !allow.ignoreCodexPath[f]) findings.push({ rule: 'CODEX-PATH', severity: 'error', skill: '-', where: p, message: 'catalog contains a ".Codex/" path' })
  }
  for (const arch of [join(cfg.home, '.claude', 'agents', 'machine-architecte.md'), join(cfg.home, '.codex', 'agents', 'machine-architecte.toml')]) {
    const at = readText(arch)
    if (at != null) { stats.catalogs++; checkRefs(extractSkillRefs(at), arch, new Set(), stats, true) }
  }

  const projects = []
  for (const e of listDir(cfg.projectsRoot)) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue
    const p = join(cfg.projectsRoot, e.name)
    const real = safeReal(p)
    if (!real || isExcludedPath(p) || isExcludedPath(real)) continue
    projects.push(p)
  }
  for (const p of projects.sort()) {
    const cm = join(p, 'CLAUDE.md')
    const t = readText(cm)
    if (t == null) continue
    if (sameRepo(p, cfg.repoRoot)) continue
    stats.catalogs++
    checkRefs(extractSkillRefs(t), cm, projectLocalNames(p), stats, true)
    if (t.includes('.Codex/')) findings.push({ rule: 'CODEX-PATH', severity: 'error', skill: '-', where: cm, message: 'catalog contains a ".Codex/" path' })
  }

  // ---- runtime parity
  findings.push(...compareRuntimes(join(cfg.home, '.claude', 'skills'), join(cfg.home, '.agents', 'skills'), 'user', allow, skip))
  for (const p of projects) {
    const c = join(p, '.claude', 'skills'), a = join(p, '.agents', 'skills')
    if (isDir(c) || isDir(a)) findings.push(...compareRuntimes(c, a, `project:${basename(p)}`, allow))
  }

  // ---- per-skill checks (deduped by content of SKILL.md)
  const dirs = []
  const addDirs = (map, label, root = null) => { for (const [n, p] of map) dirs.push({ p, label: `${label}/${n}`, root }) }
  addDirs(skillDirsIn(join(cfg.home, '.claude', 'skills')), 'claude-user')
  addDirs(skillDirsIn(join(cfg.home, '.agents', 'skills')), 'codex-user')
  for (const p of nestedSkillDirs(cfg.repoRoot)) dirs.push({ p, label: `repo/${relative(cfg.repoRoot, p)}` })
  addDirs(skillDirsIn(join(cfg.repoRoot, '.claude', 'skills')), 'repo/.claude', cfg.repoRoot)
  for (const p of projects) {
    addDirs(skillDirsIn(join(p, '.claude', 'skills')), `${basename(p)}/.claude`, p)
    addDirs(skillDirsIn(join(p, '.agents', 'skills')), `${basename(p)}/.agents`, p)
  }
  const seenReal = new Set()
  const seenDigest = new Map()
  const group = new Map()
  const dormantSeen = new Map()
  let skillCount = 0
  for (const d of dirs) {
    const real = safeReal(d.p)
    if (!real || seenReal.has(real)) continue
    seenReal.add(real)
    skillCount++
    const text = readText(join(d.p, 'SKILL.md')) || ''
    const digestKey = `${basename(d.p)}:${sha(text)}`
    let fs = lintSkillDir(d.p, d.label, allow, d.root)
    fs.push(...codexPathFindings(d.p, d.label))
    if (dormant.has(basename(d.p))) {
      // dormant: loaded on no runtime, so size, description, references and .Codex/ paths are not worth a finding
      const skipped = new Set(['R1-LINES', 'R1-WORDS', 'R7-DESC', 'REF-MISSING', 'CODEX-PATH'])
      fs = fs.filter((x) => !skipped.has(x.rule))
      if (!dormantSeen.has(basename(d.p))) dormantSeen.set(basename(d.p), d.label)
    }
    if (seenDigest.has(digestKey)) {
      // identical SKILL.md already linted: keep only the findings that depend on the directory
      const dirOnly = fs.filter((x) => x.rule === 'REF-MISSING' || x.rule === 'CODEX-PATH')
      findings.push(...dirOnly)
      continue
    }
    seenDigest.set(digestKey, d.label)
    findings.push(...fs)
    group.set(digestKey, d.label)
  }
  for (const [n, label] of [...dormantSeen].sort()) {
    findings.push({ rule: 'DORMANT', severity: 'info', skill: n, where: label, message: 'switched off on every runtime that carried it: skipped for R1, R7, REF-MISSING and CODEX-PATH' })
  }
  stats.skills = skillCount
  stats.projects = projects.length
  return { findings, notes, stats }
}

// ---------------------------------------------------------------- reporting

export function formatReport(result, { verbose = false } = {}) {
  const { findings, stats } = result
  const errs = findings.filter((f) => f.severity === 'error')
  const warns = findings.filter((f) => f.severity === 'warning')
  const infos = findings.filter((f) => f.severity === 'info')
  const out = []
  out.push(`lint-skills: ${stats.skills} skills, ${stats.catalogs} catalogs, ${stats.checked} catalog references checked, ${stats.projects} projects`)
  const order = ['CAT-MISSING', 'CAT-DISABLED', 'CODEX-PATH', 'RUNTIME-ONE-SIDE', 'SCRIPT-DIFF', 'R1-LINES', 'R1-WORDS', 'R7-DESC', 'REF-MISSING', 'ALLOWLIST', 'R9-OWNER', 'DORMANT']
  const byRule = new Map()
  for (const f of findings) { if (!byRule.has(f.rule)) byRule.set(f.rule, []); byRule.get(f.rule).push(f) }
  for (const rule of [...order, ...[...byRule.keys()].filter((r) => !order.includes(r))]) {
    const list = byRule.get(rule)
    if (!list) continue
    const sev = list[0].severity.toUpperCase()
    out.push('', `${rule} [${sev}] x${list.length}`)
    if (rule === 'R9-OWNER' && !verbose) { out.push(`  ${list.length} skills lack owner/runtimes/last-review fields (use --verbose to list)`); continue }
    for (const f of list) out.push(`  ${f.skill} (${f.where}): ${f.message}`)
  }
  out.push('', `${errs.length} error(s), ${warns.length} warning(s)${infos.length ? `, ${infos.length} info` : ''}`)
  return out.join('\n')
}

function parseArgs(argv) {
  const o = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') o.json = true
    else if (a === '--verbose') o.verbose = true
    else if (a === '--home') o.home = resolve(argv[++i])
    else if (a === '--repo') o.repoRoot = resolve(argv[++i])
    else if (a === '--projects') o.projectsRoot = resolve(argv[++i])
    else if (a === '--allowlist') o.allowlistPath = resolve(argv[++i])
    else if (a === '-h' || a === '--help') o.help = true
    else { console.error(`unknown argument: ${a}`); process.exit(2) }
  }
  return o
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log('Usage: node scripts/lint-skills.mjs [--json] [--verbose] [--home D] [--repo D] [--projects D] [--allowlist F]')
    process.exit(0)
  }
  const { json, verbose, help, ...over } = args
  const result = runLint(defaultConfig(over))
  if (json) console.log(JSON.stringify(result, null, 2))
  else console.log(formatReport(result, { verbose }))
  process.exit(result.findings.some((f) => f.severity === 'error') ? 1 : 0)
}
