---
name: schedule-plan-execution
description: Schedule autonomous Claude Code sessions to execute implementation plans at specific times on specific branches. Use this skill whenever the user wants to schedule plan execution, set up overnight autonomous runs, create follow-up continuation tasks, queue multi-phase autonomous work, or automate plan execution with post-completion polish. Triggers on phrases like "schedule plan", "run plan tonight", "execute plan at [time]", "autonomous execution", "overnight run", "schedule follow-up", "run this at 2am", "queue plan execution", or any request to set up timed autonomous plan execution in any project.
---

# Schedule Plan Execution

Schedule autonomous Claude Code sessions that execute implementation plans at specific times, with optional follow-up tasks for continuation and post-plan work.

**Sibling skill routing**: this skill schedules LOCAL sessions (Desktop scheduled tasks — the machine must be on at fire time). If the user wants the work to run **on the cloud** (claude.ai routines, machine possibly off, chained overnight runs), use `cloud-night-shift` instead. For a local item-by-item queue loop, use `loop-autonomy`.

## Why this skill exists

Executing large implementation plans takes hours. Users often want to kick off plan execution in the evening or overnight, then have a follow-up task check completion and continue or do additional polish work. This skill captures that entire scheduling workflow so it happens consistently every time, with proper autonomous prompts, atomic commits, and completion tracking.

## Workflow

### Step 1: Gather context

Collect these from the user's request and the current project state:

| Info needed | How to get it |
|---|---|
| **Plan file path** | User provides, or search `docs/**/plan*.md`, `docs/**/plans/**/*.md` |
| **Branch** | User provides, or use current branch from `git branch --show-current` |
| **Schedule time(s)** | User provides (e.g., "9:15 PM", "2 AM", "in 1 hour") |
| **Execution skill** | Detect from project: `execute-plan`, `project-executing-plan`, or `project-subagent-driven-development` |
| **Validation command** | Detect from project: `npm run validate`, `bun validate`, `bun run build`, etc. |
| **Execution strategy status** | Read the plan to check if execution strategy is already written |
| **Follow-up task?** | Ask user if they want a continuation/polish task scheduled after |
| **Additional post-plan work?** | e.g., frontend design polish, test coverage, documentation |
| **User timezone** | Infer from system or ask (needed for `fireAt` ISO 8601 offset) |

### Step 2: Detect project configuration

Before building the prompt, read the project to auto-detect settings:

```
1. Read CLAUDE.md for project rules, validation commands, and skill references
2. Read the plan file to understand:
   - Task groups and their execution strategy
   - Agent assignments (tc-implementer, tc-ui-implementer, etc.)
   - Model assignments per group (opus, sonnet, haiku)
   - Pipeline: TDD, code review, spec compliance, quality gates
   - Current progress (which tasks are already done)
3. Check for .claude/rules/ to include in autonomous instructions
4. Check for HANDOFF.md (indicates prior partial execution)
```

### Step 3: Build the scheduled task prompt

The prompt must be **self-contained** because the scheduled session starts fresh with no conversation history. Include everything the autonomous agent needs.

**Peripheral obligations go in the acceptance list.** When turning a plan phase into a prompt, copy peripheral requirements (gitignore/.gitkeep entries, docs updates, redeploy steps) into that phase's explicit acceptance checklist — requirements left in prose get skipped. (Measured on the 2026-07-07 night run: the only gap across 3 phases was a gitignore requirement that lived in prose while the rest of the acceptance list was executed to the letter.)

#### Prompt template for plan execution:

