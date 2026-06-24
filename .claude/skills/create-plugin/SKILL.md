---
name: create-plugin
description: >-
  Create or package an installable Claude Code + Codex plugin in this
  claude-skills repo. Use whenever the user wants to make a new plugin, turn an
  existing skill/agent/MCP/hook/command into a distributable plugin, "package as
  a plugin", "create a plugin for X", scaffold a plugin, add a plugin to the
  marketplace, or fix a plugin that isn't loading (skill not showing, agents
  only, Codex not finding it). Handles all component types both runtimes
  support — skills, agents, hooks, MCP servers, slash commands, LSP (Claude
  Code) and skills, MCP servers, apps, hooks (Codex) — the canonical nested
  skills directory layout, both manifests, the plugin-root path variable for
  cross-references,
  both marketplace catalogs, a README, the repo's registry/app bookkeeping, and
  validation. Triggers: create plugin, new plugin, package plugin, plugin
  marketplace, plugin not loading.
---

# Create Plugin

Scaffold, wire, register, and validate an installable plugin that works in
**both Claude Code and Codex** from one source tree. Use the scripts for the
deterministic parts; use the references for the per-runtime spec.

## When NOT to use
- Authoring the SKILL.md *content* → that's `skill-creator`.
- Authoring an agent's *content* → that's `create-subagent`.
- A throwaway/project-local skill that won't be distributed → just put it in
  `.claude/skills/` and skip everything here (it is not a plugin).

## Component support at a glance

| Component | Claude Code | Codex | Where it lives |
|---|---|---|---|
| Skill | ✅ | ✅ | `skills/<name>/SKILL.md` |
| Agents / subagents | ✅ plugin agents | ❌ (standalone TOML only) | `agents/*.md` |
| MCP servers | ✅ | ✅ | `.mcp.json` |
| Hooks | ✅ | ✅ | `hooks/hooks.json` |
| Slash commands | ✅ | ⚠️ verify | `commands/*.md` |
| Apps / connectors | ❌ | ✅ | `.app.json` |
| LSP servers | ✅ | ❌ | `.lsp.json` |

The skill is the portable core (one `skills/<name>/SKILL.md` serves both).
Agents are Claude-Code-only — in Codex the skill covers the work inline. Detail:
read [references/claude-code-plugins.md](references/claude-code-plugins.md) and
[references/codex-plugins.md](references/codex-plugins.md).

## Workflow

### 1. Intake
Confirm: plugin **name** (kebab-case), one-line **description**, **author**,
**category**, and **which components** it ships (see the matrix). If packaging
something that already exists, note where that content currently is.

### 2. Scaffold
Run the scaffolder — it creates the dir, both manifests, requested component
stubs, a README, and registers the plugin in both marketplace catalogs
(idempotent):
```bash
python3 .claude/skills/create-plugin/scripts/scaffold_plugin.py <name> \
  --description "..." --category "..." --components skill,agents,mcp,hooks,commands
```
Default `--components` is `skill`. Run from the repo root. Use `--help` for all
options (`--display-name`, `--author`, `--keywords`, `--repo-url`, `--force`).

### 3. Fill the content
- **Skill**: write `skills/<name>/SKILL.md` (invoke `skill-creator` for the
  body). Reference its own bundled files with relative `references/…` paths.
- **Agents**: write `agents/*.md` (invoke `create-subagent`). To read the
  skill's bundled files from an agent, you MUST anchor with
  `${CLAUDE_PLUGIN_ROOT}/skills/<name>/references/…` — relative paths do not
  resolve across the `agents/` ↔ `skills/` boundary. Likewise the SKILL.md
  references agents via `${CLAUDE_PLUGIN_ROOT}/agents/…`.
- **MCP / hooks / commands**: fill `.mcp.json`, `hooks/hooks.json`,
  `commands/*.md`. Use `${CLAUDE_PLUGIN_ROOT}` for bundled script paths.
- If packaging existing content, `git mv` it into place so history is preserved.

### 4. Repo bookkeeping
If the plugin ships a distributable library skill, update
`skills-registry.yaml`, `skills-app/src/data/skills.ts`, and `CLAUDE.md` — see
[references/repo-conventions.md](references/repo-conventions.md). (Project-local
`.claude/skills/` skills are exempt.)

### 5. Validate (gate)
```bash
python3 .claude/skills/create-plugin/scripts/validate_plugin.py <name>
```
Fix every `FAIL`; review `WARN`s (the "Codex can't bundle agents" warning is
expected and fine). Require a clean run before committing.

### 6. Ship
Commit/push only when asked. Marketplace installs pull from GitHub, so after
pushing the user must Update/reinstall in each host (`/reload-plugins` in Claude
Code; `/plugins` browser or "Add to Codex" in Codex). If a skill still doesn't
appear: `rm -rf ~/.claude/plugins/cache`, restart, reinstall.

## Scripts
- `scripts/scaffold_plugin.py` — generate the plugin skeleton + manifests +
  marketplace entries (deterministic).
- `scripts/validate_plugin.py` — check layout, manifests, `${CLAUDE_PLUGIN_ROOT}`
  cross-refs, and registration in every catalog. Exit 1 on FAIL.
