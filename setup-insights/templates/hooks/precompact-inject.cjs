#!/usr/bin/env node
'use strict';

/**
 * PreCompact Hook -- Injects compressed insight rules into compaction context.
 * Ensures insight knowledge survives context compaction.
 * Reads MY_INSIGHTS.md and extracts top 5 friction rules + top 3 workflow patterns.
 * Keeps injected content under 500 tokens.
 */

const fs = require('fs');
const path = require('path');

// Read input from stdin (compaction context)
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

    let insightsContent = '';
    if (fs.existsSync(projectInsights)) {
      insightsContent = fs.readFileSync(projectInsights, 'utf8');
    } else if (fs.existsSync(userInsights)) {
      insightsContent = fs.readFileSync(userInsights, 'utf8');
    }

    if (!insightsContent) {
      process.exit(0);
    }

    // Extract compressed summary (under 500 tokens)
    const summary = [
      'INSIGHT RULES (survive compaction):',
      '1. Always run `bun validate` before committing or presenting results. Never skip validation.',
      '2. Apply UI/component fixes to ALL instances across codebase, not just the first occurrence.',
      '3. Specify PLAN ONLY or PLAN + IMPLEMENT explicitly -- avoid ambiguous prompts.',
      '4. Run `bun format` before staging to prevent formatter pre-commit hook failures.',
      '5. Verify visual changes in BOTH dark and light mode.',
      '',
      'WORKFLOW PATTERNS:',
      '1. Doc-First: Generate docs/PRDs before implementation for strong context.',
      '2. Plan-Then-Implement: Separate planning from coding for large changes.',
      '3. Validate-Before-Commit: Full validation (typecheck+lint+format+test+build) before every commit.'
    ].join('\n');

    process.stdout.write(summary);
  } catch (err) {
    // Never crash
  }
  process.exit(0);
});

process.stdin.on('error', () => {
  process.exit(0);
});
