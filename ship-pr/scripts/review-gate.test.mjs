// Run: bun test ship-pr/scripts   (or: node --test ship-pr/scripts/)  No network: gh is a fake fed by __fixtures__/review-gate.json.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { main, GhError } from './review-gate.mjs'

const FX = JSON.parse(readFileSync(new URL('./__fixtures__/review-gate.json', import.meta.url), 'utf8'))
const BASE = 'b'.repeat(40)
const notFound = (args) => { throw new GhError(args, 1, 'gh: Not Found (HTTP 404)') }

// Fake gh: answers the exact calls review-gate.mjs makes, records them.
function fakeGh({ enrolled = ['.github/workflows/elmabi-review.yml'], runs = [], attempts = {}, contentsError } = {}) {
  const calls = []
  const gh = (args) => {
    calls.push(args.join(' '))
    const a = args.join(' ')
    if (args[0] === 'pr') return JSON.stringify({ baseRefName: 'main', headRefOid: FX.head })
    if (a.startsWith('api repos/o/r/commits/main')) return BASE + '\n'
    const c = a.match(/^api repos\/o\/r\/contents\/(\S+)\?ref=(\w+)/)
    if (c) {
      assert.equal(c[2], BASE, 'contents must be read at the pinned base SHA')
      if (contentsError) throw contentsError
      return enrolled.includes(c[1]) ? c[1] : notFound(args)
    }
    if (a.startsWith('api --paginate repos/o/r/actions/runs?event=pull_request_target&head_sha=' + FX.head)) return runs.map((r) => JSON.stringify(r)).join('\n') + '\n'
    const t = a.match(/^api repos\/o\/r\/actions\/runs\/(\d+)\/attempts\/(\d+)$/)
    if (t && attempts[`${t[1]}/${t[2]}`]) return JSON.stringify(attempts[`${t[1]}/${t[2]}`])
    throw new Error('unexpected gh call: ' + a)
  }
  return { gh, calls }
}
const run = (opts) => { const out = []; const f = fakeGh(opts); const code = main(['--repo', 'o/r', '--pr', '7'], { gh: f.gh, out: (s) => out.push(s) }); return { code, out: out.join('\n'), calls: f.calls } }

test('no calling file on the base branch: NOT-ENROLLED, exit 0, no run lookup (workstation today)', () => {
  const r = run({ enrolled: [] })
  assert.equal(r.code, 0)
  assert.match(r.out, /^NOT-ENROLLED/)
  assert.ok(!r.calls.some((c) => c.includes('actions/runs')))
})

for (const [name, code, re] of [
  ['absent', 1, /review never ran/],
  ['absent-only-other-workflows', 1, /review never ran/],
  ['in-progress', 1, /still in_progress/],
  ['success', 0, /^PASS/],
  ['failure', 1, /concluded failure/],
  ['failure-then-success-rerun', 1, /concluded failure/],
  ['failure-then-success-new-run', 1, /concluded failure/],
  ['cancelled-latest', 1, /concluded cancelled/],
  ['success-ignores-other-sha', 0, /^PASS/],
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
