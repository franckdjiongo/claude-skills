#!/usr/bin/env node
// resolve-codex-models.mjs — pick the Codex model and reasoning effort for the two
// review roles at use time. The skill never names a model: names live only in
// routing files that Franck maintains, so a new model generation is one edit.
//
// Order, per role (review-hunter, review-verifier):
//   1. <repo>/.codex/model-routing.json   roles["review-hunter"|"review-verifier"],
//                                          else roles.review (model only)
//   2. $CODEX_HOME/model-routing.json     same schema (CODEX_HOME defaults to ~/.codex)
//   3. $CODEX_HOME/config.toml            top-level `model` (the session default)
// Effort: the role entry's reasoningEffort, else hunter=medium, verifier=high.
// Never above high for a sub-agent (xhigh/max/ultra are clamped). If the model is
// listed in $CODEX_HOME/models_cache.json and does not support the effort, step down
// to the nearest supported lower effort. The cache is NOT used to find model names:
// the models sessions actually run are often absent from it.
//
// Usage: node resolve-codex-models.mjs [--repo <path>]   → prints JSON
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const EFFORTS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']
const CAP = 'high'
const DEFAULT_EFFORT = { 'review-hunter': 'medium', 'review-verifier': 'high' }

function readJson(path) {
  if (!existsSync(path)) return null
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return { invalid: true } }
}

function topLevelTomlString(path, key) {
  if (!existsSync(path)) return null
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (/^\s*\[/.test(line)) break
    const m = line.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`))
    if (m) return m[1]
  }
  return null
}

function fromRouting(routing, role, source) {
  if (!routing || routing.invalid) return null
  const entry = routing.roles?.[role]
  if (entry?.model) return { model: entry.model, effort: entry.reasoningEffort, source: `${source} roles.${role}` }
  if (routing.roles?.review?.model) return { model: routing.roles.review.model, effort: undefined, source: `${source} roles.review` }
  return null
}

function adjustEffort(effort, model, cache, notes) {
  let e = EFFORTS.includes(effort) ? effort : null
  if (!e) { notes.push(`unknown effort "${effort}", using medium`); e = 'medium' }
  if (EFFORTS.indexOf(e) > EFFORTS.indexOf(CAP)) { notes.push(`effort ${e} clamped to ${CAP} for a sub-agent`); e = CAP }
  const listed = cache?.models?.find((m) => m.slug === model)
  const supported = listed?.supported_reasoning_levels?.map((l) => l.effort)
  if (supported?.length && !supported.includes(e)) {
    const lower = EFFORTS.slice(0, EFFORTS.indexOf(e)).reverse().find((x) => supported.includes(x))
    if (lower) { notes.push(`${model} does not support ${e}, stepped down to ${lower}`); e = lower }
  }
  return e
}

export function resolve({ repo = process.cwd(), codexHome = process.env.CODEX_HOME || join(homedir(), '.codex') } = {}) {
  const projectRouting = readJson(join(repo, '.codex', 'model-routing.json'))
  const userRouting = readJson(join(codexHome, 'model-routing.json'))
  const cache = readJson(join(codexHome, 'models_cache.json'))
  const sessionModel = topLevelTomlString(join(codexHome, 'config.toml'), 'model')
  const result = {}
  for (const role of ['review-hunter', 'review-verifier']) {
    const notes = []
    if (projectRouting?.invalid) notes.push('project model-routing.json is not valid JSON, ignored')
    if (userRouting?.invalid) notes.push('user model-routing.json is not valid JSON, ignored')
    const pick = fromRouting(projectRouting, role, '<repo>/.codex/model-routing.json')
      ?? fromRouting(userRouting, role, `${codexHome}/model-routing.json`)
      ?? (sessionModel ? { model: sessionModel, effort: undefined, source: `${codexHome}/config.toml model` } : null)
    const model = pick?.model ?? null
    if (!model) notes.push('no model found: omit `model` in spawn_agent and pass only reasoning_effort')
    const effort = adjustEffort(pick?.effort ?? DEFAULT_EFFORT[role], model, cache, notes)
    result[role] = { model, effort, source: pick?.source ?? 'none', notes }
  }
  return result
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--repo')
  process.stdout.write(JSON.stringify(resolve(i > 0 ? { repo: process.argv[i + 1] } : {}), null, 2) + '\n')
}
