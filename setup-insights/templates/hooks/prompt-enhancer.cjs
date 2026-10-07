#!/usr/bin/env node
'use strict';

/**
 * Hook 4a -- Fast Command Hook (deterministic, ~5ms)
 * Runs on UserPromptSubmit. Does keyword-based task type detection
 * and injects relevant reminders as systemMessage.
 *
 * Bypass: prompts starting with "!" skip all coaching.
 * Slash commands starting with "/" pass through unmodified.
 */

// Read input from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || data.message || '').trim();

    // Bypass check: prompt starts with "!"
    if (prompt.startsWith('!')) {
      process.exit(0);
    }

    // Slash command check: pass through
    if (prompt.startsWith('/')) {
      process.exit(0);
    }

    // Task type detection -- check ALL categories
    const lowerPrompt = prompt.toLowerCase();
    const reminders = [];

    // Bug fix detection
    if (/\b(fix|bug|error|broken|crash|fail|issue|regress|debug)\b/.test(lowerPrompt)) {
      reminders.push(
        'REMINDER (bug-fix): Run `bun validate` after fix. Check all instances, not just the first. Test both themes.'
      );
    }

    // UI change detection
    if (/\b(redesign|ui|ux|style|animation|css|theme|layout|visual|shadow|glassmorphism|card|button|modal|dialog|color|font|responsive|mobile|dark\s*mode|light\s*mode)\b/.test(lowerPrompt)) {
      reminders.push(
        'REMINDER (ui-change): Apply to ALL instances across codebase. Verify both dark and light mode. Run full validation before presenting results. Include before/after descriptions.'
      );
    }

    // Git ops detection
    if (/\b(commit|push|merge|branch|rebase|cherry-pick|stash|tag|git)\b/.test(lowerPrompt)) {
      reminders.push(
        'REMINDER (git-ops): Run `bun format` before staging. Run validation before committing. Generate conventional commit message.'
      );
    }

    // Docs detection
    if (/\b(doc|prd|roadmap|readme|documentation|changelog|agents\.md|claude\.md)\b/.test(lowerPrompt)) {
      reminders.push(
        'REMINDER (docs): Follow doc-first workflow. Generate complete package. Check project conventions in CLAUDE.md.'
      );
    }

    // Planning detection
    if (/\b(plan|design|architect|explore|analyze|investigate|blueprint)\b/.test(lowerPrompt)) {
      reminders.push(
        'REMINDER (planning): Specify explicitly if this is PLAN ONLY or PLAN + IMPLEMENT. If plan only, save to docs/plans/. If implement, include validation gates.'
      );
    }

    // Output result
    if (reminders.length > 0) {
      // Deduplicate (in case overlapping patterns matched same category)
      const unique = [...new Set(reminders)];
      process.stdout.write(unique.join('\n'));
    }
  } catch (err) {
    // Never crash -- always approve on error
  }
  process.exit(0);
});

// Handle empty stdin gracefully
process.stdin.on('error', () => {
  process.exit(0);
});
