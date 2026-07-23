<!--
Template variables (substituted at BOOTSTRAP):
{{PROJECT_NAME}}      — Human-readable project name
{{PROJECT_SLUG}}      — kebab-case slug
{{PACKAGE_MANAGER}}   — bun | npm | pnpm
{{TEST_FRAMEWORK}}    — Vitest 4 | Jest | etc.
{{SPEC_DOC}}          — Path to functional spec
{{DATA_MODEL_DOC}}    — Path to data model
{{CATALOG_DOC}}       — Path to component catalog
{{IF_PALIER_GTE_3}}…{{/IF}}    — Worktree workflow (palier 3+)
{{IF_PALIER_GTE_2}}…{{/IF}}    — spec-tracer references (palier 2+)
-->
---
name: execute-plan
description: |
  Execute a plan file from `docs/plans/`. Dispatches the `implementer` subagent
  per task, runs the `reviewer` subagent IN FOREGROUND per task or per group,
  applies the source-of-truth delta as the final phase, commits per task or per
  group depending on tier. Handles parallel groups by dispatching multiple
  implementers in a single message. Use whenever the user says: execute plan,
  run plan, lancer le plan, implémenter le plan, "ship the plan", "do the plan",
  "run /execute-plan", or after `/write-plan` produced a plan that the user wants
  to ship. Distinct from `write-plan` (which produces the plan) and `quality-gate`
  (which audits the result) — this skill is the orchestrator that turns a plan
  into commits.
when_to_use: |
  After `/write-plan` has produced an approved plan file. This skill is the
  orchestrator that turns the plan into commits.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# execute-plan — turn a plan into commits

You are the orchestrator. You dispatch subagents, read their reports, decide on findings, commit, and apply the delta. You do not write production code yourself — you delegate to `implementer`.

## Critical rule (re-read every loop)

**Reviews never run in background.** Background dispatch returns 0-byte output while reporting "completed" — the #1 silent failure mode. When invoking `reviewer`, foreground only. Verify the response is non-empty before proceeding.

## Step 1 — Locate the plan

Accept a path argument. Default: latest file in `docs/plans/` by date prefix. If none, stop and tell the user to run `/write-plan` first.

If the plan already has an Execution Strategy block, ask: "This plan already has an Execution Strategy. Re-classify tasks, or proceed with the existing strategy?" If proceeding, skip to Step 6.

## Step 2 — Read everything

1. The plan file in full.
2. The design ref it points at (`docs/specs/...-design.html`).
3. The path-scoped rules referenced (`.claude/rules/*.md`).
4. The relevant source-of-truth docs (`{{SPEC_DOC}}`, `{{DATA_MODEL_DOC}}`, `{{CATALOG_DOC}}`) — only the sections referenced.

## Step 2b — Plan-content gate (before any classification or dispatch)

The Execution-Strategy check in Step 1 is *structural*. Before classifying or dispatching, assert each task on CONTENT:

1. **Atomic** — one logical change.
2. **Files named** — the task lists its exact target files.
3. **Criteria carried** — it has acceptance-criteria checkboxes (per `write-plan`).
4. **Self-sufficient** — a fresh subagent could execute it with no hidden context.

Also run the **design→tasks coverage check**: is every design requirement mapped to a task or listed as explicit out-of-scope? A task failing any assertion is bounced back to `write-plan` or split here — **never dispatched verbatim**. A vague task dispatched as-is makes the implementer guess; that guess is the expensive defect class (it passes review while encoding the wrong interpretation).

## Step 3 — Verify environment

```bash
git status --short
git branch --show-current
```

