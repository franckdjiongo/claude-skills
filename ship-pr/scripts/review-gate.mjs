#!/usr/bin/env node
// Review gate for ship-pr: refuses a pull request whose elmabi review never ran, is still
// running, or did not succeed on its head commit, in repos that enroll the reviewer.
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

export const CALLING_FILES = ['.github/workflows/elmabi-review.yml', '.github/workflows/pr-reviewer.yml']

const SHA = /^[0-9a-f]{40}$/
const RUN_FIELDS = '.workflow_runs[] | {id, path, event, head_sha, status, conclusion, run_attempt, created_at, pull_requests: [.pull_requests[] | {number, base: {ref: .base.ref}}]}'

export class GhError extends Error {
  constructor(args, status, stderr) { super(`gh ${args.join(' ')} failed (${status}): ${stderr.trim()}`); this.stderr = stderr }
}

function realGh(args) {
  try { return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) }
  catch (e) { throw new GhError(args, e.status, String(e.stderr ?? e.message ?? '')) }
}

const lines = (s) => s.split('\n').filter(Boolean)

// runs: the runs of one calling file bound to this PR, base and head (current attempt of each).
// earlier: conclusions of the earlier attempts of those runs.
// No retry until Ship: every run and every attempt on this head must have succeeded.
// A skipped run or attempt reviewed nothing and is ignored.
export function evaluate(file, allRuns, allEarlier = [], unbound = 0) {
  const runs = allRuns.filter((r) => r.conclusion !== 'skipped')
  const earlier = allEarlier.filter((c) => c !== 'skipped')
  if (runs.length === 0) return { ok: false, reason: `${file}: no pull_request_target run for this PR head on this base (review never ran)${unbound ? `; ${unbound} run(s) for this head are not linked to this PR and base (fork PRs are not supported)` : ''}` }
  const pending = runs.find((r) => r.status !== 'completed')
  if (pending) return { ok: false, reason: `${file}: review run ${pending.id} for this head is still ${pending.status}` }
  const bad = [...runs.map((r) => r.conclusion), ...earlier].filter((c) => c !== 'success')
  if (bad.length) return { ok: false, reason: `${file}: a review run or attempt on this head concluded ${bad.join(', ')}; only a new commit gets a new review` }
  return { ok: true, reason: `${file}: ${runs.length} run(s), every attempt concluded success` }
}

export function check(repo, pr, gh = realGh) {
  const { baseRefName, baseRefOid, headRefOid } = JSON.parse(gh(['pr', 'view', String(pr), '-R', repo, '--json', 'baseRefName,baseRefOid,headRefOid']))
  if (!SHA.test(baseRefOid ?? '') || !SHA.test(headRefOid ?? '')) throw new Error(`unexpected SHA (base ${baseRefOid}, head ${headRefOid})`)
  // Read at the pinned base commit: a 404 then means "file absent", never "unknown ref".
  const enrolled = []
  for (const file of CALLING_FILES) {
    try { gh(['api', `repos/${repo}/contents/${file}?ref=${baseRefOid}`, '--jq', '.path']); enrolled.push(file) }
    catch (e) { if (!(e instanceof GhError && /HTTP 404/.test(e.stderr))) throw e }
  }
  if (enrolled.length === 0) return { verdict: 'NOT-ENROLLED', head: headRefOid, lines: [`no calling workflow on ${baseRefName}@${baseRefOid.slice(0, 7)}`] }
  // A run made before the PR was last retargeted reviewed another base: ignore it.
  let retargets = []
  try { retargets = lines(gh(['api', '--paginate', `repos/${repo}/issues/${pr}/events?per_page=100`, '--jq', '.[] | select(.event == "base_ref_changed") | .created_at'])) }
  catch (e) { if (!(e instanceof GhError && /HTTP 410/.test(e.stderr))) throw e } // 410: Issues disabled on the repo
  const since = retargets.sort().at(-1) ?? ''
  const all = lines(gh(['api', '--paginate', `repos/${repo}/actions/runs?event=pull_request_target&head_sha=${headRefOid}&per_page=100`, '--jq', RUN_FIELDS]))
    .map((l) => JSON.parse(l))
  const out = []
  let ok = true
  for (const file of enrolled) {
    const mine = all.filter((r) => r.event === 'pull_request_target' && r.path === file && r.head_sha === headRefOid)
    const runs = mine.filter((r) => (r.pull_requests ?? []).some((p) => p.number === Number(pr) && p.base?.ref === baseRefName) && r.created_at > since)
    const earlier = []
    for (const r of runs) for (let n = 1; n < (r.run_attempt ?? 1); n++) {
      earlier.push(JSON.parse(gh(['api', `repos/${repo}/actions/runs/${r.id}/attempts/${n}`, '--jq', '{conclusion}'])).conclusion)
    }
    const res = evaluate(file, runs, earlier, mine.length - runs.length)
    ok &&= res.ok
    out.push(res.reason)
  }
  return { verdict: ok ? 'PASS' : 'REFUSE', head: headRefOid, lines: out }
}

export function main(argv, { gh = realGh, out = console.log } = {}) {
  const i = (k) => { const j = argv.indexOf(k); return j >= 0 ? argv[j + 1] : undefined }
  const repo = i('--repo'), pr = i('--pr')
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^\d+$/.test(pr ?? '')) { out('usage: review-gate.mjs --repo <owner/name> --pr <number>'); return 2 }
  try {
    const r = check(repo, pr, gh)
    out(`${r.verdict} head=${r.head}`)
    for (const l of r.lines) out(`  ${l}`)
    return r.verdict === 'REFUSE' ? 1 : 0
  } catch (e) { out(`ERROR ${e.message}`); return 2 }
}

const self = (p) => { try { return realpathSync(p) } catch { return p } }
if (process.argv[1] && self(process.argv[1]) === self(fileURLToPath(import.meta.url))) process.exitCode = main(process.argv.slice(2))
