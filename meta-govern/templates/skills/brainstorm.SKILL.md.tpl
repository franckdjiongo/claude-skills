<!--
Template variables (substituted at BOOTSTRAP):
{{PROJECT_NAME}}      — Human-readable project name (e.g., "Brillance Décor Inc.")
{{PROJECT_SLUG}}      — kebab-case slug (e.g., "brillance-decor")
{{PROJECT_DESCRIPTION}} — One-paragraph summary of stack + domain
{{PACKAGE_MANAGER}}   — bun | npm | pnpm
{{TEST_FRAMEWORK}}    — Vitest 4 | Jest | etc.
{{SPEC_DOC}}          — Path to functional spec (e.g., docs/{{PROJECT_SLUG}}-spec.html)
{{DATA_MODEL_DOC}}    — Path to data model (e.g., docs/data-model.html)
{{CATALOG_DOC}}       — Path to component catalog (e.g., docs/composants/catalogue-composants.html)
{{IF_STACK_HAS_UI}}…{{/IF}}    — Conditional block for UI-bearing stacks
{{IF_PALIER_GTE_2}}…{{/IF}}    — Conditional for spec-tracer references
-->
---
name: brainstorm
description: |
  Drive a structured design / brainstorming session for any feature, refactor, or
  architecture decision in {{PROJECT_NAME}} ({{PROJECT_DESCRIPTION}}). Hard gate:
  NO implementation until the design is approved section-by-section AND a
  `## Source of truth delta` block is written. Writes
  `docs/specs/YYYY-MM-DD-<topic>-design.html`. Use whenever the user says: brainstorm,
  design, conception, architecture, "comment implémenter", "comment ajouter",
  "plan d'attaque", "let's design", "how should we build X", "réfléchissons à",
  "feature design", "spec a feature". Triggers also on any non-trivial new feature
  request before code is written. Distinct from `write-plan` (which turns an approved
  design into tasks) and `execute-plan` (which ships them) — this skill produces
  the design draft only.
when_to_use: |
  Before writing any plan or code for a non-trivial change. The output is a design
  draft (not a plan, not implementation). Next step after this skill is `/write-plan`.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# brainstorm — design before code

You facilitate a written design that an implementer can later turn into a plan.
You never write production code in this skill. If the user asks you to "just code it",
refuse and offer a focused brainstorm.

This file owns the **workflow**. The section bodies, HUMAN GATE checklist, and
edge-case checklist are inline below (Step 3). The delta block format — allowed
verbs `ADD`/`MODIFY`/`REMOVE`/`RENAME`, the mandatory `<!-- origin: ... -->` tag,
and the amendment fast path — is defined in the installed rule `.claude/rules/spec-protocol.md`.

## Step 1 — Read source of truth + reality-check the codebase

Before asking anything, read:

1. `{{SPEC_DOC}}` — FUNC, RA, VAL identifiers (product behaviour).
2. `{{DATA_MODEL_DOC}}` — schema, contracts, relations.
3. `{{CATALOG_DOC}}` — visual / component catalogue (C-XX).

Also read the rules that match the touched paths (clean-code, file-size, plus path-scoped rules under `.claude/rules/`). Designing without these three source-of-truth files is how spec drift starts.

**Codebase reality check (mandatory if topic touches existing code).** If the brainstorm topic touches at least one existing source file, dispatch `codebase-reality-check` subagent in foreground before drafting any section. Pass: `topic`, `suspected_paths[]`, `spec_ids_referenced[]`, optional `expectations[]`. Bake findings (line counts, drift detected, config gaps, missing FUNC ids) into Section 2 (Fichiers touchés) and Section 5 (Cas limites). Skip only for pure-greenfield topics with no existing code involved — and document the skip in Section 1.

**Twin-domain parity inventory (mandatory when the topic mirrors an established domain).** If the feature touches a mirror domain — internal ↔ external/subcontracting, a future module cloning a current one — do NOT scope yet. First enumerate every capability of the established side and classify each counterpart: **specified** / **adapted** / **excluded** / **MISSING**. Record the inventory in Section 1. A MISSING that is in-scope becomes a behavior to design here; a MISSING that is out-of-scope is stated as such with a reason. This institutionalizes the parity audit and prevents the "internal feature never planned for the external twin" rework class.

Apply `clean-code.md` (DRY, KISS, YAGNI, SOLID, SINE, fail-fast, Boy Scout) **at design time** — every section already reflects them. Catching a YAGNI flag at design time costs nothing; in review it costs a re-implementation.

## Step 2 — Ask clarifying questions

### Step 2a — Intake: external revisions

> "Y a-t-il des révisions client, nouvelles règles d'affaires, ou changements de design reçus DEPUIS la dernière mise à jour de la spec et qui touchent ce sujet?"

Cross-check each entry with the three source-of-truth files. Flag a `MODIFY` / `REMOVE` (sometimes `ADD`-extension) in the delta with tag `client-revision YYYY-MM-DD` or `business-rule-change YYYY-MM-DD`. If the revision is purely spec, no code, switch to amendment workflow (delta-format §amendment) instead of continuing this brainstorm. If the answer is empty, trace it explicitly before 2b.

### Step 2b — Topic-scoped clarifying questions

List the actual unknowns before designing. Examples:

- "Should X persist across sessions, or only the current tab?"
- "Are we OK with a 200ms loading state, or is SSR required?"
- "Does this ship behind a flag, or is it visible day one?"
- "What's the failure mode when the backend is unreachable — empty state, retry, queue?"

Ask 3–6 questions max. Wait for answers. Don't invent answers.

## Step 3 — Present the design section by section, approval-gated

Present sections one at a time. After each, ask "Approved? Or changes?" and wait. Only move on after explicit approval.

The sections (each section body is given inline below):

