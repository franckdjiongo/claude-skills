{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "_meta": {
    "scaffoldedBy": "meta-govern",
    "version": "{{META_GOVERN_VERSION}}",
    "scaffoldedAt": "{{SCAFFOLD_DATE}}"
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/session-start-env-check.mjs\""
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/block-docs-markdown.mjs",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/track-workflow.mjs\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/enforce-workflow.mjs\""
          },
          {
            "type": "command",
            "command": "node .claude/hooks/docs-index-refresh.mjs",
            "timeout": 10
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/precompact-handoff.mjs\""
          }
        ]
      }
    ],
    "PostCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/postcompact-reinject.mjs\""
          }
        ]
      }
    ]
  }
}
