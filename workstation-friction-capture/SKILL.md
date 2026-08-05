---
name: workstation-friction-capture
description: >
  Triage the workstation-tool frictions logged during the session that is
  about to end (failed calls to `bun run convo|chips|secrets|lexicon|remind|
  review`, or to `mcp__html-review__*` MCP tools), and report the genuine
  structural defects — not typos or one-off slips — as a chip (spawn_task) or a note/reminder to the hub. Use this skill
  when the global Stop hook (Claude: ~/.claude/hooks/workstation-friction-
  capture-stop.mjs; Codex: ~/.codex/hooks/workstation-friction-capture-stop.mjs)
  blocks a session end because the runtime's friction log (~/.claude/friction/
  or ~/.codex/friction/<session-id>.jsonl) is non-empty — this is the ONLY
  normal trigger, it is not user-invoked. Do not use it speculatively mid-session.
---

# Workstation Friction Capture

> Source de vérité : `workstation/.claude/skills/workstation-friction-capture/` — ne pas éditer ici.

The workstation's own CLIs and MCP tools sometimes have structural bugs or
gaps that a session silently works around instead of reporting. A
`PostToolUse` hook (`workstation-friction-detect.mjs`) mechanically logs
every failed call to a workstation tool during the session, with zero
judgment; this skill applies the judgment, once, right before the session
actually stops. Full doctrine (triage criteria, dedup, 3-chip cap, audit-log
format): `/Users/elmabi/Desktop/my-projets/workstation/docs/workstation-friction-capture.md`.

## Step 1 — Read the friction log

The Stop hook's block message gives the exact path:
`~/.claude/friction/<session-id>.jsonl` — one JSON object per line
(`{ts, tool, commandTruncated, errorExcerpt, sessionId, cwd}`). `tool` is
`"Bash"` (a workstation CLI call) or an `mcp__html-review__*` tool name.

## Step 2 — Triage each entry

Classify transient/self-inflicted (typo'd flag, wrong argument, a retry
resolved it — skip) vs genuine structural defect (the tool's contract itself
is wrong or incomplete — report). Strict bar, ALL must hold: costs a FUTURE
session real time; reproducible in principle; not already known (Step 3).
Be stingy — a false positive costs a wasted chip; a missed one resurfaces
on its own next time. Full criteria and the counter-example: see the doc above.

## Step 3 — Dedup against open chips FIRST

`cd ~/Desktop/my-projets/workstation && bun run chips list --project workstation`
— skip anything already tracked (read with `bun run chips read <id>` if unsure).

## Step 4 — Report, capped at 3 chips per session

For each surviving candidate, in impact order, report via `spawn_task` (cwd
= the workstation repo, title = imperative phrase, prompt = self-contained:
failing command, error excerpt, tool, and — if known — where in the
workstation codebase the behavior likely lives) OR a note/reminder via the
hub when there's no clean fix yet (`bun run remind add "<texte>" --project
workstation`, or a `note`-kind item via `bun run convo create`). Hard cap:
3 per session — leave the rest for next time, the log line stays as evidence.

## Step 5 — Log the pass (mandatory, even at 0 candidates)

Always append one line to `~/.claude/friction/capture-log.jsonl`:

```json
{"ts": "<ISO timestamp>", "sessionId": "<session id>", "found": <N lines in the friction log>, "reported": <M chips/notes actually created>}
```

`N` = total lines in the session's friction log. `M` = chips/notes actually
created in Step 4 (0 is a fully valid, expected outcome). Never silent.

## Step 6 — Stop normally

After Step 5 the pass is complete. End your turn normally — the Stop hook's
`stop_hook_active` guard prevents a second block this turn; no `.jsonl` cleanup needed.
