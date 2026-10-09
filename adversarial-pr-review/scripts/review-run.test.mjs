// Run: node --test adversarial-pr-review/scripts/   (or: bun test)  No billed call: the cross reviewer is a stub script.
import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { main, parseArgs, validateRound, findCrossScript, UsageError, COUNTED } from './review-run.mjs'

const dirs = []
const tmp = () => { const d = realpathSync(mkdtempSync(join(tmpdir(), 'rr-test-'))); dirs.push(d); return d }
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const sh = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim()
const commit = (d, file = 'a.txt', text = String(Math.random())) => { writeFileSync(join(d, file), text); sh(d, 'add', '.'); sh(d, 'commit', '-qm', 'c'); return sh(d, 'rev-parse', 'HEAD') }
function makeRepo() {
  const d = tmp()
  sh(d, 'init', '-q', '-b', 'main'); sh(d, 'config', 'user.email', 't@t.t'); sh(d, 'config', 'user.name', 't')
  commit(d, 'a.txt', 'one\n')
  sh(d, 'checkout', '-qb', 'work')
  commit(d, 'b.txt', 'two\n')
  return d
}
const run = async (cwd, ...argv) => {
  const o = [], e = []
  const code = await main(argv, { cwd, stdout: (s) => o.push(s), stderr: (s) => e.push(s) })
  return { code, out: o.join(''), err: e.join('') }
}
const gitDirOf = (d) => sh(d, 'rev-parse', '--absolute-git-dir')
const sentinel = (d) => { const f = join(gitDirOf(d), '.adversarial-review-passed'); return existsSync(f) ? readFileSync(f, 'utf8').trim() : null }
const verdictOf = (d) => JSON.parse(readFileSync(join(gitDirOf(d), 'adversarial-review/verdict.json'), 'utf8'))
const finding = (o = {}) => ({ id: 'F1', severity: 'P2', origin: 'introduced', summary: 's', disposition: 'FIX', ...o })
const roundFile = (d, findings = [], extra = {}) => { const f = join(tmp(), 'round.json'); writeFileSync(f, JSON.stringify({ findings, ...extra })); return f }
const stateOf = (d) => JSON.parse(readFileSync(join(gitDirOf(d), 'adversarial-review/state.json'), 'utf8'))
const started = async (d) => { const r = await run(d, 'start', '--base', 'main'); assert.equal(r.code, 0, r.err); return JSON.parse(r.out) }

describe('start', () => {
  test('resolves repo, HEAD and the inventory itself (committed, staged, unstaged, untracked, no rename or glob exclusion)', async () => {
    const d = makeRepo()
    const base = sh(d, 'rev-parse', 'main')
    writeFileSync(join(d, 'staged.test.ts'), 'x'); sh(d, 'add', 'staged.test.ts')
    writeFileSync(join(d, 'unstaged.test.ts'), 'x'); sh(d, 'add', '-N', 'unstaged.test.ts')
    mkdirSync(join(d, '__fixtures__'))
    writeFileSync(join(d, '__fixtures__/with [glob]\nand newline.json'), 'x')
    sh(d, 'mv', 'a.txt', 'renamed.txt')
    const sub = join(d, 'sub'); mkdirSync(sub)
    const info = await started(sub) // cwd is a subfolder: the toplevel is resolved, no hand-typed cd
    assert.equal(info.repo, d)
    assert.equal(info.head, sh(d, 'rev-parse', 'HEAD'))
    assert.equal(info.base, base)
    assert.deepEqual([...info.newFiles].sort(), ['__fixtures__/with [glob]\nand newline.json', 'b.txt', 'renamed.txt', 'staged.test.ts', 'unstaged.test.ts'])
    assert.equal(info.roundsLeft, 2)
  })
  test('a worktree gets its own git dir and state', async () => {
    const d = makeRepo()
    const wt = join(tmp(), 'wt')
    sh(d, 'worktree', 'add', '-q', wt, '-b', 'feat', 'work')
    commit(wt, 'c.txt')
    const info = await started(wt)
    assert.equal(info.gitDir, gitDirOf(wt))
    assert.match(info.gitDir, /worktrees/)
  })
  test('the base ref is pinned once a round exists', async () => {
    const d = makeRepo(); await started(d)
    assert.equal((await run(d, 'start', '--base', 'main')).code, 0)
    await run(d, 'round', roundFile(d))
    const wider = await run(d, 'start', '--base', 'work')
    assert.equal(wider.code, 2); assert.match(wider.err, /base ref is fixed/)
    assert.equal((await run(d, 'start')).code, 0)
  })
  test('the state stays with its branch: another branch or a detached HEAD is refused, start re-binds only an empty state', async () => {
    const d = makeRepo(); await started(d)
    sh(d, 'checkout', '-qb', 'other'); await started(d)
    assert.equal(stateOf(d).branch, 'other')
    await run(d, 'round', roundFile(d))
    sh(d, 'checkout', '-q', 'work')
    for (const argv of [['round', roundFile(d)], ['fix', 'F1'], ['cross'], ['finalize', '--no-gate', 'x'], ['start']]) {
      const r = await run(d, ...argv)
      assert.equal(r.code, 2, argv[0]); assert.match(r.err, /branch other/, argv[0])
    }
    sh(d, 'checkout', '-q', '--detach', 'other')
    assert.match((await run(d, 'round', roundFile(d))).err, /branch other/)
    sh(d, 'checkout', '-q', 'other')
    assert.equal((await run(d, 'round', roundFile(d))).code, 0)
  })
  test('a state written before branch binding is not checked', async () => {
    const d = makeRepo(); await started(d)
    const { branch, ...legacy } = stateOf(d)
    writeFileSync(join(gitDirOf(d), 'adversarial-review/state.json'), JSON.stringify(legacy))
    sh(d, 'checkout', '-qb', 'other')
    assert.equal((await run(d, 'round', roundFile(d))).code, 0)
  })
  test('not a repo, bad base, no state', async () => {
    assert.equal((await run(tmp(), 'start', '--base', 'main')).code, 2)
    const d = makeRepo()
    assert.match((await run(d, 'start', '--base', 'nope')).err, /no merge-base/)
    const r = await run(d, 'finalize', '--gate', 'true')
    assert.equal(r.code, 2); assert.match(r.err, /run "review-run.mjs start"/)
    assert.equal(sentinel(d), null)
  })
})

