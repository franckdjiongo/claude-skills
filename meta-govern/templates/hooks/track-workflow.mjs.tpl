#!/usr/bin/env node
// Template: templates/hooks/track-workflow.mjs.tpl
// Variables used:
//   {{IF_STACK_HAS_UI}} ... {{/IF}} — UI-specific tracking branches
//
// PostToolUse hook on Edit|Write|MultiEdit|Bash. Updates
// .claude/tmp/workflow-state.json so enforce-workflow can read it.
// State written: lastEdit (latest feature-file edit), lastValidate (latest
// validate-style Bash command), and (if the stack has UI) lastUiEdit.

import path from 'node:path';
import {
  projectDir,
  readJsonStdin,
  readJson,
  writeJson,
  tmpDir,
  isFeatureFile,
  isValidateBash,
  reduceWorkflowState,
} from './lib/hook-utils.mjs';

const STATE_PATH = path.join(tmpDir(), 'workflow-state.json');

function isUiPath(filePath) {
  if (!filePath) return false;
  const rel = path.relative(projectDir(), path.resolve(filePath));
  return /(components|pages|theme|tokens)\//.test(rel) || /\.(css|module\.css|scss|tsx|vue|svelte)$/.test(rel);
}

async function main() {
  const event = await readJsonStdin();
  const tool = event.tool_name || '';
  const input = event.tool_input || {};
  const now = Date.now();

  let state = readJson(STATE_PATH, {
    lastEdit: 0,
    lastEditPath: '',
    lastValidate: 0,
    lastValidateCommand: '',
    lastUiEdit: 0,
    lastUiEditPath: '',
  });

  if (['Edit', 'Write', 'MultiEdit'].includes(tool)) {
    const filePath = input.file_path || input.path || '';
    if (isFeatureFile(filePath)) {
      state = reduceWorkflowState(state, {
        type: 'edit',
        filePath,
        timestamp: now,
        {{IF_STACK_HAS_UI}}isUi: isUiPath(filePath),{{/IF}}
      });
    }
  }

  if (tool === 'Bash') {
    const command = input.command || '';
    if (isValidateBash(command)) {
      state = reduceWorkflowState(state, { type: 'validate', command, timestamp: now });
    }
  }

  writeJson(STATE_PATH, state);
  process.exit(0);
}

main().catch(() => process.exit(0));
