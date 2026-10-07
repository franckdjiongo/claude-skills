// Run: node --test scripts/cross-review/   (no billed calls: the reviewer is stubbed)
import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  parseArgs, validateFindings, extractReviewJson, hasBlocking, buildClaudeCommand, buildCodexCommand,
  main, UsageError, ReviewerError, EXIT_OK, EXIT_BLOCKING, EXIT_ERROR, REVIEW_OUTPUT_SCHEMA,
} from './cross-review.mjs'

const dirs = []
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'xr-test-')); dirs.push(d); return d }
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

const sh = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim()
function makeRepo({ changed = true } = {}) {
  const d = tmp()
  sh(d, 'init', '-q', '-b', 'main')
  sh(d, 'config', 'user.email', 't@t.t'); sh(d, 'config', 'user.name', 't')
  writeFileSync(join(d, 'a.txt'), 'one\n'); sh(d, 'add', '.'); sh(d, 'commit', '-qm', 'base')
  sh(d, 'checkout', '-qb', 'work')
  if (changed) { writeFileSync(join(d, 'a.txt'), 'one\ntwo\n'); sh(d, 'commit', '-qam', 'change') }
  return d
}
const finding = (o = {}) => ({ file: 'a.txt', line: 2, severity: 'minor', claim: 'c', proof: 'p', ...o })
const run = async (argv, runner, extra = {}) => {
  const o = [], e = []
  const code = await main(argv, { runner, stdout: (s) => o.push(s), stderr: (s) => e.push(s), cwd: extra.cwd ?? tmp() })
  return { code, out: o.join(''), err: e.join('') }
}

describe('parseArgs', () => {
  test('flags', () => {
    const o = parseArgs(['--repo', '/r', '--base', 'main', '--direction', 'claude-reviews-codex', '--out', 'x.json', '--model=opus'])
    assert.equal(o.repo, '/r'); assert.equal(o.base, 'main'); assert.equal(o.out, 'x.json'); assert.equal(o.model, 'opus')
  })
  test('positionals', () => {
    const o = parseArgs(['/r', 'origin/main', 'codex-reviews-claude'])
    assert.deepEqual([o.repo, o.base, o.direction], ['/r', 'origin/main', 'codex-reviews-claude'])
  })
  test('rejects missing, unknown, bad direction, bad numbers', () => {
    assert.throws(() => parseArgs([]), UsageError)
    assert.throws(() => parseArgs(['/r', 'main']), /missing direction/)
    assert.throws(() => parseArgs(['/r', 'main', 'claude-reviews-claude']), /invalid direction/)
    assert.throws(() => parseArgs(['--bogus', '1']), /unknown option/)
    assert.throws(() => parseArgs(['--repo']), /needs a value/)
    assert.throws(() => parseArgs(['/r', '--base', '--direction']), /needs a value/)
    assert.throws(() => parseArgs(['/r', 'main', 'claude-reviews-codex', '--timeout-ms', '0']), /positive integer/)
    assert.throws(() => parseArgs(['/r', '-x', 'claude-reviews-codex']), /must not start/)
    assert.throws(() => parseArgs(['/r', 'main', 'claude-reviews-codex', 'extra']), /unexpected argument/)
  })
  test('help short-circuits', () => assert.equal(parseArgs(['--help']).help, true))
})

describe('validateFindings', () => {
  test('accepts valid and drops extra keys', () => {
    const r = validateFindings({ findings: [{ ...finding(), extra: 1 }], other: 2 })
    assert.deepEqual(r, [finding()])
  })
  test('accepts empty', () => assert.deepEqual(validateFindings({ findings: [] }), []))
  test('rejects bad shapes', () => {
    for (const bad of [null, [], 'x', {}, { findings: 'x' }, { findings: [null] },
      { findings: [finding({ file: '' })] }, { findings: [finding({ claim: 3 })] },
      { findings: [finding({ proof: '  ' })] }, { findings: [finding({ line: -1 })] },
      { findings: [finding({ line: 1.5 })] }, { findings: [finding({ line: '2' })] },
      { findings: [finding({ severity: 'critical' })] }]) {
      assert.throws(() => validateFindings(bad), ReviewerError)
    }
  })
  test('blocking = blocker or major', () => {
    assert.equal(hasBlocking([finding({ severity: 'major' })]), true)
    assert.equal(hasBlocking([finding({ severity: 'blocker' })]), true)
    assert.equal(hasBlocking([finding({ severity: 'minor' }), finding({ severity: 'nit' })]), false)
    assert.equal(hasBlocking([]), false)
  })
})

