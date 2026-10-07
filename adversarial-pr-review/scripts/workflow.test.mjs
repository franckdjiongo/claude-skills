import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8')
const template = readFileSync(new URL('../references/workflow-template.js', import.meta.url), 'utf8')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const emptyReview = () => ({ findings: [], sweeps: [], residualRisk: 'none' })
const newTarget = (file) => `wholly-new file ${file}`
const cleanSweep = (target, site = 'file.ts:1') => ({ target, sitesChecked: [site], verdict: 'clean' })

// Execute the documented Workflow, replacing only user-filled inputs and unavailable agent APIs.
async function runWorkflow({ files = [], review = emptyReview, verdict, source = template, inventoryComplete = true } = {}) {
  const calls = []
  source = source.replace('export const meta', 'const meta')
    .replace('const INVENTORY_COMPLETE = false', `const INVENTORY_COMPLETE = ${inventoryComplete}`).replace(
    'const NEW_FILES = [/* unique PR paths: the newFiles list from `review-run.mjs start` */]',
    `const NEW_FILES = ${JSON.stringify(files)}`,
  )
  const run = new AsyncFunction('phase', 'pipeline', 'parallel', 'agent', source)
  const agent = async (prompt, options) => {
    calls.push({ prompt, options })
    return options.phase === 'Hunt' ? review(prompt, options) : verdict
  }
  const result = await run(
    () => {},
    async (dimensions, hunt, verify) => Promise.all(dimensions.map(async (d) => verify(await hunt(d)))),
    (tasks) => Promise.all(tasks.map((task) => task())),
    agent,
  )
  return { result, calls }
}

