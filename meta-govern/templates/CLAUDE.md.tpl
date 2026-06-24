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
{{CURRENT_PALIER}} — Current evolution palier (0-6)
{{NEXT_PALIER_TRIGGER}} — What needs to happen to promote
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
- Default: opus (Opus 4.7) at xhigh for design, debug, refactor, migration.
- Switch: sonnet (Sonnet 4.6) at high for tests, docs, single-file features.
- Plan then build: `opusplan` for any session with both phases.
- Drop: `/effort low` for classification, formatting, simple renames.
- Rescue: `/effort max` for ONE turn on stuck problems, then drop back.
- Subagents declare their own effort. Mechanical → low. Implementer → medium. Reviewer → high. Planner → xhigh.
- Spawn multiple subagents in the same turn when fanning out across items or files.

## Après compaction
Re-read this file. If `HANDOFF.md` exists at project root, read it. Resume work on the active branch. If you're mid-plan-execution, see HANDOFF.md `Active plans` section.

{{POST_COMPACT_INSTRUCTIONS}}

## Notes
- Current palier: {{CURRENT_PALIER}}
- Next palier trigger: {{NEXT_PALIER_TRIGGER}}
- meta-govern version: {{META_GOVERN_VERSION}}
