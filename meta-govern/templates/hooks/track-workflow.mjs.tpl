#!/usr/bin/env node
// Template: templates/hooks/track-workflow.mjs.tpl
// Variables used:
//   {{IF_STACK_HAS_UI}} ... {{/IF}} — UI-specific tracking branches
//
// PostToolUse hook on Edit|Write|MultiEdit|Bash. Updates
// .claude/tmp/workflow-state.json so enforce-workflow can read it.
// State written: lastEdit (latest feature-file edit), lastValidate (latest
// PASSING validate, keyed off the success sentinel), and (if UI) lastUiEdit.

import path from 'node:path';
import fs from 'node:fs';
import {
  projectDir,
  readJsonStdin,
  readJson,
  writeJson,
  tmpDir,
  isFeatureFile,
  isValidateBash,
  reduceWorkflowState,
  git,
  extractGitStatusPath,
} from './lib/hook-utils.mjs';

const STATE_PATH = path.join(tmpDir(), 'workflow-state.json');

function isUiPath(filePath) {
  if (!filePath) return false;
  const rel = path.relative(projectDir(), path.resolve(filePath));
  return /(components|pages|theme|tokens)\//.test(rel) || /\.(css|module\.css|scss|tsx|vue|svelte)$/.test(rel);
}

// Nearest existing ancestor directory's mtime. Used for a deleted feature file,
// which has nothing to stat: the deletion bumped some ancestor dir's mtime, and
// that value is STABLE across later read-only commands — unlike Date.now(), which
// would ratchet lastEdit forward on every Bash call and perpetually re-trip the
// Stop gate while the deletion stays uncommitted. Returns 0 if nothing stats
// (→ the entry is skipped, matching the pre-fix behavior).
function nearestDirMtime(dir) {
  for (let cur = dir, i = 0; i < 64; i++) {
    try { return fs.statSync(cur).mtimeMs; } catch { /* walk up to an existing ancestor */ }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return 0;
}

// A Bash command (sed -i, cat > file, codegen, rm, mv) can change a feature file
// with no Edit/Write event. Return the newest dirty feature path so the change
// still counts toward the Stop-hook validate gate — including DELETIONS, which
// have no worktree file to stat (`rm src/...` after a validate).
function latestDirtyFeatureEdit() {
  const out = git('status --porcelain');
  if (!out) return null;
  let best = null;
  for (const line of out.split('\n')) {
    const rel = extractGitStatusPath(line);
    if (!rel || !isFeatureFile(rel)) continue;
    const abs = path.join(projectDir(), rel);
    let mtime;
    try {
      mtime = fs.statSync(abs).mtimeMs;
    } catch {
      // Deleted/moved — no file to stat. Use the nearest existing ancestor dir's
      // mtime (stable; never Date.now(), which would perpetually re-trip the gate).
      mtime = nearestDirMtime(path.dirname(abs));
    }
    if (!best || mtime > best.mtime) best = { path: rel, mtime };
  }
  return best;
}

// The validate command writes this sentinel only after the full gate passes.
// Trusting it (not the command text) means a FAILED validate — even one an exit-0
// wrapper like `... validate || true` masks — never advances the gate.
function validatePassedAt() {
  try { return fs.statSync(path.join(tmpDir(), 'last-validate-ok')).mtimeMs; }
  catch { return 0; }
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
      // Advance only when the success sentinel is fresh — i.e. validate actually
      // PASSED — not merely because the command text mentioned `validate`.
      const okAt = validatePassedAt();
      if (okAt > state.lastValidate) {
        state = reduceWorkflowState(state, { type: 'validate', command, timestamp: okAt });
      }
    } else {
      // Non-validate Bash command: credit the newest dirty feature file as an
      // edit so sed/cat>/codegen/rm changes (invisible to Edit|Write) still gate Stop.
      const edit = latestDirtyFeatureEdit();
      if (edit && edit.mtime > state.lastEdit) {
        state = reduceWorkflowState(state, {
          type: 'edit',
          filePath: edit.path,
          timestamp: edit.mtime,
          {{IF_STACK_HAS_UI}}isUi: isUiPath(edit.path),{{/IF}}
        });
      }
    }
  }

  writeJson(STATE_PATH, state);
  process.exit(0);
}

main().catch(() => process.exit(0));