1. **Problème** — what we're solving, why now, who benefits, what we don't solve.
2. **Fichiers touchés** — every file to create/modify with rationale, grouped by area, with file-size budget call-outs.
3. **Données** — schema, contracts, types, localized keys (when bilingual), production guardrails, components used.
4. **Workflow** — user flow + technical flow with error paths. **HUMAN GATE sub-section** if the design touches third-party infra setup (auth, DNS, storage buckets, payment, email).
4b. **Critères d'acceptation** — for every decided behavior, an observable pass/fail condition ("Given <state>, when <action>, then <observable result>") an implementer can check WITHOUT re-reading this conversation. These are assertions, not a test *strategy*. A behavior with no observable acceptance criterion is not designed yet. Derive them with the same adversarial rigor as edge cases; for UI topics, revisit after Section 5 to fold persona/edge-case conditions in. They become `write-plan`'s rendered checkboxes and the TDD prove-by-removal targets. (Stack-agnostic — non-UI features need observable criteria too.)
{{IF_STACK_HAS_UI}}5. **Cas limites** — fold in `persona-simulator` findings + design-level edge cases.{{/IF}}
{{IF_STACK_HAS_UI}}6. **Tests** — {{TEST_FRAMEWORK}} unit/component/integration + backend tests + Manual QA.{{/IF}}

### Interlude after Section 4 — Dispatch `persona-simulator`

Before Section 5, dispatch `persona-simulator` in foreground. You're the orchestrator (skill in main conversation), so dispatch is allowed — `implementer` and `reviewer` may not. Pass:

- The topic title.
- The approved Sections 1–4.
- Cited FUNC / RA / VAL / C-NN ids.
- Code paths affected.

Personas are project-scoped (read from `{{SPEC_DOC}}`), not generic. Findings (BLOCKING / HIGH / MEDIUM / LOW) plus cross-cutting passes (bilingual, a11y, offline, empty/loading/error, concurrency, privacy) become Section 5 inputs.

Skip only for purely internal refactors with zero user-visible behaviour change. Document the skip + justification inside Section 5 if you do.

## Step 4 — Source of truth delta (mandatory final section)

After all sections are approved, write the delta block. Allowed verbs: `ADD <id>` / `MODIFY <id>` / `REMOVE <id>` / `RENAME <old> → <new>`; every entry carries an `<!-- origin: design | client-revision YYYY-MM-DD | business-rule-change YYYY-MM-DD | bugfix-doc-correction -->` tag; before allocating an id, grep `{{SPEC_DOC}}` to avoid collisions. Full format + amendment fast path: `.claude/rules/spec-protocol.md`.

Reject your own output if this section is missing. The next skill (`write-plan`) refuses a design without a delta.

## Step 5 — Write the file

Run `date +%Y-%m-%d` via Bash. Scaffold the design doc (docs are HTML; a raw `.md` under `docs/` is blocked by the `block-docs-markdown` hook):

```bash
node .claude/scripts/docs-html/scaffold.mjs spec docs/specs/YYYY-MM-DD-<kebab-topic>-design.html "<Titre du design>"
```

Then fill `.docs-content` with the approved sections + the delta block. Topic = short kebab-case slug (e.g., `cart-persistence`, `quote-form-multi-step`).

**Post-design audits use a flat appendix structure.** Use `Section 7 — Audit findings` with flat sub-headings (`7.A`, `7.B`, `7.C`, …) — never nested numerical (`7.1`, `7.2`, `7.2.bis`). Flat appendices grow without breaking numbering.

**Self-review before declaring done.** Dispatch a foreground `reviewer` subagent on the most critical section (typically Section 3 — Données, or Section 4 — Workflow) with `scope mode="full-audit"`. A 60-second pass catches hallucinations or contradictions cheaply. Skip is allowed only with explicit inline justification ("session compaction imminent + low-risk topic" is acceptable; "running out of time" is not).

**Linguistic-precision pass (distinct from provenance).** Scan every decided behavior for two-way-interpretable phrasing and fix it: quantify "recent / large / fast", pin thresholds, state sort order, defaults, and the empty / loading / error states. An anchored-but-vague clause ("à décider par l'agent UI", "show the latest items") passes the grounding/provenance check yet leaves the implementer at a real fork — a fact can be true and still ambiguous. This is a separate check from "is this fact verified": here you verify "is this behavior phrasable only one way".

## Step 6 — Hand off

Tell the user the file path and that the next step is `/write-plan` (or `/execute-plan` if the plan already exists). Never propose implementation yourself — that's the next skill.

## Cross-references

- `.claude/rules/spec-protocol.md` — delta verbs, origin tags, ID allocation, amendment fast path.
- `clean-code.md` — DRY/KISS/YAGNI/SOLID/SINE applied at design time.
{{IF_PALIER_GTE_2}}- `spec-tracer` skill — coverage check across FUNC/RA/VAL after the design is written.{{/IF}}

## Gotchas

- Skipping the three source-of-truth reads at the start. Designs invented from intuition drift from spec within one session.
- Presenting all sections at once — they're approval-gated for a reason. Bulk dump = bulk rewrites.
- Skipping `persona-simulator` on a user-visible change. The "internal refactor" opt-out is narrow — when in doubt, dispatch.
- Running `persona-simulator` (or any subagent) in background. Foreground only — the report is consumed in this conversation. Background returns 0-byte output and silently passes.
- Writing the design file without the delta section. `write-plan` will reject it; you'll redo the whole thing.
- Inventing FUNC/RA/VAL/C-NN ids that conflict with existing ones — grep `{{SPEC_DOC}}` first (delta rules in `.claude/rules/spec-protocol.md`).
- Skipping the Step 5 self-review without inline justification. Cheap to run; expensive to skip.
