---
name: docs-workflow-generator
description: Generate a full documentation package for new feature work in this repo, including PRD, task breakdown, roadmap, and documentation workflow. Use when the user asks to create or update docs/initiative/PRD.md, docs/initiative/tasks/, docs/initiative/roadmap.md, or wants a planning/docs workflow for a new feature set.
---

# Docs Workflow Generator

## Overview

Create a consistent documentation package for new feature initiatives by scanning the codebase, selecting an initiative folder name, and generating PRD, task files, and roadmap with the repo's standard structure.

## Workflow

1. Confirm scope and constraints.
2. Scan the codebase and existing docs to ground the plan.
3. Select the initiative folder name.
4. Create or update the docs structure.
5. Generate PRD content with a documentation workflow section.
6. Generate the task breakdown and task files.
7. Generate the roadmap.
8. Validate cross-links and consistency.

## 1. Confirm Scope

Ask up to 3 clarifying questions if any of these are unclear:
- Feature set and user outcomes.
- Target areas of the codebase.
- Timeline, constraints, or sequencing.
- Whether this is a net-new initiative or an update to an existing docs package.

If the user provided a preferred initiative name, use it after validating it against naming rules below.

## 2. Scan the Codebase

Always do a quick repo scan before writing docs:
- Read `AGENTS.md` for doc conventions and architecture.
- Check `docs/` for existing initiatives and patterns.
- Use `rg` to locate relevant features, services, or Convex files.
- Open a small set of key files that define the current behavior.

Goal: identify existing patterns, dependencies, and where changes will land so the PRD and tasks are concrete.

## 3. Select Initiative Folder Name

Rules for naming `docs/<initiative>/`:
- Use lowercase hyphen-case.
- Use 2-4 meaningful keywords; avoid generic terms like `feature` or `update`.
- Keep under ~40 characters when possible.
- If multiple features, choose an umbrella label that still points to the outcome.
- If a matching initiative already exists, reuse it and update documents instead of creating a new folder.
- If a folder exists but scope is meaningfully different, create a new name with a short suffix (for example, `-v2` or a new key noun).

## 4. Create or Update Docs Structure

Ensure this structure exists:
- `docs/<initiative>/PRD.md`
- `docs/<initiative>/roadmap.md`
- `docs/<initiative>/tasks/`
- `docs/<initiative>/tasks/_template.md`

If `docs/` is missing, create it. Never create a parallel `DOC/` folder.

If a `tasks/_template.md` already exists under another initiative, reuse it verbatim. Otherwise, use the template below.

## 5. PRD Content Requirements

Model the PRD after existing examples in `docs/*/PRD.md`, and include these sections at minimum:
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

Also include a section called `Execution PRD (Codex-run)` that defines the documentation workflow. This section is required and should include:
- Progress Tracking rules (task files under `docs/<initiative>/tasks/`).
- TDD/Test expectations per task (even if UI-only, explain validation).
- Task file update rules (status, decisions, touched files, tests, blockers, next step).
- Reference to the task template file.

Keep the PRD concrete by citing specific files, modules, or tables discovered in the scan.

## 6. Task Breakdown

Create a task list that can be executed linearly. Use 6-15 tasks unless the scope is extremely small or large. Each task must be a separate file named `TXX-<slug>.md` in `docs/<initiative>/tasks/`.

Each task file must:
- Use the task template.
- Have a clear goal and checklist.
- Identify likely touched files.
- Include a minimal TDD/Test Plan.
- Set `Status` to `not-started` and `Last updated` to today.

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

## Task Template

If no template exists, create `docs/<initiative>/tasks/_template.md` with this content:

```md
# TXX - <Task Title>

Status: not-started | in-progress | blocked | done
Last updated: YYYY-MM-DD

## Goal

...

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

## Output Expectations

Provide a concise summary after generating docs:
- Initiative name and path.
- Files created or updated.
- Task count.
- Any open questions or assumptions.

Stop after docs are generated. Do not implement the feature unless explicitly asked.
