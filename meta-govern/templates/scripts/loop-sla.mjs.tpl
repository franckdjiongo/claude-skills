#!/usr/bin/env node
/**
 * Loop / autonomy SLA signals for {{PROJECT_NAME}}.
 *
 * The pure core answers three "has this drifted?" questions used by autonomous
 * loops. Each is a pure function (no I/O, no clock read — `now` is passed in), so
 * it is directly testable:
 *
 *   staleLoopBranches(branches, now, thresholdDays=14)
 *     branches: Array<{ name, lastActivity }>  (lastActivity: ms epoch | ISO | Date)
 *     -> loop branches whose last activity is older than the threshold.
 *
 *   pendingVisualQa(subjects, now, thresholdDays=7)
 *     subjects: Array<{ id, taggedAt, resolved? }>
 *     -> subjects tagged for visual QA, unresolved, past the threshold.
 *
 *   backlogDivergence(activeItemsHtml, stateJson)
 *     -> ids present in the rendered backlog vs the tracked state (onlyInHtml /
 *        onlyInState / inBoth), catching a backlog that drifted from its state.
 *
 * The `main` is a best-effort SessionStart-style pass: it gathers those signals
 * from git + docs, and when something is stale it appends ONE line to
 * additionalContext. It stays silent when everything is clean, and it never
 * blocks — a signal that can't be computed simply isn't reported. An optional
 * hub-remind seam runs in try/catch, so its absence changes nothing.
 *
 * Exit codes: always 0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PATH_PREFIX =
  '/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/sbin:/usr/sbin:/usr/bin:/sbin:/bin';
process.env.PATH = `${PATH_PREFIX}:${process.env.PATH || ''}`;

const DAY_MS = 24 * 60 * 60 * 1000;
// Long-lived integration branches are not "loop" branches — never flagged stale.
const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'HEAD']);

// ---------- Pure core ----------

// Coerce ms epoch | ISO string | Date to milliseconds, or NaN when unparseable.
function toMs(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Date.parse(v);
  return NaN;
}

export function staleLoopBranches(branches, now, thresholdDays = 14) {
  const nowMs = toMs(now);
  const thresholdMs = thresholdDays * DAY_MS;
  if (!Array.isArray(branches) || Number.isNaN(nowMs)) return [];
  return branches
    .filter((b) => b && !PROTECTED_BRANCHES.has(b.name))
    .map((b) => ({ name: b.name, ageMs: nowMs - toMs(b.lastActivity) }))
    .filter((b) => Number.isFinite(b.ageMs) && b.ageMs > thresholdMs)
    .map((b) => ({ name: b.name, ageDays: Math.floor(b.ageMs / DAY_MS) }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function pendingVisualQa(subjects, now, thresholdDays = 7) {
  const nowMs = toMs(now);
  const thresholdMs = thresholdDays * DAY_MS;
  if (!Array.isArray(subjects) || Number.isNaN(nowMs)) return [];
  return subjects
    .filter((s) => s && !s.resolved)
    .map((s) => ({ id: s.id, ageMs: nowMs - toMs(s.taggedAt) }))
    .filter((s) => Number.isFinite(s.ageMs) && s.ageMs > thresholdMs)
    .map((s) => ({ id: s.id, ageDays: Math.floor(s.ageMs / DAY_MS) }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

// Pull tracked ids out of a rendered backlog. Recognizes an explicit
// `data-item-id="…"` / `data-backlog-id="…"` attribute, and bare `PREFIX-123`
// id tokens (e.g. DEFERRED-42) so a plain HTML list still yields its ids.
function idsFromHtml(html) {
  const ids = new Set();
  const src = typeof html === 'string' ? html : '';
  for (const m of src.matchAll(/data-(?:item|backlog)-id="([^"]+)"/g)) ids.add(m[1]);
  for (const m of src.matchAll(/\b([A-Z][A-Z0-9]+-\d+)\b/g)) ids.add(m[1]);
  return ids;
}

// Accept a state object as {items:[{id}]}, an array of {id}, or an id-keyed map.
function idsFromState(stateJson) {
  const ids = new Set();
  let state = stateJson;
  if (typeof state === 'string') {
    try { state = JSON.parse(state); } catch { return ids; }
  }
  if (!state || typeof state !== 'object') return ids;
  const items = Array.isArray(state) ? state : Array.isArray(state.items) ? state.items : null;
  if (items) {
    for (const it of items) if (it && it.id != null) ids.add(String(it.id));
  } else {
    for (const key of Object.keys(state)) ids.add(key);
  }
  return ids;
}

export function backlogDivergence(activeItemsHtml, stateJson) {
  const htmlIds = idsFromHtml(activeItemsHtml);
  const stateIds = idsFromState(stateJson);
  const onlyInHtml = [...htmlIds].filter((id) => !stateIds.has(id));
  const onlyInState = [...stateIds].filter((id) => !htmlIds.has(id));
  const inBoth = [...htmlIds].filter((id) => stateIds.has(id));
  return { onlyInHtml, onlyInState, inBoth };
}

// ---------- Best-effort main ----------

const GIT_ENV = { ...process.env, PATH: `${PATH_PREFIX}:${process.env.PATH || ''}` };

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      env: GIT_ENV,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

const ROOT =
  process.env.CLAUDE_PROJECT_DIR ||
  (git(['rev-parse', '--show-toplevel'], process.cwd()) || '').trim() ||
  process.cwd();

// Local branches with their last-commit unix time, for staleLoopBranches.
function gitBranches() {
  const out = git(
    ['for-each-ref', '--format=%(refname:short)|%(committerdate:unix)', 'refs/heads'],
    ROOT,
  );
  if (!out) return [];
  const branches = [];
  for (const line of out.split('\n')) {
    const [name, unix] = line.split('|');
    if (name && unix) branches.push({ name: name.trim(), lastActivity: Number(unix) * 1000 });
  }
  return branches;
}

// Plans still carrying a NEEDS_VISUAL_QA tag, using file mtime as the tag age
// proxy — an untouched plan that still asks for visual QA has been waiting.
function visualQaSubjects() {
  const plansDir = path.join(ROOT, 'docs', 'plans');
  if (!existsSync(plansDir)) return [];
  const subjects = [];
  let entries;
  try { entries = readdirSync(plansDir); } catch { return []; }
  for (const name of entries) {
    if (!name.endsWith('.html') && !name.endsWith('.md')) continue;
    const full = path.join(plansDir, name);
    try {
      if (/NEEDS_VISUAL_QA/.test(readFileSync(full, 'utf8'))) {
        subjects.push({ id: `docs/plans/${name}`, taggedAt: statSync(full).mtimeMs, resolved: false });
      }
    } catch {}
  }
  return subjects;
}

// Optional hub-remind seam: if the project ships a notifier hook, hand it the
// summary; its absence (the common case) is a no-op, never an error.
function maybeRemind(summary) {
  const notifier = path.join(ROOT, '.claude', 'hooks', 'loop-sla-remind.mjs');
  if (!existsSync(notifier)) return;
  try {
    execFileSync('node', [notifier, summary], { env: GIT_ENV, stdio: 'ignore', timeout: 5000 });
  } catch {}
}

async function readStdin() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function main() {
  const event = await readStdin();
  const hookEventName = event.hook_event_name || 'SessionStart';
  const now = Date.now();
  const parts = [];

  try {
    const stale = staleLoopBranches(gitBranches(), now, 14);
    if (stale.length > 0) parts.push(`${stale.length} stale loop branch(es) (>14d)`);
  } catch {}

  try {
    const pending = pendingVisualQa(visualQaSubjects(), now, 7);
    if (pending.length > 0) parts.push(`${pending.length} plan(s) awaiting visual QA (>7d)`);
  } catch {}

  if (parts.length === 0) process.exit(0); // clean → silent

  const summary = `Loop SLA — ${parts.join('; ')}. Review or close them before the next autonomous run.`;
  maybeRemind(summary);
  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: summary } })}\n`,
  );
  process.exit(0);
}

// Run only when invoked directly — importing this module (e.g. from a test that
// exercises the pure SLA functions) must not fire the pass or exit the process.
const isEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) main().catch(() => process.exit(0));
