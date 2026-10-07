#!/usr/bin/env node
// install-skills.mjs — put the skills this repo owns into the two runtimes.
//
// For each skill that is BOTH in this repo and already installed in a runtime
// (~/.claude/skills, ~/.agents/skills), build that runtime's variant with
// build-runtime-variant.mjs into a temp dir and replace the installed copy only
// when the content differs. It never installs a skill that is not installed yet.
//
// Left alone, with the reason printed: a symlink, a git clone (own history), a skill
// the build says has no variant for the runtime (Codex exit 3), and every entry of
// install-skills.skip.json ("<runtime>:<skill>": "<reason>"; a missing reason is an error).
//
// A replaced copy is moved to <backup-dir>/<timestamp>/<runtime>/<skill>, never deleted.
// Both runtimes get <skill>/.ws-install-sha.json {sha, updatedAt} with the repo HEAD.
// A real run refuses a repo that is not on `main` or has uncommitted changes
// (--allow-unclean overrides). --dry-run prints the plan and changes nothing.
//
// Usage: node install-skills.mjs [--dry-run] [--allow-unclean] [--repo <dir>]
//          [--claude-root <dir>] [--codex-root <dir>] [--backup-dir <dir>]
// Exit: 0 done (skips are not failures) · 1 a skill failed to build or install · 2 refused.
import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync, cpSync, renameSync, lstatSync, readlinkSync, mkdtempSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildVariant, NotDeclaredError } from './build-runtime-variant.mjs'

export const MARKER = '.ws-install-sha.json'
const NOISE = new Set(['.DS_Store', '__pycache__'])

// rel path -> fingerprint, for every file and symlink. Install bookkeeping and OS noise are ignored.
export function digest(dir, rel = '', out = new Map()) {
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    if (NOISE.has(e.name) || (rel === '' && e.name === MARKER)) continue
    const r = rel ? `${rel}/${e.name}` : e.name
    const p = join(dir, r)
    if (e.isSymbolicLink()) out.set(r, `l:${readlinkSync(p)}`)
    else if (e.isDirectory()) digest(dir, r, out)
    else out.set(r, `f:${lstatSync(p).mode & 0o111 ? 'x' : '-'}:${createHash('sha256').update(readFileSync(p)).digest('hex')}`)
  }
  return out
}

export function diffPaths(a, b) {
  return [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k)).sort()
}

function git(repo, ...args) {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : null
}

export function repoState(repo) {
  const sha = git(repo, 'rev-parse', 'HEAD')
  if (!sha) throw new Error(`not a git repo: ${repo}`)
  const branch = git(repo, 'symbolic-ref', '--short', 'HEAD')
  const dirty = git(repo, 'status', '--porcelain')
  const problems = []
  if (branch !== 'main') problems.push(`repo is on ${branch ?? 'a detached HEAD'}, not main`)
  if (dirty) problems.push('repo has uncommitted changes')
  return { sha, problems }
}

export function readSkip(repo) {
  const file = join(repo, 'scripts', 'install-skills.skip.json')
  if (!existsSync(file)) return {}
  const skip = JSON.parse(readFileSync(file, 'utf8'))
  for (const [k, reason] of Object.entries(skip)) {
    if (typeof reason !== 'string' || !reason.trim()) throw new Error(`install-skills.skip.json: "${k}" has no reason`)
  }
  return skip
}

const writeMarker = (dir, sha) => writeFileSync(join(dir, MARKER), JSON.stringify({ sha, updatedAt: new Date().toISOString() }, null, 2) + '\n')
const readMarkerSha = (dir) => { try { return JSON.parse(readFileSync(join(dir, MARKER), 'utf8')).sha } catch { return null } }

function moveAside(from, to) {
  mkdirSync(dirname(to), { recursive: true })
  try { renameSync(from, to) } catch (err) {
    if (err.code !== 'EXDEV') throw err
    cpSync(from, to, { recursive: true, verbatimSymlinks: true })
    rmSync(from, { recursive: true, force: true })
  }
}

