<!--
Template variables (substituted at BOOTSTRAP):
{{PROJECT_NAME}}      — Human-readable project name
{{PROJECT_SLUG}}      — kebab-case slug
{{PACKAGE_MANAGER}}   — bun | npm | pnpm
{{TEST_FRAMEWORK}}    — Vitest 4 | Jest | etc.
{{SPEC_DOC}}          — Path to functional spec
{{IF_STACK_HAS_UI}}…{{/IF}}    — Conditional for UI checks (i18n, colors, container.querySelector)
-->
---
name: quality-gate
description: |
  Full code quality audit for the {{PROJECT_NAME}} codebase. Combines a deterministic
  multi-check script (hardcoded hex/rgba colors, file size > 300 lines, `any` types,
  console.log, secret patterns, direct `fetch()` in components, snapshot tests,
  container.querySelector, useEffect + setState heuristic, TODO markers,
  project-specific anti-patterns — plus an i18n-bypass check when the project has an
  i18n layer) with a short architectural review (duplication, prop drilling, missing
  tests, spec alignment).
  Use whenever the user says or implies: audit, quality gate, quality check, code
  review, pre-merge audit, FINAL SCAN, scan complet, audit qualité, contrôle qualité,
  vérifier le code, lint complet, "is this code clean", "any issues before I merge",
  "audit pré-commit", "before we ship", or after a large refactor / before opening
  a PR. ALSO use proactively at the end of an `/execute-plan` FINAL SCAN phase, even
  if the user didn't explicitly ask. Distinct from `{{PACKAGE_MANAGER}} run validate`
  (quality + size-guard + docs guards + typecheck + tests) — this catches what
  ESLint cannot: i18n bypass, leaked secrets, architectural smells.
when_to_use: |
  Before a merge / PR; at the end of a FINAL SCAN; on demand for a sanity check;
  whenever you suspect drift (recurring i18n hardcoding, files growing past budget,
  forgotten console.log). Always foreground (output is consumed in context).
allowed-tools: Read, Grep, Glob, Bash
---

# quality-gate

Quality audit combining a **deterministic script** with a **short architectural review**.

## When to invoke

- At the end of a FINAL SCAN of a plan (before the `docs(spec): apply delta` commit).
- Before a merge or PR.
- On demand (`/quality-gate`).
- When you suspect drift (i18n hardcoded that returns, files growing, forgotten console.log).

## Workflow

### Step 1 — Choose the scope

Ask the user (or decide from context):

| Scope            | When                                                             |
| ---------------- | ---------------------------------------------------------------- |
| `--scope all`    | Full audit (default, FINAL SCAN, before merge)                   |
| `--scope staged` | Fast pre-commit on staged files                                  |
| `--check <id>`   | Target a single check (e.g., `--check colors-hex` after refactor) |

### Step 2 — Run the deterministic script

```bash
{{PACKAGE_MANAGER}} run quality:check
# or directly:
node .claude/scripts/quality-checks/index.mjs --scope all --json
```

The script returns JSON:

```json
{
  "scope": "all",
  "failLevel": "HIGH",
  "checksRun": ["colors-hex", "colors-rgba", {{IF_STACK_HAS_I18N}}"i18n-ternary", {{/IF}}"file-size", "ts-any", "console", "todo", "secrets", "direct-fetch", "snapshot", "container-query", "effect-setstate"],
  "fileCount": 42,
  "findings": [
    { "id": "colors-hex", "severity": "CRITICAL", "file": "...", "line": 12, "message": "..." }
  ]
}
```

### Step 3 — Read the findings

Group by severity:

{{IF_STACK_HAS_UI}}- **CRITICAL** (exit 2): hardcoded hex/rgba colour, committed secret, snapshot test, container.querySelector (plus the i18n ternary check when the project has an i18n layer).
- **HIGH** (exit 1): file > 300 lines, `any` type, direct `fetch()` in UI.
- **MEDIUM**: file-size warning 250+, console.log.
- **LOW**: TODO markers, useEffect+setState heuristic.{{/IF}}

For non-UI stacks the colour / DOM-query checks are skipped; CRITICAL is reserved for committed secrets and project-specific anti-patterns.

