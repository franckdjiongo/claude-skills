---
name: pipeline-audit
description: >-
  Reverse-engineering audit of a project's brainstorm→plan→implementation skill pipeline:
  do the design/plan skills produce artifacts good enough that fresh implementers execute without
  guessing, asking, or deviating — and if not, which skill to fix? Project-agnostic — it discovers
  conventions (specs/plans dirs, generator + execution skills), mines Claude session transcripts
  for friction, runs three batched Workflow analyses (skills vs a fixed 14-dimension grid; the full
  design+plan corpus by theme; session friction root-caused), triangulates them, and writes an
  honest HTML report with prioritized fixes. Use when the user wants to audit, grade, or
  reverse-engineer the QUALITY of their planning pipeline or its skills: 'audit my pipeline',
  'are my brainstorming/writing-plan/execute-plan skills good enough', 'reverse-engineer my
  workflow', 'full pipeline audit', 'why do implementers keep needing rework'. Honors a scope flag
  (full, sessions-only, corpus-only). NOT a single-conversation retro (use session-review).
---

# Pipeline Audit

This skill reverse-engineers the **quality of a project's planning pipeline** — the
brainstorm/spec skill, the plan-writing skill, and the execution skills — by
triangulating three independent views:

- **What the skills *require*** (WF1: skills vs a fixed 14-dimension grid).
- **What the artifacts *contain*** (WF2: the whole design+plan corpus, by theme).
- **What *actually happened*** to implementers (WF3: session friction, root-caused).

Where the three converge is the trustworthy verdict. The output is one honest HTML
report with prioritized, per-skill recommendations — **proposed, not applied.**

This is **distinct from `session-review`**: that retrospects a *conversation*; this
audits the *artifacts and the skills that produce them*. If the user only wants to
look back over recent sessions, that's `session-review --rollup`, not this.

---

## The hard lessons — read these first, they prevent breakage

These were learned by running this audit the hard way. Skipping them breaks the run.

1. **Batch the Workflow agents to ~3 concurrent, sequentially.** A burst of 15–50
   agents trips a server-side rate limit and the whole `Workflow` dies. The
   templates use an `inBatches(items, 3, …)` helper — keep `BATCH = 3`.
2. **Make every workflow resumable.** When a batch dies, relaunch with
   `Workflow({scriptPath, resumeFromRunId})` — cached agents return instantly, only
   failed/new ones re-run. Run the three workflows **one at a time** so a death is
   cheap to replay.
3. **Embed work-lists as literals in the script — never via `Workflow` `args`.**
   Large arrays arrive unparsed through `args`. The scripts here print JSON; paste
   that JSON into the template's `EMBED` slot, write the filled script to a file,
   run it by `scriptPath`.
4. **Regex friction signals are for RANKING, not conclusions.** They tell you *where
   to look*, not *what's wrong*. Most `deferral`/`resumption` hits are **healthy
   process** (backlog routing, TDD red→green, gates firing, escalation on
   irreversible steps). Calibrate by deep-reading; default ambiguous episodes to
   healthy. Roughly half of flagged friction is typically NOT a defect.
5. **≤ ~7 docs per agent.** The corpus builder already chunks to 7. Don't hand an
   agent a whole theme.
6. **The report must be honest about its limits** (sampling, self-assessed
   severities, coarse signals). An audit that hides its weaknesses is propaganda.

---

## Scope

Default is a **full** audit. Honor a narrower scope if the user asks for one:

| Scope | Runs | Use when |
|---|---|---|
| `full` (default) | discover + mine + corpus + WF1 + WF2 + WF3 + report | "audit my pipeline" |
| `corpus-only` | discover + corpus + WF1 + WF2 + report | no useful session history, or "just grade my designs/plans" |
| `sessions-only` | discover + mine + WF3 + report | "what friction keeps hitting my implementers" |

---

## Step 1 — Discover the project's conventions (never hardcode)

```bash
python3 ~/.claude/skills/pipeline-audit/scripts/discover_project.py --cwd "$PWD"
```

