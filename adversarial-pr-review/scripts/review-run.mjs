#!/usr/bin/env node
// review-run.mjs — bookkeeping for adversarial-pr-review. The model judges (finds bugs, picks
// dispositions); this script resolves the repo and HEAD itself, keeps the round state, can call the
// cross-model reviewer, runs the gate, writes verdict.json and writes the sentinel ONLY on PASS for HEAD.
// State lives under <git-dir>/adversarial-review/ (never committed). Zero dependencies, Node >= 20.
// The round cap is per PR and survives reruns of start; a new PR from a reused branch starts by deleting that folder by hand.
//
//   start    [--repo p] [--base ref]                print state, inventory (newFiles), rounds left; rerun any time
//   round    <findings.json> [--triage]              record a round (cap 2 per PR, Mode A + B); --triage records bot-comment
//                                                    dispositions once the cap is spent (no fan-out, not counted)
//   fix      <id...>                                 mark FIX findings fixed (after the fix commit + fresh verifier)
//   cross    [--author claude|codex] [--model m]     billed other-family review of base...HEAD, once per HEAD
//   finalize --gate <cmd> | --no-gate <reason> [--guardian aligned|drift|none] [--sheet p] [--trivial] [--delta-ok <note>]
//   check    [--head sha]                            exit 0 PASS for that HEAD, 1 FAIL, 3 no verdict for it, 4 PASS voided by later findings
//
// Round file: {"findings":[{"id","severity":"P1|P2|P3","origin":"introduced|aggravated|pre-existing",
//   "summary","disposition":"FIX|CHIP|WONT_FIX|INVALID","reason"}],"openQuestions":[],"residualRisk":""}
// Exit codes: 0 ok / PASS, 1 FAIL, 2 usage or state error, 3 (check) no verdict for the HEAD, 4 (check) PASS voided.

import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const ROUND_CAP = 2
export const VERDICT_SCHEMA = 'adversarial.verdict/1'
const SEVERITIES = ['P1', 'P2', 'P3']
const ORIGINS = ['introduced', 'aggravated', 'pre-existing']
const DISPOSITIONS = ['FIX', 'CHIP', 'WONT_FIX', 'INVALID']
const BOOLEAN_FLAGS = new Set(['trivial', 'triage', 'help'])

export class UsageError extends Error {}

const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
const tryGit = (repo, args) => { try { return git(repo, args).trim() } catch { return null } }

export function parseArgs(argv) {
  const [cmd, ...rest] = argv
  const flags = {}, pos = []
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (!a.startsWith('--')) { pos.push(a); continue }
    const [k, inline] = a.slice(2).split(/=(.*)/s)
    if (BOOLEAN_FLAGS.has(k)) { flags[k] = true; continue }
    const v = inline ?? rest[++i]
    if (v === undefined || v.startsWith('--')) throw new UsageError(`--${k} needs a value`)
    flags[k] = v
  }
  return { cmd, flags, pos }
}

// ---------- repo + state ----------

function resolveCtx(flags, cwd) {
  const start = resolve(cwd, flags.repo ?? '.')
  const repo = tryGit(start, ['rev-parse', '--show-toplevel'])
  if (!repo) throw new UsageError(`not a git repository: ${start}`)
  const head = tryGit(repo, ['rev-parse', '--verify', 'HEAD^{commit}'])
  if (!head) throw new UsageError('repository has no HEAD commit')
  const gitDir = git(repo, ['rev-parse', '--absolute-git-dir']).trim()
  const branch = tryGit(repo, ['branch', '--show-current']) || '(detached)'
  return { repo, head, gitDir, branch, dir: join(gitDir, 'adversarial-review') }
}

function writeAtomic(file, content) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, content)
  renameSync(tmp, file)
}
const readJson = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return null } }
const saveState = (c, s) => writeAtomic(join(c.dir, 'state.json'), JSON.stringify(s, null, 2) + '\n')
const digest = (s) => createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0, 16)
const sentinelPath = (c) => join(c.gitDir, '.adversarial-review-passed')
const sentinelHead = (c) => existsSync(sentinelPath(c)) ? readFileSync(sentinelPath(c), 'utf8').trim().split(/\s+/)[0] : null
// New findings after a PASS void it: the sentinel for this HEAD goes, and check sees a changed state.
const voidPass = (c) => { if (sentinelHead(c) === c.head) rmSync(sentinelPath(c)) }
function needState(c) {
  const s = readJson(join(c.dir, 'state.json'))
  if (!s) throw new UsageError(`no review state for ${c.repo} (branch ${c.branch}): run "review-run.mjs start" from this checkout first`)
  return s
}

