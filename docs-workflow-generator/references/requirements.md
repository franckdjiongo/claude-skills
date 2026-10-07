# PRD, roadmap and execution prompt requirements

Detailed requirements moved out of SKILL.md.

## PRD content

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

## Task files

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

## Roadmap

Create `docs/<initiative>/roadmap.md` with:
- Title and last updated date.
- Reference to the PRD path.
- Task status table listing every task (T01, T02, ...).
- Notes section for key assumptions or constraints.

Statuses should start as `not-started` unless the user says otherwise.

## Validation

Before responding:
- Ensure every task in the roadmap has a matching task file.
- Ensure task titles and IDs match between roadmap and task files.
- Ensure dates use `YYYY-MM-DD`.
- Ensure no files were overwritten unintentionally.
- Ensure the PRD includes the Task and Roadmap Tracking section.
- Ensure all skills referenced in task files actually exist in the codebase.

## Execution prompt

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

## Output summary

Provide a concise summary after generating docs:
- Initiative name and path
- Files created or updated
- Task count
- Skills discovered and assigned
- **The LLM execution prompt (displayed in full for easy copy-paste)**
- Any open questions or assumptions

**IMPORTANT**: Always display the LLM execution prompt at the end so the user can immediately start a new session and begin implementing the PRD.
