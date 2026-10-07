# WorkOS CLI in coding-agent sessions

Read when you run or suggest `workos` CLI commands from a coding-agent or sandbox session.

The CLI resolves two independent axes: **interaction mode** (`human`/`agent`/`ci`) and **output mode** (`human`/`json`). The CLI auto-detects agent environments via known env vars (`CLAUDECODE`, `CLAUDE_CODE`, `CURSOR_AGENT`, `CODEX_SANDBOX`, `CURSOR_TRACE_ID`) and non-TTY detection, but explicit settings are more reliable across sandbox configurations.

**Recommended preflight for any setup or debugging task:**

```bash
WORKOS_MODE=agent workos doctor --json --skip-ai
```

`--skip-ai` disables the doctor's AI-powered diagnosis pass, which requires an API key and network round-trip — neither is guaranteed in a sandbox. If `--skip-ai` errors as an unknown flag, the CLI is outdated — see `references/workos-cli-upgrade.md`. The structured JSON output is sufficient for programmatic triage.

This returns a structured JSON report with `interactionMode` (`{ mode, source }`) and `hostExecution` (`{ ok, failures[] }`) fields. Read the JSON before suggesting fixes.

**Rules:**

- Use `--json` when parsing command output. It controls **formatting only** — it does not change CLI behavior.
- Use `WORKOS_MODE=agent` even when relaying human-readable messages. It controls **prompts, browser launch, and host trust**.
- Treat the doctor `HOST_EXECUTION_UNTRUSTED` issue as a hard trust boundary. If the doctor report contains this issue (or `hostExecution.ok` is `false`), **the current shell may be sandboxed**. Auth, config, keychain, and API failures from this shell are not authoritative. Ask the user to re-run host-sensitive commands (`workos auth login`, `workos doctor`, `workos env add`) on their host shell before drawing conclusions.
- Do not assume browser-based auth (`workos auth login`) works in a sandbox. If auth is required, surface the manual URL/code fallback that the CLI prints, or ask the user to run `workos auth login` on their host shell.
- For destructive CLI commands in agent mode, pass the explicit confirmation flag. Agent mode never prompts, so omitting the flag causes a `confirmation_required` error. Known flags: `--yes` for `workos api` (mutating methods), `--force` for `workos connection delete`, `workos directory delete`, and `workos debug reset`. If unsure which flag a command expects, run `workos <cmd> --help --json` to check.
- Structured CLI errors (JSON on stderr) include an optional `error.recovery.hints` array, where each hint has `description`, optional `command`, and optional `hostShellRequired`. Prefer those hints over guessing the next step.

**Legacy compatibility you may encounter:**

- `WORKOS_NO_PROMPT=1` is a legacy alias that sets both agent interaction behavior AND JSON output. To migrate, set `WORKOS_MODE=agent` and pass `--json` to the command to preserve both behaviors. Using `WORKOS_MODE=agent` alone drops the implicit JSON formatting.
- `WORKOS_FORCE_TTY=1` only affects output formatting; it does not change interaction mode.
