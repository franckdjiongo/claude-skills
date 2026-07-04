<!--
Template variables (substituted at BOOTSTRAP):
{{PROJECT_NAME}}      — Human-readable project name
{{PROJECT_SLUG}}      — kebab-case slug
{{PACKAGE_MANAGER}}   — bun | npm | pnpm
{{SPEC_DOC}}          — Path to functional spec
{{DATA_MODEL_DOC}}    — Path to data model
{{CATALOG_DOC}}       — Path to component catalog
-->
---
name: govern-claude
description: |
  Audit and evolve the {{PROJECT_NAME}} project's `.claude/` configuration. Compares
  the actual inventory with `references/baseline.md` (scaffolded by `meta-govern`).
  Detects drift: orphans, oversized files, defensive scaffolding patterns
  (Claude 4.7+/5-family), broken wires (hook not registered, rule with invalid
  `paths:`, script without wrapper), violations of the source-of-truth delta
  protocol. NEVER creates skills/agents/hooks itself — delegates to
  `skill-creator` / `create-subagent`, or follows the meta-govern authoring canon
  (`~/.claude/skills/meta-govern/references/skill-canonical-structure.html`,
  `subagent-canonical-structure.html`, `hook-canonical-patterns.html`) for direct
  edits to rules / hooks / `CLAUDE.md` / baseline. Use whenever the user
  says: govern, audit, claude config, drift, healthcheck, faire évoluer, what's
  next, lint claude, "améliore le setup", "fais évoluer .claude". Distinct from
  `quality-gate` (audits app code) and from `{{PACKAGE_MANAGER}} run validate`
  (quality + size-guard + docs guards + typecheck + tests) — this skill audits
  the `.claude/` configuration itself.
when_to_use: |
  - Periodically (every 2–4 weeks of active dev).
  - After a large refactor or addition of skill / rule / agent.
  - User says "improve the setup" or "evolve .claude".
  - Before a milestone (backend ship, multi-runtime, CI wiring).
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /govern-claude

## References loaded at Step 1

1. `references/baseline.md` — canonical expected inventory (project-local).
2. `~/.claude/skills/meta-govern/references/evolution-roadmap.html` — palier-by-palier evolution map.
3. `~/.claude/skills/meta-govern/references/skill-canonical-structure.html` + `subagent-canonical-structure.html` + `hook-canonical-patterns.html` — how to create rule / hook + delegation rules for skill / agent.
4. `~/.claude/skills/meta-govern/references/lessons-log.html` — cross-project failure-modes journal.
5. `CLAUDE.md` — current router.

## Workflow

### Step 1 — Inventory

```bash
find .claude/skills -name 'SKILL.md' -exec wc -l {} \;
find .claude/rules -name '*.md' -exec wc -l {} \;
find .claude/agents -name '*.md' -exec wc -l {} \;
grep -E '"command"' .claude/settings.json | sort -u
ls .claude/scripts/**/*.mjs 2>/dev/null
grep -E '"(quality:|size-guard|test:|validate)' package.json
ls {{SPEC_DOC}} {{DATA_MODEL_DOC}} {{CATALOG_DOC}}
cat .husky/pre-commit
wc -l CLAUDE.md
```

Read at least one existing sibling in each folder before proposing a new file. Skimming the listing is not enough — open and read one real file. The cost of reading one sibling is one tool call; the cost of skipping it is a rework loop.

### Step 2 — Diff vs baseline

For each entry of `baseline.md` §1: present? lines? status OK / drift?

### Step 3 — Caps

File-size caps from `baseline.md` §4 exceeded → severity HIGH.

### Step 4 — Broken wires

- Hook in `.claude/hooks/` but not in `settings.json` → HIGH.
- Hook without explicit Apple Silicon `PATH` (per `~/.claude/skills/meta-govern/references/macos-hook-conventions.html`) → HIGH.
- Script without `package.json` wrapper → MEDIUM.
- Skill listed in baseline but absent from `CLAUDE.md` → MEDIUM.
- Rule with invalid `paths:` (constant, not a glob) → HIGH.
- Subagent never invoked → LOW.
- ALLOWLIST script ↔ rule exemption inconsistent → MEDIUM.

### Step 5 — Defensive scaffolding (Claude 4.7+/5-family anti-pattern)