describe('round bookkeeping', () => {
  test('validateRound enforces dispositions', () => {
    assert.throws(() => validateRound({}), UsageError)
    assert.throws(() => validateRound({ findings: [finding({ disposition: 'WONT_FIX' })] }), /reason/)
    assert.throws(() => validateRound({ findings: [finding({ origin: 'pre-existing' })] }), /pre-existing/)
    assert.doesNotThrow(() => validateRound({ findings: [finding({ origin: 'pre-existing', severity: 'P1' })] }))
    assert.throws(() => validateRound({ findings: [finding(), finding()] }), /duplicate/)
    assert.throws(() => validateRound({ findings: [finding({ severity: 'high' })] }), /severity/)
  })
  test('cap is 2 rounds; triage still records bot dispositions', async () => {
    const d = makeRepo(); await started(d)
    assert.equal((await run(d, 'round', roundFile(d))).code, 0)
    assert.equal((await run(d, 'round', roundFile(d))).code, 0)
    const third = await run(d, 'round', roundFile(d))
    assert.equal(third.code, 2); assert.match(third.err, /round cap reached/)
    assert.equal((await run(d, 'round', roundFile(d, [finding({ id: 'B1', disposition: 'INVALID', reason: 'bot is wrong' })]), '--triage')).code, 0)
  })
  test('--triage is refused while a round remains, so it can never stand in for a full review', async () => {
    const d = makeRepo(); await started(d)
    const early = await run(d, 'round', roundFile(d), '--triage')
    assert.equal(early.code, 2); assert.match(early.err, /a round remains/)
    const r = await run(d, 'finalize', '--gate', 'true')
    assert.equal(r.code, 1); assert.match(r.out, /no round recorded/)
    assert.equal(sentinel(d), null)
  })
  test('fix refuses while HEAD is still the reviewed commit', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d, [finding()]))
    assert.match((await run(d, 'fix', 'F1')).err, /commit the fix first/)
    commit(d)
    assert.equal((await run(d, 'fix', 'F1')).code, 0)
    assert.match((await run(d, 'fix', 'ZZ')).err, /unknown finding/)
  })
})

