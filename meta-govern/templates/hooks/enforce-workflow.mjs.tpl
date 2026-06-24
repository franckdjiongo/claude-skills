#!/usr/bin/env node
// Template: templates/hooks/enforce-workflow.mjs.tpl
// Variables used:
//   {{VALIDATE_COMMAND}} — full validate command (e.g., `bun run validate`)
//
// Stop hook. Reads last_assistant_message from input. If it contains
// completion-style words AND the latest feature edit is newer than the
// latest validate run, returns a `block` decision. Otherwise exits silently.

import path from 'node:path';
import {
  readJsonStdin,
  writeJsonStdout,
  readJson,
  tmpDir,
  shouldBlockOnStop,
  COMPLETION_REGEX,
  writeLastHookOutput,
} from './lib/hook-utils.mjs';

const STATE_PATH = path.join(tmpDir(), 'workflow-state.json');

async function main() {
  const event = await readJsonStdin();
  const lastAssistantMessage = event.last_assistant_message || event.lastAssistantMessage || '';

  if (!COMPLETION_REGEX.test(lastAssistantMessage)) {
    process.exit(0);
  }

  const state = readJson(STATE_PATH, null);
  if (!state) process.exit(0);

  const block = shouldBlockOnStop(state, lastAssistantMessage);
  if (!block) process.exit(0);

  const editedFile = state.lastEditPath || 'feature file';
  const editIso = state.lastEdit ? new Date(state.lastEdit).toISOString() : 'unknown';
  const validateIso = state.lastValidate
    ? new Date(state.lastValidate).toISOString()
    : 'never this session';

  const reason = [
    'BLOCKED: validate gate not satisfied.',
    `Last edit: ${editedFile} (${editIso}).`,
    `Last validate: ${validateIso}.`,
    '',
    `Run \`{{VALIDATE_COMMAND}}\` before ending the session.`,
    'Fix any errors before claiming the task is done.',
  ].join('\n');

  writeLastHookOutput('enforce-workflow', { decision: 'block', reason });
  writeJsonStdout({ decision: 'block', reason });
  process.exit(0);
}

main().catch(() => process.exit(0));