```
You are executing an implementation plan autonomously. The user will NOT be available to answer questions -- work fully autonomously, follow the plan, guidelines, and rules strictly.

## Step 0 -- Anti-overlap lock (MANDATORY whenever another scheduled task -- or this task's own catch-up/resume safety net -- can target the same repo)
1. Run the reaper: `sh ~/.claude/scripts/night-run-reaper.sh` (kills orphaned vitest/esbuild/vite workers left by a dead session).
2. Acquire the lock: `~/.claude/scripts/night-run-lock.sh acquire {task_id}`.
   - **Lock HELD and FRESH (<30 min)**: do NOT work in parallel. Write a HANDOFF.md entry noting the report (who holds it, since when, best guess why) and exit cleanly -- do not touch the repo.
   - **Lock STALE (>30 min)**: document the staleness in HANDOFF.md, then check `git status` + `git stash list` for uncommitted work from the dying session -- RECOVER it (commit it or restore the stash), NEVER overwrite or discard it -- before taking the lock over.
3. `touch` the lock periodically while working so a long-running step doesn't let it go stale under you.
4. GUARANTEED release on every exit path (success, failure, abort): `~/.claude/scripts/night-run-lock.sh release` + kill any dev/preview server this session started.
5. Never commit the lock file.

## Setup
1. Change to the project directory: `cd {project_path}`
2. Ensure you are on branch `{branch}` (run `git checkout {branch}` if needed)
3. Run `git pull` to ensure latest changes

## Execution
Use the `{execution_skill}` skill to execute the plan at:
`{plan_path}`

{execution_strategy_note}

The plan covers {task_summary}:
{task_group_details}

## Autonomous Rules
- Do NOT ask the user questions -- make reasonable decisions based on the plan, specs, and codebase
- Follow ALL project rules in CLAUDE.md and .claude/rules/
{agent_model_instructions}
- Deviation clause: if a delegated unit's diff turns out SMALL and tightly coupled, the orchestrator MAY implement it directly instead of dispatching the assigned agent/model -- document the deviation and its reason in the handoff journal (a documented exception, never a silent one)
- Read a file before its first Edit ("Edit before Read" is the #1 recurring tool error in autonomous runs)
- Run `{validate_command}` after each group before committing
- If a validation fails, fix the issue autonomously -- do not skip or defer
{deferred_feedback_rule}
- Environment mutation logging: any `convex env set`, `vercel env`, or equivalent command run autonomously MUST be recorded in HANDOFF.md as old value -> new value (or a fingerprint/hash if the value is sensitive) + the reason for the change. No silent env flips.
- Commit after each successful group with descriptive messages
- Write a HANDOFF.md at the end summarizing what was accomplished and any issues encountered
```

Where:
- `{execution_strategy_note}`: If already done, say "The Execution Strategy has ALREADY been completed. Skip directly to Step 8 (Launch subagent-driven development)."
- `{agent_model_instructions}`: List specific agent and model assignments from the plan
- `{deferred_feedback_rule}`: If global CLAUDE.md has a deferred feedback workflow, include it
- `{task_id}`: this task's own scheduled-task id (the label passed to `night-run-lock.sh acquire`). Step 0 is mandatory whenever a second scheduled task (a parallel phase, or this task's own catch-up/resume fallback from Step 3c) can fire against the same repo; for a genuinely solo, single-fire task on a repo with no other scheduled activity it may be omitted, but default to including it -- the failure mode in Step 3b shows overlap is easy to miss.

#### Prompt template for follow-up/continuation task:

```
You are running autonomously at {time}. The user is NOT available -- work fully autonomously, follow project rules strictly.

## Step 0 -- Anti-overlap lock (MANDATORY whenever another scheduled task -- or this task's own catch-up/resume safety net -- can target the same repo)
1. Run the reaper: `sh ~/.claude/scripts/night-run-reaper.sh` (kills orphaned vitest/esbuild/vite workers left by a dead session).
2. Acquire the lock: `~/.claude/scripts/night-run-lock.sh acquire {task_id}`.
   - **Lock HELD and FRESH (<30 min)**: do NOT work in parallel. Write a HANDOFF.md entry noting the report (who holds it, since when, best guess why) and exit cleanly -- do not touch the repo.
   - **Lock STALE (>30 min)**: document the staleness in HANDOFF.md, then check `git status` + `git stash list` for uncommitted work from the dying session -- RECOVER it (commit it or restore the stash), NEVER overwrite or discard it -- before taking the lock over.
3. `touch` the lock periodically while working so a long-running step doesn't let it go stale under you.
4. GUARANTEED release on every exit path (success, failure, abort): `~/.claude/scripts/night-run-lock.sh release` + kill any dev/preview server this session started.
5. Never commit the lock file.

## Setup
1. Change to the project directory: `cd {project_path}`
2. Ensure you are on branch `{branch}` (run `git checkout {branch}` if needed)
3. Run `git pull` to ensure latest changes

## Phase 1: Check if the plan is complete

Read `HANDOFF.md` and check the plan status in `{plan_path}`.

**If the plan is NOT fully complete:**
- Use the `{execution_skill}` skill to resume execution from where it left off
{resume_instructions}

**If the plan IS fully complete:**
- Proceed to Phase 2 below

## Phase 2: {post_plan_work_title}

{post_plan_work_instructions}

## Phase 3: Summary Document

{summary_instructions}

## Autonomous Rules
- Do NOT ask the user questions -- make reasonable decisions
- Follow ALL project rules in CLAUDE.md and .claude/rules/
{commit_strategy}
- Run `{validate_command}` before every commit
- If validation fails, fix it before committing
- Environment mutation logging: any `convex env set`, `vercel env`, or equivalent command run autonomously MUST be recorded in HANDOFF.md as old value -> new value (or a fingerprint/hash if the value is sensitive) + the reason for the change. No silent env flips.
- Update HANDOFF.md at the very end summarizing everything accomplished
```