function mergeBase(c, baseRef) {
  const mb = tryGit(c.repo, ['merge-base', baseRef, c.head])
  if (!mb) throw new UsageError(`no merge-base between ${baseRef} and HEAD`)
  return mb
}

// The two NUL-delimited inventory commands: additions vs <sha> (committed, staged, unstaged) + untracked.
function inventory(c, sha) {
  const nul = (args) => git(c.repo, args).split('\0').filter(Boolean)
  const added = nul(['diff', '--diff-filter=A', '--no-renames', '--name-only', '-z', sha, '--'])
  return [...new Set([...added, ...nul(['ls-files', '--others', '--exclude-standard', '-z'])])]
}

const sheets = (c, flags) => flags.sheet ? [flags.sheet]
  : (existsSync(join(c.repo, '.chantier')) ? readdirSync(join(c.repo, '.chantier')) : [])
    .map((d) => join('.chantier', d, 'intention.md')).filter((p) => existsSync(join(c.repo, p)))

const used = (state) => state.rounds.filter((r) => !r.triage).length

// Latest entry per finding id (a later round re-judging an id replaces the earlier one).
function latest(state) {
  const m = new Map()
  for (const r of state.rounds) for (const f of r.findings) m.set(f.id, f)
  return m
}

// ---------- findings validation ----------

export function validateRound(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.findings)) throw new UsageError('round file needs a "findings" array')
  if (!Array.isArray(value.openQuestions ?? [])) throw new UsageError('"openQuestions" must be an array of strings')
  const seen = new Set()
  const findings = value.findings.map((f, i) => {
    const at = `findings[${i}]`
    if (!f || typeof f !== 'object') throw new UsageError(`${at} is not an object`)
    for (const k of ['id', 'summary']) if (typeof f[k] !== 'string' || !f[k].trim()) throw new UsageError(`${at}.${k} must be a non-empty string`)
    if (seen.has(f.id)) throw new UsageError(`${at}: duplicate id ${f.id}`)
    seen.add(f.id)
    if (!SEVERITIES.includes(f.severity)) throw new UsageError(`${at}.severity must be ${SEVERITIES.join('|')}`)
    if (!ORIGINS.includes(f.origin)) throw new UsageError(`${at}.origin must be ${ORIGINS.join('|')}`)
    if (!DISPOSITIONS.includes(f.disposition)) throw new UsageError(`${at}.disposition must be ${DISPOSITIONS.join('|')}`)
    if (f.disposition !== 'FIX' && !String(f.reason ?? '').trim()) throw new UsageError(`${at}: ${f.disposition} needs a one-line "reason"`)
    if (f.disposition === 'FIX' && f.origin === 'pre-existing' && f.severity !== 'P1') throw new UsageError(`${at}: a pre-existing finding is never FIX unless P1 (rule 2)`)
    return { id: f.id, severity: f.severity, origin: f.origin, summary: f.summary, disposition: f.disposition, reason: f.reason ?? '', fixed: false }
  })
  return { findings, openQuestions: (value.openQuestions ?? []).map(String), residualRisk: String(value.residualRisk ?? '') }
}

// ---------- commands ----------

