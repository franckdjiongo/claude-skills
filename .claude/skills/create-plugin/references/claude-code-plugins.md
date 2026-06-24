# Claude Code plugin spec

Read when building/fixing the Claude Code side of a plugin.

- [Layout & discovery](#layout--discovery)
- [plugin.json](#pluginjson)
- [Components](#components)
- [Path variables](#path-variables)
- [Marketplace catalog](#marketplace-catalog)
- [Install / manage commands](#install--manage-commands)
- [Gotchas](#gotchas)

## Layout & discovery

A plugin is a self-contained directory. `.claude-plugin/` holds `plugin.json`
(and `marketplace.json` if the repo is also a marketplace). **Every other
component dir lives at the plugin root, NOT inside `.claude-plugin/`.**

```
my-plugin/
├── .claude-plugin/plugin.json     # manifest (required)
├── skills/<name>/SKILL.md         # skills (auto-discovered)
├── agents/*.md                    # subagents (auto-discovered)
├── commands/*.md                  # slash commands
├── hooks/hooks.json               # event hooks
├── .mcp.json                      # MCP servers
├── .lsp.json                      # LSP servers
└── monitors/monitors.json         # monitors (experimental)
```

These default folders are auto-scanned; you only add manifest keys to override
defaults or add extra paths.

## plugin.json

Required: `name`. Recommended: `version`, `description`, `displayName`,
`author{name,url}`, `homepage`, `repository`, `license`, `keywords`.

Optional component path keys (all paths relative to plugin root, start with `./`):
- **`skills`** — *adds to* the default `skills/` scan (default always scanned).
- **`commands`, `agents`, `outputStyles`** — *replace* the default folder scan.
- **`hooks`, `mcpServers`, `lsp`** — own merge rules; can be inline or a path.

If a plugin has both a default folder and the matching manifest key, recent
Claude Code flags the ignored folder in `/doctor` and the `/plugin` detail view.

## Components

- **Skills** — `skills/<name>/SKILL.md` (+ optional `references/`, `assets/`,
  `scripts/`). Frontmatter `name` sets the invocation name → stable across
  updates. A lone `SKILL.md` at the plugin root *loads* but the Desktop panel
  does **not** list it — always use `skills/<name>/`.
- **Agents** — `agents/*.md`. Frontmatter: `name`, `description`, `model`,
  `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`,
  `background`, `isolation` (only `"worktree"`). **Plugin agents CANNOT declare
  `hooks`, `mcpServers`, or `permissionMode`.** Appear in `/agents`.
- **Commands** — `commands/*.md`, plain markdown; `$ARGUMENTS` placeholder.
  Invoked as `/<plugin-name>:<command>`.
- **Hooks** — `hooks/hooks.json` (or inline in plugin.json). Event matchers →
  actions. Types: `command`, `http`, `mcp_tool`, `prompt`, `agent`. Use
  `${CLAUDE_PLUGIN_ROOT}` for bundled script paths.
- **MCP servers** — `.mcp.json` (or inline). Standard MCP config; start
  automatically when the plugin is enabled.
- **LSP servers** — `.lsp.json`. Real-time diagnostics + code navigation.
- **Monitors** — `monitors/monitors.json` (experimental).

## Path variables

Substituted **inline anywhere they appear in skill content, agent content, and
hook/monitor/MCP/LSP commands**:
- **`${CLAUDE_PLUGIN_ROOT}`** — absolute path to the plugin's install dir. Use
  it to reference bundled files across component dirs (e.g. an agent reading the
  skill's `references/`: `${CLAUDE_PLUGIN_ROOT}/skills/<name>/references/x.md`).
  Path changes on update.
- **`${CLAUDE_PLUGIN_DATA}`** — persistent state dir that survives updates.
- **`${CLAUDE_PROJECT_DIR}`** — the project root.

Installed plugins **cannot reference files outside their directory** (`../shared`
won't work — external files aren't copied into the cache).

## Marketplace catalog

A marketplace repo has `.claude-plugin/marketplace.json` at its root:
```json
{
  "name": "claude-skills",
  "owner": { "name": "...", "url": "..." },
  "plugins": [
    { "name": "my-plugin", "source": "./my-plugin", "description": "...",
      "version": "0.1.0", "author": { "name": "..." } }
  ]
}
```

## Install / manage commands

```bash
/plugin marketplace add owner/repo      # GitHub shorthand (also git URL / local path)
/plugin install my-plugin@claude-skills # install (user scope by default)
/reload-plugins                         # activate without restart
```
Skills are namespaced: `/my-plugin:my-skill`. Manage with `/plugin list`,
`/plugin disable|enable|uninstall name@marketplace`, `/plugin marketplace update`.

## Gotchas

- **Root SKILL.md invisible in the Desktop panel** — use `skills/<name>/`.
- **Marketplace installs pull from GitHub**, not your working copy — push, then
  Update/reinstall.
- **Skills not appearing after reinstall?** `rm -rf ~/.claude/plugins/cache`,
  restart, reinstall.
