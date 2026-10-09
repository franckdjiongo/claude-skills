#!/usr/bin/env node
// Review gate for ship-pr: refuses a pull request whose elmabi review never ran, is still
// running, or failed on its head commit, in repos that enroll the reviewer.
// Usage: node review-gate.mjs --repo <owner/name> --pr <number>
// Exit 0 = PASS or NOT-ENROLLED, 1 = REFUSE, 2 = error (treat as REFUSE).
// It trusts no check run or commit status named elmabi/review (anyone with write access can
// post one). It reads the workflow runs of the calling file instead: only workflows already
// on the base branch run on pull_request_target, so a pull request cannot fake such a run.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const CALLING_FILES = ['.github/workflows/elmabi-review.yml', '.github/workflows/pr-reviewer.yml']

const SHA = /^[0-9a-f]{40}$/

export class GhError extends Error {
  constructor(args, status, stderr) { super(`gh ${args.join(' ')} failed (${status}): ${stderr.trim()}`); this.stderr = stderr }
}

function realGh(args) {
  try { return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  catch (e) { throw new GhError(args, e.status, String(e.stderr ?? '')) }
}

const order = (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id - b.id)

// runs: workflow runs of one calling file for the head SHA (current attempt of each run).
// earlier: conclusions of the earlier attempts of those runs.
export function evaluate(file, runs, earlier = []) {
  if (runs.length === 0) return { ok: false, reason: `${file}: no pull_request_target run for this head commit (review never ran)` }
  const latest = [...runs].sort(order).at(-1)
  if (runs.some((r) => r.status !== 'completed')) return { ok: false, reason: `${file}: a review run for this head commit is still ${runs.find((r) => r.status !== 'completed').status}` }
  const failed = [...runs.map((r) => r.conclusion), ...earlier].includes('failure')
  if (failed) return { ok: false, reason: `${file}: a review attempt on this head commit concluded failure (Fix first or crash); only a new commit gets a new review` }
  if (latest.conclusion !== 'success') return { ok: false, reason: `${file}: latest review run ${latest.id} concluded ${latest.conclusion}` }
  return { ok: true, reason: `${file}: run ${latest.id} concluded success` }
}

export function check(repo, pr, gh = realGh) {
  const { baseRefName, headRefOid } = JSON.parse(gh(['pr', 'view', String(pr), '-R', repo, '--json', 'baseRefName,headRefOid']))
  // Pin the base commit first: a 404 on the file then means "absent", never "unknown ref".
  const baseSha = gh(['api', `repos/${repo}/commits/${baseRefName}`, '--jq', '.sha']).trim()
  if (!SHA.test(baseSha) || !SHA.test(headRefOid ?? '')) throw new Error(`unexpected SHA (base ${baseSha}, head ${headRefOid})`)
  const enrolled = []
  for (const file of CALLING_FILES) {
    try { gh(['api', `repos/${repo}/contents/${file}?ref=${baseSha}`, '--jq', '.path']); enrolled.push(file) }
    catch (e) { if (!(e instanceof GhError && /HTTP 404/.test(e.stderr))) throw e }
  }
  if (enrolled.length === 0) return { verdict: 'NOT-ENROLLED', head: headRefOid, lines: [`no calling workflow on ${baseRefName}@${baseSha.slice(0, 7)}`] }
  const all = gh(['api', '--paginate', `repos/${repo}/actions/runs?event=pull_request_target&head_sha=${headRefOid}&per_page=100`, '--jq', '.workflow_runs[]'])
    .split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const lines = []
  let ok = true
  for (const file of enrolled) {
    const runs = all.filter((r) => r.event === 'pull_request_target' && r.path === file && r.head_sha === headRefOid)
    const earlier = []
    for (const r of runs) for (let n = 1; n < (r.run_attempt ?? 1); n++) {
      earlier.push(JSON.parse(gh(['api', `repos/${repo}/actions/runs/${r.id}/attempts/${n}`])).conclusion)
    }
    const res = evaluate(file, runs, earlier)
    ok &&= res.ok
    lines.push(res.reason)
  }
  return { verdict: ok ? 'PASS' : 'REFUSE', head: headRefOid, lines }
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

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2))
