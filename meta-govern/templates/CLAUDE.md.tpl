# {{PROJECT_NAME}} — CLAUDE.md

<!--
Template variables:
{{PROJECT_NAME}} — Human-readable project name
{{PROJECT_SUMMARY}} — One paragraph: what this is, who it serves
{{SPEC_DOC}} — Path to functional spec (e.g., docs/{{slug}}-spec.html)
{{DATA_MODEL_DOC}} — Path to data model (e.g., docs/data-model.html)
{{CATALOG_DOC}} — Path to component catalog (e.g., docs/composants/catalogue-composants.html)
{{STACK_SUMMARY}} — One sentence: framework, runtime, package manager
{{COMMAND_DEV}} — e.g., `bun run dev` or `npm run dev`
{{COMMAND_VALIDATE}} — e.g., `bun run validate`
{{COMMAND_QUALITY}} — e.g., `bun run quality:check`
{{NON_NEGOTIABLE_RULES}} — Project-specific hardcoded rules (5-10 bullets)
{{ROUTING_RULES}} — Path-scoped routing entries (one per .claude/rules/*.md)
{{POST_COMPACT_INSTRUCTIONS}} — Custom resume instructions if needed
-->

## Projet
{{PROJECT_SUMMARY}}

## Source de vérité
- `{{SPEC_DOC}}` — fonctionnalités (FUNC-XX), règles d'affaires (RA-XX), validations (VAL-XX)
- `{{DATA_MODEL_DOC}}` — schéma, contrats, relations
- `{{CATALOG_DOC}}` — catalogue des composants (C-XX)
- `docs/` est 100% HTML — créer un doc via `node .claude/scripts/docs-html/scaffold.mjs <type> <chemin>.html "<Titre>"` (hook `block-docs-markdown` bloque les `.md`)
- Registre des docs canoniques : `docs/docs-map.json`

## Stack
{{STACK_SUMMARY}}

## Commands
| Goal | Command |
|---|---|
| dev | `{{COMMAND_DEV}}` |
| validate | `{{COMMAND_VALIDATE}}` |
| quality | `{{COMMAND_QUALITY}}` |

## Règles non-négociables
{{NON_NEGOTIABLE_RULES}}

## Routing path-scoped
{{ROUTING_RULES}}

## Default model + effort
- Default: sonnet (Sonnet 5) at high — workhorse for most coding; near-Opus quality at Sonnet pricing, gentler on quota.
- Escalate: sonnet (Sonnet 5) or opus (Opus 4.8) at xhigh for the hardest multi-file refactor, debugging, architecture; opus for the hardest pure reasoning.
- Untrusted content (web pages, PR diffs, third-party tool output): prefer sonnet — most prompt-injection-resistant tier.
- Plan then build: plan mode on the stronger model (`opusplan`-style alias where available).
- Drop: `/effort low` for classification, formatting, simple renames. Sonnet 5 respects low strictly — raise effort if reasoning turns shallow; don't prompt around it.
- Rescue: `/effort max` for ONE turn on stuck problems, then drop back.
- Effort names don't carry equal depth across model versions (Sonnet 5 medium ≈ Sonnet 4.6 high; high ≈ old max) — benchmark by observed thinking length.
- Subagents declare their own effort. Mechanical → low. Implementer → medium. Reviewer → high. Planner → xhigh.
- Spawn multiple subagents in the same turn when fanning out across items or files.
- State explicit intent, constraints, acceptance criteria, file paths. Don't generalize silently.

## Après compaction
Re-read this file. If `HANDOFF.md` exists at project root, read it. Resume work on the active branch. If you're mid-plan-execution, see HANDOFF.md `Active plans` section.

{{POST_COMPACT_INSTRUCTIONS}}

## État gouvernance
Palier, version meta-govern, déclencheurs de promotion et derniers audits vivent dans
`.claude/.meta-govern.json` (source canonique) — ne pas les dupliquer ici.