describe('extractReviewJson', () => {
  const body = { findings: [finding()] }
  test('bare, envelope, fenced, prose', () => {
    assert.deepEqual(extractReviewJson(JSON.stringify(body)), body)
    assert.deepEqual(extractReviewJson(JSON.stringify({ type: 'result', structured_output: body })), body)
    assert.deepEqual(extractReviewJson(JSON.stringify({ type: 'result', result: JSON.stringify(body) })), body)
    assert.deepEqual(extractReviewJson('Here:\n```json\n' + JSON.stringify(body) + '\n```\n'), body)
    assert.deepEqual(extractReviewJson('Sure {not json} then ' + JSON.stringify({ findings: [] }) + ' done'), { findings: [] })
  })
  test('handles braces inside strings', () => {
    const b = { findings: [finding({ proof: 'if (x) { y }' })] }
    assert.deepEqual(extractReviewJson('prefix ' + JSON.stringify(b)), b)
  })
  test('rejects empty and unparseable', () => {
    assert.throws(() => extractReviewJson(''), /printed nothing/)
    assert.throws(() => extractReviewJson('no json here'), /no findings JSON/)
    assert.throws(() => extractReviewJson('{"foo":1}'), /no findings JSON/)
  })
})

describe('commands', () => {
  test('claude command carries the audited flags and nothing writable', () => {
    const { command, args } = buildClaudeCommand('PROMPT')
    assert.equal(command, 'claude')
    assert.deepEqual(args.slice(0, 10), ['-p', 'PROMPT', '--tools', 'Read', '--strict-mcp-config', '--permission-mode', 'manual', '--setting-sources', '', '--disallowedTools'])
    assert.equal(args[10], 'mcp__capture-unique__brain_search')
    assert.equal(args[11], '--json-schema')
    assert.deepEqual(JSON.parse(args[12]), REVIEW_OUTPUT_SCHEMA)
    for (const bad of ['Bash', 'Write', 'Edit', 'bypassPermissions', 'acceptEdits']) assert.ok(!args.includes(bad))
  })
  test('codex command is read-only with an output schema', () => {
    const { command, args } = buildCodexCommand('/r', '/s.json', '/l.txt')
    assert.equal(command, 'codex')
    assert.equal(args[0], 'exec')
    assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only')
    assert.equal(args[args.indexOf('--output-schema') + 1], '/s.json')
    assert.equal(args[args.indexOf('--output-last-message') + 1], '/l.txt')
    assert.ok(!args.some((a) => a.includes('dangerously') || a === 'workspace-write'))
    assert.equal(args.at(-1), '-')
  })
})

