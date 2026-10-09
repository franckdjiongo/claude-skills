#!/usr/bin/env node
// Review gate for ship-pr: refuses a pull request whose elmabi review never ran, is still
// running, or did not succeed on its head commit, in repos that enroll the reviewer.
// Calling files: .github/workflows/elmabi-review.yml (enrolled repos), pr-reviewer.yml (elmabi-suite).
// Usage: node review-gate.mjs --repo <owner/name> --pr <number>
// Exit 0 = PASS or NOT-ENROLLED, 1 = REFUSE, 2 = error (treat as REFUSE).
// It trusts no check run or commit status named elmabi/review (anyone with write access can
// post one). It reads the workflow runs of the calling file instead: only workflows already
// on the base branch run on pull_request_target, so a pull request cannot fake such a run.
// Real pull_request_target runs carry head_sha = PR head and pull_requests[{number, base.ref}]
// (checked on public runs, 2026-10-09); runs are bound to this PR and base through them.
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SHA = /^[0-9a-f]{40}$/
const CALLING_NAME = /^(elmabi-review|pr-reviewer)\.ya?ml$/i
const RUN_FIELDS = '.workflow_runs[] | {id, path, event, head_sha, status, conclusion, run_attempt, created_at, pull_requests: [.pull_requests[] | {number, base: {ref: .base.ref}}]}'

export class GhError extends Error {
  constructor(args, status, stderr) { super(`gh ${args.join(' ')} failed (${status}): ${stderr.trim()}`); this.stderr = stderr }
}

function realGh(args) {
  try { return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) }
  catch (e) { throw new GhError(args, e.status, String(e.stderr ?? e.message ?? '')) }
}

const lines = (s) => s.split('\n').filter(Boolean)

// valid: runs of one calling file bound to this PR and base, made after the last retarget.
// poison: conclusions of every run and attempt of that file on this head linked to THIS PR,
// whatever base it ran for, so a retarget, a close/reopen or a re-run cannot reset a red review.
// Runs of another PR or unlinked runs (forks) neither poison nor validate: a third party cannot
// block this PR, and the absence of a linked green run still refuses.
// No retry until Ship: all must be success. A skipped run or attempt reviewed nothing.
export function evaluate(file, valid, poison = [], unbound = 0) {
  const runs = valid.filter((r) => r.conclusion !== 'skipped')
  if (runs.length === 0) return { ok: false, reason: `${file}: no pull_request_target run for this PR head on this base (review never ran)${unbound ? `; ${unbound} run(s) for this head are not linked to this PR and base (fork PRs are not supported)` : ''}` }
  const pending = runs.find((r) => r.status !== 'completed')
  if (pending) return { ok: false, reason: `${file}: review run ${pending.id} for this head is still ${pending.status}` }
  const bad = poison.filter((c) => c !== 'success' && c !== 'skipped')
  if (bad.length) return { ok: false, reason: `${file}: a review run or attempt on this head concluded ${bad.join(', ')}; only a new commit gets a new review` }
  return { ok: true, reason: `${file}: ${runs.length} run(s), every attempt on this head concluded success` }
}

