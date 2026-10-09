#!/usr/bin/env node
// review-run.mjs — bookkeeping for adversarial-pr-review. The model judges (finds bugs, picks
// dispositions); this script resolves the repo and HEAD itself, keeps the round state, can call the
// cross-model reviewer, runs the gate, writes verdict.json and writes the sentinel ONLY on PASS for HEAD.
// State lives under <git-dir>/adversarial-review/ (never committed). Zero dependencies, Node >= 20.
// The round cap is per cycle and survives reruns of start. After a FAIL, start --new-cycle <chip-id> archives the state
// (state-<n>.json, verdict-<n>.json) and opens a second and last cycle; a new PR from a reused branch deletes that folder by hand.
// start binds the state to the current branch; every other command refuses another branch (one worktree per PR).
//
//   start    [--repo p] [--base ref] [--new-cycle chip-id]  print state, inventory (newFiles), rounds left; rerun any time
//   round    <findings.json> [--triage] [--head sha] record a round (cap 2 per cycle, Mode A + B); --triage records bot-comment
//                                                    dispositions once the cap is spent (no fan-out, not counted); --head records
//                                                    the commit an external pass reviewed (HEAD or an ancestor), default HEAD
//   adopt    <other-checkout>                        move the review state (+ sentinel) of the same branch from another worktree here
//   fix      <id...> [--subtractive-tried <why>]     mark FIX findings fixed (after the fix commit + fresh verifier); refused
//                                                    without <why> over 30 added lines per finding, or when the round grows a
//                                                    PR of >= 200 reviewed lines by > 15 % (D2: try removing code first, or CHIP)
//   cross    [--author claude|codex] [--model m]     billed other-family review of base...HEAD, once per HEAD;
//                                                    round 1 only, alongside the hunters (D1)
//   finalize --gate <cmd> | --no-gate <reason> [--simplifier <sha>|none] [--sheet p] [--trivial] [--delta-ok <note>]
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
export const CYCLE_CAP = 2
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
  if (!s) throw new UsageError(`no review state for ${c.repo} (branch ${c.branch}): run "review-run.mjs start" from this checkout first, or "adopt <other-checkout>" if the branch moved`)
  // The state lives per worktree, not per branch: a review bound to one branch never absorbs another's rounds.
  // A state written before the binding has no branch and is not checked.
  if (s.branch && s.branch !== c.branch) throw new UsageError(`this review state belongs to branch ${s.branch}, not ${c.branch}: review ${c.branch} from its own worktree, "adopt" its state from there, or run "review-run.mjs start" here if ${s.branch} has nothing recorded`)
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

// Counted lines (D2): not docs, lockfiles or generated code. lineDelta sums numstat over the commits of
// <range> that the base does not have (no merge commits; a --no-ff side branch counts, a base merge does not).
const LOCKS = new Set(['package-lock.json', 'bun.lock', 'bun.lockb', 'yarn.lock', 'pnpm-lock.yaml'])
export const COUNTED = (p) => !p.startsWith('docs/') && !p.startsWith('src/generated/') && !p.endsWith('.md') && !LOCKS.has(p.split('/').pop())
// pick(path) narrows the sum to some counted paths (e.g. tests vs code for the finalize metrics).
export function lineDelta(c, range, baseRef, pick = () => true) {
  const t = git(c.repo, ['log', '--no-merges', '--numstat', '-z', '--format=', range, '--not', baseRef]).split('\0')
  const d = { added: 0, removed: 0 }
  for (let i = 0; i < t.length; i++) {
    const m = /^(\d+|-)\t(\d+|-)\t(.*)$/s.exec(t[i].replace(/^\n+/, ''))
    if (!m) continue
    const path = m[3] === '' ? t[i += 2] : m[3] // rename: "a\tr\t\0old\0new\0", classed under the new path
    if (m[1] !== '-' && COUNTED(path) && pick(path)) { d.added += +m[1]; d.removed += +m[2] }
  }
  return d
}
export const IS_TEST = (p) => /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(p)
// D6: code vs tests added since the merge-base, and what the review rounds added on top of the first full round.
function metrics(c, base, baseRef, firstFull) {
  const code = lineDelta(c, `${base}..HEAD`, baseRef, (p) => !IS_TEST(p)).added
  const tests = lineDelta(c, `${base}..HEAD`, baseRef, IS_TEST).added
  const reviewAdded = firstFull ? lineDelta(c, `${firstFull.head}..HEAD`, baseRef).added : 0
  // null, not 0, when nothing was added: a share of nothing is undefined, not "no review growth".
  const reviewShare = code + tests ? reviewAdded / (code + tests) : null
  return { code, tests, ratio: code ? Math.round((tests / code) * 10) / 10 : null, reviewAdded, reviewShare }
}
const isAncestor = (c, a, b) => { try { git(c.repo, ['merge-base', '--is-ancestor', a, b]); return true } catch { return false } }

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

