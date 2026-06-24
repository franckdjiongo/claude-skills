# Subagent frontmatter reference

The complete field list for `.claude/agents/<name>.md`. Only `name` and `description` are required. Everything else has sensible defaults.

## Required

### `name`
Lowercase letters and hyphens only. Must be unique within the scope it's installed in (project, user, or plugin). Higher-priority scopes shadow lower-priority ones with the same name.

### `description`
The single most important field — Claude uses *only* this string to decide whether to delegate to the agent. Keyword-dense and specific beats elegant. Mention concrete user phrases that should trigger the agent. Phrases like "use proactively" lean on automatic delegation; phrases like "use when" leave it to Claude's judgment.

Under-triggering is the most common failure mode. If the agent isn't getting picked up, the description is almost always the cause.

## Tool access

### `tools`
Allowlist. Comma-separated tool names: `Read, Grep, Glob, Bash, Edit, Write, WebFetch, WebSearch, mcp__server__tool, ...`. If omitted, the agent inherits all tools from the parent.

Use an allowlist when you want to fail safe — read-only agents, validators, reviewers. Use inheritance when the agent's job is implementation work and restricting tools would just create friction.

`Agent` and `Agent(subagent-name)` only matter when this agent runs as the *main* thread via `claude --agent`. Subagents cannot spawn other subagents, so listing `Agent` in a regular subagent's tools has no effect.

### `disallowedTools`
Denylist. Subtractive. Use this when "everything except X and Y" is easier to express than the corresponding allowlist. Resolved before `tools` if both are set.

## Model and reasoning

### `model`
`sonnet`, `opus`, `haiku`, a full model ID like `claude-opus-4-7`, or `inherit`. Default: `inherit`.

Use `haiku` when the work is genuinely simple and high-volume (fast retrieval, mechanical formatting). Use `sonnet` or `opus` when reasoning quality is the bottleneck. Inherit otherwise — most subagents should match the session model.

### `effort`
`low`, `medium`, `high`, `xhigh`, `max` — depends on the model. Default: inherits from the session.

Override only when the subagent's task is meaningfully harder or easier than the session default. Opus 4.7 recommends starting `high` for coding and agentic work.

### `maxTurns`
Hard cap on agentic turns before the subagent stops. Useful for bounded loops; not a substitute for good prompting.

## Permissions and isolation

### `permissionMode`
`default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`. Default: inherits from the session.

- `plan` — read-only exploration mode. Right for pure-research agents.
- `acceptEdits` — auto-accept file edits and common filesystem commands. Right for trusted implementers.
- `auto` — uses the auto-mode classifier. Inherited from parent if parent is in auto.
- `bypassPermissions` — skips all permission prompts. Use deliberately and warn the user.
- `dontAsk` — auto-deny. Niche.
- `default` — standard prompts.

Parent-mode precedence: if the parent is in `bypassPermissions`, `acceptEdits`, or `auto`, that overrides the child's setting.

### `isolation`
Set to `worktree` to give the agent a temporary git worktree — its own copy of the repo. Cleaned up automatically if no changes are made. Use this when the agent makes file changes that should stay quarantined until the user reviews.

### `background`
`true` to always run this subagent concurrently rather than blocking the main conversation. Default: `false`. Background agents pre-approve permissions before launch and auto-deny anything not pre-approved.

## Memory

### `memory`
`user`, `project`, or `local`. Enables a persistent directory the agent reads and writes across sessions:

- `user` → `~/.claude/agent-memory/<name>/` — knowledge generalizes across all projects.
- `project` → `.claude/agent-memory/<name>/` — knowledge is codebase-specific, shareable via VCS.
- `local` → `.claude/agent-memory-local/<name>/` — codebase-specific, *not* checked in.

When memory is enabled, Claude Code automatically:
- Includes memory instructions in the agent's system prompt.
- Includes the first ~200 lines (or 25KB) of `MEMORY.md`.
- Enables `Read`, `Write`, `Edit` so the agent can curate its own files.

`project` is usually the right default. Tell the agent in its body to read its memory before starting and update it when done — that's how the knowledge compounds.

## Skills and MCP

### `skills`
List of skill names to **preload** into the agent's context at startup. The full skill content is injected — not just made available for invocation. Subagents do not inherit skills from the parent; you must list them explicitly.

You cannot preload skills with `disable-model-invocation: true`.

### `mcpServers`
List of MCP servers to expose to this agent. Two forms:

```yaml
mcpServers:
  - playwright:                    # inline definition, scoped to this agent
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github                         # reference an already-configured server
```

Inline definitions connect when the agent starts and disconnect when it finishes. Useful for keeping MCP tool descriptions out of the parent conversation.

## Hooks

### `hooks`
Lifecycle hooks scoped to this agent. Most common:

- `PreToolUse` — runs before each tool call, can block via exit code 2.
- `PostToolUse` — runs after each tool call.
- `Stop` — runs when the agent finishes (becomes `SubagentStop` at runtime when invoked as a subagent).

Hook entries follow the standard Claude Code hooks format with `matcher` and `hooks: [{type, command}]`.

## Cosmetic

### `color`
`red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`. Display color in the task list.

### `initialPrompt`
Auto-submitted as the first user turn when the agent runs as the main session via `--agent` or the `agent` setting. Commands and skills are processed. Prepended to any user-provided prompt.

## Plugin agents — fields that are silently ignored

When an agent ships inside a plugin (in the plugin's `agents/` directory), the following fields are **ignored** at load time, for security:

- `hooks`
- `mcpServers`
- `permissionMode`

If the agent needs any of these, ship it at user or project scope (`~/.claude/agents/` or `.claude/agents/`) instead of in a plugin. Or document in the plugin README that consumers must add those rules manually after install — for example via `permissions.allow` in `settings.json`, which applies session-wide rather than per-agent.

## Loading semantics

- Subagents are loaded at session start. **If you edit a subagent file directly on disk, restart the session to pick up changes.**
- Subagents created or edited via `/agents` apply immediately.
- Subagent transcripts are stored separately from the main conversation, persist within the session, and are auto-cleaned per `cleanupPeriodDays` (default 30).
