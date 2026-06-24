# Claude Hook Reference

Use this file when designing or revising Claude Code hooks and when the user wants source-grounded rationale.

## Decision Boundary

- Use a hook when the behavior should happen deterministically at a lifecycle or tool boundary.
- Prefer `CLAUDE.md` when the rule should simply be present in context.
- Prefer a skill or subagent when the behavior requires judgment rather than fixed gating or automation.

## Scope And Placement

- `~/.claude/settings.json`: personal hooks across projects.
- `.claude/settings.json`: project-shared hooks that can be committed.
- `.claude/settings.local.json`: project-local private hooks.
- Subagent frontmatter: behavior that should exist only while that subagent runs.

Frontmatter hook nuance:

- Frontmatter hooks fire only when the agent runs as a subagent.
- They do not fire when the same agent runs as the main session agent via `--agent`.
- Project-level `SubagentStart` and `SubagentStop` hooks belong in settings.

## Event And Matcher Notes

High-value events:

- `PreToolUse`
- `PostToolUse`
- `PermissionRequest`
- `Notification`
- `SessionStart`
- `ConfigChange`
- `CwdChanged`
- `FileChanged`
- `SubagentStart`
- `SubagentStop`

Matcher notes:

- Tool events match tool names such as `Bash`, `Edit|Write`, or `mcp__github__.*`.
- `SessionStart` matches values like `startup`, `resume`, `clear`, or `compact`.
- `SubagentStart` and `SubagentStop` match agent types such as `Explore`, `Plan`, or custom names.
- `FileChanged` uses literal filenames separated by `|`; it is not regex in the watch-list sense.
- `if` filtering works only on tool events and uses permission-rule syntax such as `Bash(git *)`.

## Input And Output Rules

- Command hooks receive event JSON on stdin.
- Use stdout only for intentional context injection or structured JSON responses.
- Use stderr for human-readable diagnostics or block reasons.
- `exit 0`: allow the action to proceed. For `SessionStart` and `UserPromptSubmit`, stdout can add context.
- `exit 2`: block the action; stderr becomes feedback to Claude.
- Any other exit code: the action proceeds and the hook is treated as an error.
- If you need structured control, exit `0` and print JSON. Do not emit JSON and then exit `2`; the JSON is ignored.

## Structured Decision Notes

- `PreToolUse` can emit `hookSpecificOutput.permissionDecision` with `allow`, `deny`, or `ask`.
- `PermissionRequest` uses `hookSpecificOutput.decision.behavior`.
- Hook approvals do not override deny rules from Claude permissions or managed policy.
- Multiple matching hooks run in parallel and Claude applies the most restrictive result.

## Command Design Rules

- Keep commands deterministic and side-effect-aware.
- Prefer a separate script file for anything longer than a short one-liner.
- Use `jq` when parsing stdin JSON from shell.
- Quote `"$CLAUDE_PROJECT_DIR"` when calling project-relative scripts.
- Keep matchers narrow, especially on `PermissionRequest`.
- Avoid empty or `.*` permission matchers unless the user explicitly wants very broad automation and understands the risk.

## Common Patterns

- Format edited files with `PostToolUse` and `Edit|Write`.
- Block risky edits or commands with `PreToolUse`.
- Re-inject critical context after compaction with `SessionStart` plus `compact`.
- Reload environment on `CwdChanged` or `FileChanged`.
- Audit configuration changes with `ConfigChange`.
- Add user notifications with `Notification`.
- Attach setup or cleanup behavior to `SubagentStart` and `SubagentStop`.

## Local Companion Notes

If present on this machine, these companion files provide broader synthesis from the same research pass:

- `/Users/elmabi/Downloads/claude-code-subagents-research.md`
- `/Users/elmabi/Downloads/claude-code-subagents-source-map.md`

Treat the official URLs below as authoritative if any wording differs.

## Official Sources

- Hooks guide: https://code.claude.com/docs/en/hooks-guide
- Subagents docs: https://code.claude.com/docs/en/sub-agents
- Permissions: https://code.claude.com/docs/en/permissions
- Tools reference: https://code.claude.com/docs/en/tools-reference
- Context window: https://code.claude.com/docs/en/context-window
- Agent teams: https://code.claude.com/docs/en/agent-teams
- Claude blog: https://claude.com/blog/subagents-in-claude-code
