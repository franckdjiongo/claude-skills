#!/usr/bin/env node
// Convex cost and payload checks for one Convex repository. Ported from meta-govern 1.20.0.
//   convex-cron-unjustified      a cron in convex/crons.ts without a `cost-justified` comment on its line or just above
//   convex-test-real-deployment  a test that reaches a real deployment (ConvexHttpClient, or a real deployment URL with fetch) without convex-test
//   convex-mutation-cast         `as never|any|unknown` inside the arguments of a useMutation or useAction call
// Findings listed in the baseline (default <root>/.claude/convex-checks-baseline.json) are known and do not fail.
// Usage: node convex-checks.mjs [--root <dir>] [--baseline <file>] [--write-baseline]. Exit 0 clean, 1 new findings, 2 error.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.vercel', '.wrangler', '.svelte-kit', '_generated', '.claude', '.chantier', '.worktrees'])
const TEST_RE = /\.(test|spec)\.[cm]?[jt]sx?$/
const SRC_RE = /\.[cm]?[jt]sx?$/
const DEPLOY_URL_RE = /\b(?:https?|wss?):\/\/[a-z0-9]+(?:-[a-z0-9]+)*-\d+\.convex\.(?:cloud|site)\b/i
const CAST_RE = /\bas\s+(?:never|any|unknown)\b/
const CRON_RE = /\bcrons\.(cron|interval|hourly|daily|weekly|monthly)\s*\(/g

function walk(dir, out = []) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p, out) }
    else if (e.isFile() && SRC_RE.test(e.name)) out.push(p)
  }
  return out
}

function crons(root) {
  const file = path.join(root, 'convex', 'crons.ts')
  if (!fs.existsSync(file)) return []
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  const found = []
  for (const m of text.matchAll(CRON_RE)) {
    const at = text.slice(0, m.index).split('\n').length - 1
    const name = text.slice(m.index + m[0].length).match(/^\s*['"`]([^'"`]+)['"`]/)?.[1] ?? `line ${at + 1}`
    let ok = /cost-justified/i.test(lines[at])
    for (let i = at - 1; !ok && i >= 0 && /^\s*(\/\/|\/\*|\*)/.test(lines[i]); i--) ok = /cost-justified/i.test(lines[i])
    if (!ok) found.push({ check: 'convex-cron-unjustified', file: 'convex/crons.ts', detail: name })
  }
  return found
}

function realDeploymentTest(rel, text) {
  if (!TEST_RE.test(rel) || /['"]convex-test['"]/.test(text)) return []
  const client = /\bConvexHttpClient\b/.test(text) && /['"]convex\/browser['"]/.test(text)
  const url = DEPLOY_URL_RE.test(text) && /\bfetch\s*\(/.test(text)
  return client || url ? [{ check: 'convex-test-real-deployment', file: rel, detail: client ? 'ConvexHttpClient' : 'deployment URL' }] : []
}

// Index of the parenthesis that closes text[open] === '(' (strings are not parsed, bounded to 5000 chars).
function closeOf(text, open) {
  let depth = 0
  for (let i = open; i < text.length && i < open + 5000; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')' && --depth === 0) return i
  }
  return -1
}

function mutationCasts(rel, text) {
  if (!/use(?:Mutation|Action)\s*\(/.test(text)) return []
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/.*$/gm, '$1')
  const found = []
  const castIn = (open) => { const close = closeOf(src, open); return close !== -1 && CAST_RE.test(src.slice(open + 1, close)) }
  for (const [, handle] of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*use(?:Mutation|Action)\s*\(/g)) {
    for (const call of src.matchAll(new RegExp(`\\b${handle.replace(/\$/g, '\\$')}\\s*\\(`, 'g'))) {
      if (castIn(call.index + call[0].length - 1)) found.push({ check: 'convex-mutation-cast', file: rel, detail: handle })
    }
  }
  for (const m of src.matchAll(/\buse(?:Mutation|Action)\s*\(/g)) {
    const close = closeOf(src, m.index + m[0].length - 1)
    if (close === -1) continue
    let j = close + 1
    while (/\s/.test(src[j] ?? '')) j++
    if (src[j] === '(' && castIn(j)) found.push({ check: 'convex-mutation-cast', file: rel, detail: 'inline call' })
  }
  return found
}

export function scan(root) {
  const findings = crons(root)
  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/')
    const text = fs.readFileSync(file, 'utf8')
    findings.push(...realDeploymentTest(rel, text), ...mutationCasts(rel, text))
  }
  return findings
}

export const keyOf = (f) => `${f.check} ${f.file} ${f.detail}`

// The baseline counts each finding key, so a second occurrence of a known key is new.
export function run({ root, baselinePath, writeBaseline = false, log = console.log }) {
  const counts = {}
  for (const k of scan(root).map(keyOf).sort()) counts[k] = (counts[k] ?? 0) + 1
  if (writeBaseline) {
    fs.writeFileSync(baselinePath, JSON.stringify({ known: counts }, null, 2) + '\n')
    log(`convex-checks: ${Object.keys(counts).length} known finding(s) written to ${path.basename(baselinePath)}`)
    return 0
  }
  const known = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')).known : {}
  const fresh = Object.entries(counts).filter(([k, n]) => n > (known[k] ?? 0))
  for (const [k, n] of fresh) log(`convex-checks: ${k} (${n}, known ${known[k] ?? 0})`)
  log(`convex-checks: ${fresh.length} new, ${Object.keys(counts).length - fresh.length} known`)
  return fresh.length ? 1 : 0
}

const isMain = () => { try { return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]) } catch { return false } }
if (process.argv[1] && isMain()) {
  const args = process.argv.slice(2)
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
  const root = path.resolve(opt('--root') ?? process.cwd())
  try {
    process.exitCode = run({
      root,
      baselinePath: path.resolve(root, opt('--baseline') ?? '.claude/convex-checks-baseline.json'),
      writeBaseline: args.includes('--write-baseline'),
    })
  } catch (err) {
    console.error(`convex-checks: ${err.message}`)
    process.exitCode = 2
  }
}