### Step 3b: Session-aware scheduling

Claude Code sessions have a ~5-hour usage window. Each scheduled task should run in its own window so it gets a fresh context and full capacity. Before proposing any schedule time, calculate the next available slot.

#### Duration calibration (budget from estimates, not from the 5-hour ceiling)

Do NOT default to 5-hour spacing. Estimate each task's real duration from its content, budget **1.5× the estimate**, and only fall back to wide spacing when the estimate itself is unknown. Measured baselines (autonomous night run, 2026-07-07 — orchestrator + subagent pattern, gates + browser verification included):

| Work shape | Measured | Budget (×1.5) |
|---|---|---|
| Small chip (cleanup, gitignore, data commit) | ~15 min | ~25 min |
| Full new subsystem (schema + service + routes + SSE + UI + live acceptance) | ~1 h | ~1 h 30 |
| Coupled config refactor (ports/env/scripts + acceptance test) | 15–30 min | ~45 min |
| Dashboard slice (store read + UI + tests) | ~15 min each | ~25 min each |
| Independent verification pass (re-prove acceptances live) | ~30 min | ~45 min |

On that night, conservative 5-hour-style budgets were 3–9× over reality (2 h 19 of active work spread over 8 h 45 of slots). Tight duration-based spacing + the completion-chaining below is the preferred design; the 5-hour window math remains relevant only for rate-limit awareness when sessions overlap inside one usage window.

#### Failure mode: simultaneous catch-up

`fireAt` spacing guarantees nothing if the app is closed or the machine is asleep at the scheduled time. On relaunch, the catch-up dispatcher fires EVERY overdue task at once, regardless of how far apart their `fireAt` times were (incident 2026-07-08: two tasks on the same repo -- a plan-execution task fired at 23:30 and its own resume/safety-net fallback fired at 05:30 -- both actually started at 05:58, one second apart, because the machine was asleep through both original fire times). Spacing fallbacks further apart does NOT fix this; it only changes which times get bunched together at the next relaunch.

Rule: anti-concurrency protection must live INSIDE the prompts (the Step 0 lock above), never only in the scheduling math. Treat every `fireAt` as advisory, not as a mutual-exclusion guarantee.

Complementary mitigations:
- For a planned overnight run, keep the machine awake through the fire window (`caffeinate -s` from a Terminal left open, or an always-on utility like Amphetamine) so tasks actually fire at their intended times instead of bunching at relaunch.
- If the machine can't be trusted to be awake/on at fire time, route the work to the `cloud-night-shift` skill instead of a local scheduled task.

### Step 3b-bis: Name which gate applies to a PARTIAL run

A routine that executes lots `a..b` of a brief-chantier plan runs the **per-lot verification the plan prescribes for each lot** (typecheck + targeted tests, `+ build` for a UI lot); the full closure gate (e.g. `typecheck && build && test && test:hooks`) belongs to the plan's LAST lot only. Write that distinction explicitly in every generated prompt — a prompt that just says "les gates" produced an ambiguity in the 2026-09-08 retrospectives (the reviewer could not tell whether `test:hooks` had been skipped or was simply not due). The routine may still run the full suite by prudence; the prompt must say which one is REQUIRED.

### Step 3c: Chained scheduling (preferred for successive plan phases)

When the user wants several phases executed back-to-back, do not rely on fixed times alone — chain on completion:

1. **Create ALL tasks up front** (Step 4), each with a **fallback `fireAt`** spaced by the duration budgets above (never 5 h apart by default). The fallback only matters if a session dies silently.
2. **Each prompt's final step arms the next task**: after the end-of-run journal/annotations, the session calls `mcp__scheduled-tasks__update_scheduled_task { taskId: "<next-task-id>", fireAt: <now + 5 min> }` — the next phase starts minutes after the previous one actually finishes instead of waiting for its fallback slot.
3. **Name the next task explicitly in each prompt** (exact taskId) so the chaining step is mechanical.
4. **Use the GLOBAL anti-overlap lock** `~/.claude/scripts/night-run-lock.sh` (`acquire <label>` non-blocking / `touch` / `release` / `check`; lock file `~/.claude/night-run.lock`, stale >30 min). It serializes autonomous runs across ALL projects on the machine — a per-repo `.night-run.lock` does NOT (incident 2026-07-08: two projects scheduled the same night overlapped, each firing a full vitest suite + a vite dev server, saturating the CPU; the second run also died mid-task without cleanup). If the repo also carries a legacy per-repo lock, keep honoring it, but the global lock is the one that matters.
5. **Every generated prompt must include process hygiene**: (a) at startup, run `sh ~/.claude/scripts/night-run-reaper.sh` to kill orphaned vitest/esbuild/vite workers (PPID=1) left by a previous dead session; (b) GUARANTEED teardown on EVERY exit path — kill any dev/preview server the session started and `night-run-lock.sh release`, even on failure/abort (a session that dies without teardown leaves orphan workers eating CPU until reboot); (c) `.night-run.lock` (if a repo-local one is used) must be gitignored so an autonomous `git add -A` never commits it.
6. **Skip the re-arm entirely when the running session IS a scheduled task** (its first turn is a `<scheduled-task>` prompt: non-interactive, nobody to answer the approval dialog). Measured 2026-09-08 on two routines of the workstation `provenance-session` run: 73 min and 58 min of calendar time lost waiting on a dialog that could not be answered, the second one until `fireAt` had already passed ("fireAt must be in the future"). In a generated prompt, write the chaining step as: "if this session was started by a scheduled task, do NOT call `update_scheduled_task`; the fallback `fireAt` of the next task stands" — and only keep the call for prompts the user will run interactively. Caveats: the chained `update_scheduled_task` needs its tool approval pre-granted (same warning as Step 5); after ANY manual user edit of a task, re-verify `fireAt`/`enabled` survived (the clearing bug in Step 5 also eats chained re-arms).
   **VERIFIED LIMIT (2026-07-10): the re-arm approval CANNOT be bypassed.** The `update_scheduled_task` / `create_scheduled_task` tools prompt "This tool requires explicit approval regardless of permission mode" — bypass-permissions mode does NOT cover them (observed live: a finished night run sat blocked on this dialog at 00:39 until the owner happened to be awake; known friction, e.g. claude-code issues #40470/#46224/#47180). Consequences for plan design: (a) treat chaining as a best-effort LATENCY optimization only — the staggered fallback `fireAt` times from Step 3b are the actual guarantee, so ALWAYS set them as if chaining did not exist; (b) a blocked re-arm dialog does NOT prevent the fallback from firing later (the task's own fireAt still stands if it was never consumed), but a re-arm that was never approved simply means the follow-up runs at its fallback time — plan the fallback times to be acceptable outcomes on their own; (c) for fully unattended nights, prefer `cloud-night-shift` (cloud routines have no local approval dialog) or accept fallback-only scheduling without chaining.
7. This lock/reaper/teardown discipline is now baked directly into both prompt templates in Step 3 as a mandatory "Step 0 -- Anti-overlap lock" block -- copy it into every generated prompt whenever two scheduled tasks, or a task and its own catch-up/resume fallback, can target the same repo. It is also the concrete defense against the "simultaneous catch-up" failure mode in Step 3b: `fireAt` spacing can say two tasks are hours apart and they can still start together at relaunch, so the lock (not the schedule) is what actually prevents concurrent work on the same repo.

Measured benefit on 2026-07-07: chaining would have delivered the final verification ~4 h earlier (10:20 → ~06:00).

#### How to calculate available slots

1. **List existing scheduled tasks** using `mcp__scheduled-tasks__list_scheduled_tasks` to get all tasks with their `fireAt` times.
2. **Determine the current session window**: the current conversation started at some point and occupies roughly a 5-hour window from now.
3. **Map occupied windows**: each scheduled task with a `fireAt` occupies a 5-hour window starting from its fire time. Two tasks firing within 5 hours of each other risk competing for the same session's resources.
4. **Find the next free slot**: starting from the earliest reasonable time (e.g., user's requested time, or "as soon as possible"), find the first 5-hour window that doesn't overlap with any existing task's window or the current session.

#### Slot calculation logic

```
occupied_windows = []

# Current session (approximate)
occupied_windows.append({ start: now, end: now + 5h })

# Each existing scheduled task
for task in scheduled_tasks:
    if task.fireAt and task.enabled:
        occupied_windows.append({ start: task.fireAt, end: task.fireAt + 5h })

# Sort by start time
occupied_windows.sort(by: start)

# Find gaps: next_available = end of last overlapping window
# If user requested a specific time, check if it falls in a free slot
# If not, propose the nearest free slot after their requested time
```

#### When proposing times to the user

- If the user gives a specific time and it's in a free slot, use it.
- If the user gives a time that conflicts, say something like:
  > "You already have a task scheduled at 9:15 PM (runs until ~2:15 AM). To give each task its own fresh 5-hour session, I'd suggest scheduling this one at 2:15 AM or later. Does 2:15 AM work?"
- If the user asks to schedule multiple tasks without specifying times, space them 5 hours apart automatically and present the proposed schedule.
- If multiple tasks are queued, show the full timeline:
  > "Here's the proposed schedule based on 5-hour session windows:
  > - Session 1 (9:15 PM - 2:15 AM): Execute plan Tasks 10-14
  > - Session 2 (2:15 AM - 7:15 AM): Continue + design polish
  > - Session 3 (7:15 AM - 12:15 PM): Next available slot"

#### Why this matters

Without this spacing, a task that fires while a previous session is still active may hit rate limits, context exhaustion, or competing resource usage. The 5-hour window is conservative — most tasks finish sooner — but it guarantees each task gets a clean, fully-resourced session.

### Step 4: Create the scheduled tasks

Use `mcp__scheduled-tasks__create_scheduled_task` with:
- **taskId**: kebab-case descriptive name (e.g., `execute-phases-3-4-5-tasks-10-14`)
- **description**: one-line summary
- **fireAt**: ISO 8601 with timezone offset (e.g., `2026-04-07T21:15:00-04:00`)
- **prompt**: the full autonomous prompt from Step 3
- **notifyOnCompletion**: `true`

For follow-up tasks, create a second scheduled task with a later `fireAt`.

### Step 5: Verify and warn about permissions

After creating each task:

1. **List all scheduled tasks** to confirm they were created correctly (schedule, enabled status)
2. **Warn the user about tool permissions**: Scheduled tasks need tool approvals pre-granted. Tell the user:
   > "Don't forget to set bypass permissions on this task, or do a quick 'Run now' test to pre-approve the tools it needs. Otherwise it may pause on permission prompts while you're away."
3. **Watch for the enable bug**: If the user updates a task externally (e.g., to add bypass permissions), the `fireAt` schedule can get cleared. After any user update, re-list tasks to verify the schedule is intact. Re-apply `fireAt` + `enabled: true` if needed.

### Step 6: Provide a summary table

Always end with a clear summary table:

```
| Time | Task ID | What it does |
|------|---------|-------------|
| 9:15 PM | execute-my-plan | Execute plan Tasks X-Y |
| 2:15 AM | continue-or-polish | Resume if incomplete, then polish UI |
```

## Commit strategy for post-plan work

When the follow-up task includes additional work beyond plan execution (like design polish), enforce atomic commits for easy revertability:

- **One commit per logical unit** (e.g., one panel, one component, one feature area)
- **Descriptive prefixes**: `design:`, `refactor:`, `docs:`, `fix:`
- **Include file scope in message**: e.g., `design: Polish NotesPanel -- improve spacing, typography, and visual consistency`
- **Summary doc committed separately** so it can be kept even if design changes are reverted

## Edge cases

- **Multiple time zones**: Always use ISO 8601 with explicit offset. If unsure of user's timezone, ask.
- **Plan already partially done**: Read HANDOFF.md to determine resume point. Include this context in the prompt.
- **No execution strategy yet**: Don't tell the agent to skip to Step 8. Let the execute-plan skill handle the full flow.
- **User wants to watch**: If user says they'll be around, skip `notifyOnCompletion` and suggest they run manually instead.
- **Cross-midnight scheduling**: For times like "2 AM", use the next day's date (e.g., if today is April 7th and user says 2 AM, use April 8th).

## What NOT to do

- Don't create overly generic prompts. The autonomous agent has no conversation history -- every detail matters.
- Don't schedule tasks without verifying the plan file exists and the branch is valid.
- Don't assume the execution strategy is done unless you've read the plan and confirmed it.
- Don't forget to mention bypass permissions -- this is the #1 reason scheduled tasks fail silently.
