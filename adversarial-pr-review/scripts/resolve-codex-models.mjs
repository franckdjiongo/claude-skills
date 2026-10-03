#!/usr/bin/env node
// resolve-codex-models.mjs — pick the Codex model and reasoning effort for the two
// review roles at use time. The skill never names a model: names live only in
// routing files that Franck maintains, so a new model generation is one edit.
//
// Model and effort are resolved INDEPENDENTLY, per role, first hit wins:
//   1. <repo>/.codex/model-routing.json   roles["review-hunter"|"review-verifier"],
//                                          then roles.review (model only)
//   2. $CODEX_HOME/model-routing.json     same schema (CODEX_HOME defaults to ~/.codex)
//   3. $CODEX_HOME/config.toml            top-level `model` (the session default)
// Effort defaults: hunter=medium, verifier=high. Never above high for a sub-agent
// (xhigh/max/ultra are clamped). If the model is listed in
// $CODEX_HOME/models_cache.json and does not support the effort, step down to the
// nearest supported lower effort. The cache is only a hint, never a source of
// model names (the models sessions actually run are often absent from it), and a
// malformed cache is ignored with a note.
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

// Top-level `key = "..."` or `key = '...'` of a TOML file, before the first table
// header, skipping multi-line strings and multi-line arrays.
export function topLevelTomlString(text, key) {
  let inString = null
  let arrayDepth = 0
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (inString) { if (raw.includes(inString)) inString = null; continue }
    const line = raw.trim()
    if (arrayDepth > 0) { arrayDepth += (line.match(/\[/g) ?? []).length - (line.match(/\]/g) ?? []).length; continue }
    if (/^\[\[?[^\]"']+\]\]?\s*(#.*)?$/.test(line)) break
    const m = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/)
    if (!m) continue
    const value = m[2]
    const triple = value.match(/^("""|''')/)
    if (triple && !value.slice(3).includes(triple[1])) { inString = triple[1]; continue }
    if (value.startsWith('[')) { arrayDepth = (value.match(/\[/g) ?? []).length - (value.match(/\]/g) ?? []).length; continue }
    if (m[1] === key) {
      const s = value.match(/^"([^"]*)"|^'([^']*)'/)
      if (s) return s[1] ?? s[2]
    }
  }
  return null
}

function routingEntries(routing, role) {
  if (!routing || routing.invalid || typeof routing.roles !== 'object' || !routing.roles) return []
  return [routing.roles[role], routing.roles.review].filter((e) => e && typeof e === 'object')
}

function adjustEffort(effort, model, cache, notes) {
  let e = String(effort ?? '').trim().toLowerCase()
  if (!EFFORTS.includes(e)) { notes.push(`unknown effort "${effort}", using medium`); e = 'medium' }
  if (EFFORTS.indexOf(e) > EFFORTS.indexOf(CAP)) { notes.push(`effort ${e} clamped to ${CAP} for a sub-agent`); e = CAP }
  const models = Array.isArray(cache?.models) ? cache.models : null
  if (cache && !models) notes.push('models_cache.json has no models list, ignored')
  const listed = models?.find((m) => m && typeof m === 'object' && m.slug === model)
  const levels = Array.isArray(listed?.supported_reasoning_levels)
    ? listed.supported_reasoning_levels.map((l) => l?.effort).filter((x) => EFFORTS.includes(x))
    : []
  if (levels.length && !levels.includes(e)) {
    const lower = EFFORTS.slice(0, EFFORTS.indexOf(e)).reverse().find((x) => levels.includes(x))
    if (lower) { notes.push(`${model} does not support ${e}, stepped down to ${lower}`); e = lower }
    else notes.push(`${model} lists no effort at or below ${e} in models_cache.json; kept ${e}`)
  }
  return e
}

export function resolve({ repo = process.cwd(), codexHome = process.env.CODEX_HOME || join(homedir(), '.codex') } = {}) {
  const projectRouting = readJson(join(repo, '.codex', 'model-routing.json'))
  const userRouting = readJson(join(codexHome, 'model-routing.json'))
  const cache = readJson(join(codexHome, 'models_cache.json'))
  const configPath = join(codexHome, 'config.toml')
  const sessionModel = existsSync(configPath) ? topLevelTomlString(readFileSync(configPath, 'utf8'), 'model') : null
  const result = {}
  for (const role of ['review-hunter', 'review-verifier']) {
    const notes = []
    if (projectRouting?.invalid) notes.push('project model-routing.json is not valid JSON, ignored')
    if (userRouting?.invalid) notes.push('user model-routing.json is not valid JSON, ignored')
    const sources = [
      ['<repo>/.codex/model-routing.json', projectRouting],
      [`${codexHome}/model-routing.json`, userRouting],
    ]
    let model = null, modelSource = 'none', effort, effortSource = 'default'
    for (const [name, routing] of sources) {
      for (const e of routingEntries(routing, role)) {
        if (!model && typeof e.model === 'string' && e.model) { model = e.model; modelSource = name }
      }
      // Effort comes only from the role's own entry, never from roles.review (whose
      // effort is set for a different job).
      const own = routing && !routing.invalid ? routing.roles?.[role] : null
      if (effort === undefined && own && typeof own.reasoningEffort === 'string') { effort = own.reasoningEffort; effortSource = name }
    }
    if (!model && sessionModel) { model = sessionModel; modelSource = `${codexHome}/config.toml model` }
    if (!model) notes.push('no model found: omit `model` in spawn_agent and pass only reasoning_effort')
    result[role] = { model, effort: adjustEffort(effort ?? DEFAULT_EFFORT[role], model, cache, notes), source: modelSource, effortSource, notes }
  }
  return result
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--repo')
  process.stdout.write(JSON.stringify(resolve(i > 0 ? { repo: process.argv[i + 1] } : {}), null, 2) + '\n')
}
