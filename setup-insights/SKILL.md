---
description: Bootstrap the Insight Coaching System in the current project
argument-hint: "[optional: project name or specific conventions to include]"
---

# Setup Insight Coaching System

You are bootstrapping the Insight Coaching System for the current project. This system provides:
- Prompt coaching hooks that detect task type and inject reminders
- Session logging and friction detection
- Pre-compaction insight injection to survive context compaction
- Quality gates on Stop and SubagentStop events

Think hard about the current project before starting. Analyze its structure, tools, and conventions to adapt the coaching system appropriately.

## Step 1: Analyze the Current Project

Read and analyze these files (skip any that don't exist):
- `CLAUDE.md` in the project root
- `package.json` in the project root
- Project directory structure (ls the root and src/ if it exists)

From this analysis, determine:
- **Project name**: from package.json `name` field or directory name
- **Package manager**: look for bun.lockb (bun), yarn.lock (yarn), pnpm-lock.yaml (pnpm), or default to npm
- **Validation command**: look for a `validate` script in package.json. If none exists, compose one from available scripts (format:check, lint, typecheck, test, build)
- **Format command**: the formatter command (e.g., `bun format`, `npm run format`, `yarn format`)
- **Test command**: the test runner command
- **Build command**: the build command
- **Lint command**: the linter command
- **Languages/framework**: TypeScript? JavaScript? React? Vue? Svelte? Next.js? etc.
- **Theme system**: does it have dark/light mode? What CSS approach?
- **i18n**: is it bilingual/multilingual?
- **Existing conventions and gotchas** from CLAUDE.md

Store all discovered values for use in subsequent steps. Use `$PKG` as shorthand for the package manager command (e.g., `bun`, `npm run`, `yarn`, `pnpm`).

Construct these key variables:
- `VALIDATE_CMD`: e.g., `bun validate`, `npm run validate`, `yarn validate`
- `FORMAT_CMD`: e.g., `bun format`, `npm run format`
- `PKG_RUN`: e.g., `bun`, `npm run`, `yarn`, `pnpm`

## Step 2: Create `.claude/insights/MY_INSIGHTS.md`

First, read the universal insights file at `~/.claude/insights/UNIVERSAL_INSIGHTS.md`.

Then create `.claude/insights/MY_INSIGHTS.md` with the following structure. Replace ALL occurrences of `bun validate` with the project's actual `VALIDATE_CMD`, and `bun format` with the project's actual `FORMAT_CMD`.

```markdown
---
last_updated: <today's date YYYY-MM-DD>
max_target_lines: 300
---

# My Claude Code Insights

## System Usage

- **Bypass coaching:** Start any prompt with `!` to skip ALL coaching hooks. Example: `! just commit and push`
- **Slash commands skip coaching automatically** -- no bypass needed for `/commit`, `/coach`, etc.
- **Simple directives** (yes, no, continue, do it, looks good) skip Haiku coaching automatically.

## Universal Patterns

### My Workflow Profile

- **Style:** Iterative refinement with visual feedback, rapid directives
- **Session pattern:** Short bursts (~6 msgs/session), frequent sessions
- **Role for Claude:** Managed junior developer -- quick directives + quality gates
- **Strengths:** Doc-first development, multi-session task tracking, structured git automation
- **Multi-clauding:** Runs 24+ parallel sessions regularly

### Friction Patterns

#### FP-1: Buggy Initial Implementations

- **Root cause:** Claude's first pass often has type errors, visual regressions, or incomplete fixes
- **Mitigation:** Always run full validation (`VALIDATE_CMD`) before presenting results. Include acceptance criteria and screenshots upfront.
- **CLAUDE.md rule:** "Always run `VALIDATE_CMD` before committing. Never skip validation steps."

#### FP-2: Plan-But-No-Code Sessions

- **Root cause:** Prompt doesn't clearly signal "implement now" vs "just plan"
- **Mitigation:** Explicitly state PLAN ONLY or PLAN + IMPLEMENT in every prompt
- **CLAUDE.md rule:** "Specify explicitly if this is PLAN ONLY or PLAN + IMPLEMENT."

#### FP-3: Git and Tooling Friction

- **Root cause:** Prettier/formatter pre-commit hook failures, file locks, dev server crashes
- **Mitigation:** Always run `FORMAT_CMD` before staging. Kill stale dev servers before starting new ones.
- **CLAUDE.md rule:** "Run formatter before staging to avoid pre-commit hook failures."

#### FP-4: Single-Instance Fixes

- **Root cause:** Claude fixes a component in one place but misses other views, variants, or pages
- **Mitigation:** Always search codebase for ALL instances of a component before declaring fix complete
- **CLAUDE.md rule:** "Apply UI fixes to ALL instances across codebase, not just the first occurrence."

#### FP-5: Missing Theme Verification

- **Root cause:** Visual changes not tested in both light and dark mode
- **Mitigation:** Always verify both themes after visual/CSS changes
- **CLAUDE.md rule:** "Verify rendering in BOTH light and dark mode."

### Proven Workflow Patterns

#### WP-1: Doc-First Development

Generate PRDs, roadmaps, task breakdowns, and execution prompts BEFORE implementation. Gives Claude strong context and produces higher success rate.

#### WP-2: Plan-Then-Implement

For large redesigns, explicitly separate planning from implementation. Planning session saves to `docs/plans/`. Implementation session follows the plan. Prevents context exhaustion.

#### WP-3: Validate-Before-Commit

Run full validation suite (typecheck + lint + format + test + build) before every commit. Catches bugs that would otherwise require re-commit cycles.

#### WP-4: Multi-Session Task Tracking

Use TodoWrite/TaskCreate for initiatives spanning multiple sessions. Track progress across sessions with numbered tasks.

### Anti-Patterns to Flag

1. **Open-ended "improve X"** without specifying plan vs implement
2. **Skipping validation** before presenting results or committing
3. **Fixing only one instance** of a component when multiple exist
4. **Not checking both themes** (light/dark) for visual changes
5. **Scope creep** -- trying to do too many unrelated things in one prompt
6. **Missing acceptance criteria** for UI changes
7. **Separate sessions for git ops** -- end implementation sessions with validate+commit+push instead

### Prompt Templates

#### Bug Fix (Autonomous Loop)

` ` `
I have the following bugs to fix: [describe bugs or paste error logs].
For each bug: 1) Read relevant source and test files. 2) Identify root cause.
3) Apply fix. 4) Run `VALIDATE_CMD`. 5) If any check fails, diagnose and fix.
6) Repeat until ALL checks pass with zero errors. 7) Present summary of changes.
Do NOT skip validation. Track progress with TaskCreate.
At the end, run `git diff --stat` so I can review before committing.
` ` `

#### UI Change (with validation gates)

` ` `
Implement the following UI changes: [description].
After EACH file you modify, run typecheck on that file.
Apply changes to ALL instances across the codebase.
Verify both dark and light mode. After all changes complete, run `VALIDATE_CMD`.
Fix any issues before showing me results. Include before/after descriptions.
` ` `

#### Plan Only

` ` `
I need a redesign of [component/page]. PLAN MODE ONLY -- do NOT write any code yet.
Explore the codebase, identify all files that need changes, and create a numbered
implementation plan in a markdown file at docs/plans/[feature]-plan.md.
Include file paths, specific changes, and dependencies between tasks.
` ` `

#### Plan + Implement

` ` `
I need [feature/change]. Create a brief plan, then IMPLEMENT it fully.
Run `VALIDATE_CMD` after implementation. Fix any issues before presenting results.
Apply to ALL instances. Check both themes. Show git diff --stat when done.
` ` `

#### Git: Validate-Commit-Push

` ` `
We're done with this feature. Run full validation (typecheck, lint, format, test, build).
If everything passes, stage all meaningful changes (exclude build artifacts and OS files),
generate a conventional commit message, commit, and push to origin.
Show me the commit hash when done.
` ` `

## Project: <project-name>

- **Stack:** <discovered stack info>
- **Validation:** `VALIDATE_CMD` = <what it runs>
- **Format:** `FORMAT_CMD`
- <any other project-specific conventions discovered>
```

