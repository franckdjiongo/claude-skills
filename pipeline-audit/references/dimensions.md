# The 14-dimension grid

The fixed rubric every design and plan artifact is scored against. It encodes one
question: **can a fresh sub-agent with no hidden context execute this artifact
correctly — without guessing, asking, or deviating?** WF1 scores the *skills* that
author/execute artifacts against it; WF2 scores the *artifacts themselves*.

Score each dimension **1–5**. Always cite concrete evidence (a quote, a file, a
missing section) — a bare number is worthless. When in doubt, score LOWER and say
why; an honest 3 beats an unearned 5.

General anchors (apply to every dimension):
- **5** — Structurally guaranteed. The skill *hard-gates* it / the artifact fully satisfies it. A fresh agent cannot get it wrong.
- **4** — Present and good, but relies on author diligence rather than a gate. Usually right; not guaranteed.
- **3** — Partial. Present for the easy cases, silent on the hard ones. A careful reader is fine; a literal executor branches.
- **2** — Mostly absent. One token gesture (an optional bullet) but no real coverage.
- **1** — Absent or actively misleading.

---

## DESIGN dimensions (7) — the brainstorming/spec stage

| id | name | measures | a 5 looks like | a 1 looks like |
|---|---|---|---|---|
| `decision_closure` | Decision closure | every decision is *resolved in the artifact* | no "TBD / to decide during implementation"; each open question was driven to a ruling | "the UI agent will decide the sort order later" |
| `sot_anchoring` | Source-of-truth anchoring | claims trace to a cited governing source | every behavior cites a spec/data-model/catalog ID; zero invented facts | asserts behavior with no provenance; invents a field name |
| `scope_sizing` | Scope sizing | one coherent slice a fresh agent holds in head | a single feature/phase, right-sized | 3 phases stacked into one design; "and also refactor X, Y, Z" |
| `edge_cases` | Edge-case coverage | empty / error / loading / boundary / permission states enumerated adversarially | a loop-until-dry pass listing each non-happy state + behavior | only the happy path described |
| `acceptance_criteria` | Acceptance criteria | observable pass/fail conditions **per behavior** | "GIVEN X WHEN Y THEN Z" style, behavior by behavior, derived as rigorously as edge cases | only a vague "Testing/verification" bullet, i.e. a *strategy* not assertions |
| `ambiguity_freedom` | Ambiguity freedom | each decided behavior phrased non-interpretable-twice | thresholds, sort orders, defaults, empty/error states all quantified | "show recent items", "make it fast", "a large list" left undefined |
| `sot_deltas` | Source-of-truth deltas | changes the artifact requires of the SoT are named as explicit deltas | "this adds FUNC-NEW-12 / column gg_x to the data model" listed up front | new behavior silently assumes spec changes never written down |

## PLAN dimensions (7) — the writing-plan + execution stage

| id | name | measures | a 5 looks like | a 1 looks like |
|---|---|---|---|---|
| `task_atomicity` | Task atomicity | each task is one coherent, independently dispatchable unit | tasks map 1:1 to a behavior/file-set; none bundles unrelated work | "Task 3: build the whole feature" |
| `testability` | Testability | each task carries a verification shape tied to a criterion | RED/GREEN (or equivalent) with a test that fails if the criterion is removed | "write the code, then check it works" |
| `file_precision` | File precision | each task names the exact files it touches | every task lists its files + signatures | "update the relevant components" |
| `design_fidelity` | Design fidelity | the plan faithfully covers its design; no silent shrink/override | every design section maps to a task or an explicit out-of-scope | plan quietly drops a requirement, or overrides the design at execution (renamed field, changed default) |
| `sequencing` | Sequencing | tasks ordered so dependencies resolve | delta-first; foundation before consumers; no forward refs | task N needs an artifact built in task N+3 |
| `execution_strategy_block` | Execution-strategy block | the plan carries an orchestration block | tiers/groups/gates/parallelism declared, with user-validation gates marked | no strategy block; executor must invent the run shape |
| `self_sufficiency` | Per-task self-sufficiency | a fresh agent executes each task with ZERO hidden context | complete call-site sweeps, unique step labels, verified line counts, no self-contradictory sub-prompts | "modify X but do not modify X"; incomplete sweep → downstream type errors; duplicate "Step 6" labels |

---

## WF2-only cross-dimensions (corpus scoring)

Beyond per-artifact scoring, WF2 also reports, per theme:

- **`design_to_plan_fidelity` (1–5):** for each paired design↔plan, does the plan cover the design without silent scope-shrink, orphaning, or execution-time override? This is the single most predictive number for downstream rework. Score the *pair*, cite the dropped/added/renamed item.
- **`remediation_cycle` (none | light | yes):** is there evidence the theme needed a second pass — a "round-2"/"final-polish"/"fix-regressions" plan, a same-day re-plan, a revert? Note WHETHER the remediation was caused by an upstream artifact insufficiency (a real defect) vs healthy iteration (new requirement, user change-of-mind). Only the former counts against the pipeline.
- **maturity trajectory:** tag each theme with its date. Report scores **chronologically** — a pipeline that heals (low scores only in old themes, high in recent) is the most important positive signal and must not be hidden by a global average.

## WF1-only synthesis

WF1 scores each *skill* (not artifact) on the subset of dimensions it owns, reading
the skill's `SKILL.md` + its key references/agent bodies, then names the **weakest
link** and, per finding, **which behavior the skill fails to gate** (vs. merely
fails to mention). Distinguish "the guard lives in the agent body but not the
SKILL" — a real gap, because the SKILL is the contract.

## Attribution rule (all workflows)

Every finding is attributed to **one faulty skill** (the one whose contract should
have caught it), tagged with a **severity** (high/medium/low) and **evidence**.
Severities are self-assessed by the agent — the report must say so (see report-template.md, "Limits").