function cmdStart(c, flags, out) {
  const old = readJson(join(c.dir, 'state.json'))
  const baseRef = flags.base ?? old?.baseRef ?? tryGit(c.repo, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  if (!baseRef) throw new UsageError('no base ref: pass --base <ref> (origin/HEAD is not set)')
  if (old?.rounds.length && baseRef !== old.baseRef) throw new UsageError(`the base ref is fixed once a round is recorded (${old.baseRef}); a wider base would certify an unreviewed diff`)
  const base = mergeBase(c, baseRef)
  const state = old ? { ...old, baseRef } : { schema: 'adversarial.state/1', baseRef, rounds: [], cross: [], crossRuns: [] }
  saveState(c, state)
  const last = state.rounds.at(-1)
  const info = {
    repo: c.repo, gitDir: c.gitDir, branch: c.branch, head: c.head, baseRef, base,
    dirty: git(c.repo, ['status', '--porcelain']).trim() !== '',
    roundsUsed: used(state), roundsLeft: ROUND_CAP - used(state),
    stat: git(c.repo, ['diff', '--stat=160', `${base}...${c.head}`]).trim(),
    newFiles: inventory(c, base),
    ...(last ? { newFilesSinceLastRound: inventory(c, last.head) } : {}),
    intentSheets: sheets(c, flags),
    roundFile: { findings: [{ id: 'F1', severity: 'P1|P2|P3', origin: ORIGINS.join('|'), summary: '', disposition: DISPOSITIONS.join('|'), reason: 'required unless FIX' }], openQuestions: [], residualRisk: '' },
    next: used(state) >= ROUND_CAP ? 'cap reached: fix with fresh verifiers, then finalize'
      : 'hunt + verify, write the round file, then: review-run.mjs round <file>',
  }
  out(JSON.stringify(info, null, 2) + '\n')
  return 0
}

function cmdRound(c, pos, flags, out) {
  const state = needState(c)
  if (flags.triage && used(state) < ROUND_CAP) throw new UsageError('a round remains: record this as a round, --triage is for after the cap')
  if (!flags.triage && used(state) >= ROUND_CAP) throw new UsageError(`round cap reached: ${ROUND_CAP} rounds already recorded for this PR (rule 1); bot-comment dispositions go in with --triage`)
  if (!pos[0]) throw new UsageError('round needs a findings file')
  const raw = readJson(resolve(pos[0]))
  if (!raw) throw new UsageError(`cannot read JSON from ${pos[0]}`)
  const round = { round: state.rounds.length + 1, triage: Boolean(flags.triage), head: c.head, at: new Date().toISOString(), ...validateRound(raw) }
  state.rounds.push(round)
  saveState(c, state)
  voidPass(c)
  const l = latest(state)
  const fix = round.findings.filter((f) => f.disposition === 'FIX').map((f) => f.id)
  const crossOpen = state.cross.filter((x) => !l.has(x.id)).map((x) => x.id)
  out(`round ${round.round}${round.triage ? ' (triage)' : `/${ROUND_CAP}`} recorded at ${c.head.slice(0, 8)}: ${round.findings.length} finding(s), FIX [${fix.join(', ')}]` +
    `${crossOpen.length ? `, cross findings without disposition [${crossOpen.join(', ')}]` : ''}\n`)
  return 0
}

function cmdFix(c, pos, out) {
  const state = needState(c)
  if (!pos.length) throw new UsageError('fix needs finding ids')
  for (const id of pos) {
    const round = [...state.rounds].reverse().find((r) => r.findings.some((f) => f.id === id))
    const f = round?.findings.find((x) => x.id === id)
    if (!f) throw new UsageError(`unknown finding ${id}`)
    if (f.disposition !== 'FIX') throw new UsageError(`${id} is ${f.disposition}, not FIX`)
    if (round.head === c.head) throw new UsageError(`${id}: HEAD is still the reviewed commit ${c.head.slice(0, 8)}: commit the fix first`)
    f.fixed = true
    f.fixedAt = c.head
  }
  saveState(c, state)
  voidPass(c)
  out(`marked fixed at ${c.head.slice(0, 8)}: ${pos.join(', ')}\n`)
  return 0
}

export function findCrossScript(flags, env = process.env) {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [flags.script, env.CROSS_REVIEW_SCRIPT, resolve(here, '../../scripts/cross-review/cross-review.mjs'),
    join(homedir(), 'Desktop/my-projets/claude-skills/scripts/cross-review/cross-review.mjs')]
  return candidates.find((p) => p && existsSync(p)) ?? null
}

function cmdCross(c, flags, out, err) {
  const state = needState(c)
  const author = flags.author ?? 'claude'
  if (!['claude', 'codex'].includes(author)) throw new UsageError('--author must be claude or codex')
  if (state.crossRuns.some((r) => r.head === c.head)) throw new UsageError(`cross review already ran on ${c.head.slice(0, 8)} (billed call): read its findings in state.json`)
  const script = findCrossScript(flags)
  if (!script) throw new UsageError('cross-review.mjs not found: pass --script <path> or set CROSS_REVIEW_SCRIPT')
  const file = join(c.dir, `cross-${c.head.slice(0, 8)}.json`)
  rmSync(file, { force: true })
  const args = [script, '--repo', c.repo, '--base', state.baseRef, '--direction', author === 'claude' ? 'codex-reviews-claude' : 'claude-reviews-codex', '--out', file]
  if (flags.model) args.push('--model', flags.model)
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0 && r.status !== 1) throw new UsageError(`cross review failed (exit ${r.status ?? r.error?.message}): ${(r.stderr || r.stdout).trim().slice(0, 500)}`)
  const review = readJson(file)
  if (!review || review.schema !== 'cross.review/1' || review.head !== c.head || !Array.isArray(review.findings)) {
    throw new UsageError('cross review wrote no valid review.json for this HEAD: not a pass')
  }
  let n = state.cross.length
  const added = review.findings.map((f) => ({ id: `X${++n}`, head: c.head, reviewer: review.reviewer, ...f }))
  state.cross.push(...added)
  state.crossRuns.push({ head: c.head, reviewer: review.reviewer, findings: added.length })
  saveState(c, state)
  voidPass(c)
  out(JSON.stringify({ reviewer: review.reviewer, file, findings: added }, null, 2) + '\n')
  err('give every X<n> finding a disposition in a round file\n')
  return 0
}