describe('documented adversarial Workflow', () => {
  test('does not dispatch a hunt while inventory is incomplete', async () => {
    await expect(runWorkflow({ inventoryComplete: false })).rejects.toThrow('INCOMPLETE: populate and validate')
  })

  test('two coverage-complete zero-finding rounds pass independently', async () => {
    const files = ['new.test.ts', '__fixtures__/new.json']
    const review = (prompt) => ({ ...emptyReview(), sweeps: files
      .filter((file) => prompt.includes(newTarget(file)))
      .map((file) => cleanSweep(newTarget(file), `${file}:1`)),
    })
    for (let round = 0; round < 2; round++) {
      const { result } = await runWorkflow({ files, review })
      expect(result.verdict).toBe('PASS')
      expect(result.uncoveredTargets).toEqual([])
      expect(result.notExaminedSweeps).toEqual([])
      expect(result.inconsistentSweeps).toEqual([])
    }
  })

  test('assigns every new file round-robin without losing existing targets', async () => {
    const files = Array.from({ length: 11 }, (_, i) => `tests/fixture ${i}.test.ts`)
    const source = template.replace("key:'correctness',", "key:'correctness', targets:['existing target'],")
    const { calls } = await runWorkflow({ files, source })
    const hunts = calls.filter((c) => c.options.phase === 'Hunt')
    expect(hunts).toHaveLength(8)
    files.forEach((file, i) => {
      expect(hunts[i % hunts.length].prompt).toContain(newTarget(file))
      expect(hunts.filter((c) => c.prompt.includes(newTarget(file)))).toHaveLength(1)
    })
    expect(hunts[0].prompt).toContain('existing target')
  })

  test('round 2 reviews only the delta since round 1', async () => {
    const source = template.replace('const ROUND = 1', 'const ROUND = 2').replace("const ROUND1_SHA = ''", "const ROUND1_SHA = 'abc1234'")
    const { calls } = await runWorkflow({ source })
    for (const { prompt } of calls.filter((c) => c.options.phase === 'Hunt')) {
      expect(prompt).toContain('diff abc1234 --')
      expect(prompt).toContain('ONLY the delta since round 1')
      expect(prompt).not.toContain('<merge-base-sha> --')
    }
  })

  test('silent new-file coverage returns INCOMPLETE, never PASS', async () => {
    const { result } = await runWorkflow({ files: ['__fixtures__/new.json', 'new.test.ts'] })
    expect(result.verdict).toBe('INCOMPLETE')
    expect(result.uncoveredTargets).toEqual(['wholly-new file __fixtures__/new.json', 'wholly-new file new.test.ts'])
  })

  test('accepts an explicit target sweep and preserves residual risk', async () => {
    const { result } = await runWorkflow({ files: ['new.test.ts'], review: (_, opts) => ({
      ...emptyReview(),
      sweeps: opts.label === 'hunt:correctness' ? [cleanSweep(newTarget('new.test.ts'), 'new.test.ts:1')] : [],
      residualRisk: opts.label === 'hunt:correctness' ? 'static read only — no test run' : 'none',
    }) })
    expect(result.verdict).toBe('PASS')
    expect(result.uncoveredTargets).toEqual([])
    expect(result.residualRisks).toEqual(['static read only — no test run'])
  })

  test('a prefix target or a path appearing only in sitesChecked cannot satisfy coverage', async () => {
    const { result } = await runWorkflow({ files: ['a.ts'], review: (_, opts) => ({
      ...emptyReview(), sweeps: opts.label === 'hunt:correctness'
        ? [cleanSweep('wholly-new file a.ts.bak'), cleanSweep('other target', 'wholly-new file a.ts')]
        : [],
    }) })
    expect(result.verdict).toBe('INCOMPLETE')
    expect(result.uncoveredTargets).toEqual(['wholly-new file a.ts'])
  })

  test.each([
    { verdict: 'not-examined', sitesChecked: [] },
    { verdict: 'not-examined', sitesChecked: ['a.ts:1'] },
    { verdict: 'clean', sitesChecked: [] },
    { verdict: 'clean', sitesChecked: [''] },
    { verdict: 'clean', sitesChecked: ['   '] },
    { verdict: 'finding-filed', sitesChecked: ['a.ts:1'], findingRef: 'ghost' },
  ])('does not count an unresolved sweep as a clean round: %j', async (sweep) => {
    const { result } = await runWorkflow({ files: ['a.ts'], review: (_, opts) => ({
      ...emptyReview(), sweeps: opts.label === 'hunt:correctness' ? [{ target: newTarget('a.ts'), ...sweep }] : [],
    }) })
    expect(result.verdict).toBe('INCOMPLETE')
  })

  test('verified findings and their checks reach the orchestrator', async () => {
    const finding = { title: 'Missing boundary guard', file: 'a.ts', line: '2', class: 'correctness', severity: 'P2', trigger: 'existing caller passes empty input', origin: 'introduced', scenario: 'invalid input', suggestedFix: 'validate input' }
    const verification = { mustFix: true, class: 'correctness', origin: 'introduced', checksPerformed: ['bun test a.test.ts → 1 pass'], reasoning: 'Reproduced' }
    const { result, calls } = await runWorkflow({ files: ['a.ts'], verdict: verification, review: (_, opts) => ({
      ...emptyReview(), findings: opts.label === 'hunt:correctness' ? [finding] : [],
      sweeps: opts.label === 'hunt:correctness'
        ? [{ target: newTarget('a.ts'), sitesChecked: ['a.ts:2'], verdict: 'finding-filed', findingRef: finding.title }]
        : [],
    }) })
    expect(result.verdict).toBe('FINDINGS')
    expect(result.inconsistentSweeps).toEqual([])
    expect(result.uncoveredTargets).toEqual([])
    expect(result.confirmed[0].verdict.checksPerformed).toEqual(verification.checksPerformed)
    expect(calls.filter((c) => c.options.phase === 'Verify')).toHaveLength(1)
  })

  test('hunter execution constraints survive prompt interpolation and are required in fallback', async () => {
    const { calls } = await runWorkflow()
    for (const { prompt } of calls) {
      expect(prompt).toContain("--include='*.ts'")
      expect(prompt).toContain("rg -g '*.ts'")
      expect(prompt).toContain('Hunters must not edit reviewed files')
      expect(prompt).toContain('Run TARGETED tests only')
      expect(prompt).toContain('mktemp -d')
      expect(prompt).toContain('Do not assume GNU `timeout` exists')
    }
    const fallback = skill.split('**The hand-launched fan-out drops the Workflow tool, never a phase.**')[1].split('### 4.')[0].replace(/\s+/g, ' ')
    expect(fallback).toContain('Apply the EVIDENCE FORM, SHARED MACHINE and SHELL')
    expect(fallback).toContain('the `newFiles` list from `start`')
  })
})