describe('finalize', () => {
  test('PASS only when converged: sentinel is the current HEAD, verdict.json is complete', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d, [finding()], { residualRisk: 'none seen' }))
    const head2 = commit(d)
    await run(d, 'fix', 'F1')
    await run(d, 'round', roundFile(d))
    const r = await run(d, 'finalize', '--gate', 'echo green')
    assert.equal(r.code, 0, r.out + r.err)
    assert.equal(sentinel(d), head2)
    const v = verdictOf(d)
    assert.equal(v.schema, 'adversarial.verdict/1'); assert.equal(v.verdict, 'PASS'); assert.equal(v.head, head2)
    assert.equal(v.base, sh(d, 'rev-parse', 'main')); assert.equal(v.rounds.length, 2)
    assert.equal(v.findings[0].disposition, 'FIX'); assert.equal(v.findings[0].fixed, true)
    assert.equal(v.gate.status, 'pass'); assert.match(v.gate.tail, /green/)
    assert.equal((await run(d, 'check')).code, 0)
  })
  test('FAIL writes verdict.json but never the sentinel: unfixed FIX', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d, [finding()]))
    commit(d)
    await run(d, 'round', roundFile(d))
    const r = await run(d, 'finalize', '--gate', 'true')
    assert.equal(r.code, 1); assert.equal(sentinel(d), null)
    assert.equal(verdictOf(d).verdict, 'FAIL'); assert.match(verdictOf(d).reasons[0], /FIX not fixed/)
    assert.equal((await run(d, 'check')).code, 1)
  })
  test('FAIL: round 2 owed, HEAD moved without --delta-ok, open questions, P1 left open, no round', async () => {
    const d = makeRepo(); await started(d)
    assert.match((await run(d, 'finalize', '--gate', 'true')).out, /no round recorded/)
    await run(d, 'round', roundFile(d, [finding({ id: 'P', severity: 'P1', disposition: 'WONT_FIX', reason: 'r' })], { openQuestions: ['uncovered target x'] }))
    commit(d)
    const r = await run(d, 'finalize', '--gate', 'true')
    assert.equal(r.code, 1)
    for (const re of [/P1 left open/, /open questions/, /HEAD moved/]) assert.match(r.out, re)
    assert.equal(sentinel(d), null)
  })
  test('round 2 owed when round 1 committed a fix', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d, [finding()]))
    commit(d); await run(d, 'fix', 'F1')
    const r = await run(d, 'finalize', '--gate', 'true', '--delta-ok', 'verifier classified')
    assert.equal(r.code, 1); assert.match(r.out, /round 2 owed/)
  })
  test('--delta-ok lets a verified delta after the last round pass; --trivial allows zero rounds', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d)); await run(d, 'round', roundFile(d))
    const head = commit(d)
    assert.equal((await run(d, 'finalize', '--gate', 'true', '--delta-ok', 'one gate repair')).code, 0)
    assert.equal(sentinel(d), head); assert.deepEqual(verdictOf(d).delta.files, ['a.txt'])
    const e = makeRepo(); await started(e)
    const t = await run(e, 'finalize', '--gate', 'true', '--trivial')
    assert.equal(t.code, 0); assert.equal(verdictOf(e).tier, 'trivial')
  })
  test('gate: a failing command fails, a skip is recorded and is not a silent pass', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d))
    const bad = await run(d, 'finalize', '--gate', 'echo boom; exit 3')
    assert.equal(bad.code, 1); assert.equal(verdictOf(d).gate.exit, 3); assert.equal(sentinel(d), null)
    const skip = await run(d, 'finalize', '--no-gate', 'docs only')
    assert.equal(skip.code, 0); assert.equal(verdictOf(d).gate.status, 'skipped'); assert.match(skip.out, /warn: gate skipped/)
    assert.equal((await run(d, 'finalize')).code, 2)
  })
  test('refuses a dirty tree', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d))
    writeFileSync(join(d, 'dirty.txt'), 'x')
    const dirty = await run(d, 'finalize', '--gate', 'true')
    assert.equal(dirty.code, 2); assert.match(dirty.err, /not clean/)
  })
  test('anything recorded after a PASS voids it: sentinel gone, check says stale, finalize decides again', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d))
    assert.equal((await run(d, 'finalize', '--gate', 'true')).code, 0)
    assert.equal((await run(d, 'check')).code, 0)
    await run(d, 'round', roundFile(d, [finding({ id: 'Z', severity: 'P1' })]))
    assert.equal(sentinel(d), null)
    assert.equal((await run(d, 'check')).code, 4)
    assert.equal((await run(d, 'finalize', '--gate', 'true')).code, 1)
    assert.equal(sentinel(d), null)
  })
  test('check also catches a state edit that left the sentinel in place', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d))
    await run(d, 'finalize', '--gate', 'true')
    const f = join(gitDirOf(d), 'adversarial-review/state.json')
    const st = JSON.parse(readFileSync(f, 'utf8')); st.rounds[0].findings.push({ id: 'Q', severity: 'P1', disposition: 'FIX', fixed: false }); writeFileSync(f, JSON.stringify(st))
    const r = await run(d, 'check')
    assert.equal(r.code, 4); assert.match(r.out, /voided/)
  })
  test('FAIL when the gate dirties the tree or the reviewed commit is no longer an ancestor', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d))
    const dirty = await run(d, 'finalize', '--gate', 'echo x > generated.txt')
    assert.equal(dirty.code, 1); assert.match(dirty.out, /gate changed/); assert.equal(sentinel(d), null)
    rmSync(join(d, 'generated.txt'))
    sh(d, 'commit', '--amend', '-qm', 'rewritten') // history rewrite after the review
    const rewritten = await run(d, 'finalize', '--gate', 'true')
    assert.equal(rewritten.code, 1); assert.match(rewritten.out, /history rewritten/); assert.equal(sentinel(d), null)
  })
  test('an intent sheet makes --simplifier mandatory; none passes with a warning; --guardian is retired', async () => {
    const d = makeRepo()
    mkdirSync(join(d, '.chantier/x'), { recursive: true }); commit(d, '.chantier/x/intention.md', 'sheet')
    await started(d); await run(d, 'round', roundFile(d))
    const no = await run(d, 'finalize', '--gate', 'true')
    assert.equal(no.code, 1); assert.match(no.out, /--simplifier.*\(D5\)/)
    const none = await run(d, 'finalize', '--gate', 'true', '--simplifier', 'none')
    assert.equal(none.code, 0); assert.match(none.out, /warn: simplifier removed nothing/); assert.equal(verdictOf(d).simplifier, 'none')
    const g = await run(d, 'finalize', '--gate', 'true', '--guardian', 'aligned')
    assert.equal(g.code, 2); assert.match(g.err, /retired/)
  })
})

