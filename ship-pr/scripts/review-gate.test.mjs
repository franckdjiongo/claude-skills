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
const TIP = 'c'.repeat(40)
const notFound = (args) => { throw new GhError(args, 1, 'gh: Not Found (HTTP 404)') }

// Fake gh: answers the exact calls review-gate.mjs makes, records them.
// enrolled: file names in .github/workflows on the base (null = the folder does not exist).
// atTip: file names at the live base tip (default: same as enrolled).
function fakeGh({ enrolled = ['elmabi-review.yml', 'validate.yml'], atTip = enrolled, runs = [], attempts = {}, retargets = [], contentsError, baseError } = {}) {
  const calls = []
  const gh = (args) => {
    calls.push(args.join(' '))
    const a = args.join(' ')
    if (args[0] === 'pr') return JSON.stringify({ baseRefName: 'main', baseRefOid: BASE, headRefOid: FX.head })
    if (a.startsWith('api repos/o/r/branches/main ')) return TIP + '\n'
    const g = a.match(/^api repos\/o\/r\/git\/commits\/(\w+) /)
    if (g) { if (baseError) throw baseError; return g[1] + '\n' }
    const c = a.match(/^api repos\/o\/r\/contents\/\.github\/workflows\?ref=(\w+)/)
    if (c) {
      assert.ok([BASE, TIP].includes(c[1]), 'the folder must be read at a pinned SHA')
      if (contentsError) throw contentsError
      const names = c[1] === TIP ? atTip : enrolled
      return names === null ? notFound(args) : names.join('\n') + '\n'
    }
    if (a.startsWith('api --paginate repos/o/r/issues/7/events')) return retargets.join('\n') + '\n'
    if (a.startsWith('api --paginate repos/o/r/actions/runs?event=pull_request_target&head_sha=' + FX.head)) return runs.map((r) => JSON.stringify(r)).join('\n') + '\n'
    const t = a.match(/^api repos\/o\/r\/actions\/runs\/(\d+)\/attempts\/(\d+) /)
    if (t && attempts[`${t[1]}/${t[2]}`]) return JSON.stringify(attempts[`${t[1]}/${t[2]}`])
    throw new Error('unexpected gh call: ' + a)
  }
  return { gh, calls }
}
const run = (opts) => { const out = []; const f = fakeGh(opts); const code = main(['--repo', 'o/r', '--pr', '7'], { gh: f.gh, out: (s) => out.push(s) }); return { code, out: out.join('\n'), calls: f.calls } }

