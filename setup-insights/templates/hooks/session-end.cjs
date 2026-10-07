#!/usr/bin/env node
'use strict';

/**
 * SessionEnd Hook -- Cleans up session-specific files and merges logs.
 * 1. Reads session-specific log file
 * 2. Appends to consolidated all-sessions.jsonl
 * 3. Deletes session-specific log file and sidecar state file
 */

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const logsDir = path.join(projectDir, '.claude', 'logs');

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const consolidatedFile = path.join(logsDir, 'all-sessions.jsonl');

    // Glob-based merge -- merge ALL session-*.jsonl files, not just current ppid
    // This makes session ID instability irrelevant
    const files = fs.readdirSync(logsDir);
    for (const f of files) {
      if (f.startsWith('session-') && f.endsWith('.jsonl')) {
        const filePath = path.join(logsDir, f);
        try {
          const sessionData = fs.readFileSync(filePath, 'utf8').trim();
          if (sessionData) {
            fs.appendFileSync(consolidatedFile, sessionData + '\n');
          }
          fs.unlinkSync(filePath);
        } catch (_) {}
      }
    }

    // Clean up ALL sidecar state files
    for (const f of files) {
      if (f.startsWith('.state-') && f.endsWith('.json')) {
        try { fs.unlinkSync(path.join(logsDir, f)); } catch (_) {}
      }
      // Also clean up .tmp files from atomic writes
      if (f.endsWith('.json.tmp')) {
        try { fs.unlinkSync(path.join(logsDir, f)); } catch (_) {}
      }
    }

    // Size-based log rotation (5MB threshold)
    if (fs.existsSync(consolidatedFile)) {
      try {
        const stats = fs.statSync(consolidatedFile);
        if (stats.size > 5 * 1024 * 1024) {
          const archiveDir = path.join(logsDir, 'archive');
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
          }
          const datestamp = new Date().toISOString().slice(0, 10);
          const archivePath = path.join(archiveDir, `sessions-${datestamp}.jsonl`);
          fs.renameSync(consolidatedFile, archivePath);
        }
      } catch (_) {}
    }

  } catch (err) {
    // Never crash
  }

  process.exit(0);
});

process.stdin.on('error', () => {
  process.exit(0);
});