describe('main with stubbed runner', () => {
  test('claude direction: non-blocking finding -> exit 0, review.json written by the script', async () => {
    const repo = makeRepo(); const cwd = tmp()
    const calls = []
    const runner = (command, args, o) => { calls.push({ command, args, o }); return { status: 0, stdout: JSON.stringify({ findings: [finding()] }), stderr: '' } }
    const r = await run(['--repo', repo, '--base', 'main', '--direction', 'claude-reviews-codex'], runner, { cwd })
    assert.equal(r.code, EXIT_OK)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].command, 'claude')
    assert.match(calls[0].args[1], /\+two/)           // diff embedded in prompt
    assert.equal(calls[0].o.cwd, sh(repo, 'rev-parse', '--show-toplevel'))
    const rev = JSON.parse(readFileSync(join(cwd, 'review.json'), 'utf8'))
    assert.equal(rev.schema, 'cross.review/1')
    assert.equal(rev.head, sh(repo, 'rev-parse', 'HEAD'))
    assert.equal(rev.base, sh(repo, 'rev-parse', 'main'))
    assert.equal(rev.reviewer, 'claude')
    assert.deepEqual(rev.findings, [finding()])
  })
  test('blocking finding -> exit 1', async () => {
    const repo = makeRepo(); const cwd = tmp()
    const runner = () => ({ status: 0, stdout: JSON.stringify({ findings: [finding({ severity: 'blocker' })] }), stderr: '' })
    const r = await run([repo, 'main', 'claude-reviews-codex', '--out', join(cwd, 'o', 'r.json')], runner, { cwd })
    assert.equal(r.code, EXIT_BLOCKING)
    assert.ok(existsSync(join(cwd, 'o', 'r.json')))
  })
  test('codex direction reads the last-message file and is read-only', async () => {
    const repo = makeRepo(); const cwd = tmp()
    let seen
    const runner = (command, args, o) => {
      seen = { command, args, o }
      writeFileSync(args[args.indexOf('--output-last-message') + 1], JSON.stringify({ findings: [] }))
      assert.deepEqual(JSON.parse(readFileSync(args[args.indexOf('--output-schema') + 1], 'utf8')), REVIEW_OUTPUT_SCHEMA)
      return { status: 0, stdout: '', stderr: '' }
    }
    const r = await run(['--repo', repo, '--base', 'main', '--direction', 'codex-reviews-claude'], runner, { cwd })
    assert.equal(r.code, EXIT_OK)
    assert.equal(seen.command, 'codex')
    assert.match(seen.o.input, /\+two/)
    assert.equal(JSON.parse(readFileSync(join(cwd, 'review.json'), 'utf8')).reviewer, 'codex')
  })
  test('empty diff: reviewer is not called, clean review written', async () => {
    const repo = makeRepo({ changed: false }); const cwd = tmp()
    const r = await run(['--repo', repo, '--base', 'main', '--direction', 'claude-reviews-codex'], () => { throw new Error('must not run') }, { cwd })
    assert.equal(r.code, EXIT_OK)
    assert.deepEqual(JSON.parse(readFileSync(join(cwd, 'review.json'), 'utf8')).findings, [])
  })
  test('reviewer failure or invalid JSON -> exit 2 and no review.json', async () => {
    const repo = makeRepo()
    const base = ['--repo', repo, '--base', 'main', '--direction', 'claude-reviews-codex']
    for (const runner of [
      () => ({ status: 1, stdout: '', stderr: 'boom' }),
      () => ({ status: null, stdout: '', stderr: '', error: 'timed out after 1 ms' }),
      () => ({ status: 0, stdout: 'not json', stderr: '' }),
      () => ({ status: 0, stdout: JSON.stringify({ findings: [{ file: 'a' }] }), stderr: '' }),
    ]) {
      const cwd = tmp()
      const r = await run(base, runner, { cwd })
      assert.equal(r.code, EXIT_ERROR)
      assert.ok(!existsSync(join(cwd, 'review.json')))
    }
  })
  test('usage errors -> exit 2', async () => {
    const cwd = tmp()
    assert.equal((await run([], () => ({}), { cwd })).code, EXIT_ERROR)
    assert.equal((await run([tmp(), 'main', 'claude-reviews-codex'], () => ({}), { cwd })).code, EXIT_ERROR) // not a repo
    const repo = makeRepo()
    const r = await run([repo, 'no-such-ref', 'claude-reviews-codex'], () => ({}), { cwd })
    assert.equal(r.code, EXIT_ERROR); assert.match(r.err, /base ref not found/)
  })
  test('--help -> exit 0', async () => assert.equal((await run(['--help'], () => ({}))).code, EXIT_OK))
  test('truncated diff is flagged in the prompt', async () => {
    const repo = makeRepo(); const cwd = tmp(); let prompt
    const runner = (c, args) => { prompt = args[1]; return { status: 0, stdout: '{"findings":[]}', stderr: '' } }
    await run(['--repo', repo, '--base', 'main', '--direction', 'claude-reviews-codex', '--max-diff-bytes', '20'], runner, { cwd })
    assert.match(prompt, /TRUNCATED/)
  })
})