test('no calling file on the base branch and no review run: NOT-ENROLLED, exit 0 (workstation today)', () => {
  for (const enrolled of [null, [], ['validate.yml']]) {
    const r = run({ enrolled })
    assert.equal(r.code, 0, r.out)
    assert.match(r.out, /^NOT-ENROLLED head=74a37c5\S* base=main/)
  }
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
  ['cancelled-then-success', 0, /^PASS/],
  ['success-ignores-other-sha', 0, /^PASS/],
  ['success-from-other-pr', 1, /review never ran/],
  ['success-from-other-base', 1, /review never ran/],
  ['success-before-retarget', 1, /predate the last retarget: push a new commit/],
  ['success-after-retarget', 0, /^PASS/],
  ['skipped-and-success', 0, /^PASS/],
  ['only-skipped', 1, /review never ran/],
  ['fork-unlinked', 1, /not linked to this PR \(fork/],
]) {
  test(`enrolled, fixture ${name}: exit ${code}`, () => {
    const r = run(FX[name])
    assert.equal(r.code, code, r.out)
    assert.match(r.out, re)
  })
}

test('pr-reviewer.yml (elmabi-suite) is a calling file too', () => {
  const runs = FX.success.runs.map((x) => ({ ...x, path: '.github/workflows/pr-reviewer.yml' }))
  assert.equal(run({ enrolled: ['pr-reviewer.yml'], runs }).code, 0)
  assert.equal(run({ enrolled: ['pr-reviewer.yml', 'elmabi-review.yml'], runs }).code, 1)
})

test('other spellings of a calling file (.yaml, any case) enroll the repo and refuse without a run', () => {
  for (const name of ['elmabi-review.yaml', 'Elmabi-Review.yml', 'PR-REVIEWER.YAML']) {
    const r = run({ enrolled: [name] })
    assert.equal(r.code, 1, name)
    assert.match(r.out, /review never ran/)
  }
})

test('calling file gone from the base but a review already ran for this head: still enrolled', () => {
  assert.equal(run({ enrolled: null, runs: FX.failure.runs }).code, 1)
  assert.equal(run({ enrolled: null, runs: FX.success.runs }).code, 0)
})

test('base commit not readable, or a non-404 folder error, refuses (exit 2), never NOT-ENROLLED', () => {
  for (const opts of [
    { baseError: new GhError(['api'], 1, 'gh: Not Found (HTTP 404)') },
    { contentsError: new GhError(['api'], 1, 'gh: No commit found for the ref main (HTTP 404)') },
    { contentsError: new GhError(['api'], 1, 'gh: Resource not accessible by integration (HTTP 403)') },
    { contentsError: new Error('spawn gh ENOENT') },
  ]) {
    const r = run(opts)
    assert.equal(r.code, 2, r.out)
    assert.match(r.out, /^ERROR/)
  }
})

test('a red review of THIS PR poisons its head across retargets, close/reopen and bases', () => {
  const ok = FX.success.runs[0]
  const red = { ...ok, id: 99, conclusion: 'failure', created_at: '2026-10-09T19:00:00Z' }
  for (const own of [red, { ...red, pull_requests: [{ number: 7, base: { ref: 'evil' } }] }]) {
    const r = run({ runs: [own, { ...ok, created_at: '2026-10-09T20:10:00Z' }], retargets: ['2026-10-09T20:05:00Z'] })
    assert.equal(r.code, 1, r.out)
    assert.match(r.out, /concluded failure/)
  }
})

test('a red run of another PR or an unlinked run on the same head neither poisons nor validates', () => {
  const ok = FX.success.runs[0]
  const red = { ...ok, id: 99, conclusion: 'failure' }
  for (const other of [{ ...red, pull_requests: [] }, { ...red, pull_requests: [{ number: 8, base: { ref: 'main' } }] }]) {
    assert.equal(run({ runs: [other, ok] }).code, 0)
    assert.equal(run({ runs: [{ ...other, conclusion: 'success' }] }).code, 1)
    assert.equal(run({ enrolled: null, runs: [other] }).code, 0, 'an unlinked run does not enroll')
  }
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
    // A fake gh on PATH: base readable, no workflows folder, no run for the head.
    writeFileSync(join(d, 'gh'), `#!/bin/sh
case "$1 $2" in
  "pr view") echo '{"baseRefName":"main","baseRefOid":"${BASE}","headRefOid":"${FX.head}"}';;
  "api repos/o/r/branches/main") echo ${BASE};;
  "api repos/o/r/git/commits/${BASE}") echo ${BASE};;
  "api --paginate") ;;
  *) echo 'gh: Not Found (HTTP 404)' >&2; exit 1;;
esac
`)
    chmodSync(join(d, 'gh'), 0o755)
    const out = execFileSync(process.execPath, [link, '--repo', 'o/r', '--pr', '7'], { encoding: 'utf8', env: { ...process.env, PATH: `${d}:${process.env.PATH}` } })
    assert.match(out, /^NOT-ENROLLED head=/)
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('calling file only at the live base tip (added after the PR base snapshot): enrolled, refuses without a run', () => {
  const r = run({ enrolled: null, atTip: ['elmabi-review.yml'] })
  assert.equal(r.code, 1, r.out)
  assert.match(r.out, /review never ran/)
  assert.match(run({ enrolled: null, atTip: null }).out, /tip ccccccc, PR base bbbbbbb/)
})