function runGate(c, cmd) {
  const r = spawnSync(cmd, { shell: true, cwd: c.repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 })
  const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-12).join('\n')
  const exit = r.status ?? -1
  return { status: exit === 0 ? 'pass' : 'fail', command: cmd, exit, tail }
}

export function finalize(c, flags, state) {
  if (git(c.repo, ['status', '--porcelain']).trim() !== '') throw new UsageError('working tree is not clean: commit the reviewed state first')
  if (!flags.gate && !flags['no-gate']) throw new UsageError('finalize needs --gate <command> or --no-gate <reason>')
  const reasons = [], warnings = []
  const base = mergeBase(c, state.baseRef)
  const rounds = state.rounds
  const last = rounds.at(-1)
  const l = latest(state)
  const entries = [...l.values()]
  const full = rounds.filter((r) => !r.triage)
  const tier = full.length ? 'full' : 'trivial'

  if (!full.length && !flags.trivial) reasons.push('no round recorded (use --trivial only for a typo, comment or one-line change)')
  const unfixed = entries.filter((f) => f.disposition === 'FIX' && !f.fixed).map((f) => f.id)
  if (unfixed.length) reasons.push(`FIX not fixed and verified: ${unfixed.join(', ')}`)
  const p1 = entries.filter((f) => f.severity === 'P1' && (f.disposition === 'CHIP' || f.disposition === 'WONT_FIX')).map((f) => f.id)
  if (p1.length) reasons.push(`P1 left open (${p1.join(', ')}): a P1 is FIX or INVALID`)
  const noDisp = state.cross.filter((x) => !l.has(x.id)).map((x) => x.id)
  if (noDisp.length) reasons.push(`cross-review findings without disposition: ${noDisp.join(', ')}`)
  if (last?.openQuestions.length) reasons.push(`open questions after the last round: ${last.openQuestions.join(' | ')}`)
  if (full.length === 1 && full[0].findings.some((f) => f.disposition === 'FIX') && c.head !== full[0].head) reasons.push('round 2 owed: round 1 committed a fix')

  let delta = null
  const ancestor = (a, b) => { try { git(c.repo, ['merge-base', '--is-ancestor', a, b]); return true } catch { return false } }
  const lastFull = full.at(-1) // a triage record never moves the reviewed commit
  if (lastFull && !ancestor(lastFull.head, c.head)) reasons.push(`history rewritten: the reviewed commit ${lastFull.head.slice(0, 8)} is not an ancestor of HEAD, review again`)
  else if (lastFull && c.head !== lastFull.head) {
    delta = { from: lastFull.head, to: c.head, files: git(c.repo, ['diff', '--name-only', lastFull.head, c.head]).split('\n').filter(Boolean), note: flags['delta-ok'] ?? '' }
    if (!delta.note) reasons.push('HEAD moved since the last round: pass --delta-ok "<a fresh verifier classified every hunk as fix, gate repair, clean base merge or sheet removal>"')
  }

  const found = sheets(c, flags)
  const guardian = found.length ? (flags.guardian ?? 'none') : 'n/a'
  if (found.length && !['aligned', 'drift'].includes(guardian)) reasons.push(`intent sheet exists (${found.join(', ')}) and the guardian verdict is "${guardian}": run gardien-intention, pass --guardian aligned|drift`)
  if (guardian === 'drift') warnings.push('guardian reported DERIVE: remove the listed parts or justify each in the PR body')

  let gate = { status: 'not-run' }
  if (!reasons.length) {
    gate = flags['no-gate'] ? { status: 'skipped', reason: flags['no-gate'] } : runGate(c, flags.gate)
    const moved = tryGit(c.repo, ['rev-parse', 'HEAD']) !== c.head || git(c.repo, ['status', '--porcelain']).trim() !== ''
    if (moved) { gate.status = 'fail'; reasons.push('the gate changed HEAD or the working tree: commit that change and review it') }
    else if (gate.status === 'fail') reasons.push(`gate failed (exit ${gate.exit}): ${gate.command}`)
    if (gate.status === 'skipped') warnings.push(`gate skipped: ${gate.reason} (a skip is not a pass: state it in the PR body)`)
  }

  return {
    schema: VERDICT_SCHEMA, head: c.head, base, baseRef: state.baseRef, repo: c.repo, branch: c.branch, tier,
    rounds: rounds.map((r) => ({ round: r.round, triage: r.triage, head: r.head, findings: r.findings.length, openQuestions: r.openQuestions })),
    findings: entries, cross: state.cross, crossRuns: state.crossRuns, gate, guardian, delta,
    residualRisk: rounds.map((r) => r.residualRisk).filter(Boolean).join(' | '),
    warnings, reasons, stateDigest: digest(state), verdict: reasons.length ? 'FAIL' : 'PASS', at: new Date().toISOString(),
  }
}