- Resolve the repo's actual base branch (e.g., `master` or `main`); record it for changed-scope gates.
- **Create the feature branch FIRST (step 0).** If `git branch --show-current` returns the base branch (master/main), do NOT proceed on it. Confirm a branch name with the user via `AskUserQuestion`, then `git checkout -b <name>`. Committing feature work directly on the base branch is the failure where hundreds of commits land on master, caught only at teardown.
- **Phase 0 gate**: if the plan carries a Phase 0 (human setup + automated preflight, per `write-plan`), the preflight verdict must be a full per-item PASS before any development task is dispatched. A FAIL item BLOCKS execution and is surfaced to the user — never worked around. The setup checklist lives in the plan's Phase 0; don't duplicate it here.
- **Prod-go gate**: for any production cutover/backfill step, no "go" until the tooling is committed, rehearsed on a non-prod target, and its guard-rails proven fail-closed. Independently verify sub-agent reports that gate a prod decision (recount, don't trust the summary).
- Classify dirty files as **in-scope** / **unrelated** / **mixed**. Mixed files require partial staging or an explicit no-commit decision.
- If working tree is dirty, warn the user and ask whether to proceed or stash. Don't auto-stash.
- Do NOT run `{{PACKAGE_MANAGER}} install` automatically. If `package.json` was modified by the plan, the implementer task requests it explicitly.

## Step 4 — Per-task loop

For each task in order:

### 4a. Dispatch the implementer

Before dispatch, mark the task live in the plan file (re-read it first if a sub-agent touched it): set the task's `<h3 id="task-N">` to `data-status="in-progress"` and its TOC entry to `data-toc-status="in-progress"`. This is the live-execution signal `docs-plan.css`/`docs-plan.js` render — the plan shows what is running, not just todo/done.

Lay the batch sentinel `.claude/tmp/.batch-in-flight` before EVERY writing-agent dispatch — serial or parallel — and remove it at the task/group close-out. The invariant: no writing agent in flight without the sentinel (a serial implementer mutating the tree mid-flight false-trips the Stop gate exactly like a parallel group would). Step 5 keeps the parallel-group specifics (JSON payload, group-level lifecycle).{{IF_PALIER_GTE_3}} The `agent-dispatch-preflight` hook poses/refreshes the sentinel deterministically on every writing dispatch (implementer / ui-implementer) — a backstop for when the orchestrator forgets; the explicit touch/remove here stays the owner of the lifecycle, and the consumer's 30-min mtime-TTL bounds an abandoned sentinel.{{/IF}}

Send a single message that invokes `implementer`. Payload:

- Task title and number from the plan.
- Files touched.
- Governing evidence: FUNC/RA/VAL/C-NN ids.
- The TDD checklist verbatim.
- A reminder: "read `.claude/rules/<relevant>.md` first; do not run `{{PACKAGE_MANAGER}} install`."
- **File-size warning block**: before dispatch, check listed target files. If any existing file is at 281+ lines, inject a `FILE SIZE WARNING:` block with current line counts.

### 4b. Read the implementer's report

Wait for completion. Confirm files claimed changed actually changed (`git diff --name-only`), tests claimed added exist, and {{IF_STACK_TYPESCRIPT}}`{{PACKAGE_MANAGER}} run typecheck` + {{/IF}}`{{PACKAGE_MANAGER}} run build` (or `validate:fast`) reported pass. A one-line "done" or "validate passed" is not a valid completion — require changed files, behavior changed, RED → GREEN, checks run, validate status.

If the task produced a runnable execution artifact (script, migration, seed, backfill, export), the report must show a REAL run (dry-run or sandbox) — reading clean and typechecking green is not evidence it runs. Before you Edit any file listed in the report, Read it first — the sub-agent's edits are not in your context; editing from a stale view yields `file_not_read_yet` / lost-edit errors. Systematic, not only after an error.

### 4c. Dispatch the reviewer (FOREGROUND)

For RIGOROUS: per-task. For STANDARD: per group. For BATCH: one combined review at the end. A task whose diff touches a `critique` path (per `.claude/risk-tiers.json` — repositories, domain, security, payroll, `.claude/hooks/**`) earns at least a per-group review; it stays out of the single end-of-run BATCH sweep even when `write-plan` tiered it low. Payload: task / group description, spec refs (FUNC/RA/VAL/C), exact `git diff` since the last reviewed commit (or since base), pointer to `.claude/rules/` files in scope. **Verdict format required**: `PASS`, `FINDINGS`, or `BLOCKED` with file/line refs when findings exist. If the reply lacks a strict verdict, re-prompt; do not treat unstructured reviews as a pass. Re-state before dispatching: "I am NOT setting run_in_background. I will read the reviewer's findings before continuing."

**Incremental cross-cutting review (large plans).** On a large plan — many tasks, a phase-structured plan, or a diff past a few thousand lines — don't defer all cross-task class detection to `write-plan`'s final adversarial whole-branch review gate (its `Task N+1`, enforced by Step 8 gate #8). At each phase / group close-out, run one incremental cross-cutting pass over the accumulated branch diff, sweeping the reviewer's permanent structural checklist (ownership, server caps, sibling classes, ported branches) across everything merged so far. Classes that live BETWEEN tasks surface early and cheap here; concentrated into a single final pass on a 140-file surface they converge slowly — the observed cost is eight adversarial rounds where per-phase sweeps would have closed the transverse classes in three.

When an autonomous run resumes (`MG_HEADLESS_RUN=1`), seed each incremental pass with a risk-weighted sample: `node .claude/scripts/sample-review.mjs --base <base-branch>` ranks the accumulated commits by touched-path risk tier × diff size and prints the top-N as markdown. Read those first — the commits touching `critique` paths or moving the most lines are where a transverse class most likely hides, so the sweep spends its first attention where a defect costs the most. The sampler ranks attention only; it verifies nothing and gates nothing, so a clean sample still leaves the structural checklist to run.

### 4d. Process findings

Each finding needs an explicit **disposition**:

- **Fixed** — re-dispatch implementer with the fix; verify; capture commit ref.
- **Deferred** — append to `docs/backlog-deferred.html` (create via `node .claude/scripts/docs-html/scaffold.mjs backlog docs/backlog-deferred.html "Backlog différé"` if absent) with id `DEFERRED-XXX` + a 2-line explanation. Cite the id in the status report.

No silent drops. If unsure, ask the user.

**Visual-unverified is NOT soft-disposable.** For any UI / component / page group, "rendered output not visually verified" cannot be dispositioned as Deferred or waved through. Either (a) the live render is verified (browser / visual QA where the project supports it), or (b) the group's task is hard-tagged `NEEDS_VISUAL_QA` and its "done" is **BLOCKED** until verified — tracked as open, never closed. jsdom / unit-green is blind to contrast, padding, saturated modal backgrounds, illegible highlights; it proves the wrong thing. The one false output that reaches users is the visual defect that was soft-disposed. And before declaring a "visual fail" from a headless/automated check, A/B-diagnose it (same page, known-good state) — a headless failure has non-visual causes.

**Owner-QA handoff preflight.** Before any "owner, please QA via the dev server" handoff, verify the local env actually feeds the app: every key the source reads (`import.meta.env.*` or equivalent) is present in `.env.local`. A missing key fails at the owner's first click (e.g. `auth/invalid-api-key`), burning the QA round. FAIL blocks the handoff.

**Secrets protocol.** When asking the owner to deposit a secret, give the exact command up front (`umask 077 && pbpaste > /tmp/<name>`), consume it immediately, and delete the temp file as soon as the operation is reported done — never leave deposited secrets on disk.

### 4e. Verify

`{{IF_STACK_TYPESCRIPT}}{{PACKAGE_MANAGER}} run typecheck && {{/IF}}{{PACKAGE_MANAGER}} run build` (or `{{PACKAGE_MANAGER}} run validate` for the full gate). Failing → re-dispatch implementer to fix; do NOT mark the task done.

Where the project has real-boundary tests (live datastore / integration, not idealized mocks), they are part of this gate. A suite that is green on mocks while the app is broken against the real backend proves the wrong thing — keep at least one test that exercises the real shape.

### 4f. Commit

- **RIGOROUS**: one commit per task. Title: `<type>(<scope>): <task title>`.
- **STANDARD / BATCH**: one commit per group, listing tasks in the body.

Use the project's commit conventions — `git log -10` for style. Do not add Co-Authored-By or AI attribution lines.

### 4g. Close out the task in the plan

Close-out is an ordered checklist — a task is `done` only when all four land:

1. Flip the task's Pipeline Task List checkbox(es) (`checked=""` on the matching `<input class="task-list-item-checkbox">`).
2. Set the task's `data-status="done"` (h3) and its TOC entry's `data-toc-status="done"`.
3. Tick **every** detailed acceptance/TDD checkbox actually satisfied. A box left `[ ]` with no inline `PENDING-MANUAL: <reason>` marker means the task is NOT done — resolve it or mark it `PENDING-MANUAL` before step 4.
4. Commit (per 4f tiering).

The plan is the persistent record; task-tracker items are ephemeral.

Derive task status from a **single source** — the step-records you maintain in this loop — never from drifting checkbox headers kept in two places (they fall out of sync and force reconciliation commits). And before editing any file a sub-agent just mutated, **re-read it**: the sub-agent's edits are not in your context, so editing from a stale view yields `file_not_read_yet` / lost-edit errors.

## Step 5 — Parallel groups

When the plan declares "Group A (parallel): Tasks 3, 4, 5":

- Write the batch sentinel before dispatch: `.claude/tmp/.batch-in-flight` (JSON: `{"group": "A", "tasks": [3,4,5], "startedAt": "<ISO>"}`). While it exists, `enforce-workflow` downgrades its Stop-block to a warning — mid-flight edits by parallel implementers would otherwise false-trip the validate gate.
- Dispatch ALL implementers in a **single message** (multiple Task tool calls in one assistant turn). Separate turns = sequential = wasted overhead.
- Wait for all to complete.
- Run a single group reviewer pass (foreground).
- Process findings, fix, verify, commit the group as one (or per-task if any task is RIGOROUS).
- Remove the sentinel at group close-out (after the group commit) — the Stop gate resumes normal enforcement.

{{IF_PALIER_GTE_3}}### Worktree parallelism (palier 3+)

When the plan marks tasks as worktree-parallelizable, check file overlap. Shared files → sequential. Disjoint files → worktree-parallel:

1. `git worktree add .worktrees/<task-name> -b wt-<task-name>`
2. Link gitignored deps (run the project's worktree setup script if present).
3. Dispatch ALL worktree agents in one turn.
4. Wait for all; merge branches back: `git merge wt-<task-name>` per task.
5. Teardown: `git worktree remove .worktrees/<task-name>`.
6. Reconcile the plan on the merged branch — worktree-local plan edits are not the source of truth.
7. Run combined review + quality gate on merged result.

Skip worktrees when: tasks share files, only 1–2 tasks remain, sequential dependencies exist.{{/IF}}

## Step 6 — Final phase: apply the source-of-truth delta

This is the LAST task in every plan, per `spec-protocol.md`.

1. Read the design's `## Source of truth delta` section.
2. Apply each ADD / MODIFY / REMOVE / RENAME to:
   - `{{SPEC_DOC}}`
   - `{{DATA_MODEL_DOC}}`
   - `{{CATALOG_DOC}}`
3. Commit on its own:
   ```
   docs(spec): apply delta from <design-filename>
   ```
4. Verify with `git log -2` that the delta commit is separate from the feature commits — never bundle them.

## Step 7 — Final validation

```bash
{{PACKAGE_MANAGER}} install   # ONLY if dependencies changed
{{IF_STACK_TYPESCRIPT}}{{PACKAGE_MANAGER}} run typecheck
{{/IF}}{{PACKAGE_MANAGER}} run build
{{PACKAGE_MANAGER}} run test
```

Plus any project-specific suites declared in the plan. If anything fails, stop. Don't claim done.

{{IF_PALIER_GTE_2}}Run `/spec-tracer` for traceability coverage and `/quality-gate` for the final audit pass.{{/IF}}

## Step 8 — Status report

Output to the user:

- Tasks completed (with commit hashes).
- Tasks deferred (with DEFERRED-XXX ids).
- Plan file final state (all `[x]`, or which boxes remain).
- Delta commit hash.
- Any warnings raised during the run.

Before reporting, audit each claim against a tool result from this session (a diff, a test run, a reviewer verdict). Only report work you can point to evidence for; if something is not yet verified, say so explicitly.

## Cross-references

- `write-plan` skill — produces the plan this skill consumes.
- `quality-gate` skill — final audit pass after the plan ships.
- `implementer` agent — does the actual code writing, per task.
- `reviewer` agent — foreground audit, per task or per group.
- `spec-protocol.md` — delta protocol, never bundle delta with feature commits.
- `parallel-dispatch.md` — N agents → 1 message rule.

## Gotchas

- Running reviewer subagents in background. Re-read the critical rule every loop. Background returns 0-byte and silently passes.
- Marking a plan box `[x]` without verifying the work. The plan file is the persistent record; lying to it lies to future sessions.
- Bundling the delta commit with feature commits. Reverts become impossible to scope.
- Running `{{PACKAGE_MANAGER}} install` unless the plan explicitly added a dependency. Side-effect installs corrupt deterministic builds.
- Skipping a finding's disposition. Every reviewer finding is fixed-with-commit-ref or deferred-with-DEFERRED-XXX-entry. "Deferred to backlog" without opening the file is the observed failure mode.
- Continuing after a typecheck/build failure. The plan is not done. Don't claim it.
- Editing source-of-truth docs outside the final apply-delta phase. The whole protocol depends on a single, scoped commit.
- Treating an unstructured reviewer reply as PASS. Re-prompt for `PASS` / `FINDINGS` / `BLOCKED` instead.
