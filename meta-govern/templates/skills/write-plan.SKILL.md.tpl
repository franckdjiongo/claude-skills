<!--
Template variables (substituted at BOOTSTRAP):
{{PROJECT_NAME}}      — Human-readable project name
{{PROJECT_SLUG}}      — kebab-case slug
{{PACKAGE_MANAGER}}   — bun | npm | pnpm
{{TEST_FRAMEWORK}}    — Vitest 4 | Jest | etc.
{{SPEC_DOC}}          — Path to functional spec
{{DATA_MODEL_DOC}}    — Path to data model
{{CATALOG_DOC}}       — Path to component catalog
{{IF_PALIER_GTE_2}}…{{/IF}}    — Conditional for spec-tracer references
-->
---
name: write-plan
description: |
  Transform an approved design draft (from `/brainstorm`) into a task-sequenced
  implementation plan file at `docs/plans/YYYY-MM-DD-<topic>-plan.html`. Rejects
  any design that lacks a `## Source of truth delta` section. Each task carries
  files, agent assignment (implementer / reviewer), governing FUNC/RA/VAL/C-XX
  refs, TDD checklist, and tier (BATCH / STANDARD / RIGOROUS). Inserts Task 1 =
  "Apply source-of-truth delta" (delta-at-start protocol) and a final reviewer
  pass + full validate gate. Use whenever the user says: write a plan, écrire
  un plan, tâches, étapes, task list, plan d'implémentation, "turn this design
  into a plan", "build the plan for X", "let's plan the work". Distinct from
  `brainstorm` (which produces the design) and `execute-plan` (which ships the
  plan) — this skill produces the executable task graph only.
when_to_use: |
  After a `/brainstorm` design is approved. Produces the plan that `/execute-plan`
  will run. Skipping this loses traceability between design and commits.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# write-plan — design → executable plan

You take an approved design and turn it into a sequenced plan that subagents can execute. You do not implement. You do not modify the source-of-truth docs.

## Step 1 — Locate the design

If the user passes a path, use it. Otherwise list `docs/specs/` and pick the latest by date prefix. If no design exists, stop and tell the user to run `/brainstorm` first.

### Amendment fast path

If the design filename starts with `amendment-` (per `spec-protocol.md` amendment workflow), this is a spec-only revision with no code to implement. Skip Steps 5–6 (tier analysis, parallel groups) and produce a minimal plan:

- Header section as usual.
- ONE task: `Apply source-of-truth delta`, tier BATCH, agent = (no implementer).
- Commit: `docs(spec): amendment from <filename>`.

Sections 2–6 of an amendment design read `N/A — amendment spec-only`. Do not fabricate implementation tasks. Hand off to `/execute-plan` — it will run only the apply-delta phase.

## Step 2 — Reject designs without a delta block

Read the design file. Search for a `## Source of truth delta` heading. If absent, stop immediately. Output:

```
REJECTED: design <path> has no `## Source of truth delta` section.
Run `/brainstorm` to add one (or the explicit opt-out), then re-run /write-plan.
```

Do not proceed. The delta is non-negotiable per `spec-protocol.md`.

## Step 3 — Read context

Read in this order:

1. The full design file.
2. `{{SPEC_DOC}}`, `{{DATA_MODEL_DOC}}`, `{{CATALOG_DOC}}` — only the sections referenced by the design.
3. The path-scoped rules likely to apply (`ui-components.md`, `data-layer.md`, `testing.md`, `file-size-budget.md`, `spec-protocol.md`).
4. The actual existing code files the design says it will touch — to size each task realistically.

## Step 4 — Write the plan file

Run `date +%Y-%m-%d`. Scaffold `docs/plans/YYYY-MM-DD-<topic>-plan.html` (reuse the design's kebab topic) via `node .claude/scripts/docs-html/scaffold.mjs plan <chemin> "<Titre>"` — docs are HTML; the `block-docs-markdown` hook blocks `.md` — then fill `.docs-content` with the structure below. Per `spec-protocol.md` delta-at-start, **Task 1 = "Apply source-of-truth delta"** — implementers and reviewers downstream read the three source-of-truth files post-delta. Apply at the end = stale spec = silent class of bug.

Required structure:

```markdown
# Plan: <Topic>

## Header

- **Goal**: <one paragraph from design's Problème section>
- **Design ref**: docs/specs/YYYY-MM-DD-<topic>-design.html
- **Spec refs**: FUNC-NN, RA-NN, VAL-NN, C-NN (from design)
- **Rules in scope**: <relevant rules from .claude/rules/>
- **Agents**: implementer (tasks), reviewer (foreground only, per group + final)
- **Verification**: `{{PACKAGE_MANAGER}} run validate:fast` per task; `{{PACKAGE_MANAGER}} run validate` (full) end-of-group + before final commit

## Task 1: Apply source-of-truth delta

- **Tier**: BATCH
- **Files**: `{{SPEC_DOC}}`, `{{DATA_MODEL_DOC}}`, `{{CATALOG_DOC}}`
- **Agent**: (none — `execute-plan` applies directly, no subagent)
- **Governing evidence**: `spec-protocol.md` (delta-at-start)
- **Action**: apply delta block from `docs/specs/YYYY-MM-DD-<topic>-design.html`, preserving every `<!-- origin: ... -->` tag. Follow allowed verbs (ADD/MODIFY/REMOVE/RENAME).
- **Commit**: `docs(spec): apply delta from YYYY-MM-DD-<topic>-design.html`
- **Note**: runs FIRST per delta-at-start protocol.

