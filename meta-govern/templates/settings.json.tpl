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
      },
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/postcompact-reinject.mjs\""
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/bash-write-guard.mjs\"",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/block-docs-markdown.mjs\"",
            "timeout": 5
          }{{IF_PALIER_GTE_2}},
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/plan-closeout-guard.mjs\"",
            "timeout": 5
          }{{/IF}}
        ]
      }{{IF_PALIER_GTE_3}},
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/agent-dispatch-preflight.mjs\"",
            "timeout": 5
          }
        ]
      }{{/IF}}
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
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/docs-index-refresh.mjs\"",
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
    ]
  }
}
