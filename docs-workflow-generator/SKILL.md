---
name: docs-workflow-generator
description: Generate a full documentation package for new feature work in this repo, including PRD, task breakdown, roadmap, and execution prompt. Use when the user asks to create or update docs/initiative/PRD.md, docs/initiative/tasks/, docs/initiative/roadmap.md, or wants a planning/docs workflow for a new feature set.
---

# Docs Workflow Generator

Create a consistent documentation package for new feature initiatives by scanning the codebase, selecting an initiative folder name, and generating PRD, task files, roadmap, and execution prompt.

## Workflow

1. Confirm scope and constraints.
2. Scan the codebase and existing docs.
3. Select the initiative folder name.
4. Create the docs structure.
5. Generate PRD content.
6. Discover available skills and create task files with skill assignments.
7. Generate the roadmap.
8. Validate cross-links and consistency.
9. Generate and display the LLM execution prompt.

## 1. Confirm Scope

Ask up to 3 clarifying questions if any of these are unclear:
- Feature set and user outcomes.
- Target areas of the codebase.
- Timeline, constraints, or sequencing.
- Whether this is a net-new initiative or an update to an existing docs package.

## 2. Scan the Codebase

Always do a quick repo scan before writing docs:
- Read the instructions file (`CLAUDE.md` for Claude Code, `AGENTS.md` for codex, antigravity, gemini and other LLMs) for doc conventions and architecture.
- Check `docs/` for existing initiatives and patterns.
- Use `rg` to locate relevant features, services, or Convex files.
- Open a small set of key files that define the current behavior.

Goal: identify existing patterns, dependencies, and where changes will land so the PRD and tasks are concrete.

## 3. Select Initiative Folder Name

Rules for naming `docs/<initiative>/`:
- Use lowercase hyphen-case.
- Use 2-4 meaningful keywords; avoid generic terms like `feature` or `update`.
- Keep under ~40 characters when possible.
- If a matching initiative already exists, reuse it instead of creating a new folder.
- If scope is meaningfully different, create a new name with a short suffix (e.g., `-v2`).

## 4. Create Docs Structure

Ensure this structure exists:
- `docs/<initiative>/PRD.md`
- `docs/<initiative>/roadmap.md`
- `docs/<initiative>/tasks/`
- `docs/<initiative>/tasks/_template.md`
- `docs/<initiative>/PROMPT.md`

> **Note**: `walkthrough.md` is created by the implementing LLM at the end of work, not by this skill.

If `docs/` is missing, create it. Never create a parallel `DOC/` folder.

For the task template, see [references/templates.md](references/templates.md#task-template).

## 5. PRD Content Requirements

Model the PRD after existing examples in `docs/*/PRD.md`, and include these sections:
- Summary
- Goals
- Non-goals
- Decisions (Locked)
- Architecture Overview
- Data Model Changes (if applicable)
- Backend Design (if applicable)
- Frontend and UX Changes (if applicable)
- Acceptance Criteria
- Risks

### Task and Roadmap Tracking (REQUIRED)

**IMPORTANT**: The PRD MUST explicitly include a section stating that:

1. **Task files exist** in `docs/<initiative>/tasks/` and must be updated during implementation.
2. **The roadmap** at `docs/<initiative>/roadmap.md` tracks overall progress and MUST be kept in sync.
3. **Each task file must be updated** when work begins and ends with:
   - Status (not-started → in-progress → done/blocked)
   - Decisions made during implementation
   - Touched files (actual files modified)
   - Tests/Validation performed
   - Blockers encountered
   - Next step
4. **The roadmap must be updated** after each task completion with the new status and date.
5. **A walkthrough.md file** must be created at the end listing test scenarios and expected results.

Also include a section called `Execution PRD (Codex-run)` that defines the documentation workflow with progress tracking, TDD/test expectations, and task file update rules.

## 6. Task Breakdown with Skill Assignment

### Discover Available Skills First

Before creating task files, scan the codebase for available skills. See [references/skill-discovery.md](references/skill-discovery.md) for the full discovery process.

Quick discovery commands:
```bash
# Find all SKILL.md files
find . -name "SKILL.md" -type f

# Check instructions file for skill listings (use CLAUDE.md or AGENTS.md based on LLM)
cat CLAUDE.md 2>/dev/null | grep -i skill || cat AGENTS.md 2>/dev/null | grep -i skill

# Check LLM-specific skill directories
ls .claude/skills/ .codex/skills/ .agent/skills/ .gemini/skills/ 2>/dev/null
```

### Create Task Files

Create 6-15 tasks (unless scope requires more/less). Each task is a separate file named `TXX-<slug>.md` in `docs/<initiative>/tasks/`.

Each task file must:
- Use the task template from [references/templates.md](references/templates.md#task-template).
- Have a clear goal and checklist.
- **Include a `Required Skills` section** listing skills that would help with the task.
- Identify likely touched files.
- Include a minimal TDD/Test Plan.
- Set `Status` to `not-started` and `Last updated` to today.

### Skill Assignment Example

```md
## Required Skills

- [convex-schema] - This task involves Convex table schema changes
- [tdd-workflow] - Complex logic requiring test-first approach

> No specific skill required for this task.
```

## 7. Roadmap

Create `docs/<initiative>/roadmap.md` with:
- Title and last updated date.
- Reference to the PRD path.
- Task status table listing every task (T01, T02, ...).
- Notes section for key assumptions or constraints.

Statuses should start as `not-started` unless the user says otherwise.

## 8. Validation

Before responding:
- Ensure every task in the roadmap has a matching task file.
- Ensure task titles and IDs match between roadmap and task files.
- Ensure dates use `YYYY-MM-DD`.
- Ensure no files were overwritten unintentionally.
- Ensure the PRD includes the Task and Roadmap Tracking section.
- Ensure all skills referenced in task files actually exist in the codebase.

## 9. Generate LLM Execution Prompt

After generating all docs, create and display a **ready-to-use prompt** for a new LLM session.

1. Save the prompt to `docs/<initiative>/PROMPT.md`
2. Display it in full to the user for easy copy-paste

The prompt template is in [references/templates.md](references/templates.md#llm-execution-prompt-template).

The prompt MUST include:
- **Goal**: Reference to PRD path and task range
- **Workflow**: Step-by-step instructions for task execution
- **Task update rules**: How to update task files before/after each task
- **Roadmap sync**: Explicit instruction to update roadmap after each task
- **Walkthrough creation**: Instruction to create `walkthrough.md` at the end with test scenarios
- **Constraints**: Repo conventions, forbidden actions, scope limits

Customize placeholders with actual task numbers, feature areas, and test scenarios.

## Output Expectations

Provide a concise summary after generating docs:
- Initiative name and path
- Files created or updated
- Task count
- Skills discovered and assigned
- **The LLM execution prompt (displayed in full for easy copy-paste)**
- Any open questions or assumptions

**IMPORTANT**: Always display the LLM execution prompt at the end so the user can immediately start a new session and begin implementing the PRD.

Stop after docs are generated. Do not implement the feature unless explicitly asked.