describe('metrics and simplifier (D5, D6)', () => {
  const lines = (n, tag = 'l') => Array.from({ length: n }, (_, i) => `${tag}${i}`).join('\n') + '\n'
  test('every verdict prints code, tests, ratio and review growth; a ratio over 2 on >= 50 code lines warns', async () => {
    const d = makeRepo() // b.txt: 1 code line
    mkdirSync(join(d, 'tests')); commit(d, 'tests/t.js', lines(3))
    await started(d); await run(d, 'round', roundFile(d, [finding()]))
    commit(d, 'x.test.ts', lines(2))
    const r = await run(d, 'finalize', '--gate', 'true')
    assert.equal(r.code, 1); assert.match(r.out, /lines: code 1, tests 5, tests\/code 5, review added 2 \(33%\)\n {2}FAIL/)
    assert.doesNotMatch(r.out, /A1:/) // under 50 code lines
    const e = makeRepo(); commit(e, 'c.js', lines(50)); commit(e, 'c.spec.js', lines(108)) // 51 code lines with b.txt
    await started(e); await run(e, 'round', roundFile(e))
    const w = await run(e, 'finalize', '--gate', 'true')
    assert.equal(w.code, 0); assert.match(w.out, /tests\/code 2\.1, review added 0 \(0%\)/); assert.match(w.out, /warn: A1: tests\/code 2\.1 > 2: justify in the PR body \(D6\)/)
  })
  test('a deleted sheet still needs a simplifier commit that removes more than it adds', async () => {
    const d = makeRepo() // the sheet lands on the base, the closeout deletes it on the branch
    sh(d, 'checkout', '-q', 'main'); mkdirSync(join(d, '.chantier/x'), { recursive: true }); commit(d, '.chantier/x/intention.md', 'sheet')
    sh(d, 'checkout', '-q', 'work'); sh(d, 'merge', '-q', '--no-edit', 'main')
    const before = commit(d, 'big.js', lines(10))
    await started(d); await run(d, 'round', roundFile(d))
    sh(d, 'commit', '-q', '--allow-empty', '-m', 'empty'); const empty = sh(d, 'rev-parse', 'HEAD')
    sh(d, 'rm', '-q', '.chantier/x/intention.md'); sh(d, 'commit', '-qm', 'rm sheet'); const rmSheet = sh(d, 'rev-parse', 'HEAD')
    const grows = commit(d, 'big.js', lines(8) + lines(3, 'n'))
    const ok = commit(d, 'big.js', lines(6))
    const fin = (...a) => run(d, 'finalize', '--gate', 'true', '--delta-ok', 'verified', ...a)
    assert.match((await fin()).out, /--simplifier/)
    for (const sha of [empty, rmSheet, grows, before, 'nope']) {
      const r = await fin('--simplifier', sha); assert.equal(r.code, 1); assert.match(r.out, /FAIL: --simplifier .*\(D5\)/)
    }
    assert.equal((await fin('--simplifier', ok.slice(0, 10))).code, 0); assert.equal(verdictOf(d).simplifier, ok)
  })
  test('a sheet added and deleted on the branch also needs --simplifier', async () => {
    const d = makeRepo(); mkdirSync(join(d, '.chantier/x'), { recursive: true }); commit(d, '.chantier/x/intention.md', 'sheet')
    await started(d); await run(d, 'round', roundFile(d)); sh(d, 'rm', '-q', '.chantier/x/intention.md'); sh(d, 'commit', '-qm', 'rm sheet')
    const r = await run(d, 'finalize', '--gate', 'true', '--delta-ok', 'sheet removal')
    assert.equal(r.code, 1); assert.match(r.out, /intent sheet \(\.chantier\/x\/intention\.md\).*\(D5\)/)
  })
})

