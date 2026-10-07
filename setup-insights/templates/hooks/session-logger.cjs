#!/usr/bin/env node
'use strict';

/**
 * PostToolUse Observability Hook -- Session Logger
 * Logs tool use events to session-specific JSONL files.
 * Tracks friction signals via sidecar state file (repeated edits, failures, rejections).
 *
 * Log files: .claude/logs/session-{session_id}.jsonl
 * Sidecar:   .claude/logs/.state-{session_id}.json
 */

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const logsDir = path.join(projectDir, '.claude', 'logs');

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Determine session ID
    const sessionId = process.env.CLAUDE_SESSION_ID || String(process.ppid || 'unknown');

    const logFile = path.join(logsDir, `session-${sessionId}.jsonl`);
    const stateFile = path.join(logsDir, `.state-${sessionId}.json`);

    // Extract tool info from input
    const toolName = data.tool_name || data.tool || data.toolName || 'unknown';
    const toolInput = data.tool_input || data.input || {};
    const toolOutput = data.tool_output || data.output || {};
    const exitCode = data.exit_code != null ? data.exit_code : (toolOutput.exit_code != null ? toolOutput.exit_code : null);
    const userRejected = data.was_rejected === true || data.user_rejected === true || data.decision === 'reject';

    // Determine file being operated on (for Edit/Write/Read)
    let targetFile = toolInput.file_path || toolInput.path || toolInput.file || null;
    if (typeof targetFile === 'string') {
      // Normalize to relative path (Windows path separator mismatch fix)
      const norm = (p) => p.replace(/\\/g, '/');
      targetFile = norm(targetFile).replace(norm(projectDir), '').replace(/^\/+/, '');
    }

    // Build log entry
    const entry = {
      ts: new Date().toISOString(),
      tool: toolName,
      session: sessionId
    };

    if (targetFile) entry.file = targetFile;

    // Determine status
    if (userRejected) {
      entry.status = 'rejected';
    } else if (exitCode !== null && exitCode !== 0) {
      entry.status = 'failed';
    } else {
      entry.status = 'success';
    }

    // Load or create sidecar state
    let state = { file_edit_counts: {} };
    try {
      if (fs.existsSync(stateFile)) {
        state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        if (!state.file_edit_counts) state.file_edit_counts = {};
      }
    } catch (_) {
      state = { file_edit_counts: {} };
    }

    // Track friction signals
    const isEditTool = /^(Edit|Write|NotebookEdit)$/i.test(toolName);
    if (isEditTool && targetFile) {
      state.file_edit_counts[targetFile] = (state.file_edit_counts[targetFile] || 0) + 1;
      if (state.file_edit_counts[targetFile] >= 3) {
        entry.friction_signal = `repeated_edit_count:${state.file_edit_counts[targetFile]}`;
      }
    }

    if (entry.status === 'failed') {
      entry.friction_signal = entry.friction_signal
        ? `${entry.friction_signal},command_failure`
        : 'command_failure';
    }

    if (entry.status === 'rejected') {
      entry.friction_signal = entry.friction_signal
        ? `${entry.friction_signal},user_rejected`
        : 'user_rejected';
    }

    // Write log entry (append)
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

    // Save sidecar state (atomic write via rename for NTFS safety)
    const tmpFile = stateFile + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(state));
    fs.renameSync(tmpFile, stateFile);

  } catch (err) {
    // Never crash -- silently fail
  }

  process.exit(0);
});

process.stdin.on('error', () => {
  process.exit(0);
});
