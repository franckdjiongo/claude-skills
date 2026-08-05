#!/usr/bin/env node
// Template: templates/hooks/enforce-workflow.mjs.tpl
// Variables used:
//   {{VALIDATE_COMMAND}} — full validate command (e.g., `bun run validate`)
//
// Stop hook. Reads the last assistant message from the transcript JSONL
// (the Stop event carries `transcript_path`, not the message inline). If it
// contains completion-style words AND the latest feature edit is newer than the
// latest validate run, returns a `block` decision. Otherwise exits silently.
// Bails on Stop re-entry (`stop_hook_active`) so it blocks at most once per turn.

import path from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import {
  readJsonStdin,
  writeJsonStdout,
  readJson,
  tmpDir,
  batchSentinelPath,
  shouldBlockOnStop,
  COMPLETION_REGEX,
  writeLastHookOutput,
} from './lib/hook-utils.mjs';

const STATE_PATH = path.join(tmpDir(), 'workflow-state.json');

// Une sentinelle .batch-in-flight plus vieille que ce TTL est traitée comme
// absente : le poseur (execute-plan 4a / hook agent-dispatch-preflight,
// palier 3+) rafraîchit le mtime à chaque dispatch écrivant, donc une
// sentinelle abandonnée périme et le gate reprend — fail-open BORNÉ.
const SENTINEL_TTL_MS = 30 * 60 * 1000;

// Last assistant TEXT in the transcript JSONL. Walks from the end, skipping
// assistant turns that are only tool_use / thinking (no text block), since the
// Stop event's final transcript entry is often a tool_use. Returns '' on any
// problem (missing path, unreadable, no text) — fail-open, never throws.
function lastAssistantText(transcriptPath) {
  if (!transcriptPath) return '';
  let raw;
  try { raw = readFileSync(transcriptPath, 'utf8'); } catch { return ''; }
  const lines = raw.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'assistant' && o.message?.role !== 'assistant') continue;
    const content = o.message?.content ?? o.content;
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n');
    }
    if (text.trim()) return text;
  }
  return '';
}

async function main() {
  const event = await readJsonStdin();

  // A `block` decision re-prompts the model, which fires Stop again. Bail on that
  // re-entry so the gate blocks at most once per turn and can never trap the session.
  if (event.stop_hook_active === true) process.exit(0);

  const lastAssistantMessage =
    event.last_assistant_message ||
    event.lastAssistantMessage ||
    lastAssistantText(event.transcript_path) ||
    '';

  // An autonomous run (MG_HEADLESS_RUN=1) requires a validate regardless of the
  // final message, so the completion-phrasing short-circuit only applies outside
  // headless mode. Interactive sessions keep exiting quietly when the last
  // message carries no completion marker (EN or FR — the regex now covers both).
  if (process.env.MG_HEADLESS_RUN !== '1' && !COMPLETION_REGEX.test(lastAssistantMessage)) {
    process.exit(0);
  }

  const state = readJson(STATE_PATH, null);
  if (!state) process.exit(0);

  const block = shouldBlockOnStop(state, lastAssistantMessage);
  if (!block) process.exit(0);

  // Batch sentinel: while a writing dispatch is in flight (`execute-plan`
  // 4a/Step 5 — and the palier-3+ agent-dispatch-preflight hook — write
  // `.claude/tmp/.batch-in-flight` at dispatch; close-out removes it),
  // mid-flight implementer edits legitimately postdate the last validate.
  // Downgrade the block to a logged warning. The sentinel only counts while
  // its mtime is younger than SENTINEL_TTL_MS: the poser refreshes the mtime
  // on every writing dispatch, so an abandoned sentinel expires and the gate
  // resumes — producer and consumer agree on mtime semantics.
  let sentinelFresh = false;
  try {
    sentinelFresh = Date.now() - statSync(batchSentinelPath()).mtimeMs < SENTINEL_TTL_MS;
  } catch { /* absente : le gate s'applique normalement */ }
  if (sentinelFresh) {
    writeLastHookOutput('enforce-workflow', {
      decision: 'warn',
      reason: 'Batch in flight — validate gate deferred to group close-out.',
    });
    process.exit(0);
  }

  const editedFile = state.lastEditPath || 'feature file';
  const editIso = state.lastEdit ? new Date(state.lastEdit).toISOString() : 'unknown';
  const validateIso = state.lastValidate
    ? new Date(state.lastValidate).toISOString()
    : 'never this session';

  const reason = [
    'BLOCKED: validate gate not satisfied.',
    'BLOQUÉ : gate de validation non satisfait.',
    `Last edit / Dernière édition : ${editedFile} (${editIso}).`,
    `Last validate / Dernière validation : ${validateIso}.`,
    '',
    `Run \`{{VALIDATE_COMMAND}}\` before ending the session.`,
    `Lance \`{{VALIDATE_COMMAND}}\` avant de terminer la session.`,
    'Fix any errors before claiming the task is done.',
    'Corrige les erreurs avant de déclarer la tâche terminée.',
  ].join('\n');

  writeLastHookOutput('enforce-workflow', { decision: 'block', reason });
  writeJsonStdout({ decision: 'block', reason });
  process.exit(0);
}

main().catch(() => process.exit(0));
