---
name: meta-govern
description: Audit one project's Claude Code setup against the user's standards ("audit this project", "govern this project", "check drift", "/meta-govern"), or report which projects are behind ("which projects are behind", "projects out of date"). Includes Convex cost checks.
---

# meta-govern

Governance for Claude Code projects, reduced to two commands. Scripts own the procedure. This file holds routing, the non-negotiables, and what needs judgment.

| User says | Command |
|---|---|
| "audit this project", "check drift", "healthcheck", "what's missing in my .claude" | AUDIT |
| "which projects are behind", "projects out of date", "what needs an audit" | BEHIND |

Bootstrap, migrate, evolve meta-govern itself and advise are not commands. They are maintainer procedures in `references/maintainer-modes.html`. When the user asks for one, say so, then ask whether to proceed. When the request fits neither command and no maintainer procedure, ask with `AskUserQuestion`.

Before AUDIT, consult the Second Brain (`search`/`fetch` MCP tools, or the `second-brain` CLI) for lessons, decisions and frictions filed against the project slug. Build on them.

## AUDIT: one project

1. Run `node ~/.claude/skills/meta-govern/scripts/audit-project.mjs <project-path> --json`. It is read-only. Exit 0 clean, 1 findings, 2 error. It checks inventory, size budgets, hook and skill wiring, docs-html drift, model-version pins, DDD and Claude Code anti-patterns, and the Convex cost checks below.
2. Judge what the script cannot see, with `references/audit-procedure.html`: whether CLAUDE.md still points at the canonical docs, defensive scaffolding in standing context (`references/anti-pattern-catalog.html`), and the palier (`references/evolution-roadmap.html`).
3. Write the report to `docs/audits/YYYY-MM-DD-meta-govern-audit.html` (`node .claude/scripts/docs-html/scaffold.mjs audit <path> "<Title>"`). Severity-tiered findings with proposed diffs. Never auto-apply.
4. When the user accepts the audit, record it: rerun the script with `--stamp`. That writes `lastAudit`, `lastAuditVersion` and `auditChecks` into the project's `.claude/.meta-govern.json` and nothing else. Then dispatch `coherence-validator` with `mode_run: AUDIT` to confirm the state file and cross-references are consistent.

### Convex cost checks

For every Convex project the audit enforces the frugality contract (`references/stack-convex.html#frugality-contract`). A usage-billed backend bills each unjustified cron and each test loop against a deployment (workstation quota incident, 2026-06-19).

- `convex-frugality` MEDIUM: a cron in `convex/crons.ts` without a `// cost-justified` marker.
- `convex-frugality` HIGH: a test file that touches a real deployment (`ConvexHttpClient`, or a real `*.convex.cloud` / `*.convex.site` URL with `fetch`) without `convex-test`.
- `convex-mutation-casts` HIGH: a type cast on mutation arguments.

A stamped audit of a Convex project records `convex-frugality` in `auditChecks`. BEHIND reads that record.

## BEHIND: which projects are behind

Run `node ~/.claude/skills/meta-govern/scripts/projects-behind.mjs [--root <dir>] [--exclude <name>]... [--json] [<project-path>...]`. Default root `~/Desktop/my-projets`. It reads each `<project>/.claude/.meta-govern.json`, read-only, and flags a project for any of these reasons:

- `version-behind`: `metaGovernVersion` is older than this skill's `version.json`.
- `never-audited`: `lastAudit` is empty.
- `audit-stale`: `lastAudit` is more than 28 days old (`parked` projects are exempt).
- `convex-cost-checks-missing`: a Convex project with no evidence the cost checks ran, meaning no `convex-frugality` in `auditChecks` and none in its `docs/audits/`. This catches Convex projects audited before the checks existed (v1.7.1, 2026-07-02) or never stamped.

Present the table, worst first, with one next action per flagged project: AUDIT it, then stamp. Do not audit projects unprompted. Honor every `--exclude` and every project the user puts off limits: do not read or touch it.

## Sub-agents

Two leaf workers in `agents/`, symlinked into `~/.claude/agents/` by `node ~/.claude/skills/meta-govern/scripts/install-agent-symlinks.mjs` (`--check` verifies, `--repair` fixes). Sub-agents never spawn sub-agents.

| Sub-agent | Model / effort | Used for |
|---|---|---|
| `coherence-validator` | opus / xhigh | Final check of any run that wrote state |
| `evolution-orchestrator` | opus / xhigh | Maintainer procedures: migrate and evolve |

When a step names a sub-agent, dispatch it through the Agent tool with a self-contained prompt. Do not synthesize its role inline.

## Non-negotiables

- Show diffs before modifying a project's `.claude/`. Never auto-commit. The user always commits.
- Ground every claim in a file or script output. Never invent skills, agents or hooks the user has not approved.
- Critical project rules belong in hooks. Skill auto-invocation is not reliable enough. Principles in `references/canon-principles.html`.
- Keep defensive scaffolding language out of skill bodies, CLAUDE.md and rules (`references/anti-pattern-catalog.html`). Aggressive markers belong in frontmatter descriptions only.
- Do not modify `~/.claude/settings.json` or `~/.claude/CLAUDE.md` without explicit approval.
- Stay in the governance lane. Hand authoring to the specialists below.

| User intent | Skill |
|---|---|
| Author one skill | `skill-creator` |
| Author one subagent | Write it from `references/subagent-canonical-structure.html` |
| Session retrospective | `session-review` |
| DDD decision | `domain-driven-design` |
| Revise one CLAUDE.md | `claude-md-improver` (plugin) |
| Audit one project's `.claude/` at project level | `govern-claude` |
| Autonomous-execution work plan | `brief-chantier` |

## References

Load on demand, never preload. They are HTML: unescape `&lt;` and `&amp;` inside `<pre><code>` before reusing code.

| Reference | Load when |
|---|---|
| `audit-procedure.html` | AUDIT report structure, BEHIND rules |
| `canon-principles.html` | Judging a finding against the 13 principles |
| `maintainer-modes.html` | Bootstrap, migrate, evolve, advise |
| `anti-pattern-catalog.html`, `baseline.html` | AUDIT drift and per-project baseline |
| `stack-convex.html` and the other `stack-*.html` | The matching stack |
| `evolution-roadmap.html`, `governance-cadence.html` | Palier and cadence |
| `lessons-log.html` | Maintainer: append-only journal |

## Output

End every run with this block.

```
## meta-govern run: <AUDIT|BEHIND> @ <project or root>
- Version: <meta-govern semver>
- Files changed: <count> (or "0, read-only")
- Key findings: <bullets, severity-tagged>
- Next steps: <ordered checklist for the user>
- Suggested commit message (if any changes): <one line>
```