```bash
grep -rEn -i 'double[- ]check|verify before returning|do not skip any step|please make sure to|always remember to|n.?oubli(?:e|er)|attention.{0,3}à' .claude/ CLAUDE.md
```

Matches → MEDIUM, propose deletion. Aggressive markers belong in **frontmatter only** (they boost activation). In bodies they create instruction-following loops on current Claude models (4.7+/5).

### Step 6 — Delta protocol

- Source-of-truth modified without a `docs(spec): apply delta` commit following → violation.
- Design without `## Source of truth delta` → violation.
- Plan without Task 1 = `Apply source-of-truth delta` → violation.

### Step 7 — Evolution suggestions

Measure LOC, FUNC IDs, presence of backend / CI / tests. Cross-reference with `~/.claude/skills/meta-govern/references/evolution-roadmap.html`. Propose 1–3 relevant additions NOW.

For each addition:

```
### Suggestion N — <addition>
Observed trigger: <indicator + threshold>
Type: skill | subagent | rule | hook
Delegation: see the meta-govern authoring canon (skill → skill-creator,
            subagent → create-subagent, rule/hook → manual edit per playbook)
Effort frontmatter (if subagent): low | medium | high | xhigh
CLAUDE.md / baseline.md edits: <line to add>
```

### Step 8 — Report

```markdown
# .claude/ governance audit — <date>

## Health summary

Skills: N/M | Rules: ... | Agents: ... | Hooks: ... (wired/non) | CLAUDE.md: P/120

## Drift findings

### HIGH | ### MEDIUM | ### LOW

## Claude 4.7+/5-family anti-patterns

...

## Delta protocol

Last spec mod: ... | Last apply: ... | Status: OK | violation

## Evolution proposal

Scale: <small | medium | large>

1. ...
2. ...
3. ...

## Diffs proposed (direct-edit only — rule, hook, CLAUDE.md, baseline)

1. ...
2. ...
```

### Step 9 — Application

Ask: `Apply 1, 2, 3? (y / numbers / n)`.

- New skill → invoke `Skill: skill-creator`.
- New subagent → invoke `Skill: create-subagent`.
- Edit rule / hook / `CLAUDE.md` / baseline → direct edit, then re-run inventory.

## Cross-references

- `references/baseline.md` — canonical inventory + caps (project-local).
- `~/.claude/skills/meta-govern/references/evolution-roadmap.html` — palier triggers + recommended additions.
- `~/.claude/skills/meta-govern/references/skill-canonical-structure.html` + `subagent-canonical-structure.html` + `hook-canonical-patterns.html` + `macos-hook-conventions.html` — rule / hook / skill / agent authoring + delegation.
- `~/.claude/skills/meta-govern/references/lessons-log.html` — failure modes journal.
- `skill-creator` skill — owns skill authoring (this skill never authors skills directly).
- `create-subagent` skill — owns agent authoring.
- `meta-govern` skill (user-level) — audits multiple projects + bumps the master baseline.

## Gotchas

- Modifying `.claude/` without explicit user confirmation. The audit reports; the user authorizes; only then the skill applies.
- Mass-deleting orphan skills. They may be slash-invokable. Verify with `grep -r "/skill-name"` before proposing deletion.
- Touching the source-of-truth docs (`{{SPEC_DOC}}`, `{{DATA_MODEL_DOC}}`, `{{CATALOG_DOC}}`). Those flow through the delta protocol only, never through this skill.
- Bloating `CLAUDE.md` because "the 1M context allows it". The cap exists because every loaded line steals from working budget.
- Suggesting all the roadmap evolutions at once. Limit to 1–3 NOW. Bigger sweeps fragment user attention and create half-shipped primitives.
- Authoring a new skill / agent inline. This skill delegates to `skill-creator` / `create-subagent`. Inline authoring drifts from the canonical structure and creates the failure modes journaled in `~/.claude/skills/meta-govern/references/lessons-log.html`.
- Caching code state in a document. Inventories rot silently with each rename. The right fix for "Claude forgot to grep" is to tighten the grep discipline in skills, not pre-compute the inventory.
- Placing compaction-recovery instructions inside skill files. Those are lost on compaction. Only `CLAUDE.md` (re-read from disk) and `SessionStart` hooks (matcher: `compact`) survive — `PostCompact` itself is side-effects-only and does not consume `additionalContext`.
