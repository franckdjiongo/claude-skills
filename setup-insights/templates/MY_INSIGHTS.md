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
