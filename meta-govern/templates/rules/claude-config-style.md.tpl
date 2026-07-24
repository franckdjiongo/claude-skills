---
description: Style guide for .claude/ files — durable-only standing context, one-concept-one-place, no meta-text, no defensive scaffolding, Claude 4.7+/5-family anti-patterns
paths:
  - .claude/**/*.{md,mjs,js}
  - CLAUDE.md
  - AGENTS.md
---

# Style — Claude config files

## One concept, one place

If the same idea appears in two files, delete the less canonical copy and link to the surviving one.

## Contenu durable seulement (CLAUDE.md, AGENTS.md, corps de rules)

N'y consigner que des invariants : conventions, protocoles, pointeurs, commandes stables. Tout fait d'ÉTAT (version, palier, compte de constats/tests, statut de migration, « backend vivant = X », « pas encore de Y », « aujourd'hui/currently ») vit dans sa source canonique (`.claude/.meta-govern.json`, `HANDOFF.md`, docs vivants, le code) — le standing context POINTE, il ne duplique pas. Test du rot : « cette phrase peut-elle devenir fausse sans qu'on édite CE fichier ? » — si oui, la remplacer par la règle durable + le pointeur. Exception encadrée : une ligne datée qui nomme son expiration ET l'état successeur (« Fable 5 until 2026-07-07, then Opus 4.8 ») — elle se périme visiblement au lieu de mentir en silence.

## No meta-text

Skip "this file documents X" and "loaded by the harness when Y matches". Frontmatter answers "when this loads"; the body answers "what to do".

## Short phrases

An idea that fits in a bullet or table cell doesn't need a paragraph. Reserve prose for the why; bullets carry the what.

## Avoided phrases (Claude 4.7+/5-family anti-patterns)

These create rigid loops or defensive scaffolding:

- "MUST" / "ALWAYS" in caps — prefer "use", "favor", or stating the positive form.
- "n'oublie pas de…" / "do not forget" — list the action plainly.
- "double-check before returning" / "verify before returning" / "re-verify before responding" — describe the check, not the meta-instruction.
- "include a final verification step" / "use a subagent to verify" — current models already verify their own work; asking again produces self-built verification pipelines that burn the budget. Deterministic gates and review of someone else's diff are a different thing, and they live in hooks and agents, not here.
- "do not skip any step" — write the steps so they're load-bearing, not optional decoration.

Negations always pair with an alternative: not "don't do X" but "don't do X; do Y instead."

## Shadow mode for new blocking rules

A new blocking rule — a hook that denies, a gate that fails a run — starts in observation. It logs what it would have stopped (a JSONL line, a warning) and lets the action through, so a window of real traffic shows it fires only on the cases it means to. Promote it to enforce once that window passes clean, via an `<GUARD>_ENFORCE=1` env flag (uppercased guard name) or a `shadow` field the rule reads. The bash-write-guard already works this way: it shadow-logs `src/**` writes and denies them only under `BASH_WRITE_GUARD_ENFORCE=1`. Shipping straight to enforce trades that evidence for a guard whose first false positive lands on a live session.

## Frontmatter discipline

- **Skills**: `name`, `description`, optional `allowed-tools`. Description starts with "Use this skill when…".
- **Agents**: `name`, `description`, `tools`, `model`. Description starts with a verb.
- **Rules**: `description` (one-line) + `paths` (glob list scoping when the rule loads).
- **Hooks**: configured in `settings.json`, not in frontmatter.

## Naming conventions

- Kebab-case partout — Skills: `.claude/skills/<name>/SKILL.md` · Agents: `.claude/agents/<name>.md`.
- Hooks: `.claude/hooks/<name>.mjs` (explicit PATH) · Rules: `.claude/rules/<topic>.md` with `paths:` glob.

File caps live in the governance baseline. Skills, agents, rules each have line budgets — over-budget files split via `references/` (skills) or sibling files (agents/rules).
