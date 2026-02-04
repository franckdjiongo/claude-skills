# Templates Reference

This file contains templates for the docs-workflow-generator skill.

## Task Template

Create `docs/<initiative>/tasks/_template.md` with this content:

```md
# TXX - <Task Title>

Status: not-started | in-progress | blocked | done
Last updated: YYYY-MM-DD

## Goal

...

## Required Skills

- [skill-name] - Why this skill is needed for this task

> Leave empty if no specific skill is required.

## Checklist

- [ ] ...

## Decisions

- ...

## TDD/Test Plan

- Red: ...
- Green: ...
- Refactor: ...

## Touched files

- ...

## Tests/Validation

- ...

## Blockers

- ...

## Next step

- ...
```

## Walkthrough Template

The **implementing LLM** (not this skill) creates `docs/<initiative>/walkthrough.md` at the end of implementation with this structure:

```md
# <Initiative Name> - Testing Walkthrough

Last updated: YYYY-MM-DD

## Overview

This walkthrough guides testers through validating the features implemented in this initiative.

## Prerequisites

- [ ] Application is running locally
- [ ] Required test data is set up
- [ ] User has appropriate permissions

## Test Scenarios

### Feature Area 1: [Name]

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | [Action] | [Expected] | ⬜ |
| 2 | [Action] | [Expected] | ⬜ |

### Feature Area 2: [Name]

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | [Action] | [Expected] | ⬜ |
| 2 | [Action] | [Expected] | ⬜ |

## Edge Cases

- [ ] [Edge case 1 description and expected behavior]
- [ ] [Edge case 2 description and expected behavior]

## Error Handling

- [ ] [Error scenario 1 and expected UI/logging behavior]
- [ ] [Error scenario 2 and expected UI/logging behavior]

## Visual/UX Validation

- [ ] [Visual check 1]
- [ ] [Visual check 2]

## Sign-off

| Tester | Date | Result |
|--------|------|--------|
| | | |
```

## LLM Execution Prompt Template

Save to `docs/<initiative>/PROMPT.md` and display to user:

```md
# Execution Prompt for <Initiative Name>

Goal: Implement the work described in docs/<initiative>/PRD.md by completing tasks T01–TXX in
docs/<initiative>/tasks/. Use the required skills listed in each task before analysis or edits.
Follow AGENTS.md instructions.

Workflow:
1. Read AGENTS.md, then PRD and roadmap.
2. Execute tasks in order: T01, T02, ..., TXX.
3. Before starting a task, open its task file and set Status to in-progress and update Last updated to today (YYYY-MM-DD).
4. After each task, update its task file with:
   - Status (done/blocked)
   - Decisions
   - Touched files
   - Tests/Validation (what you ran or manual checks)
   - Blockers (if any)
   - Next step
5. Keep PRD/roadmap in sync. Update docs/<initiative>/roadmap.md after each task, and update its date.

At the end:
- Ensure all completed tasks are marked done in their task files and in the roadmap.
- Create a testing walkthrough file named docs/<initiative>/walkthrough.md that lists step-by-step manual tests and expected results for:
  - [Feature area 1 test scenarios]
  - [Feature area 2 test scenarios]
  - [UI/UX validation points]
  - [Edge cases and error handling]

Constraints:
- Use the repo's coding conventions.
- No destructive git commands.
- No new features outside the PRD scope.
```

Customize this template based on the specific initiative, replacing placeholders with actual task numbers, feature areas, and test scenarios.
