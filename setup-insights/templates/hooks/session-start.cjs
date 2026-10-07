#!/usr/bin/env node
'use strict';

/**
 * SessionStart Hook -- Injects baseline insight awareness into every session.
 * Reads MY_INSIGHTS.md (project-level first, user-level fallback)
 * and returns a brief ~100 token summary of top 3 critical rules.
 */

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    // Try project-level first, then user-level fallback
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const projectInsights = path.join(projectDir, '.claude', 'insights', 'MY_INSIGHTS.md');
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    const userInsights = path.join(homeDir, '.claude', 'insights', 'UNIVERSAL_INSIGHTS.md');

    let hasInsights = false;
    if (fs.existsSync(projectInsights)) {
      hasInsights = true;
    } else if (fs.existsSync(userInsights)) {
      hasInsights = true;
    }

    if (!hasInsights) {
      process.exit(0);
    }

    // Clean up orphaned session/state files older than 24h
    const logsDir = path.join(projectDir, '.claude', 'logs');
    try {
      if (fs.existsSync(logsDir)) {
        const now = Date.now();
        const logFiles = fs.readdirSync(logsDir);
        for (const f of logFiles) {
          if ((f.startsWith('.state-') || (f.startsWith('session-') && f.endsWith('.jsonl'))) && !f.startsWith('all-')) {
            const filePath = path.join(logsDir, f);
            const stat = fs.statSync(filePath);
            if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
              // Merge orphaned session logs before deleting
              if (f.startsWith('session-') && f.endsWith('.jsonl')) {
                try {
                  const data = fs.readFileSync(filePath, 'utf8').trim();
                  if (data) {
                    const consolidated = path.join(logsDir, 'all-sessions.jsonl');
                    fs.appendFileSync(consolidated, data + '\n');
                  }
                } catch (_) {}
              }
              try { fs.unlinkSync(filePath); } catch (_) {}
            }
          }
        }
      }
    } catch (_) {}

    // Brief summary -- top 3 critical rules (~100 tokens)
    // NOTE: Intentionally static for speed. Update these when /retro changes insights.
    const summary = [
      'SESSION INSIGHT RULES:',
      '1. Always run `bun validate` before committing or presenting results.',
      '2. Apply UI changes to ALL instances across the codebase, not just the first.',
      '3. Specify PLAN vs IMPLEMENT explicitly in ambiguous prompts.'
    ].join(' ');

    process.stdout.write(summary);
  } catch (err) {
    // Never crash
  }
  process.exit(0);
});

process.stdin.on('error', () => {
  process.exit(0);
});