describe('triage and the reviewed commit', () => {
  test('a triage record cannot move the reviewed commit and wave through unreviewed commits', async () => {
    const d = makeRepo(); await started(d)
    await run(d, 'round', roundFile(d)); await run(d, 'round', roundFile(d))
    commit(d) // unreviewed work after both rounds
    await run(d, 'round', roundFile(d, [finding({ id: 'B1', disposition: 'INVALID', reason: 'bot is wrong' })]), '--triage')
    const r = await run(d, 'finalize', '--gate', 'true')
    assert.equal(r.code, 1); assert.match(r.out, /HEAD moved since the last round/); assert.equal(sentinel(d), null)
    assert.equal((await run(d, 'finalize', '--gate', 'true', '--delta-ok', 'verifier classified every hunk')).code, 0)
  })
})

describe('check', () => {
  test('absent and stale verdicts are never a pass', async () => {
    const d = makeRepo(); await started(d)
    assert.equal((await run(d, 'check')).code, 3)
    await run(d, 'round', roundFile(d)); await run(d, 'finalize', '--gate', 'true')
    const reviewed = sh(d, 'rev-parse', 'HEAD')
    assert.equal((await run(d, 'check', '--head', reviewed)).code, 0)
    commit(d)
    const stale = await run(d, 'check')
    assert.equal(stale.code, 3); assert.match(stale.out, /stale/)
  })
})

describe('cross', () => {
  const stub = (dir, body) => { const f = join(dir, 'stub-cross.mjs'); writeFileSync(f, body); return f }
  const okStub = (dir, findings) => stub(dir, `
    import { execFileSync } from 'node:child_process'; import { writeFileSync } from 'node:fs'
    const a = process.argv; const get = (k) => a[a.indexOf(k) + 1]
    const head = execFileSync('git', ['-C', get('--repo'), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    writeFileSync(get('--out'), JSON.stringify({ schema: 'cross.review/1', head, base: 'b', reviewer: 'codex', findings: ${JSON.stringify(findings)} }))
    process.exit(${findings.some((f) => f.severity === 'major') ? 1 : 0})`)
  const xf = { file: 'b.txt', line: 1, severity: 'major', claim: 'c', proof: 'p' }

  test('cross findings get ids and must be dispositioned before PASS; a rerun on the same HEAD is refused', async () => {
    const d = makeRepo(); await started(d)
    const script = okStub(tmp(), [xf])
    const r = await run(d, 'cross', '--script', script)
    assert.equal(r.code, 0, r.err)
    assert.equal(JSON.parse(r.out).findings[0].id, 'X1')
    assert.match((await run(d, 'cross', '--script', script)).err, /already ran/)
    await run(d, 'round', roundFile(d))
    const fail = await run(d, 'finalize', '--gate', 'true')
    assert.equal(fail.code, 1); assert.match(fail.out, /X1/)
    await run(d, 'round', roundFile(d, [finding({ id: 'X1', disposition: 'INVALID', reason: 'the line is dead code' })]))
    assert.equal((await run(d, 'finalize', '--gate', 'true')).code, 0)
    assert.equal(verdictOf(d).cross[0].id, 'X1')
  })
  test('a failed reviewer or an invalid review.json is an error, never a clean review', async () => {
    const d = makeRepo(); await started(d)
    const dead = stub(tmp(), 'process.stderr.write("no auth"); process.exit(2)')
    const r = await run(d, 'cross', '--script', dead)
    assert.equal(r.code, 2); assert.match(r.err, /cross review failed/)
    const liar = stub(tmp(), 'process.exit(0)') // exit 0 but no review.json
    assert.match((await run(d, 'cross', '--script', liar)).err, /not a pass/)
    assert.equal(JSON.parse(readFileSync(join(gitDirOf(d), 'adversarial-review/state.json'), 'utf8')).crossRuns.length, 0)
  })
  test('D1: a round recorded during the call survives; after a round, cross is refused without spawning', async () => {
    const d = makeRepo(); await started(d)
    const racer = stub(tmp(), `
      import { execFileSync } from 'node:child_process'; import { readFileSync, writeFileSync } from 'node:fs'
      const a = process.argv; const get = (k) => a[a.indexOf(k) + 1]
      const g = (...x) => execFileSync('git', ['-C', get('--repo'), ...x], { encoding: 'utf8' }).trim()
      const head = g('rev-parse', 'HEAD'), f = g('rev-parse', '--absolute-git-dir') + '/adversarial-review/state.json'
      const s = JSON.parse(readFileSync(f, 'utf8')); s.rounds.push({ round: 1, triage: false, head, findings: [], openQuestions: [], residualRisk: '' })
      writeFileSync(f, JSON.stringify(s))
      writeFileSync(get('--out'), JSON.stringify({ schema: 'cross.review/1', head, reviewer: 'codex', findings: ${JSON.stringify([xf])} }))`)
    assert.equal((await run(d, 'cross', '--script', racer)).code, 0)
    const st = stateOf(d); assert.equal(st.rounds.length, 1); assert.equal(st.cross[0].id, 'X1')
    const marker = join(tmp(), 'spawned')
    const r = await run(d, 'cross', '--script', stub(tmp(), `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'x')`))
    assert.equal(r.code, 2); assert.match(r.err, /round 1.*D1/); assert.equal(existsSync(marker), false)
  })
  test('script lookup honours --script, then CROSS_REVIEW_SCRIPT, and the repo copy is found', () => {
    const f = join(tmp(), 's.mjs'); writeFileSync(f, '')
    assert.equal(findCrossScript({ script: f }, {}), f)
    assert.equal(findCrossScript({}, { CROSS_REVIEW_SCRIPT: f }), f)
    assert.match(findCrossScript({}, {}) ?? '', /cross-review\.mjs$/)
  })
})