## Task 2..N: <imperative title>

- **Tier**: BATCH | STANDARD | RIGOROUS
- **Files**: <list>
- **Agent**: implementer
- **Governing evidence**: FUNC-NN / RA-NN / VAL-NN / C-NN
- **Acceptance criteria**: rendered checkboxes (NOT prose), one `[ ]` per observable behavior from the design's Section 4b, each citing FUNC/RA/VAL/C-NN. Edge cases to verify go here as `[ ]` items too — never buried in a Notes paragraph, or they silently fall out of the executable contract.
- **TDD checklist**: [ ] failing test → [ ] implement → [ ] passes → [ ] refactor
- **Notes**: <constraints, extraction>

## Group X (parallel): Tasks A, B, C

Files disjoint. Per `parallel-dispatch.md`, `/execute-plan` dispatches in 1 message multi-tool-use.

## Task N: Final reviewer pass + {{PACKAGE_MANAGER}} run validate

- **Agent**: reviewer (foreground only — never background)
- **Validation**: `{{PACKAGE_MANAGER}} run validate` must pass before final commit (hook `enforce-workflow` blocks otherwise).
```

## Step 5 — Tier each task

- **BATCH** — mechanical: types, route stubs, content keys, constants. Bundle for one combined gate.
- **STANDARD** — pattern-following: a component matching an existing pattern, a backend query of standard shape, a hook wrapping `useQuery`. One reviewer pass per group of 3–5.
- **RIGOROUS** — complex logic, state machines, role/permission code, anything > 150 lines added, anything touching schema files. Per-task reviewer + per-task commit.

Be honest. Marking everything STANDARD to "go faster" defeats the system. When in doubt, escalate one tier.

## Step 6 — Identify parallel groups

Tasks parallelizable iff their **file sets are disjoint**. Same file = serial. Document each group explicitly so `/execute-plan` can dispatch agents in one message:

```markdown
## Group A (parallel): Tasks 3, 4, 5

- Task 3 touches `<path-A>`
- Task 4 touches `<path-B>`
- Task 5 touches `<path-C>`
- Disjoint — safe to run in parallel.
```

If any two tasks touch the same file, leave them serial.

## Step 7 — Verify Task 1 = Apply source-of-truth delta

Per `spec-protocol.md` delta-at-start, Task 1 = `Apply source-of-truth delta`, NOT the last task. Reject your own output if Task 1 is anything else — the rules file says `write-plan` rejects plans where Task 1 violates this contract.

## Step 7b — Design→tasks coverage traceability

Enumerate every requirement in the design — each Section 4b acceptance criterion, each delta entry, each twin-domain "specified / adapted" capability. For each, prove it maps to a task OR list it under an explicit `## Out of scope (this plan)` heading with a one-line reason. A design requirement that is neither mapped to a task nor explicitly excluded is a **silent drop** (the requirement-present-in-design-but-absent-from-plan class) — STOP and add the task or the exclusion before hand-off.

This is the design→tasks direction (no omission). Step 8 only checks task→spec (no invention). Both directions are required: one stops fabricated ids, the other stops dropped requirements.

## Step 8 — Self-review the plan

Before hand-off, grep your own plan output to verify protocol compliance. Run these deterministic checks:

**Hard gates** (any ❌ → edit the plan inline and re-run Step 8 until clean):
1. Task 1 is exactly `Apply source-of-truth delta` (grep the first `## Task` heading).
2. Every `[HUMAN GATE]` task is tier BATCH with **Agent: (none)** — no subagent runs a human-gated task.
3. A final reviewer task exists (`Agent: reviewer`, foreground) carrying the full `{{PACKAGE_MANAGER}} run validate` gate.

**Soft gates** (❌ → hand-off warning, not a reject):
4. Every implementation task names **Governing evidence** (FUNC/RA/VAL/C-NN).
5. Every parallel `## Group` lists file sets that are pairwise disjoint (same file = serial).

This skill produces deterministic protocol artifacts. Catching a violation post-write is cheap; catching it during `/execute-plan` is expensive.

## Step 9 — Hand off

Tell the user:

- Plan file path.
- Total tasks, group count, tier mix.
- Confirm Task 1 = apply delta (per Step 7 + Step 8 self-review).
- List of [HUMAN GATE] tasks (so user knows blocking points upfront).
- Suggested next step: `/execute-plan <plan-path>`.

## Cross-references

- `brainstorm` skill — produces the design this skill consumes.
- `execute-plan` skill — consumes the plan this skill produces.
- `spec-protocol.md` — delta-at-start, allowed verbs, origin tags.
- `parallel-dispatch.md` — N agents → 1 message rule.
{{IF_PALIER_GTE_2}}- `spec-tracer` skill — post-execution coverage check.{{/IF}}

## Gotchas

- Writing a plan from a design with no delta block. Stop. Reject. Send the user back to `/brainstorm`.
- Placing apply-delta anywhere other than Task 1. Subagents reading source-of-truth during implementation read the post-delta version.
- Tiering complex logic as BATCH to compress runtime. The reviewer pass exists for a reason; skipping it on RIGOROUS work creates the failure modes journaled in `~/.claude/skills/meta-govern/references/lessons-log.html`.
- Grouping tasks that share a file as parallel. They'll serialize anyway via merge conflicts, after wasting both implementers' time.
- Skipping Step 8 self-review. Protocol violations are 5x cheaper to catch here than during execution.
- Editing the source-of-truth docs yourself. That happens in Task 1 of `/execute-plan`, applied by the orchestrator, not by this skill.
