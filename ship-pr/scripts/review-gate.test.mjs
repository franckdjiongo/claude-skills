// Run: bun test ship-pr/scripts   (or: node --test ship-pr/scripts/review-gate.test.mjs)  No network: gh is a fake fed by __fixtures__/review-gate.json.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, symlinkSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { main, GhError } from './review-gate.mjs'

const FX = JSON.parse(readFileSync(new URL('./__fixtures__/review-gate.json', import.meta.url), 'utf8'))
const BASE = 'b'.repeat(40)
const notFound = (args) => { throw new GhError(args, 1, 'gh: Not Found (HTTP 404)') }

// Fake gh: answers the exact calls review-gate.mjs makes, records them.
function fakeGh({ enrolled = ['.github/workflows/elmabi-review.yml'], runs = [], attempts = {}, retargets = [], contentsError, eventsGone } = {}) {
  const calls = []
  const gh = (args) => {
    calls.push(args.join(' '))
    const a = args.join(' ')
    if (args[0] === 'pr') return JSON.stringify({ baseRefName: 'main', baseRefOid: BASE, headRefOid: FX.head })
    const c = a.match(/^api repos\/o\/r\/contents\/(\S+)\?ref=(\w+)/)
    if (c) {
      assert.equal(c[2], BASE, 'contents must be read at the pinned base SHA')
      if (contentsError) throw contentsError
      return enrolled.includes(c[1]) ? c[1] : notFound(args)
    }
    if (a.startsWith('api --paginate repos/o/r/issues/7/events') && eventsGone) throw new GhError(args, 1, 'gh: Issues are disabled for this repo (HTTP 410)')
    if (a.startsWith('api --paginate repos/o/r/issues/7/events')) return retargets.join('\n') + '\n'
    if (a.startsWith('api --paginate repos/o/r/actions/runs?event=pull_request_target&head_sha=' + FX.head)) return runs.map((r) => JSON.stringify(r)).join('\n') + '\n'
    const t = a.match(/^api repos\/o\/r\/actions\/runs\/(\d+)\/attempts\/(\d+) /)
    if (t && attempts[`${t[1]}/${t[2]}`]) return JSON.stringify(attempts[`${t[1]}/${t[2]}`])
    throw new Error('unexpected gh call: ' + a)
  }
  return { gh, calls }
}
const run = (opts) => { const out = []; const f = fakeGh(opts); const code = main(['--repo', 'o/r', '--pr', '7'], { gh: f.gh, out: (s) => out.push(s) }); return { code, out: out.join('\n'), calls: f.calls } }

test('no calling file on the base branch: NOT-ENROLLED, exit 0, no run lookup (workstation today)', () => {
  const r = run({ enrolled: [] })
  assert.equal(r.code, 0)
  assert.match(r.out, /^NOT-ENROLLED head=74a37c5/)
  assert.ok(!r.calls.some((c) => c.includes('actions/runs') || c.includes('/events')))
})

for (const [name, code, re] of [
  ['absent', 1, /review never ran/],
  ['absent-only-other-workflows', 1, /review never ran/],
  ['in-progress', 1, /still in_progress/],
  ['success', 0, /^PASS/],
  ['failure', 1, /concluded failure/],
  ['failure-then-success-rerun', 1, /concluded failure/],
  ['timed-out-then-success-rerun', 1, /concluded timed_out/],
  ['failure-then-success-new-run', 1, /concluded failure/],
  ['cancelled-then-success', 1, /concluded cancelled/],
  ['success-ignores-other-sha', 0, /^PASS/],
  ['success-from-other-pr', 1, /review never ran/],
  ['success-from-other-base', 1, /review never ran/],
  ['success-before-retarget', 1, /review never ran/],
  ['success-after-retarget', 0, /^PASS/],
  ['skipped-and-success', 0, /^PASS/],
  ['only-skipped', 1, /review never ran/],
  ['fork-unlinked', 1, /not linked to this PR and base/],
]) {
  test(`enrolled, fixture ${name}: exit ${code}`, () => {
    const r = run(FX[name])
    assert.equal(r.code, code, r.out)
    assert.match(r.out, re)
  })
}

test('pr-reviewer.yml (elmabi-suite) is a calling file too', () => {
  const runs = FX.success.runs.map((x) => ({ ...x, path: '.github/workflows/pr-reviewer.yml' }))
  assert.equal(run({ enrolled: ['.github/workflows/pr-reviewer.yml'], runs }).code, 0)
  assert.equal(run({ enrolled: ['.github/workflows/pr-reviewer.yml'], runs: FX.success.runs }).code, 1)
})

test('a contents error other than 404 refuses (exit 2), never NOT-ENROLLED', () => {
  const r = run({ contentsError: new GhError(['api'], 1, 'gh: Server Error (HTTP 502)') })
  assert.equal(r.code, 2)
  assert.match(r.out, /^ERROR/)
})

test('bad arguments exit 2', () => {
  assert.equal(main(['--repo', 'o/r'], { gh: () => '', out: () => {} }), 2)
})

test('run through a symlinked path, the CLI still runs and prints a verdict line', () => {
  const d = mkdtempSync(join(tmpdir(), 'rg-'))
  try {
    const link = join(d, 'review-gate.mjs')
    symlinkSync(fileURLToPath(new URL('./review-gate.mjs', import.meta.url)), link)
    // A fake gh on PATH: the PR view succeeds, the base has no calling file.
    writeFileSync(join(d, 'gh'), `#!/bin/sh\ncase "$1" in pr) echo '{"baseRefName":"main","baseRefOid":"${BASE}","headRefOid":"${FX.head}"}';; *) echo 'gh: Not Found (HTTP 404)' >&2; exit 1;; esac\n`)
    chmodSync(join(d, 'gh'), 0o755)
    const out = execFileSync(process.execPath, [link, '--repo', 'o/r', '--pr', '7'], { encoding: 'utf8', env: { ...process.env, PATH: `${d}:${process.env.PATH}` } })
    assert.match(out, /^NOT-ENROLLED head=/)
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('Issues disabled (410 on the events list) counts as no retarget', () => {
  assert.equal(run({ ...FX.success, eventsGone: true }).code, 0)
})