describe('fix size (D2)', () => {
  const lines = (n, tag = 'l') => Array.from({ length: n }, (_, i) => `${tag}${i}`).join('\n') + '\n'
  // reviewed = n lines brought by a --no-ff side branch + b.txt (1 line); round 1 holds F1 and F2 (FIX)
  async function fixRepo(n = 0) {
    const d = makeRepo()
    if (n) { sh(d, 'checkout', '-qb', 'side'); commit(d, 'big.txt', lines(n)); sh(d, 'checkout', '-q', 'work'); sh(d, 'merge', '-q', '--no-ff', '-m', 'm', 'side') }
    await started(d); await run(d, 'round', roundFile(d, [finding(), finding({ id: 'F2' })]))
    return d
  }
  const fixed = (d, id) => stateOf(d).rounds[0].findings.find((f) => f.id === id)
  test('30 lines per finding: 30 accepted, then 31 refused unless --subtractive-tried; two 25-line fixes in a row pass', async () => {
    const d = await fixRepo()
    commit(d, 'f.txt', lines(30)); assert.equal((await run(d, 'fix', 'F1')).code, 0)
    commit(d, 'g.txt', lines(31))
    const no = await run(d, 'fix', 'F2')
    assert.equal(no.code, 2); for (const re of [/fix of 31 lines/, /subtractive-tried/, /CHIP/]) assert.match(no.err, re)
    assert.equal(fixed(d, 'F2').fixed, false)
    assert.equal((await run(d, 'fix', 'F2', '--subtractive-tried', 'removal breaks the API')).code, 0)
    assert.equal(fixed(d, 'F2').fixLines, 31); assert.equal(fixed(d, 'F2').subtractiveTried, 'removal breaks the API')
    const e = await fixRepo()
    commit(e, 'f.txt', lines(25)); assert.equal((await run(e, 'fix', 'F1')).code, 0)
    commit(e, 'g.txt', lines(25)); assert.equal((await run(e, 'fix', 'F2')).code, 0)
    assert.equal(fixed(e, 'F2').fixLines, 25)
  })
  test('15% growth on >= 200 reviewed lines (a --no-ff branch counts) is refused; a shrinking round is not', async () => {
    const d = await fixRepo(200)
    commit(d, 'f.txt', lines(31))
    const no = await run(d, 'fix', 'F1', 'F2')
    assert.equal(no.code, 2); assert.match(no.err, /grows the PR by 31 lines, > 15% of the 201 reviewed/)
    sh(d, 'reset', '-q', '--hard', 'HEAD~1')
    commit(d, 'big.txt', lines(150) + lines(20, 'n'))
    assert.equal((await run(d, 'fix', 'F1')).code, 0); assert.equal(fixed(d, 'F1').fixLines, 20)
  })
  test('a base merge and a pure rename are not counted; docs, lockfiles and generated code never are', async () => {
    const d = await fixRepo(200)
    sh(d, 'checkout', '-q', 'main'); commit(d, 'm.txt', lines(100)); sh(d, 'checkout', '-q', 'work'); sh(d, 'merge', '-q', '--no-edit', 'main')
    sh(d, 'mv', 'big.txt', 'moved.txt'); commit(d, 'f.txt', lines(2))
    assert.equal((await run(d, 'fix', 'F1')).code, 0); assert.equal(fixed(d, 'F1').fixLines, 2)
    assert.deepEqual(['docs/a.html', 'x/README.md', 'web/bun.lock', 'src/generated/m.ts', 'src/a.ts'].map(COUNTED), [false, false, false, false, true])
  })
})

