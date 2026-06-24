# Codex (OpenAI) plugin spec

Read when building/fixing the Codex side of a plugin. Codex and Claude Code
**share the `skills/<name>/SKILL.md` layout**, so one physical skill serves both.

- [Manifest & components](#manifest--components)
- [Skills](#skills)
- [Agents are NOT a plugin component](#agents-are-not-a-plugin-component)
- [Marketplace catalog](#marketplace-catalog)
- [Install / manage commands](#install--manage-commands)

> Codex evolves fast. Verify field names against the live docs before relying on
> anything beyond skills: <https://developers.openai.com/codex/plugins/build>,
> <https://developers.openai.com/codex/subagents>.

## Manifest & components

The only required file is `.codex-plugin/plugin.json`. A Codex plugin can bundle:

| Component | Manifest pointer | Notes |
|---|---|---|
| **Skills** | `"skills": "./skills/"` | container dir; finds `skills/<name>/SKILL.md` |
| **MCP servers** | `"mcpServers": "./.mcp.json"` | standard MCP config |
| **Apps / connectors** | `"apps": "./.app.json"` | app/connector integrations |
| **Hooks** | `"hooks": "./hooks/"` | lifecycle hooks |

There is **no `agents` key** (see below). Common extra fields:
```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "...",
  "skills": "./skills/",
  "interface": {
    "displayName": "My Plugin",
    "shortDescription": "...",
    "longDescription": "...",
    "category": "Design"
  }
}
```
Codex reads the `interface` block for the marketplace/detail UI (e.g. `category`
shows up in the plugin detail page). The detail view shows metadata + "Try in
chat" — it does NOT list components, so a missing "Skills" section there is
normal, not a bug.

## Skills

`"skills"` points at the **container** directory (`./skills/`), and Codex finds
each skill at `skills/<name>/SKILL.md` — identical to Claude Code. Do **not**
point it at an individual skill folder.

## Agents are NOT a plugin component

Codex plugins cannot ship agents. Codex **subagents are standalone TOML files**
in `~/.codex/agents/` (personal) or `.codex/agents/` (project):
```toml
name = "reviewer"
description = "PR reviewer focused on correctness, security, missing tests."
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Review like an owner. Prioritize correctness, security, regressions, coverage.
"""
nickname_candidates = ["Atlas", "Delta"]
```
Required fields: `name`, `description`, `developer_instructions`. Optional:
`model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`,
`skills.config`, `nickname_candidates`.

So a plugin's `agents/*.md` load in **Claude Code only**. In Codex the skill
router covers the modes inline — you lose nothing. (Known issue mid-2026:
*project-scoped* `.codex/agents/` are advertised but may fail to spawn → prefer
the personal `~/.codex/agents/` location for hand-authored agents.)

The `agents/openai.yaml` seen in some plugins is not a documented Codex plugin
component — don't rely on it; the scaffolder does not generate it.

## Marketplace catalog

Codex reads `.agents/plugins/marketplace.json` at the repo root:
```json
{
  "name": "claude-skills",
  "interface": { "displayName": "Franck Djiongo Skills" },
  "plugins": [
    { "name": "my-plugin",
      "source": { "source": "local", "path": "./my-plugin" },
      "policy": { "installation": "AVAILABLE" },
      "category": "Design" }
  ]
}
```
`source` can also be `{"source":"github","path":"..."}`.

## Install / manage commands

```bash
codex plugin marketplace add owner/repo     # GitHub shorthand (also git URL / local)
codex plugin marketplace list | upgrade | remove <name>
```
There is **no `codex plugin install` command** — after adding the marketplace,
install from the interactive `/plugins` browser (run `codex`, open `/plugins`,
pick the source, open the plugin, install), or in the Codex App/IDE choose
**Add to Codex**.
