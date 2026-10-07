#!/usr/bin/env node
'use strict';

/**
 * Stop Command Hook -- Friction Logger
 * Runs on Stop event. Detects friction signals in the conversation
 * and persists them to .claude/logs/friction-flags.jsonl for /retro analysis.
 *
 * Detection keywords:
 * - User corrections: "try again", "that's wrong", "no I meant", "not what I asked"
 * - Failure signals: "still broken", "didn't work", "same error", "again"
 * - Frustration: "no!", "wrong", "I said", "I already told you"
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

    const frictionFile = path.join(logsDir, 'friction-flags.jsonl');

    // Get conversation transcript from input
    // The Stop hook receives conversation context in various formats
    const transcript = data.transcript || data.conversation || data.messages || data.content || '';
    const text = typeof transcript === 'string'
      ? transcript
      : JSON.stringify(transcript);

    if (!text || text.length < 10) {
      process.exit(0);
    }

    const lowerText = text.toLowerCase();

    // Friction detection patterns (no /g flag to prevent lastIndex leakage)
    const frictionPatterns = [
      { pattern: /try again/i, signal: 'user_retry_request' },
      { pattern: /that'?s wrong/i, signal: 'user_correction' },
      { pattern: /no,?\s*i\s*meant/i, signal: 'user_correction' },
      { pattern: /not what i\s*(asked|wanted|meant)/i, signal: 'user_correction' },
      { pattern: /still broken/i, signal: 'persistent_failure' },
      { pattern: /didn'?t work/i, signal: 'persistent_failure' },
      { pattern: /same error/i, signal: 'repeated_error' },
      { pattern: /i already told you/i, signal: 'user_frustration' },
      { pattern: /i said\b/i, signal: 'user_frustration' },
      { pattern: /no!/i, signal: 'user_frustration' },
      { pattern: /wrong approach/i, signal: 'wrong_approach' },
      { pattern: /start over/i, signal: 'restart_needed' },
      { pattern: /\brevert\b/i, signal: 'revert_needed' },
    ];

    const detectedFriction = [];
    for (const { pattern, signal } of frictionPatterns) {
      if (pattern.test(text)) {
        detectedFriction.push(signal);
      }
    }

    // Deduplicate signals
    const uniqueSignals = [...new Set(detectedFriction)];

    if (uniqueSignals.length > 0) {
      // Extract a brief context snippet (first match area)
      let contextSnippet = '';
      for (const { pattern } of frictionPatterns) {
        const match = pattern.exec(text);
        if (match) {
          const start = Math.max(0, match.index - 30);
          const end = Math.min(text.length, match.index + match[0].length + 30);
          contextSnippet = text.slice(start, end).replace(/\n/g, ' ').trim();
          break;
        }
      }

      const entry = {
        ts: new Date().toISOString(),
        signals: uniqueSignals,
        context: contextSnippet.slice(0, 200),
        session: process.env.CLAUDE_SESSION_ID || String(process.ppid || 'unknown')
      };

      fs.appendFileSync(frictionFile, JSON.stringify(entry) + '\n');
    }

  } catch (err) {
    // Never crash
  }

  process.exit(0);
});

process.stdin.on('error', () => {
  process.exit(0);
});
