---
description: Style guide for .claude/ files — one-concept-one-place, no meta-text, no defensive scaffolding, anti-Opus-4.7 patterns
paths:
  - .claude/**/*.{md,mjs,js}
  - CLAUDE.md
---

# Style — Claude config files

Applies to any modification of `CLAUDE.md`, rules, skills, agents, hooks, and their references.

## One concept, one place

If the same idea appears in two files, delete the less canonical copy and link to the surviving one.

## No meta-text

Skip "this file documents X" and "loaded by the harness when Y matches". Frontmatter answers "when this loads"; the body answers "what to do".

## Short phrases

An idea that fits in a bullet or table cell doesn't need a paragraph. Reserve prose for the why; bullets carry the what.

## Avoided phrases (Opus 4.7 anti-patterns)

These create rigid loops or defensive scaffolding:

- "MUST" / "ALWAYS" in caps — prefer "use", "favor", or stating the positive form.
- "n'oublie pas de…" / "do not forget" — list the action plainly.
- "double-check before returning" / "verify before returning" — describe the check, not the meta-instruction.
- "do not skip any step" — write the steps so they're load-bearing, not optional decoration.

Negations always pair with an alternative: not "don't do X" but "don't do X; do Y instead."

## Frontmatter discipline

- **Skills**: `name`, `description`, optional `allowed-tools`. Description starts with "Use this skill when…".
- **Agents**: `name`, `description`, `tools`, `model`. Description starts with a verb.
- **Rules**: `description` (one-line) + `paths` (glob list scoping when the rule loads).
- **Hooks**: configured in `settings.json`, not in frontmatter.

## Naming conventions

- Skills: kebab-case `.claude/skills/<name>/SKILL.md`.
- Agents: kebab-case `.claude/agents/<name>.md`.
- Hooks: kebab-case `.claude/hooks/<name>.mjs` with explicit PATH.
- Rules: kebab-case `.claude/rules/<topic>.md` with `paths:` glob.

File caps live in the governance baseline. Skills, agents, rules each have line budgets — over-budget files split via `references/` (skills) or sibling files (agents/rules).