describe('round --head and adopt', () => {
  test('--head accepts an ancestor and records it; a non-ancestor or a non-commit is refused', async () => {
    const d = makeRepo(); const first = sh(d, 'rev-parse', 'HEAD'); commit(d, 'c.txt'); await started(d)
    const r = await run(d, 'round', roundFile(d), '--head', first)
    assert.equal(r.code, 0, r.err); assert.match(r.out, new RegExp(`recorded at ${first.slice(0, 8)}`))
    assert.equal(stateOf(d).rounds[0].head, first)
    sh(d, 'checkout', '-q', 'main'); sh(d, 'checkout', '-qb', 'side'); const side = commit(d, 's.txt'); sh(d, 'checkout', '-q', 'work')
    const bad = await run(d, 'round', roundFile(d), '--head', side)
    assert.equal(bad.code, 2); assert.match(bad.err, /neither HEAD nor an ancestor/)
    assert.match((await run(d, 'round', roundFile(d), '--head', 'nope')).err, /not a commit/)
    assert.match((await run(d, 'round', roundFile(d), '--head', 'main')).err, /not in the reviewed range/)
    assert.equal(stateOf(d).rounds.length, 1)
  })
  test('--head works with --triage; the default stays HEAD', async () => {
    const d = makeRepo(); const first = sh(d, 'rev-parse', 'HEAD'); commit(d, 'c.txt'); await started(d)
    await run(d, 'round', roundFile(d)); await run(d, 'round', roundFile(d, [], {}))
    assert.equal(stateOf(d).rounds[0].head, sh(d, 'rev-parse', 'HEAD'))
    const t = await run(d, 'round', roundFile(d), '--triage', '--head', first)
    assert.equal(t.code, 0, t.err); assert.equal(stateOf(d).rounds[2].head, first)
  })
  test('adopt moves the state and the sentinel from the other worktree of the same branch', async () => {
    const d = makeRepo(); await started(d); await run(d, 'round', roundFile(d))
    assert.equal((await run(d, 'finalize', '--no-gate', 'x')).code, 0)
    const head = sh(d, 'rev-parse', 'HEAD'); assert.equal(sentinel(d), head)
    sh(d, 'checkout', '-q', 'main'); const wt = join(tmp(), 'wt'); sh(d, 'worktree', 'add', '-q', wt, 'work')
    const r = await run(wt, 'adopt', d)
    assert.equal(r.code, 0, r.err); assert.match(r.out, /adopted/)
    assert.equal(stateOf(wt).rounds.length, 1); assert.equal(sentinel(wt), head)
    assert.equal(existsSync(join(gitDirOf(d), 'adversarial-review')), false); assert.equal(sentinel(d), null)
    assert.equal((await run(wt, 'check')).code, 0)
  })
  test('adopt refuses another branch, a state without branch, no state, and the same checkout', async () => {
    const d = makeRepo(); await started(d)
    const wt = join(tmp(), 'wt'); sh(d, 'worktree', 'add', '-q', wt, '-b', 'feat', 'main')
    const r = await run(wt, 'adopt', d)
    assert.equal(r.code, 2); assert.match(r.err, /belongs to branch work, not feat/)
    const { branch, ...legacy } = stateOf(d); writeFileSync(join(gitDirOf(d), 'adversarial-review/state.json'), JSON.stringify(legacy))
    assert.match((await run(wt, 'adopt', d)).err, /no branch/)
    assert.match((await run(wt, 'adopt', wt)).err, /same checkout/)
    sh(wt, 'checkout', '-q', '--detach'); assert.match((await run(wt, 'adopt', d)).err, /detached HEAD/)
    assert.match((await run(d, 'adopt', tmp())).err, /not a git checkout/)
    assert.match((await run(d, 'adopt', wt)).err, /no review state/)
    const other = makeRepo(); await started(other); assert.match((await run(d, 'adopt', other)).err, /another repository/)
  })
  test('adopt drops a stale sentinel of the emptied state when the source has none', async () => {
    const d = makeRepo(); await started(d)
    sh(d, 'checkout', '-q', 'main'); const wt = join(tmp(), 'wt'); sh(d, 'worktree', 'add', '-q', wt, 'work')
    await started(wt); assert.equal((await run(wt, 'finalize', '--trivial', '--no-gate', 'x')).code, 0); assert.ok(sentinel(wt))
    assert.equal((await run(wt, 'adopt', d)).code, 0); assert.equal(sentinel(wt), null)
  })
  test('adopt never overwrites a state that holds rounds', async () => {
    const d = makeRepo(); await started(d); await run(d, 'round', roundFile(d))
    sh(d, 'checkout', '-q', 'main'); const wt = join(tmp(), 'wt'); sh(d, 'worktree', 'add', '-q', wt, 'work')
    await started(wt); await run(wt, 'round', roundFile(wt))
    const r = await run(wt, 'adopt', d)
    assert.equal(r.code, 2); assert.match(r.err, /never overwritten/)
    assert.equal(stateOf(d).rounds.length, 1)
  })
})

