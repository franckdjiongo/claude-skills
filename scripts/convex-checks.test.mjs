// Tests for convex-checks.mjs. Run: node --test <this file>
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { scan, run, keyOf } from './convex-checks.mjs'

function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'convex-checks-'))
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), text)
  }
  return root
}
const keys = (root) => scan(root).map(keyOf).sort()

test('a cron needs a cost-justified comment on its line or just above', () => {
  const root = repo({
    'convex/crons.ts': [
      "crons.daily('bare', { hourUTC: 1 }, internal.a.b)",
      "crons.hourly('inline', {}, internal.a.b) // cost-justified: one call per hour",
      '// cost-justified: one call per day',
      '// second comment line',
      "crons.cron('above', '0 3 * * *', internal.a.b)",
    ].join('\n'),
  })
  assert.deepEqual(keys(root), ['convex-cron-unjustified convex/crons.ts bare'])
})

test('a test that reaches a real deployment without convex-test is flagged', () => {
  const root = repo({
    'a.test.ts': "import { ConvexHttpClient } from 'convex/browser'",
    'b.test.ts': "await fetch('https://happy-otter-123.convex.cloud/api')",
    'c.test.ts': "import { convexTest } from 'convex-test'\nimport { ConvexHttpClient } from 'convex/browser'",
    'd.test.ts': "await fetch('https://example.convex.site/api')",
    'e.ts': "import { ConvexHttpClient } from 'convex/browser'",
  })
  assert.deepEqual(keys(root), [
    'convex-test-real-deployment a.test.ts ConvexHttpClient',
    'convex-test-real-deployment b.test.ts deployment URL',
  ])
})

test('a cast inside mutation or action arguments is flagged, other casts are not', () => {
  const root = repo({
    'src/View.tsx': [
      'const save = useMutation(api.items.save)',
      'save({ id: x as never })',
      'const y = z as unknown',
      '// save({ id: x as any })',
      'useAction(api.items.run)({ id: x as any })',
    ].join('\n'),
  })
  assert.deepEqual(keys(root), [
    'convex-mutation-cast src/View.tsx inline call',
    'convex-mutation-cast src/View.tsx save',
  ])
})

test('ignored folders are not scanned', () => {
  const bad = "import { ConvexHttpClient } from 'convex/browser'"
  const root = repo({ 'node_modules/x/a.test.ts': bad, '.claude/worktrees/a.test.ts': bad, '.chantier/x/a.test.ts': bad, 'convex/_generated/a.test.ts': bad })
  assert.deepEqual(keys(root), [])
})

test('known findings pass, new ones fail, and --write-baseline records the current counts', () => {
  const root = repo({ 'convex/crons.ts': "crons.daily('bare', {}, internal.a.b)" })
  const baselinePath = path.join(root, 'baseline.json')
  const log = () => {}
  assert.equal(run({ root, baselinePath, log }), 1)
  assert.equal(run({ root, baselinePath, writeBaseline: true, log }), 0)
  assert.deepEqual(JSON.parse(fs.readFileSync(baselinePath, 'utf8')).known, { 'convex-cron-unjustified convex/crons.ts bare': 1 })
  assert.equal(run({ root, baselinePath, log }), 0)
  fs.appendFileSync(path.join(root, 'convex/crons.ts'), "\ncrons.weekly('other', {}, internal.a.b)")
  assert.equal(run({ root, baselinePath, log }), 1)
})

test('a second occurrence of a known finding fails', () => {
  const view = 'const save = useMutation(api.items.save)\nsave({ id: x as never })\n'
  const root = repo({ 'src/View.tsx': view })
  const baselinePath = path.join(root, 'baseline.json')
  const log = () => {}
  run({ root, baselinePath, writeBaseline: true, log })
  assert.equal(run({ root, baselinePath, log }), 0)
  fs.appendFileSync(path.join(root, 'src/View.tsx'), 'save({ id: y as any })\n')
  assert.equal(run({ root, baselinePath, log }), 1)
})