// Replaces `target` with `built`, keeping the old copy in `backup`. Rolls back if the swap fails.
function swap(built, target, backup, sha) {
  const staged = join(dirname(target), `.${resolve(target).split('/').pop()}.new-${process.pid}`)
  rmSync(staged, { recursive: true, force: true })
  try {
    cpSync(built, staged, { recursive: true, verbatimSymlinks: true, filter: (src) => !NOISE.has(src.split('/').pop()) })
    writeMarker(staged, sha)
    moveAside(target, backup)
    try { renameSync(staged, target) } catch (err) { moveAside(backup, target); throw err }
  } finally {
    rmSync(staged, { recursive: true, force: true })
  }
}

// Returns [{ runtime, skill, status, detail }]. status: installed | marker | current | skip | error.
export function installSkills({ repo, roots, backupDir, sha, skip = {}, dryRun = false }) {
  const results = []
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const work = mkdtempSync(join(tmpdir(), 'install-skills-'))
  try {
    for (const runtime of ['claude', 'codex']) {
      const root = roots[runtime]
      if (!root || !existsSync(root)) continue
      for (const skill of readdirSync(root).sort()) {
        const target = join(root, skill)
        const res = (status, detail = '') => results.push({ runtime, skill, status, detail })
        const st = lstatSync(target)
        if (st.isSymbolicLink()) { res('skip', 'symlink'); continue }
        if (!st.isDirectory() || skill.startsWith('.')) continue
        const source = join(repo, skill)
        if (!existsSync(join(source, 'SKILL.md'))) continue // not owned by this repo
        if (existsSync(join(target, '.git'))) { res('skip', 'git clone with its own history'); continue }
        const reason = skip[`${runtime}:${skill}`]
        if (reason) { res('skip', reason); continue }
        try {
          const built = join(work, `${runtime}-${skill}`)
          try { buildVariant(source, runtime, built) } catch (err) {
            if (err instanceof NotDeclaredError) { res('skip', `no ${runtime} variant declared`); continue }
            throw err
          }
          const changed = diffPaths(digest(built), digest(target))
          if (changed.length) {
            if (!dryRun) swap(built, target, join(backupDir, stamp, runtime, skill), sha)
            res('installed', `${changed.length} path(s): ${changed.slice(0, 4).join(', ')}${changed.length > 4 ? ', ...' : ''}`)
          } else if (readMarkerSha(target) !== sha) {
            if (!dryRun) writeMarker(target, sha)
            res('marker', 'content already current, marker updated')
          } else res('current')
        } catch (err) {
          res('error', err?.message ?? String(err))
        }
      }
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
  return results
}

function main(argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const here = dirname(fileURLToPath(import.meta.url))
  const repo = resolve(arg('--repo') ?? join(here, '..'))
  const dryRun = argv.includes('--dry-run')
  const { sha, problems } = repoState(repo)
  if (problems.length) {
    const msg = `${problems.join(' and ')}`
    if (dryRun) process.stdout.write(`NOTE a real run would refuse: ${msg}\n`)
    else if (!argv.includes('--allow-unclean')) { process.stderr.write(`REFUSED: ${msg} (--allow-unclean overrides)\n`); return 2 }
  }
  const results = installSkills({
    repo,
    roots: { claude: resolve(arg('--claude-root') ?? join(homedir(), '.claude', 'skills')), codex: resolve(arg('--codex-root') ?? join(homedir(), '.agents', 'skills')) },
    backupDir: resolve(arg('--backup-dir') ?? join(homedir(), '.local', 'state', 'claude-skills-install', 'backups')),
    sha,
    skip: readSkip(repo),
    dryRun,
  })
  for (const r of results) process.stdout.write(`${r.status.toUpperCase().padEnd(9)} ${r.runtime.padEnd(6)} ${r.skill}${r.detail ? ` : ${r.detail}` : ''}\n`)
  const count = (s) => results.filter((r) => r.status === s).length
  process.stdout.write(`${dryRun ? 'DRY-RUN ' : ''}${count('installed')} installed, ${count('marker')} marker-only, ${count('current')} current, ${count('skip')} skipped, ${count('error')} failed (repo ${sha.slice(0, 7)})\n`)
  return count('error') ? 1 : 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)))
