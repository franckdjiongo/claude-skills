# Skill design rules (R1 to R12)

Standard for every skill in this repo and on this machine. Source: skills portfolio audit of 2026-10-04, section 11, approved by Franck. Agent-facing: the reader is an agent writing or reviewing a skill, so this file stays in Markdown.

Check the machine-checkable rules with `node scripts/lint-skills.mjs` (exit 0 clean, exit 1 on any error). Rules R1, R6, R7, R9, R10 and R11 are covered by the script, the others are review rules.

| Rule | Statement | Checked by |
|---|---|---|
| R1 | A SKILL.md has at most 150 lines and 1,800 words. Exceptions are listed by name in `scripts/lint-skills.allowlist.json`: `session-review` (193 lines) and `power-platform-architect` (236 lines), because their scripts and schemas carry the procedure. | `lint-skills` (R1-LINES, R1-WORDS) |
| R2 | Scripts own the procedure. SKILL.md holds routing, the non-negotiables and what needs judgment. The model is `power-platform-architect`: a router over schemas and scripts. | review |
| R3 | At load, a script prints the current state and names the next file to read (the `brief-preflight` pattern). | review |
| R4 | A success claim comes from an exit code or a verdict file, never from the agent's words. A skip is stated and is never a pass. | review |
| R5 | Every documented guard is wired and has a test you can replay. | review |
| R6 | One source per skill. Mirrors are generated or linked and checked in CI. Never find-and-replace runtime names. | `lint-skills` (CODEX-PATH, SCRIPT-DIFF, RUNTIME-ONE-SIDE) |
| R7 | A description has at most 300 characters. The skill catalogue was truncated once, on 2026-08-14. | `lint-skills` (R7-DESC) |
| R8 | Fix by removing text before adding text. A failing test beats a longer prompt. | review |
| R9 | Each skill names its owner repo, its runtimes and a last-review date (frontmatter keys `owner`, `runtimes`, `last-review`, top level or under `metadata`). Zero use for 90 days on both runtimes triggers a switch-off review. No dated model names. | `lint-skills` (R9-OWNER and MODEL-PIN, warnings only) |
| R10 | An agent that preloads a skill fails loudly if that skill is missing. | review |
| R11 | The parity and lint script checks the items listed below. | `lint-skills` |
| R12 | Catalogs are generated, not hand-edited. The sync script appends new skills to `CLAUDE.md` and `AGENTS.md` and also removes the lines of skills that no longer exist. Generate the catalog block from each skill's R9 fields, so one switch-off is one edit. | `scripts/sync-local-skills.py` (removal), `lint-skills` (CAT-MISSING, CAT-DISABLED) |

Tests: `node --test scripts/lint-skills.test.mjs` and `python3 scripts/sync-local-skills.prune.test.py`.

## R11: what `scripts/lint-skills.mjs` checks

| Code | Severity | Meaning |
|---|---|---|
| CAT-MISSING | error | A skill named in a catalog does not exist. Catalogs: this repo's `CLAUDE.md` and `AGENTS.md`, `~/.claude/agents/machine-architecte.md`, and every project `CLAUDE.md` under `~/Desktop/my-projets` (the repos on the hard-exclusion list are never read). |
| CAT-DISABLED | error | A skill named in a catalog is switched off in `~/.claude/settings.json` `skillOverrides`, or its plugin is disabled. |
| CODEX-PATH | error | A `.Codex/` path (capital C) survives in a skill or catalog. It is the signature of a blind runtime find-and-replace. |
| RUNTIME-ONE-SIDE | error | A skill exists on one runtime only (`~/.claude/skills` or `~/.agents/skills`) and `scripts/lint-skills.allowlist.json` states no reason. |
| SCRIPT-DIFF | error | A skill's `scripts/` differ between the two runtimes. Test files (`*.test.[cm]?[jt]s`) are ignored, because the Codex variant never ships them. A hand-written Codex variant is accepted when `scripts/install-skills.skip.json` states a reason under `codex:<skill>`. |
| R1-LINES, R1-WORDS | error | SKILL.md is over 150 lines or 1,800 words and is not a named exception. |
| R7-DESC | error | The frontmatter description is over 300 characters. |
| REF-MISSING | error | SKILL.md references a file (`references/...`, `scripts/...`, a relative link) that does not exist. |
| R9-OWNER | warning | A frontmatter owner, runtimes or last-review field is missing. |
| MODEL-PIN | warning | SKILL.md or a text file under `references/` names a dated model release (Opus 4.7, claude-sonnet-4-6…). Name the alias (opus, sonnet, haiku) instead. A line carrying `model-routing:allow` is exempt. |
| DORMANT | info | A skill is dormant: switched off in `skillOverrides` and either disabled in `~/.codex/config.toml` (`[[skills.config]]`, `enabled = false`) or without a Codex user-scope copy. It is reported once and skipped for R1, R7, REF-MISSING and CODEX-PATH. A skill that is off on Claude but still loads on Codex is not dormant. Info lines never change the exit code. |

Intentional exceptions live in `scripts/lint-skills.allowlist.json`, each with a written reason. An entry without a reason is itself an error.

## Writing rules for this file

No dated model names. Refer to a role or a resolution mechanism instead.
