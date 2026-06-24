# Packaging ship-polished-ui + visual-qa-inspector as a plugin

If you want to ship the skill **and** its paired sub-agent as a single distributable unit (sharing across machines, with teammates, or via a marketplace), the right primitive is a **Claude Code plugin**. Plugins package skills, agents, hooks, slash commands, and MCP servers under a single `plugin.json` manifest.

This file documents the layout — you don't need to read it during normal use. Read it when you decide to publish.

## Why a plugin (instead of two separate user-scope files)

- **Atomic install / update.** One `plugin add` brings both pieces; one `plugin update` keeps them aligned.
- **Versioning.** A `plugin.json` carries a `version` so you can revise the agent and skill together without drift.
- **Discoverability.** Marketplaces (`claude-plugins-official`, custom internal ones) list plugins, not loose files.
- **No physical nesting required.** The plugin layout already co-locates `skills/` and `agents/` under one tree — that's the only directory structure where they sit side by side.

## Directory layout

```text
ship-polished-ui-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── ship-polished-ui/
│       ├── SKILL.md
│       └── references/
│           ├── visual-qa-checklist.md
│           ├── css-side-effects.md
│           ├── iframe-and-host-shells.md
│           ├── session-lessons-2026-05-04.md
│           ├── agent-dispatch.md
│           └── packaging-as-plugin.md   # this file
└── agents/
    └── visual-qa-inspector.md
```

## `plugin.json` manifest

```json
{
  "name": "ship-polished-ui",
  "version": "1.0.0",
  "description": "Premium UI craft skill + paired visual-qa-inspector sub-agent. Two-phase loop: design via frontend-design, then a non-negotiable browser-based visual QA pass.",
  "author": "your-handle",
  "license": "MIT",
  "skills": ["skills/ship-polished-ui"],
  "agents": ["agents/visual-qa-inspector.md"]
}
```

## Constraints to know about

Per the architecture research (section C.5), **plugin-shipped sub-agents cannot declare `hooks`, `mcpServers`, or `permissionMode`**. The current `visual-qa-inspector.md` declares none of those, so it ports cleanly. Keep it that way if you publish.

If you later decide the agent needs hooks (e.g. a hook that auto-screenshots on every PostToolUse), you'll need to keep the agent at user-scope (`~/.claude/agents/`) instead of inside the plugin. That's a deliberate trade-off Anthropic enforces to keep plugin installation safe.

## Migration steps from the current user-scope layout

1. Create `ship-polished-ui-plugin/` somewhere (e.g. a new git repo).
2. Move `~/.claude/skills/ship-polished-ui/` → `ship-polished-ui-plugin/skills/ship-polished-ui/`.
3. Move `~/.claude/agents/visual-qa-inspector.md` → `ship-polished-ui-plugin/agents/visual-qa-inspector.md`.
4. Add `.claude-plugin/plugin.json` with the manifest above.
5. Test locally: `claude plugin add ./ship-polished-ui-plugin` (path install).
6. Publish to a marketplace when ready.

After install, both the skill and the agent appear in their normal places — auto-trigger and `subagent_type: visual-qa-inspector` work unchanged. Users don't need to know the plugin layout exists.

## When NOT to package as a plugin

- You're the only user and you don't share machines. The user-scope layout (`~/.claude/skills/` + `~/.claude/agents/`) is simpler.
- You want hooks tied to the agent. Hooks aren't allowed on plugin sub-agents.
- You're still iterating heavily. Plugins encourage frozen versions; loose user-scope files are easier to edit in place.
