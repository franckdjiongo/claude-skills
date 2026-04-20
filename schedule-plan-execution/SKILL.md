---
name: schedule-plan-execution
description: Schedule autonomous Claude Code sessions to execute implementation plans at specific times on specific branches. Use this skill whenever the user wants to schedule plan execution, set up overnight autonomous runs, create follow-up continuation tasks, queue multi-phase autonomous work, or automate plan execution with post-completion polish. Triggers on phrases like "schedule plan", "run plan tonight", "execute plan at [time]", "autonomous execution", "overnight run", "schedule follow-up", "run this at 2am", "queue plan execution", or any request to set up timed autonomous plan execution in any project.
---

# Schedule Plan Execution

Schedule autonomous Claude Code sessions that execute implementation plans at specific times, with optional follow-up tasks for continuation and post-plan work.

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

#### Prompt template for plan execution:

```
You are executing an implementation plan autonomously. The user will NOT be available to answer questions -- work fully autonomously, follow the plan, guidelines, and rules strictly.

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
- Run `{validate_command}` after each group before committing
- If a validation fails, fix the issue autonomously -- do not skip or defer
{deferred_feedback_rule}
- Commit after each successful group with descriptive messages
- Write a HANDOFF.md at the end summarizing what was accomplished and any issues encountered
```

Where:
- `{execution_strategy_note}`: If already done, say "The Execution Strategy has ALREADY been completed. Skip directly to Step 8 (Launch subagent-driven development)."
- `{agent_model_instructions}`: List specific agent and model assignments from the plan
- `{deferred_feedback_rule}`: If global CLAUDE.md has a deferred feedback workflow, include it

#### Prompt template for follow-up/continuation task:

```
You are running autonomously at {time}. The user is NOT available -- work fully autonomously, follow project rules strictly.

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
- Update HANDOFF.md at the very end summarizing everything accomplished
```

### Step 3b: Session-aware scheduling

Claude Code sessions have a ~5-hour usage window. Each scheduled task should run in its own window so it gets a fresh context and full capacity. Before proposing any schedule time, calculate the next available slot.

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
