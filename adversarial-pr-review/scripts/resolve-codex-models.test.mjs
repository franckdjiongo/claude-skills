import { describe, expect, test, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { symlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from './resolve-codex-models.mjs'

const dirs = []
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'resolve-models-')); dirs.push(d); return d }
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })

function setup({ project, user, config, cache } = {}) {
  const repo = tmp(), codexHome = tmp()
  if (project) { mkdirSync(join(repo, '.codex')); writeFileSync(join(repo, '.codex', 'model-routing.json'), typeof project === 'string' ? project : JSON.stringify(project)) }
  if (user) writeFileSync(join(codexHome, 'model-routing.json'), JSON.stringify(user))
  if (config) writeFileSync(join(codexHome, 'config.toml'), config)
  if (cache) writeFileSync(join(codexHome, 'models_cache.json'), JSON.stringify(cache))
  return { repo, codexHome }
}
const roles = (hunter, verifier) => ({ schemaVersion: 1, roles: { 'review-hunter': hunter, 'review-verifier': verifier } })

describe('resolve-codex-models', () => {
  test('project routing wins over user routing and config', () => {
    const r = resolve(setup({
      project: roles({ model: 'p-h', reasoningEffort: 'low' }, { model: 'p-v', reasoningEffort: 'high' }),
      user: roles({ model: 'u-h' }, { model: 'u-v' }),
      config: 'model = "cfg"\n',
    }))
    expect(r['review-hunter']).toMatchObject({ model: 'p-h', effort: 'low' })
    expect(r['review-verifier']).toMatchObject({ model: 'p-v', effort: 'high' })
  })

  test('project roles.review gives the model for both roles, efforts default to medium/high', () => {
    const r = resolve(setup({ project: { roles: { review: { model: 'rev', reasoningEffort: 'high' } } } }))
    expect(r['review-hunter']).toMatchObject({ model: 'rev', effort: 'medium' })
    expect(r['review-verifier']).toMatchObject({ model: 'rev', effort: 'high' })
  })

  test('user routing is used when the project has none', () => {
    const r = resolve(setup({ user: roles({ model: 'u', reasoningEffort: 'high' }, { model: 'u', reasoningEffort: 'high' }), config: 'model = "cfg"\n' }))
    expect(r['review-hunter']).toMatchObject({ model: 'u', effort: 'high' })
  })

  test('falls back to the top-level config model, ignoring section keys', () => {
    const r = resolve(setup({ config: 'model = "cfg"\nmodel_reasoning_effort = "xhigh"\n[profiles.x]\nmodel = "other"\n' }))
    expect(r['review-hunter']).toMatchObject({ model: 'cfg', effort: 'medium' })
    expect(r['review-verifier']).toMatchObject({ model: 'cfg', effort: 'high' })
  })

  test('never above high for a sub-agent', () => {
    const r = resolve(setup({ user: roles({ model: 'u', reasoningEffort: 'ultra' }, { model: 'u', reasoningEffort: 'xhigh' }) }))
    expect(r['review-hunter'].effort).toBe('high')
    expect(r['review-verifier'].effort).toBe('high')
    expect(r['review-hunter'].notes.join(' ')).toContain('clamped')
  })

  test('steps down when the cache says the model lacks the effort', () => {
    const cache = { models: [{ slug: 'small', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'medium' }] }] }
    const r = resolve(setup({ user: roles({ model: 'small' }, { model: 'small' }), cache }))
    expect(r['review-verifier'].effort).toBe('medium')
  })

  test('a model absent from the cache is kept as is', () => {
    const r = resolve(setup({ user: roles({ model: 'not-cached' }, { model: 'not-cached' }), cache: { models: [] } }))
    expect(r['review-verifier']).toMatchObject({ model: 'not-cached', effort: 'high' })
  })

  test('invalid project JSON is ignored with a note', () => {
    const r = resolve(setup({ project: '{bad', config: 'model = "cfg"\n' }))
    expect(r['review-hunter'].model).toBe('cfg')
    expect(r['review-hunter'].notes.join(' ')).toContain('not valid JSON')
  })

  test('nothing configured: no model, effort still pinned, and a note says so', () => {
    const r = resolve(setup())
    expect(r['review-hunter']).toMatchObject({ model: null, effort: 'medium' })
    expect(r['review-hunter'].notes.join(' ')).toContain('no model found')
  })

  test('missing files produce no "invalid JSON" note', () => {
    const r = resolve(setup({ config: 'model = "cfg"\n' }))
    expect(r['review-hunter'].notes).toEqual([])
  })

  test('a model only inside a TOML table is not the session model', () => {
    const r = resolve(setup({ config: '[profiles.x]\nmodel = "other"\n' }))
    expect(r['review-hunter'].model).toBeNull()
  })

  test('TOML: multi-line strings and arrays are skipped, single quotes accepted', () => {
    const config = 'instructions = """\nmodel = "evil"\n"""\nnotify = [\n  ["a", "b"],\n]\nmodel = \'real\'\n'
    expect(resolve(setup({ config }))['review-hunter'].model).toBe('real')
  })

  test('TOML: quoted table headers end the top level; brackets in strings do not open arrays', () => {
    expect(resolve(setup({ config: '[projects."/Users/x"]\ntrust_level = "trusted"\n[profiles."a.b"]\nmodel = "wrong"\n' }))['review-hunter'].model).toBeNull()
    expect(resolve(setup({ config: 'notes = ["a[b"]\nmodel = "right" # comment [\n' }))['review-hunter'].model).toBe('right')
    expect(resolve(setup({ config: '"model" = "q\\"x"\n' }))['review-hunter'].model).toBe('q"x')
  })

  test('the CLI prints JSON when invoked through a symlinked path', () => {
    const { repo, codexHome } = setup({ config: 'model = "cfg"\n' })
    const link = join(tmp(), 'resolve.mjs')
    symlinkSync(new URL('./resolve-codex-models.mjs', import.meta.url).pathname, link)
    const r = spawnSync('node', [link, '--repo', repo], { encoding: 'utf8', env: { ...process.env, CODEX_HOME: codexHome } })
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout)['review-hunter'].model).toBe('cfg')
  })

  test('unknown or upper-case efforts', () => {
    const r = resolve(setup({ user: roles({ model: 'u', reasoningEffort: 'HIGH' }, { model: 'u', reasoningEffort: 'turbo' }) }))
    expect(r['review-hunter'].effort).toBe('high')
    expect(r['review-verifier'].effort).toBe('medium')
    expect(r['review-verifier'].notes.join(' ')).toContain('unknown effort')
  })

  test('an effort-only role entry still sets the effort; the model comes from further down', () => {
    const r = resolve(setup({ project: roles({ reasoningEffort: 'low' }, {}), user: roles({ model: 'u' }, { model: 'u' }) }))
    expect(r['review-hunter']).toMatchObject({ model: 'u', effort: 'low' })
  })

  test('routing that covers one role leaves the other to the next source', () => {
    const r = resolve(setup({ user: { roles: { 'review-hunter': { model: 'u' } } }, config: 'model = "cfg"\n' }))
    expect(r['review-hunter'].model).toBe('u')
    expect(r['review-verifier'].model).toBe('cfg')
  })

  test('a malformed models cache is ignored with a note, never a crash', () => {
    for (const cache of [{ models: { a: 1 } }, { models: [null] }, { models: [{ slug: 'u', supported_reasoning_levels: 'low' }] }]) {
      const r = resolve(setup({ user: roles({ model: 'u' }, { model: 'u' }), cache }))
      expect(r['review-verifier']).toMatchObject({ model: 'u', effort: 'high' })
    }
  })

  test('a cache listing only higher efforts keeps the effort and says so', () => {
    const cache = { models: [{ slug: 'big', supported_reasoning_levels: [{ effort: 'xhigh' }] }] }
    const r = resolve(setup({ user: roles({ model: 'big' }, { model: 'big' }), cache }))
    expect(r['review-verifier'].effort).toBe('high')
    expect(r['review-verifier'].notes.join(' ')).toContain('lists no effort at or below')
  })
})