// Rule 1: after a FAIL, a chip fixing its blocking finding opens one more cycle; the old one is archived, never deleted.
function newCycle(c, old, chip) {
  if (readJson(join(c.dir, 'verdict.json'))?.verdict !== 'FAIL' || !old) throw new UsageError('--new-cycle follows a FAIL verdict of this review')
  const n = old.cycle ?? 1
  if (n >= CYCLE_CAP) throw new UsageError(`cycle cap reached: ${CYCLE_CAP} cycles per PR (rule 1): the PR stays a draft, the user decides`)
  return { schema: old.schema, baseRef: old.baseRef, branch: old.branch, cycle: n + 1, chip, rounds: [], cross: [], crossRuns: [] }
}

function cmdStart(c, flags, out) {
  let old = readJson(join(c.dir, 'state.json'))
  if (flags['new-cycle']) old = newCycle(c, old && needState(c), flags['new-cycle'])
  const baseRef = flags.base ?? old?.baseRef ?? tryGit(c.repo, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  if (!baseRef) throw new UsageError('no base ref: pass --base <ref> (origin/HEAD is not set)')
  if (old?.rounds.length && baseRef !== old.baseRef) throw new UsageError(`the base ref is fixed once a round is recorded (${old.baseRef}); a wider base would certify an unreviewed diff`)
  if (old?.branch && old.branch !== c.branch && (old.rounds.length || old.crossRuns?.length)) {
    throw new UsageError(`this worktree holds the review of branch ${old.branch} (${old.rounds.length} round(s), ${old.crossRuns?.length ?? 0} cross run(s)): review ${c.branch} from its own worktree (git worktree add, then "adopt"), or delete ${c.dir} once that PR is closed`)
  }
  const base = mergeBase(c, baseRef)
  for (const f of flags['new-cycle'] ? ['verdict', 'state'] : []) renameSync(join(c.dir, `${f}.json`), join(c.dir, `${f}-${old.cycle - 1}.json`))
  const state = old ? { ...old, baseRef, branch: c.branch } : { schema: 'adversarial.state/1', baseRef, branch: c.branch, rounds: [], cross: [], crossRuns: [] }
  saveState(c, state)
  const last = state.rounds.at(-1)
  const info = {
    repo: c.repo, gitDir: c.gitDir, branch: c.branch, head: c.head, baseRef, base,
    dirty: git(c.repo, ['status', '--porcelain']).trim() !== '',
    cycle: state.cycle ?? 1, roundsUsed: used(state), roundsLeft: ROUND_CAP - used(state),
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
  if (!flags.triage && used(state) >= ROUND_CAP) throw new UsageError(`round cap reached: ${ROUND_CAP} rounds already recorded for this cycle (rule 1); bot-comment dispositions go in with --triage`)
  if (!pos[0]) throw new UsageError('round needs a findings file')
  const raw = readJson(resolve(pos[0]))
  if (!raw) throw new UsageError(`cannot read JSON from ${pos[0]}`)
  let head = c.head // --head: the commit an external pass reviewed, never one HEAD does not contain
  if (flags.head) {
    head = tryGit(c.repo, ['rev-parse', '--verify', '-q', `${flags.head}^{commit}`])
    if (!head) throw new UsageError(`--head ${flags.head} is not a commit`)
    if (head !== c.head && !isAncestor(c, head, c.head)) throw new UsageError(`--head ${flags.head} is neither HEAD nor an ancestor of HEAD: it cannot have been reviewed on this branch`)
    const mb = mergeBase(c, state.baseRef)
    if (head === mb || isAncestor(c, head, mb)) throw new UsageError(`--head ${flags.head} is not in the reviewed range: it must come after the merge-base ${mb.slice(0, 8)}`)
  }
  const round = { round: state.rounds.length + 1, triage: Boolean(flags.triage), head, at: new Date().toISOString(), ...validateRound(raw) }
  state.rounds.push(round)
  saveState(c, state)
  voidPass(c)
  const l = latest(state)
  const fix = round.findings.filter((f) => f.disposition === 'FIX').map((f) => f.id)
  const crossOpen = state.cross.filter((x) => !l.has(x.id)).map((x) => x.id)
  out(`round ${round.round}${round.triage ? ' (triage)' : `/${ROUND_CAP}`} recorded at ${head.slice(0, 8)}: ${round.findings.length} finding(s), FIX [${fix.join(', ')}]` +
    `${crossOpen.length ? `, cross findings without disposition [${crossOpen.join(', ')}]` : ''}\n`)
  return 0
}

function cmdAdopt(c, pos, out) {
  if (!pos[0]) throw new UsageError('adopt needs the path of the other checkout')
  const from = tryGit(resolve(pos[0]), ['rev-parse', '--absolute-git-dir'])
  if (!from) throw new UsageError(`not a git checkout: ${pos[0]}`)
  const common = (d) => tryGit(d, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  if (common(resolve(pos[0])) !== common(c.repo)) throw new UsageError('that checkout belongs to another repository')
  if (from === c.gitDir) throw new UsageError('source and destination are the same checkout')
  if (c.branch === '(detached)') throw new UsageError('detached HEAD: a branch name is the only proof the state belongs here')
  const src = join(from, 'adversarial-review'), s = readJson(join(src, 'state.json'))
  if (!s) throw new UsageError(`no review state in ${pos[0]}`)
  if (!s.branch) throw new UsageError('that state has no branch: it cannot be proven to belong to this branch')
  if (s.branch !== c.branch) throw new UsageError(`that state belongs to branch ${s.branch}, not ${c.branch}`)
  const mine = readJson(join(c.dir, 'state.json'))
  if (mine?.rounds?.length || mine?.crossRuns?.length) throw new UsageError(`this worktree already holds a review (${mine.rounds.length} round(s), ${mine.crossRuns?.length ?? 0} cross run(s)): never overwritten`)
  rmSync(c.dir, { recursive: true, force: true })
  renameSync(src, c.dir)
  const moved = ['adversarial-review']
  const sf = join(from, '.adversarial-review-passed')
  rmSync(sentinelPath(c), { force: true }) // a PASS of the emptied state must not outlive it
  if (existsSync(sf)) { renameSync(sf, sentinelPath(c)); moved.push('.adversarial-review-passed') }
  out(`adopted from ${from}: ${moved.join(', ')} (${s.rounds.length} round(s)) -> ${c.gitDir}\n`)
  return 0
}

function cmdFix(c, pos, flags, out) {
  const state = needState(c)
  if (!pos.length) throw new UsageError('fix needs finding ids')
  const why = String(flags['subtractive-tried'] ?? '').trim(), measured = new Map()
  const hits = pos.map((id) => {
    const round = [...state.rounds].reverse().find((r) => r.findings.some((f) => f.id === id))
    const f = round?.findings.find((x) => x.id === id)
    if (!f) throw new UsageError(`unknown finding ${id}`)
    if (f.disposition !== 'FIX') throw new UsageError(`${id} is ${f.disposition}, not FIX`)
    if (round.head === c.head) throw new UsageError(`${id}: HEAD is still the reviewed commit ${c.head.slice(0, 8)}: commit the fix first`)
    return { round, f }
  })
  for (const round of new Set(hits.map((h) => h.round))) { // D2, measured per round
    const n = hits.filter((h) => h.round === round).length
    const from = round.findings.map((f) => f.fixedAt).filter((s) => s && isAncestor(c, s, c.head))
      .reduce((a, b) => (isAncestor(c, a, b) ? b : a), round.head)
    const fix = lineDelta(c, `${from}..HEAD`, state.baseRef).added
    const g = lineDelta(c, `${round.head}..HEAD`, state.baseRef), growth = g.added - g.removed
    const mb = tryGit(c.repo, ['merge-base', state.baseRef, round.head]) ?? round.head
    const reviewed = lineDelta(c, `${mb}..${round.head}`, state.baseRef).added
    const over = [fix > 30 * n && `fix of ${fix} lines > 30 per finding (${n} finding(s))`,
      reviewed >= 200 && growth > 0.15 * reviewed && `round ${round.round} grows the PR by ${growth} lines, > 15% of the ${reviewed} reviewed lines`].filter(Boolean)
    if (over.length && !why) throw new UsageError(`${over.join('; ')}: try a version that removes code first, then pass --subtractive-tried "<why>", or CHIP and open a draft PR (D2)`)
    measured.set(round, fix)
  }
  for (const { round, f } of hits) Object.assign(f, { fixed: true, fixedAt: c.head, fixLines: measured.get(round), ...(why ? { subtractiveTried: why } : {}) })
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
  if (used(state) >= 1) throw new UsageError('cross runs only during round 1, alongside the hunters, before the round is recorded (D1)')
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
  const fresh = needState(c) // a round recorded during the call must survive
  let n = fresh.cross.length
  const added = review.findings.map((f) => ({ id: `X${++n}`, head: c.head, reviewer: review.reviewer, ...f }))
  fresh.cross.push(...added)
  fresh.crossRuns.push({ head: c.head, reviewer: review.reviewer, findings: added.length })
  saveState(c, fresh)
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
  if (flags.guardian !== undefined) throw new UsageError('--guardian is retired: run the simplifier, then pass --simplifier <sha>|none (D5)')
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
  const ancestor = (a, b) => isAncestor(c, a, b)
  const lastFull = full.at(-1) // a triage record never moves the reviewed commit
  if (lastFull && !ancestor(lastFull.head, c.head)) reasons.push(`history rewritten: the reviewed commit ${lastFull.head.slice(0, 8)} is not an ancestor of HEAD, review again`)
  else if (lastFull && c.head !== lastFull.head) {
    delta = { from: lastFull.head, to: c.head, files: git(c.repo, ['diff', '--name-only', lastFull.head, c.head]).split('\n').filter(Boolean), note: flags['delta-ok'] ?? '' }
    if (!delta.note) reasons.push('HEAD moved since the last round: pass --delta-ok "<a fresh verifier classified every hunk as fix, gate repair, clean base merge, sheet removal or simplifier commit>"')
  }

  const m = metrics(c, base, state.baseRef, full[0])
  if (m.code >= 50 && m.ratio > 2) warnings.push(`A1: tests/code ${m.ratio} > 2: justify in the PR body (D6)`)

  // D5: a sheet in the tree, or one the closeout deleted, requires a simplifier pass that really removed code.
  const deleted = [...new Set(git(c.repo, ['log', '--diff-filter=D', '--no-renames', '--name-only', '--format=', `${base}..HEAD`, '--', '.chantier/*/intention.md']).split('\n').filter(Boolean))]
  const found = [...sheets(c, flags), ...deleted]
  let simplifier = found.length ? flags.simplifier : 'n/a'
  if (simplifier === undefined) reasons.push(`intent sheet (${found.join(', ')}): run the simplifier, then pass --simplifier <sha>|none (D5)`)
  else if (simplifier === 'none') warnings.push('simplifier removed nothing: say why in the PR body (D5)')
  else if (simplifier !== 'n/a') {
    const s = tryGit(c.repo, ['rev-parse', '--verify', '-q', `${simplifier}^{commit}`]), from = lastFull?.head ?? base
    const d = s && s !== from && ancestor(s, c.head) && ancestor(from, s) ? lineDelta(c, `${s}^..${s}`, state.baseRef) : null
    if (!d || !(d.removed > 0 && d.removed >= d.added)) reasons.push(`--simplifier ${simplifier}: not a commit after the last round that removes at least as many counted lines as it adds (D5)`)
    else simplifier = s
  }

  let gate = { status: 'not-run' }
  if (!reasons.length) {
    gate = flags['no-gate'] ? { status: 'skipped', reason: flags['no-gate'] } : runGate(c, flags.gate)
    const moved = tryGit(c.repo, ['rev-parse', 'HEAD']) !== c.head || git(c.repo, ['status', '--porcelain']).trim() !== ''
    if (moved) { gate.status = 'fail'; reasons.push('the gate changed HEAD or the working tree: commit that change and review it') }
    else if (gate.status === 'fail') reasons.push(`gate failed (exit ${gate.exit}): ${gate.command}`)
    if (gate.status === 'skipped') warnings.push(`gate skipped: ${gate.reason} (a skip is not a pass: state it in the PR body)`)
  }

  return {
    schema: VERDICT_SCHEMA, head: c.head, base, baseRef: state.baseRef, repo: c.repo, branch: c.branch, tier, cycle: state.cycle ?? 1, chip: state.chip ?? null,
    rounds: rounds.map((r) => ({ round: r.round, triage: r.triage, head: r.head, findings: r.findings.length, openQuestions: r.openQuestions })),
    findings: entries, cross: state.cross, crossRuns: state.crossRuns, gate, simplifier, delta, metrics: m,
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
  const m = verdict.metrics, share = m.reviewShare === null ? 'n/a' : `${Math.round(m.reviewShare * 100)}%`
  out(`${verdict.verdict} ${c.head.slice(0, 8)} (${verdict.tier}, ${verdict.rounds.length} round(s)) -> ${join(c.dir, 'verdict.json')}\n` +
    `  lines: code ${m.code}, tests ${m.tests}, tests/code ${m.ratio ?? 'n/a'}, review added ${m.reviewAdded} (${share})\n` +
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

const USAGE = 'usage: review-run.mjs start|round|adopt|fix|cross|finalize|check  (see the header of this file)\n'

export async function main(argv, deps = {}) {
  const out = deps.stdout ?? ((s) => process.stdout.write(s))
  const err = deps.stderr ?? ((s) => process.stderr.write(s))
  try {
    const { cmd, flags, pos } = parseArgs(argv)
    if (!cmd || cmd === '--help' || flags.help) { out(USAGE); return cmd ? 0 : 2 }
    if (!['start', 'round', 'adopt', 'fix', 'cross', 'finalize', 'check'].includes(cmd)) throw new UsageError(`unknown command ${cmd}`)
    const c = resolveCtx(flags, deps.cwd ?? process.cwd())
    if (cmd === 'start') return cmdStart(c, flags, out)
    if (cmd === 'round') return cmdRound(c, pos, flags, out)
    if (cmd === 'adopt') return cmdAdopt(c, pos, out)
    if (cmd === 'fix') return cmdFix(c, pos, flags, out)
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
