---
name: workstation-friction-capture
description: >
  Triage the workstation-tool frictions logged during the session that is
  about to end (failed calls to `bun run convo|chips|secrets|lexicon|remind|
  review`, or to `mcp__html-review__*` MCP tools), and report the ones that
  are genuine structural defects — not typos or one-off slips — to the
  workstation hub as a chip (spawn_task) or a note/reminder. Use this skill
  when the global Stop hook (~/.claude/hooks/workstation-friction-capture-
  stop.mjs) blocks a session end because
  ~/.claude/friction/<session-id>.jsonl is non-empty — this is the ONLY
  normal trigger, it is not user-invoked. Do not use it speculatively
  mid-session.
---

# Workstation Friction Capture

The workstation's own CLIs and MCP tools sometimes have structural bugs or
gaps — an awkward flag, a stale assumption, a missing capability — that a
session silently works around instead of reporting. This closes the loop:
`workstation-friction-detect.mjs` (a `PostToolUse` hook) mechanically logs
every failed call to a workstation tool during the session, with zero
judgment; this skill applies the judgment, once, right before the session
actually stops.

## Step 1 — Read the friction log

The Stop hook's block message gives you the exact path:
`~/.claude/friction/<session-id>.jsonl`. Read it — one JSON object per line:

```json
{"ts": "...", "tool": "Bash", "commandTruncated": "...", "errorExcerpt": "...", "sessionId": "...", "cwd": "..."}
```

`tool` is `"Bash"` (a workstation CLI call) or an `mcp__html-review__*` tool
name. `commandTruncated`/`errorExcerpt` are truncated to ~300 chars — you
already have the session's own context for the full picture if you were
present when it happened (you may not always have been, if the session is
long — the log line is then your only evidence, which is fine, judge from
it).

## Step 2 — Triage each entry

For each line, classify:

- **(a) Transient / self-inflicted** — a typo'd flag, a wrong argument, a
  file that genuinely didn't exist yet, anything that a correct retry
  resolved without changing how the tool itself works. **Skip these.** They
  cost nothing to a future session.
- **(b) Genuine structural defect or missing capability** — the tool's
  contract itself is wrong or incomplete: a flag that can't do what its
  description implies, a CLI that fails on a legitimate input, an MCP tool
  whose error message hides the real cause, a workflow gap where no clean
  command exists for something routine. **These are worth reporting.**

Strict inclusion bar — ALL must hold before an entry earns a report:

1. It would cost a **future** session real time (not just this one).
2. It is **reproducible** in principle (not a one-off environment fluke).
3. It is **not already known** (see Step 3 — dedup first).

Be stingy. A false positive costs the human a wasted chip; a missed one just
waits for the next session to hit it again and (per the detection hook)
resurfaces automatically. When in doubt, skip.

## Step 3 — Dedup against open chips FIRST

Before reporting anything, list what's already tracked:

```
cd ~/Desktop/my-projets/workstation && bun run chips list --project workstation
```

If an open/launched chip already describes the same tool + failure class,
skip it — do not create a duplicate. If you're unsure whether two chips are
"the same," err toward not duplicating (read the existing one with
`bun run chips read <id>` and compare).

## Step 4 — Report, capped at 3 chips per session

For each surviving candidate (post-dedup), in order of how much time it would
save a future session, report via **one** of:

- **`spawn_task`** (preferred when there's a clear, actionable fix or a clear
  repro to hand off) — `cwd` = the workstation repo
  (`~/Desktop/my-projets/workstation`), title = imperative verb phrase, and
  the prompt MUST be self-contained: include the exact command that failed,
  the error excerpt, the tool involved, and — if you know it — where in the
  workstation codebase the behavior likely lives (e.g. `server/cli/secrets.ts`
  for `bun run secrets`). Do not derail into fixing it yourself.
- **A note or reminder via the hub** when there's no clean actionable fix yet
  (e.g. a workflow gap that needs a human decision, not just a bug fix):
  `cd ~/Desktop/my-projets/workstation && bun run remind add "<texte>" --project workstation`,
  or a `note`-kind item via `bun run convo create <slug> <fichier.json|->`
  (see `templates/conversations/support-session.json` for the `note` item
  shape) when the note needs more structure than a one-liner.

**Hard cap: 3 chips per session.** If more than 3 genuine candidates survive
triage + dedup, report the 3 most impactful and leave the rest for the next
session's pass (the friction log line stays as evidence — nothing is lost,
just deferred). Never report more than 3 in one pass; that itself would be
noise.

Fingerprint reported items by `(tool, error class)` — e.g.
`(Bash:bun-run-secrets, "cwd option ignored")` — so a repeat of the exact
same failure in a later session doesn't spawn a second chip (dedup against
Step 3's open-chips list should already catch this, but keep the fingerprint
in mind when deciding what counts as "the same").

## Step 5 — Log the pass (mandatory, even at 0 candidates)

Once triage is complete, ALWAYS append one line to
`~/.claude/friction/capture-log.jsonl` (create the file if it doesn't exist):

```json
{"ts": "<ISO timestamp>", "sessionId": "<session id>", "found": <N lines in the friction log>, "reported": <M chips/notes actually created>}
```

`N` = total lines in the session's friction log (may be small). `M` = how
many chips/notes you actually created in Step 4 (0 is a fully valid, expected
outcome — most sessions' frictions are transient). This makes a 0-report pass
visible and auditable, exactly the brain-capture/lexicon-capture §4
discipline applied to this domain — never silent.

## Step 6 — Stop normally

After Step 5, the capture pass is complete. End your turn as you normally
would — the Stop hook's `stop_hook_active` guard ensures it will not block
you again this turn. You do NOT need to delete or truncate the session's
`.jsonl` friction log — it is small, session-scoped, and harmless to leave
on disk (a future cleanup pass, if ever needed, is out of scope for this
skill).