describe('review cycles (rule 1)', () => {
  const archived = (d, f) => JSON.parse(readFileSync(join(gitDirOf(d), 'adversarial-review', f), 'utf8'))
  const failCycle = async (d) => {
    await started(d); await run(d, 'round', roundFile(d, [finding()]))
    assert.equal((await run(d, 'finalize', '--no-gate', 'x')).code, 1)
    commit(d)
  }
  test('after a FAIL, --new-cycle archives state and verdict and opens 2 fresh rounds; finalize writes the cycle', async () => {
    const d = makeRepo(); await failCycle(d)
    const r = await run(d, 'start', '--new-cycle', 'chip-1')
    assert.equal(r.code, 0, r.err)
    const info = JSON.parse(r.out)
    assert.equal(info.cycle, 2); assert.equal(info.roundsLeft, 2)
    assert.equal(archived(d, 'state-1.json').rounds.length, 1)
    assert.equal(archived(d, 'verdict-1.json').verdict, 'FAIL')
    assert.equal(existsSync(join(gitDirOf(d), 'adversarial-review/verdict.json')), false)
    assert.equal((await run(d, 'check')).code, 3)
    assert.deepEqual({ cycle: stateOf(d).cycle, chip: stateOf(d).chip, rounds: stateOf(d).rounds }, { cycle: 2, chip: 'chip-1', rounds: [] })
    await run(d, 'round', roundFile(d))
    assert.equal((await run(d, 'finalize', '--no-gate', 'x')).code, 0)
    assert.equal(verdictOf(d).cycle, 2); assert.equal(verdictOf(d).chip, 'chip-1')
  })
  test('a third cycle is refused and the second cycle state is kept', async () => {
    const d = makeRepo(); await failCycle(d)
    assert.equal((await run(d, 'start', '--new-cycle', 'chip-1')).code, 0)
    await run(d, 'round', roundFile(d, [finding({ id: 'F9' })]))
    assert.equal((await run(d, 'finalize', '--no-gate', 'x')).code, 1)
    const r = await run(d, 'start', '--new-cycle', 'chip-2')
    assert.equal(r.code, 2); assert.match(r.err, /cycle cap reached/)
    assert.equal(stateOf(d).cycle, 2); assert.equal(stateOf(d).rounds.length, 1)
    assert.equal(existsSync(join(gitDirOf(d), 'adversarial-review/state-2.json')), false)
  })
  test('--new-cycle needs a FAIL verdict', async () => {
    const d = makeRepo()
    assert.match((await run(d, 'start', '--new-cycle', 'c')).err, /follows a FAIL/)
    await started(d)
    assert.match((await run(d, 'start', '--new-cycle', 'c')).err, /follows a FAIL/)
    assert.equal((await run(d, 'finalize', '--trivial', '--no-gate', 'x')).code, 0)
    assert.match((await run(d, 'start', '--new-cycle', 'c')).err, /follows a FAIL/)
    assert.equal((await started(d)).cycle, 1)
  })
})

test('parseArgs', () => {
  const p = parseArgs(['finalize', '--gate', 'bun test', '--trivial', '--delta-ok=ok x', 'pos'])
  assert.deepEqual(p, { cmd: 'finalize', flags: { gate: 'bun test', trivial: true, 'delta-ok': 'ok x' }, pos: ['pos'] })
  assert.throws(() => parseArgs(['start', '--base']), /needs a value/)
})