export function check(repo, pr, gh = realGh) {
  const { baseRefName, baseRefOid, headRefOid } = JSON.parse(gh(['pr', 'view', String(pr), '-R', repo, '--json', 'baseRefName,baseRefOid,headRefOid']))
  if (!SHA.test(baseRefOid ?? '') || !SHA.test(headRefOid ?? '')) throw new Error(`unexpected SHA (base ${baseRefOid}, head ${headRefOid})`)
  // Positive proof first: the pinned base commit is readable. Only then does an explicit 404
  // "Not Found" on the workflows folder mean "no calling file"; any other error refuses.
  if (gh(['api', `repos/${repo}/git/commits/${baseRefOid}`, '--jq', '.sha']).trim() !== baseRefOid) throw new Error(`base commit ${baseRefOid} not readable`)
  let names = []
  try { names = lines(gh(['api', `repos/${repo}/contents/.github/workflows?ref=${baseRefOid}`, '--jq', '.[].name'])) }
  catch (e) { if (!(e instanceof GhError && /Not Found \(HTTP 404\)/.test(e.stderr))) throw e }
  const runsTotal = lines(gh(['api', '--paginate', `repos/${repo}/actions/runs?event=pull_request_target&head_sha=${headRefOid}&per_page=100`, '--jq', RUN_FIELDS]))
    .map((l) => JSON.parse(l)).filter((r) => r.event === 'pull_request_target' && r.head_sha === headRefOid)
  const all = runsTotal.filter((r) => (r.pull_requests ?? []).some((p) => p.number === Number(pr))) // linked to this PR
  const unlinked = (file) => runsTotal.filter((r) => r.path === file).length
  // Enrolled: any spelling of a known calling file (.yml/.yaml, any case) on the pinned base, or
  // one that already ran for this PR's head (a file removed from the base since then still counts).
  const enrolled = [...new Set([...names.map((n) => `.github/workflows/${n}`), ...all.map((r) => r.path)])]
    .filter((f) => f.startsWith('.github/workflows/') && CALLING_NAME.test(f.slice(18)))
  if (enrolled.length === 0) return { verdict: 'NOT-ENROLLED', head: headRefOid, base: baseRefName, lines: [`no calling workflow on ${baseRefName}@${baseRefOid.slice(0, 7)} and no review run linked to this PR head`] }
  // A run made before the PR was last retargeted reviewed another base: it cannot pass this one.
  let retargets = []
  try { retargets = lines(gh(['api', '--paginate', `repos/${repo}/issues/${pr}/events?per_page=100`, '--jq', '.[] | select(.event == "base_ref_changed") | .created_at'])) }
  catch (e) { if (!(e instanceof GhError && /HTTP 410/.test(e.stderr))) throw e } // 410: Issues disabled on the repo
  const since = retargets.sort().at(-1) ?? ''
  const out = []
  let ok = true
  for (const file of enrolled) {
    const mine = all.filter((r) => r.path === file)
    const valid = mine.filter((r) => r.pull_requests.some((p) => p.number === Number(pr) && p.base?.ref === baseRefName) && r.created_at > since)
    const poison = mine.map((r) => r.conclusion)
    for (const r of mine) for (let n = 1; n < (r.run_attempt ?? 1); n++) {
      poison.push(JSON.parse(gh(['api', `repos/${repo}/actions/runs/${r.id}/attempts/${n}`, '--jq', '{conclusion}'])).conclusion)
    }
    if (mine.some((r) => r.status !== 'completed')) poison.push('in_progress')
    const res = evaluate(file, valid, poison, unlinked(file) - mine.length)
    ok &&= res.ok
    out.push(res.reason)
  }
  return { verdict: ok ? 'PASS' : 'REFUSE', head: headRefOid, base: baseRefName, lines: out }
}

export function main(argv, { gh = realGh, out = console.log } = {}) {
  const i = (k) => { const j = argv.indexOf(k); return j >= 0 ? argv[j + 1] : undefined }
  const repo = i('--repo'), pr = i('--pr')
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^\d+$/.test(pr ?? '')) { out('usage: review-gate.mjs --repo <owner/name> --pr <number>'); return 2 }
  try {
    const r = check(repo, pr, gh)
    out(`${r.verdict} head=${r.head} base=${r.base}`)
    for (const l of r.lines) out(`  ${l}`)
    return r.verdict === 'REFUSE' ? 1 : 0
  } catch (e) { out(`ERROR ${e.message}`); return 2 }
}

const self = (p) => { try { return realpathSync(p) } catch { return p } }
if (process.argv[1] && self(process.argv[1]) === self(fileURLToPath(import.meta.url))) process.exitCode = main(process.argv.slice(2))