function cmdFinalize(c, flags, out) {
  const verdict = finalize(c, flags, needState(c))
  writeAtomic(join(c.dir, 'verdict.json'), JSON.stringify(verdict, null, 2) + '\n')
  if (verdict.verdict === 'PASS') {
    writeAtomic(sentinelPath(c), `${c.head}\n`)
    if (sentinelHead(c) !== c.head) throw new Error('sentinel read-back mismatch')
  } else voidPass(c) // a FAIL on this HEAD must not leave an older pass for it
  out(`${verdict.verdict} ${c.head.slice(0, 8)} (${verdict.tier}, ${verdict.rounds.length} round(s)) -> ${join(c.dir, 'verdict.json')}\n` +
    [...verdict.reasons.map((r) => `  FAIL: ${r}`), ...verdict.warnings.map((w) => `  warn: ${w}`)].map((s) => s + '\n').join(''))
  return verdict.verdict === 'PASS' ? 0 : 1
}

function cmdCheck(c, flags, out) {
  const v = readJson(join(c.dir, 'verdict.json'))
  const want = flags.head ?? c.head
  if (!v || v.schema !== VERDICT_SCHEMA) { out(`no verdict for ${want.slice(0, 8)} (absent, not a pass)\n`); return 3 }
  if (v.head !== want) { out(`stale verdict: reviewed ${v.head.slice(0, 8)}, asked ${want.slice(0, 8)} (not a pass)\n`); return 3 }
  if (v.verdict === 'PASS' && (v.stateDigest !== digest(readJson(join(c.dir, 'state.json'))) || sentinelHead(c) !== v.head)) {
    out(`voided: findings were recorded after the PASS for ${v.head.slice(0, 8)}, finalize again (not a pass)\n`); return 4
  }
  out(`${v.verdict} ${v.head.slice(0, 8)}${v.verdict === 'FAIL' ? `: ${v.reasons.join(' | ')}` : ''}\n`)
  return v.verdict === 'PASS' ? 0 : 1
}

const USAGE = 'usage: review-run.mjs start|round|fix|cross|finalize|check  (see the header of this file)\n'

export async function main(argv, deps = {}) {
  const out = deps.stdout ?? ((s) => process.stdout.write(s))
  const err = deps.stderr ?? ((s) => process.stderr.write(s))
  try {
    const { cmd, flags, pos } = parseArgs(argv)
    if (!cmd || cmd === '--help' || flags.help) { out(USAGE); return cmd ? 0 : 2 }
    if (!['start', 'round', 'fix', 'cross', 'finalize', 'check'].includes(cmd)) throw new UsageError(`unknown command ${cmd}`)
    const c = resolveCtx(flags, deps.cwd ?? process.cwd())
    if (cmd === 'start') return cmdStart(c, flags, out)
    if (cmd === 'round') return cmdRound(c, pos, flags, out)
    if (cmd === 'fix') return cmdFix(c, pos, out)
    if (cmd === 'cross') return cmdCross(c, flags, out, err)
    if (cmd === 'finalize') return cmdFinalize(c, flags, out)
    return cmdCheck(c, flags, out)
  } catch (e) {
    err(e instanceof UsageError ? `error: ${e.message}\n` : `error: ${e?.stack ?? e}\n`)
    return 2
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code))
}