IMPORTANT: In the file you write, replace every literal `VALIDATE_CMD` with the actual command (e.g., `npm run validate`), and every `FORMAT_CMD` with the actual format command (e.g., `npm run format`). The backtick-fenced prompt template code blocks should use single backticks in the actual output (the triple backticks shown above with spaces are just escaping for this skill file).

If the argument to this skill includes specific conventions or a project name, incorporate them into the `## Project:` section.

## Step 3: Create Hook Scripts in `.claude/hooks/`

Create the directory `.claude/hooks/` if it doesn't exist. Then write each of the 6 hook scripts below. In every script, replace `bun validate` with the project's `VALIDATE_CMD` and `bun format` with the project's `FORMAT_CMD`.

### File: `.claude/hooks/prompt-enhancer.cjs`

```javascript
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
```

### File: `.claude/hooks/precompact-inject.cjs`

```javascript
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
```

### File: `.claude/hooks/session-logger.cjs`

```javascript
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
```

### File: `.claude/hooks/session-start.cjs`

```javascript
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
```

### File: `.claude/hooks/session-end.cjs`

```javascript
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
```

### File: `.claude/hooks/friction-logger.cjs`

```javascript
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
```

## Step 4: Create `.claude/settings.local.json`

Write this file, replacing `bun validate` with `VALIDATE_CMD` and `bun format` with `FORMAT_CMD` in the prompt text strings:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/prompt-enhancer.cjs",
            "timeout": 5
          },
          {
            "type": "prompt",
            "prompt": "You are a prompt quality coach for a developer who uses Claude Code heavily. You are analyzing their prompt BEFORE Claude processes it.\n\nUser prompt: $ARGUMENTS\n\nFIRST: Check if coaching should be skipped:\n- If the prompt starts with '!' (bypass flag) -> respond \"Bypass mode.\"\n- If the prompt starts with '/' (slash command) -> respond \"Slash command.\"\n- If the prompt is under 10 words and is clearly a simple directive (yes, no, continue, do it, looks good, etc.) -> respond \"Simple directive.\"\n- If the prompt is clearly an informational question (explain, what is, how does, why, compare) with no implementation request -> respond \"Informational query.\"\n\nOtherwise, evaluate prompt quality. Check for these known anti-patterns from the user's history:\n\n1. PLAN-VS-IMPLEMENT AMBIGUITY: Does the prompt clearly state whether it wants planning only, or planning + implementation? If ambiguous, flag it.\n2. MISSING VALIDATION GATE: For any code change request, does the prompt include a validation step (like 'run VALIDATE_CMD')? If not, suggest adding one.\n3. SINGLE-INSTANCE RISK: For UI/component changes, does the prompt specify applying to ALL instances? If it mentions a specific component without saying 'everywhere' or 'all instances', flag it.\n4. MISSING THEME CHECK: For visual/CSS/animation changes, does the prompt mention checking both dark and light mode? If not, flag it.\n5. SCOPE CREEP: Is the prompt trying to do too many unrelated things at once? If so, suggest splitting.\n6. MISSING ACCEPTANCE CRITERIA: For UI changes, are there concrete criteria for 'done'? If not, suggest adding them.\n\nRespond with JSON: {\\\"ok\\\": true, \\\"reason\\\": \\\"brief explanation\\\"}. If the prompt is good: {\\\"ok\\\": true, \\\"reason\\\": \\\"Well-structured prompt.\\\"}. If improvements are needed: {\\\"ok\\\": true, \\\"reason\\\": \\\"PROMPT COACH SUGGESTIONS: [suggestions]\\\"}. Never set ok to false -- always approve. Keep reason under 100 words.",
            "timeout": 10
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/precompact-inject.cjs",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-start.cjs",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-end.cjs",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/friction-logger.cjs",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-logger.cjs",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

IMPORTANT: In the actual file you write, replace every `VALIDATE_CMD` with the project's actual validation command, and every `FORMAT_CMD` with the project's format command. Keep the exact JSON structure.

## Step 5: Update CLAUDE.md

If `CLAUDE.md` does not exist in the project root, create a minimal one with the project name and basic commands section.

Then check if the following sections already exist. For each section that does NOT already exist, append it to the end of CLAUDE.md. Replace `VALIDATE_CMD` and `FORMAT_CMD` with actual commands:

```markdown
## Pre-Commit Checklist

Always run `VALIDATE_CMD` (or the full validation suite: typecheck, lint, build, test) before committing any changes. Never skip validation steps.

## UI Changes

- When making UI/visual changes, apply fixes to ALL instances of a component across the codebase, including variants, mobile views, and all page routes -- not just the first occurrence found.
- When implementing visual/animation features (shadows, card effects, theme tokens), verify rendering in BOTH light and dark mode.
- When making changes that affect global appearance (attribution, logos, meta tags, theme defaults), apply them site-wide -- not just to a single page.

## Task Clarity

When a prompt is ambiguous about whether to plan or implement, ask for clarification. Default to PLAN + IMPLEMENT unless the user says otherwise.

## Git Workflow

Always run formatting (`FORMAT_CMD` or equivalent) before staging to avoid pre-commit hook failures.
```

Do NOT duplicate sections that already exist in the file.

## Step 6: Update .gitignore

Read the project's `.gitignore` file. If it does NOT already contain the Claude coaching system entries, append this block:

```
# Claude Code coaching system -- ephemeral data
.claude/logs/
!.claude/logs/.gitkeep
!.claude/logs/archive/
!.claude/logs/archive/.gitkeep
.claude/insights/MY_INSIGHTS.md.bak
.claude/insights/ARCHIVE.md
```

If the entries already exist, skip this step.

## Step 7: Create Log Directories

Create these directories and gitkeep files:
- `.claude/logs/.gitkeep` (empty file)
- `.claude/logs/archive/.gitkeep` (empty file)

Use `mkdir -p` and `touch` (or equivalent) to create them.

## Step 8: Verify Setup

Run these verification checks and report results:

1. **Syntax check all hooks:** Run `node --check .claude/hooks/prompt-enhancer.cjs` (and all other 5 `.cjs` files). Report pass/fail for each.
2. **JSON validation:** Run `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.local.json','utf8')); console.log('OK')"` to verify settings.local.json parses correctly.
3. **Smoke test prompt-enhancer:** Run `echo '{"prompt":"fix the login bug"}' | node .claude/hooks/prompt-enhancer.cjs` and verify it returns plain text containing a reminder (not JSON).
4. **Smoke test bypass mode:** Run `echo '{"prompt":"! just do it"}' | node .claude/hooks/prompt-enhancer.cjs` and verify it exits cleanly with no output (exit code 0).

Report each check as PASS or FAIL with details.

## Step 9: Verify Slash Commands

Check if user-level commands exist at `~/.claude/commands/`:
- `coach.md`
- `patterns.md`
- `autopilot.md`
- `retro.md`

If ALL 4 exist, report "Slash commands: OK".
If any are missing, warn: "WARNING: Missing user-level slash commands at ~/.claude/commands/. The coaching system works best with /coach, /patterns, /autopilot, and /retro commands. Set these up separately."

## Final Report

After all steps complete, present a summary:

```
Insight Coaching System Setup Complete
======================================
Project:        <project-name>
Package manager: <detected>
Validate cmd:   <VALIDATE_CMD>
Format cmd:     <FORMAT_CMD>

Files created:
  .claude/insights/MY_INSIGHTS.md
  .claude/hooks/prompt-enhancer.cjs
  .claude/hooks/precompact-inject.cjs
  .claude/hooks/session-logger.cjs
  .claude/hooks/session-start.cjs
  .claude/hooks/session-end.cjs
  .claude/hooks/friction-logger.cjs
  .claude/settings.local.json
  .claude/logs/.gitkeep
  .claude/logs/archive/.gitkeep

Files updated:
  CLAUDE.md (appended coaching sections)
  .gitignore (added coaching exclusions)

Verification:
  Hook syntax:     <PASS/FAIL details>
  Settings JSON:   <PASS/FAIL>
  Smoke test:      <PASS/FAIL>
  Slash commands:  <OK/WARNING>

The coaching system is now active. Start a new Claude Code session
in this project to activate the hooks. Use `!` prefix to bypass
coaching on any prompt. Run `/coach` for coaching status.
```