### Step 4 — Architectural review (beyond the script)

The script doesn't see everything. Do a short read of:

1. **`git diff` recent**: uncommitted changes. Look for:
   - Duplicated logic (3+ near-identical blocks not extracted).
   - Props threaded through 3+ levels (signal: needs Context or composition).
   - Components mixing fetch + UI + state (should split: hook + UI).
   - Business validations only in frontend (should also live in backend).

2. **Spec alignment**: if the session just modified UI / pages, verify the corresponding FUNC-XX exist in `{{SPEC_DOC}}` and the behaviour matches.

3. **Tests**: for each newly created or heavily modified component, is there a `*.test.{{TEST_FRAMEWORK}}` file? If not, that's a gap (not blocking, but flag it).

### Step 5 — Combined report

Produce a structured markdown report:

```markdown
# Quality Gate Report — <date>

## Scope
- <all | staged>
- <fileCount> files scanned

## Score
- CRITICAL: <N>
- HIGH: <N>
- MEDIUM: <N>
- LOW: <N>
- Exit code: <0/1/2>

## Findings (deterministic)
<table: severity | id | file:line | message>

## Architectural review
- <observation 1>
- <observation 2>

## Proposed disposition
- CRITICAL: fix now (list each finding + fix suggestion)
- HIGH: fix or defer (if defer, create DEFERRED-XXX in docs/backlog-deferred.html)
- MEDIUM/LOW: note, fix if quick win

## Action
- [ ] Fix the <N> CRITICAL
- [ ] Decide HIGH (fix / defer)
- [ ] Re-run `/quality-gate --scope staged` after the fixes
```

### Step 6 — Disposition

For every CRITICAL / HIGH finding, require an explicit disposition before marking the session done:

- **Fixed**: commit ref that addresses the finding.
- **Deferred**: `DEFERRED-XXX` entry in `docs/backlog-deferred.html` with severity, reason, proposed action.

No finding silently ignored.

## Usage rules

1. **Always foreground.** Never `run_in_background: true` (the script can produce a lot of output to parse in context).
2. **The script is non-negotiable.** If it flags CRITICAL, you fix or defer — never disable a check without a documented reason.
3. **Architectural review is complementary** — don't skip it even if the script is clean. The script catches mechanical patterns; the review catches logical ones.
4. **No fixing in this skill.** Quality-gate produces the report. Fixes go through `/execute-plan` or direct edits by the orchestrator, not in this skill.

## CLI alternatives

For non-skill usage:

```bash
# Full audit (default fail-level = HIGH)
{{PACKAGE_MANAGER}} run quality:check

# Staged only
{{PACKAGE_MANAGER}} run quality:check:staged

# Fail only on CRITICAL
node .claude/scripts/quality-checks/index.mjs --fail-level critical

# Single check
node .claude/scripts/quality-checks/index.mjs --check colors-hex
```

## Cross-references

- `.claude/scripts/quality-checks/checks/` — per-check source (id, severity, regex, match rationale) lives in each `checks/*.mjs`; `.claude/scripts/quality-checks/index.mjs` is the runner and the place to register a new check.
- `execute-plan` skill — invokes this skill at FINAL SCAN.
- `govern-claude` skill — audits whether this skill itself is wired correctly (script exists, package.json wrapper, etc.).
- `docs/backlog-deferred.html` — destination for deferred findings.

## Gotchas

- Running this skill in background. The script's JSON output is meant to be parsed in context. Background = lost output = silent pass.
- Disabling a check because it's "noisy". The check exists because someone burned a debugging cycle on the pattern. Document the suppression in the catalogue or fix the source.
- Skipping the architectural review because the script is clean. Mechanical patterns ≠ logical patterns. Duplication-of-three rarely shows up in regex.
- Fixing findings inside this skill. The skill produces the report; fixes flow through `/execute-plan` so they're tier-classified, reviewed, and committed properly.
- Treating "deferred to backlog" as enough. The DEFERRED-XXX line must actually land in `docs/backlog-deferred.html` — saying it without writing it is the documented failure mode.