It reads a `docs-map.json` path resolver if present, else scans the filesystem, and
emits JSON: `specs_dir`, `plans_dir`, `report_dir`, `design_glob`/`plan_glob`,
`scaffold` (the project's HTML doc tool + theme), `skills.{design,plan,execution}`,
the session transcript dir + count, and an **`unresolved`** list.

**For every entry in `unresolved`, ask the user (AskUserQuestion) — do not guess.**
A wrong guess about where plans live silently audits the wrong corpus. Also confirm
ambiguous skill classifications if they look off (the name heuristics are generous).
If `unresolved` is empty and the skill buckets look right, proceed.

---

## Step 2 — Mine the sessions (WF3 input)  · skip if `corpus-only`

```bash
python3 ~/.claude/skills/pipeline-audit/scripts/mine_friction.py --cwd "$PWD" --top 18
```

Walks every transcript under `~/.claude/projects/<encoded-cwd>/` (main sessions AND
sub-agents — all flat `.jsonl`), composes `session-review`'s `analyze_session.py
--rollup` for the canonical per-session map, ranks sessions by a coarse friction
score, and writes readable **dossiers** for the top-N (default 18) to
`.pipeline-audit/dossiers/`. Expect a minute or two on a large project (~1.5k
transcripts ≈ 45s here). The `ranking` JSON and `dossiers_written` paths feed WF3.

Tune `--top` to the corpus size. If `mine_friction` reports zero transcripts, tell
the user the sessions leg is empty and either narrow to `corpus-only` or proceed
without WF3.

---

## Step 3 — Build the corpus work-list (WF2 input)  · skip if `sessions-only`

```bash
python3 ~/.claude/skills/pipeline-audit/scripts/build_corpus_worklist.py \
  --specs-dir "<specs_dir>" --plans-dir "<plans_dir>" \
  --design-glob "<design_glob>" --plan-glob "<plan_glob>" --chunk-size 7
```

Pairs each design with its plan by theme, flags **orphans** (design with no plan, or
plan with no design — both are findings), and chunks every theme to ≤7 docs/agent.
The `chunks` and `themes` arrays are what you embed into WF2.

---

## Step 4 — Run the three workflows (batched + resumable)

Read **`references/workflow-templates.md`** and **`references/dimensions.md`**. For
each workflow you'll: copy the template, paste the literal JSON (skill list / chunks
/ dossier paths) into its `EMBED` slot and the absolute `GRID` path, write it to
`.pipeline-audit/wfN.mjs`, then `Workflow({scriptPath: ".pipeline-audit/wfN.mjs"})`.

Run them **in order, one at a time**, reading each result before the next:

- **WF1 — skills audit:** each pipeline skill scored against the 14-dim grid; names the weakest link.
- **WF2 — corpus scoring:** every design+plan scored by theme, + design→plan fidelity + remediation, with a chronological **maturity trajectory**.
- **WF3 — session friction:** deep-read the top dossiers, classify each episode's root cause, label artifact-defect vs healthy-process, and report the calibration %.

If a workflow dies mid-batch (rate limit / transient error): `TaskStop` it, then
re-run the SAME `scriptPath` with `resumeFromRunId: "<runId from the result>"`.

Honor the scope flag: `corpus-only` skips WF3; `sessions-only` runs only WF3.

---

## Step 5 — Triangulate and write the report

Read **`references/report-template.md`**. Triangulate the three workflow outputs into
one HTML report (the convergence is the point, not three stapled reports). Use the
project's scaffold tool from Step 1 if it has one, writing into `report_dir`; else
emit a clean self-contained HTML. The **Limites** section is mandatory. Recommendations
are **proposed, not applied** — route any actual skill change through the project's
governance/parity path (do not edit the audited skills as part of this audit).

---

## Cost & expectations

A full audit on a mature project fans out on the order of **30–50 agents** across the
three workflows (batched 3-at-a-time) plus a friction scan over all transcripts. Plan
for a meaningful run, not a quick check. The scope flag and `--top` are the levers if
the user wants something lighter.

---

## Codex / other runtimes

The three Python scripts are runtime-agnostic — run them identically. Only the
orchestration differs: a runtime without a `Workflow` tool (e.g. Codex) replays each
WF as a **manual sub-agent loop** (`spawn_agent`/`wait_agent`/`close_agent`) with the
SAME batching discipline (close finished agents before the next batch of 3; Codex
caps near 6 live agents). Same grid, same schemas (echoed back as plain JSON), same
triangulation. This skill is authored for the Claude runtime; it is not duplicated
into the Codex tree.

---

## Files in this skill

- `scripts/discover_project.py` — project-agnostic convention discovery → JSON (with `unresolved` for AskUserQuestion).
- `scripts/mine_friction.py` — friction miner over all transcripts; composes `analyze_session.py`; writes ranked dossiers.
- `scripts/build_corpus_worklist.py` — design↔plan pairing + orphan detection + ≤7-doc chunking → JSON work-list.
- `references/dimensions.md` — the fixed 14-dimension grid + scoring rubric (read by WF1/WF2 agents).
- `references/workflow-templates.md` — the three `Workflow` scripts with batching/resume/embed baked in.
- `references/report-template.md` — the 11-section HTML report structure + honest-limits contract.
