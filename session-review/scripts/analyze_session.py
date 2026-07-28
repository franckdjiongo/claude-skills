#!/usr/bin/env python3
# ANALYZER_VERSION = "v1.29 — additive: markdown render only — when commits_during_session.count==0 but git_commit_tool_calls_observed>0, emit a ⚠️ line surfacing the observed count. The cwd-scoped `git log` misses commits landed in OTHER repos the session cd'd into (observed 2026-07-11, meta-govern overnight migration: 8 commits across automintech/eosa/personal-budget-app rendered as '0 commits (none)', hiding the v1.16 cross-check signal already present in the JSON). JSON schema UNCHANGED. Purely additive. 2026-07-11"
# ANALYZER_VERSION_PREVIOUS_V1_28 = "v1.28 — additive: external_interruption_detected boolean per user turn + 🌐EXTERNAL-INTERRUPT render marker. Turns interrupted by the ENVIRONMENT (rate-limit, machine restart, API overloaded, session limit) were length-classified `other`/`likely_intervention`, forcing manual requalification of 'the user corrected me' vs 'the environment broke'. Case-insensitive keyword match over the lowercased preview: rate-limit, rate limit, overloaded, redémarr, redemarr, restart, crashed, session limit, api error, api overloaded. Never overrides category; every other turn keeps its exact prior classification. Purely additive. 2026-07-10"
# ANALYZER_VERSION_PREVIOUS_V1_27 = "v1.27 — additive: `id` column (first 8 chars of session_id, backticked) prepended to the per-session table in render_rollup_markdown --rollup mode. A rollup rapport citing a specific session ('the 617-min run') previously gave the reader no handle to re-run `--session <id>` on it — the session_id was already in the per_session JSON rows but absent from the rendered table (improvement carried as State B from the 2026-07-02 session-review). Markdown rendering only: rollup()/per_session schema, single-session path, and every JSON key UNCHANGED. Purely additive. 2026-07-02"
# ANALYZER_VERSION_PREVIOUS_V1_26 = "v1.26 — additive: local_command_echo classifier category, tested right BEFORE the likely_intervention branch in classify_user_turns. Harness-echoed local-command output turns (preview starting with '<local-command-caveat>', e.g. after /model) were length-classified as likely_intervention — false intervention signal observed 2026-07-02 (personal-budget-app convex-migration sessions). New category only claims turns whose preview (lstripped) starts with '<local-command-caveat>'; earlier branches (stop_hook_feedback, command_invocation, continuation, confirmation, short_directive) and every other turn keep their exact prior classification. Purely additive. 2026-07-02"
# ANALYZER_VERSION_PREVIOUS_V1_25 = "v1.25 — additive: stop_hook_feedback classifier category, checked FIRST in classify_user_turns. Harness-injected 'Stop hook feedback:' turns (Stop hook blocking a stop) were length-classified as likely_intervention/initial_request — observed 2026-07-01/02 (personal-budget-app convex-migration run): 6 Stop-hook turns during parallel batches read as user interventions, a false intervention signal the rapport had to hand-correct. New category only claims turns whose preview starts with 'stop hook feedback' (case-insensitive); every other turn keeps its exact prior classification. NOTE: the session-review's second proposed improvement (commits_during_session via git log --since/--until) already exists since v1.7 + v1.16 — verified, not duplicated. Purely additive. 2026-07-02"
# ANALYZER_VERSION_PREVIOUS_V1_24 = "v1.24 — additive: --last N CLI flag, an ergonomic alias for --rollup N ('review the last N sessions' / 'review les N dernieres sessions'). It folds into --rollup right after parse_args, so --rollup keeps its EXACT meaning and the single-session path is untouched when neither flag is passed. No schema change (CLI-only, aliasing existing behavior). Companion SKILL.md edit recognizes the 'last N sessions' phrasing and adds a pipeline-audit boundary pointer (a full design/plan artifact + skill-quality audit is a separate, heavier multi-agent job, NOT a conversation retro). Purely additive. 2026-06-22"
# ANALYZER_VERSION_PREVIOUS_V1_23 = "v1.23 — additive: browser_verification top-level key ({total_calls, chrome_mcp, claude_preview, computer_use, used, by_tool}) derived read-only from tool_usage + a 'Browser / visual verification' markdown block. This session (2026-06-17) shipped two UI features (F1/F2) with only API/unit smoke tests, never opening a browser; a hard infinite-render loop on the notification deep-link reached the user before being caught (turn 7 correction 'bizarre que tu n'as pas testé cela'), then took 41 Chrome-MCP calls to debug. The script listed those browser tools individually but surfaced no aggregate 'was previewable UI visually verified?' signal — exactly the judgment Dimension 3 needs. Purely additive; tool_usage untouched. 2026-06-17"
# ANALYZER_VERSION_PREVIOUS_V1_22 = "v1.22 — additive widening: correction_tokens now catches the 'tu ne vois pas … X est une colonne' / 'actually it's X' data-model correction shape (missed 2026-06-16 turn 17 'gg_compagnienom est une colonne calcule. tu ne voois pas cela dans le lexique', which fell to category `other` with correction_keyword_detected=false). Added 12 low-false-positive FR/EN tokens incl. the exact observed typo 'voois'. Existing categories, keys, and the correction_keyword_detected field UNCHANGED — purely additive widening of one tuple. 2026-06-16"
# ANALYZER_VERSION_PREVIOUS_V1_21 = "v1.21 — additive: (a) compute_active_duration → session.active_duration_seconds / active_duration_minutes_rounded / idle_gaps_excluded (gaps > 30 min trimmed) — duration_seconds wildly overcounts resumed sessions (observed 2026-06-16: a 2676-min wall-clock that was ~244 min of real work across 'i lost connection' / 'Continue from where you left off' resumes); existing duration_* keys untouched. (b) `--rollup [N]` cross-session mode → rollup()/render_rollup_markdown(): per-session table + merged aggregate (subagent types, skills, slash commands, tool-error kinds, parallelism, commits, harness events) over the project's sessions. A project retrospective ('analyze the last ~10 sessions of this project') previously forced a hand-written aggregator over per-session JSON dumps; --rollup builds it natively, reusing analyze() per session so every field stays consistent. Single-session path + schema UNCHANGED (rollup short-circuits only when --rollup is passed). Purely additive. 2026-06-16"
# ANALYZER_VERSION_PREVIOUS_V1_20 = "v1.20 — additive: harness_events top-level key ({compactions_detected, stop_hook_activations}) + markdown 'Harness events' block. Long autonomous sessions (this run: 617 min, /goal Stop hook, 'Continue from where you left off' after 101 tools) silently cross compaction boundaries and run deep no-user-turn spans; the script surfaced neither, so the rapport couldn't grade recovery quality or attribute autonomy. Detects isCompactSummary / compact_boundary / 'compact'+'boundary' system text, and 'stop hook is now active' across user+system events. Purely additive. 2026-06-16"
# ANALYZER_VERSION_PREVIOUS_V1_19 = "v1.19 — additive: candidate_sessions top-level key — every *.jsonl in the project dir with {session_id, mtime, size_bytes, user_turn_count, is_selected} — plus a multi-session ambiguity warning in markdown when >1 session was modified within ~60 min of the selected one. Auto-selection is most-recent-mtime; observed 2026-06-15 it picked a parallel 'github deploy + README' session over the active one, forcing a manual --session. Selection behavior UNCHANGED (mtime-tie tiebreak by user_turn_count left as a proposal, not applied). Purely additive. 2026-06-15"
# ANALYZER_VERSION_PREVIOUS_V1_18 = "v1.18 — additive: image_echo_detected boolean per user turn + 🖼️IMAGE-ECHO render marker. Harness re-injects '[Image: original WxH…]' turns after Read-image calls; their short length after several tool uses mislabels them likely_intervention (observed 2026-06-10: 4 of 6 likely_intervention turns were image echoes). Never overrides category. 2026-06-10"
# ANALYZER_VERSION_PREVIOUS_V1_17 = "v1.17 — additive: branches_created top-level key ({created, switched_to}) parsed from Bash `git checkout -b`/`git switch -c`/checkout/switch calls + markdown section. The session-start `git branch` header goes stale when the session creates its own branch (observed 2026-06-10: header cited feature/loop-autonomy-system while all 8 commits landed on feature/refonte-grille-saisie-temps). 2026-06-10"
# ANALYZER_VERSION_PREVIOUS_V1_16 = "v1.16 — additive: commits_during_session.git_commit_tool_calls_observed + attribution_note. extract_commits_during_session attributes commits by TIME WINDOW alone, so concurrent/out-of-band commits (another tool, a teammate, a hook) get mis-credited to the session. Cross-checks against Bash `git commit` tool calls actually observed; when commits>0 but observed==0, flags them as likely not session-authored. Existing count/commits/window keys preserved. 2026-06-08"
# ANALYZER_VERSION_PREVIOUS_V1_15 = "v1.15 — additive: workflow_fanout block. Parses workflow-completion <task-notification> <usage> blocks (agent_count / subagent_tokens / tool_uses / duration_ms) so the rapport cites a Workflow's TRUE internal fan-out + token cost without grepping the raw JSONL. Complements workflows_invoked.internal_subagents_uncounted with the actual numbers. 2026-06-03"
# ANALYZER_VERSION_PREVIOUS_V1_14 = "v1.14 — additive: reasoning_directive_detected boolean per user turn + 🧠REASONING-ASK render marker. Flags turns explicitly requesting deeper reasoning (ultrathink/ultracode/think hard/réfléchis bien) so response depth is attributed to an explicit ask, not scope creep. Never overrides category. 2026-06-03"
# ANALYZER_VERSION_PREVIOUS_V1_13 = "v1.13 — additive: imperative_directive boolean per user turn. Flags moderate-length, low-tools-before turns issuing a concrete command (merge/push/delete/run/fix…) that the length heuristic drops into `other`. Never overrides category. 2026-06-03"
# ANALYZER_VERSION_PREVIOUS_V1_12 = "v1.12 — additive: tool_error_kinds breakdown under failure_patterns. Classifies each is_error tool_result by signature (file_modified_since_read, file_not_read_yet, ambiguous_match, match_not_found, file_not_found, permission_denied, other) so stale-read churn is distinguishable from real bugs. tool_errors count preserved. 2026-06-01"
# ANALYZER_VERSION_PREVIOUS_V1_11 = "v1.11 — additive: correction_keyword_detected per user turn + ✏️CORRECTION render marker. Flags long turns that are really corrections (e.g. 'tu n'as pas réglé X', 'I thought you would'), which the length heuristic mislabels as new_request_mid_work. Never overrides category. 2026-05-31"
# ANALYZER_VERSION_PREVIOUS_V1_10 = "v1.10 — additive: workflows_invoked block. Counts Workflow
#                     tool calls (named/scriptPath/inline) and flags that their
#                     internally-spawned subagents are NOT in the `subagents`
#                     block, so workflow-orchestrated sessions stop undercounting
#                     their true subagent fan-out. 2026-05-29"
# ANALYZER_VERSION_PREVIOUS_V1_9 = "v1.9 — additive: harness_injected boolean per user turn +
#                     turns.harness_injected_turns count + 🤖 render marker. Flags
#                     <task-notification> / [SYSTEM NOTIFICATION] turns that are
#                     injected into the user role but are not genuine user input,
#                     so rapports don't miscount them as interventions. 2026-05-29"
# ANALYZER_VERSION_PREVIOUS_V1_8 = "v1.8 — additive: slash_commands_invoked. Extracts skill /
#                         command names launched via the <command-name> wrapper
#                         (slash commands) from command_invocation turns —
#                         skills_invoked only catches Skill() tool calls and
#                         misses /quality-gate, /systematic-debug, etc. New
#                         top-level key slash_commands_invoked = {total, by_name}
#                         + markdown section 'Slash commands invoked'. Applied
#                         2026-05-22 from the deferred-backlog-wave /session-review
#                         (3 skills run as slash commands, all invisible to
#                         skills_invoked)."
# ANALYZER_VERSION_PREVIOUS_V1_7 = "v1.7 — additive: commits_during_session. Shells `git log`
#                         filtered by commit date to [first_event, last_event]
#                         so the rapport can cite a revert map without running
#                         git by hand. New top-level key commits_during_session
#                         = {count, commits:[{hash,subject}], window}; degrades
#                         to count 0 + note when cwd unknown / git absent / not
#                         a repo. New markdown section 'Commits during session'.
#                         Applied 2026-05-22 from the premium-UI-elevation
#                         /session-review (13 commits had to be cited via a
#                         manual git log because the script did not expose them)."
# ANALYZER_VERSION_PREVIOUS_V1_6 = "v1.6 — additive: forked-session detection. Reads the
#                         `forkedFrom` field (present only on /branch-forked
#                         JSONLs, absent on normal sessions) and exposes
#                         session.forked_from = parent sessionId. render_markdown
#                         emits a prominent ⚠️ warning when set, because a fork
#                         often omits subagent dispatches + tool calls from
#                         before the branch point (silent undercount). Applied
#                         2026-05-21 from the devis-rename /execute-plan session:
#                         /session-review ran post-/branch and the analyzer
#                         reported 7 subagents when the parent session had 16,
#                         with no signal that the data was truncated."
# ANALYZER_VERSION_PREVIOUS_V1_5 = "v1.5 — additive: cross-reference timestamp-cluster info
#                         in the 'All Agents dispatched solo' warning. When
#                         max cluster size >= 2 (cluster detector found parallel
#                         intent within 60s window), append an informational
#                         bullet flagging the warning as likely a harness-split
#                         artifact rather than an actual parallel-dispatch.md
#                         violation. The original warning text is unchanged
#                         (additive only — same trigger conditions, same wording);
#                         the new bullet appears conditionally underneath.
#                         Applied 2026-05-19 from B2.1 brainstorm session (4
#                         agents dispatched in 1 message but persisted as 4
#                         separate messages → warning fired on intent that
#                         was actually compliant)."
# ANALYZER_VERSION_PREVIOUS_V1_4 = "v1.4 — additive: urgency_intervention boolean flag on each
#                         turn, set when user text matches frustration tokens
#                         (stop guessing, losing my time, perds mon temps, …).
#                         Flag is purely additive — never overrides category.
#                         Lets rapports surface category-likely_intervention
#                         turns that are categorically harsher than peers.
#                         Applied 2026-05-13 from B1 seed pipeline session
#                         (T15 'stop guessing. you are losing my time' was a
#                         far stronger signal than the other 4 likely_intervention
#                         turns the analyzer flagged equivalently)."
# ANALYZER_VERSION_PREVIOUS_V1_3 = "v1.3 — additive: (a) timestamp-cluster parallel detection
#                         (60s window) surfaces intent-based parallelism the
#                         per-message uuid count misses (each tool_use is
#                         persisted in a separate assistant message even when
#                         composed in one function_calls block); (b) orphaned
#                         agents detection (Agent tool_use without matching
#                         tool_result) catches zombie agents the orchestrator
#                         lost track of. Applied 2026-05-13 from session-review
#                         State B proposal after T15 zombie incident in B1
#                         backlog cleanup session."
# ANALYZER_VERSION_PREVIOUS_V1_2 = "v1.2 — additive: agent_dispatch_pattern (per-message Agent
#                         count distribution: solo vs parallel groups). Surfaces
#                         parallel-dispatch failures when N independent Agents
#                         are dispatched in N separate messages instead of 1
#                         multi-tool-use message. Applied 2026-05-06 from
#                         session-review State B proposal (user-explicit-auth)."
# ANALYZER_VERSION_PREVIOUS_V1_1 = "v1.1 — additive: render subagents by_description
#                         in markdown (JSON schema already carried the data since
#                         v1.0). Applied 2026-04-20 from session-review State B."
# ANALYZER_VERSION_PREVIOUS_V1_0 = "v1.0 — initial extraction: session meta, tool usage,
#                         subagents, skills, turn classification (7 categories),
#                         failure patterns. Baseline established 2026-04-17."
#
# The session-review skill may evolve this script additively (never regressively).
# See SKILL.md section "Continuous improvement of the analyzer (living script)" for
# the additive-only contract. Every evolution bumps this version marker.
"""analyze_session.py — Deterministic session metrics for /session-review.

Reads Claude Code's persisted session JSONL transcript and extracts ground-truth
signals that the `session-review` skill uses to anchor its qualitative analysis.

Usage:
    python3 analyze_session.py                 # auto-detect current session
    python3 analyze_session.py --cwd <path>    # specify cwd (defaults to $PWD)
    python3 analyze_session.py --session <id>  # specify session UUID directly
    python3 analyze_session.py --file <path>   # direct path to .jsonl
    python3 analyze_session.py --json          # machine-readable JSON only
    python3 analyze_session.py --md            # human-readable markdown only
    # default: both, JSON first, then markdown

Output: prints a structured JSON report with:
- session metadata (id, project, cwd, git branch)
- duration and message counts
- exact tool-usage distribution
- subagents invoked with counts + agent types
- skills invoked with counts
- user interventions (heuristic: short user turns following tool-heavy assistant turns)
- scope tier recommendation (Micro / Small / Medium / Large)
- flagged patterns (retries, empty outputs, reactive fixes)

The skill SKILL.md calls this script as Step 1, then uses the output as ground
truth for its qualitative analysis. The script is read-only and idempotent.
"""

from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


# ─── Session discovery ──────────────────────────────────────────────────────


def encode_cwd_for_projects_dir(cwd: str) -> str:
    """Claude Code encodes cwd in ~/.claude/projects/ by replacing / with -."""
    # Leading slash becomes leading dash
    return "-" + cwd.lstrip("/").replace("/", "-")


def find_current_session_jsonl(cwd: str):
    """Find the most recently modified .jsonl for this cwd."""
    encoded = encode_cwd_for_projects_dir(cwd)
    proj_dir = Path.home() / ".claude" / "projects" / encoded
    if not proj_dir.exists():
        return None
    jsonls = sorted(
        proj_dir.glob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return jsonls[0] if jsonls else None


def find_session_by_id(session_id: str, cwd: str):
    """Find a specific session .jsonl by UUID."""
    encoded = encode_cwd_for_projects_dir(cwd)
    proj_dir = Path.home() / ".claude" / "projects" / encoded
    candidate = proj_dir / f"{session_id}.jsonl"
    return candidate if candidate.exists() else None


def _count_user_turns_light(path: Path):
    """Lightweight count of genuine user turns (skips pure tool_result echoes).
    Used only to characterize candidate sessions — not the rich classifier."""
    n = 0
    for ev in parse_jsonl(path):
        if ev.get("type") != "user":
            continue
        content = ev.get("message", {}).get("content", [])
        if (
            isinstance(content, list)
            and content
            and all(
                isinstance(b, dict) and b.get("type") == "tool_result"
                for b in content
            )
        ):
            continue
        n += 1
    return n


def enumerate_candidate_sessions(cwd, selected_path=None):
    """v1.19 additive: list every *.jsonl in the project dir with light metadata
    so the rapport (and reviewer) can spot when auto-selection (most-recent mtime)
    picked the wrong session. Observed 2026-06-15: a parallel 'github deploy +
    README' session was newer than the active one and got auto-selected, forcing a
    manual --session. Purely additive — does NOT change which session analyze()
    reads (selection stays most-recent-mtime in find_current_session_jsonl)."""
    if not cwd:
        return []
    encoded = encode_cwd_for_projects_dir(cwd)
    proj_dir = Path.home() / ".claude" / "projects" / encoded
    if not proj_dir.exists():
        return []
    selected_resolved = None
    if selected_path:
        try:
            selected_resolved = Path(selected_path).resolve()
        except OSError:
            selected_resolved = None
    out = []
    for p in proj_dir.glob("*.jsonl"):
        try:
            st = p.stat()
        except OSError:
            continue
        try:
            is_selected = (
                selected_resolved is not None and p.resolve() == selected_resolved
            )
        except OSError:
            is_selected = False
        out.append({
            "session_id": p.stem,
            "mtime": datetime.fromtimestamp(
                st.st_mtime, tz=timezone.utc
            ).isoformat(),
            "mtime_epoch": st.st_mtime,
            "size_bytes": st.st_size,
            "user_turn_count": _count_user_turns_light(p),
            "is_selected": is_selected,
        })
    out.sort(key=lambda c: c["mtime_epoch"], reverse=True)
    return out


# ─── Parsing ────────────────────────────────────────────────────────────────


def parse_jsonl(path: Path):
    """Yield parsed JSON objects from a JSONL file, skipping malformed lines."""
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def iso_from_timestamp(ts):
    """Convert ms-epoch or ISO string to Python datetime (UTC-aware)."""
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000 if ts > 1e11 else ts, tz=timezone.utc)
    if isinstance(ts, str):
        try:
            # Handle various ISO formats
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            pass
    return None


def extract_tool_uses(event):
    """Yield (tool_name, input) tuples from an assistant event's content.

    Preserved 2-tuple shape for v1.0–v1.2 callers. For v1.3+ richer extraction
    (tool_use_id), use `extract_tool_uses_with_id()`.
    """
    content = event.get("message", {}).get("content", [])
    if not isinstance(content, list):
        return
    for block in content:
        if isinstance(block, dict) and block.get("type") == "tool_use":
            yield block.get("name", "?"), block.get("input", {})


def extract_tool_uses_with_id(event):
    """v1.3 additive — yield (tool_name, input, tool_use_id) tuples.

    Adds tool_use_id to support orphaned-agent detection (Agent tool_use
    without matching tool_result). Pure additive — does not replace
    extract_tool_uses(); existing callers continue to work unchanged.
    """
    content = event.get("message", {}).get("content", [])
    if not isinstance(content, list):
        return
    for block in content:
        if isinstance(block, dict) and block.get("type") == "tool_use":
            yield block.get("name", "?"), block.get("input", {}), block.get("id")


def extract_text_blocks(event):
    """Yield text content from an assistant or user event."""
    content = event.get("message", {}).get("content", [])
    if isinstance(content, str):
        yield content
        return
    if not isinstance(content, list):
        return
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            yield block.get("text", "")


# ─── Heuristics ─────────────────────────────────────────────────────────────


def classify_scope_tier(signals):
    """Map tool counts and subagents to a scope tier."""
    tool_total = sum(signals["tool_usage"].values())
    n_subagents = signals["subagents_count_total"]
    n_user_turns = signals["user_turns_nontrivial"]

    # Thresholds calibrated against the session-review SKILL.md definitions
    if tool_total < 6 and n_subagents == 0 and n_user_turns <= 2:
        return "Micro"
    if n_subagents == 0 and tool_total < 30:
        return "Small"
    if n_subagents <= 3 and tool_total < 100:
        return "Medium"
    return "Large"


def collect_user_turns(events):
    """Collect every genuine user turn (non-tool-result, non-pure-system-reminder)
    with context about how much autonomous assistant work preceded it.

    Rather than guess what's a "correction" vs "new task", we report all user
    turns with signals so the skill can classify them qualitatively:
      - length (short user turns mid-work are likely corrections/confirmations)
      - tool_uses_since_prev_user (how autonomous the assistant was just before)
      - preview text (first 250 chars)
      - is_command_invocation (starts with /command or contains <command-name>)

    Returns (total_user_events, user_turns_with_text, turns_detail)
    """
    total_user_events = 0
    turns = []
    tool_uses_since_prev_user = 0

    for ev in events:
        t = ev.get("type")
        if t == "assistant":
            tool_uses_since_prev_user += sum(1 for _ in extract_tool_uses(ev))
            continue
        if t != "user":
            continue
        total_user_events += 1

        content = ev.get("message", {}).get("content", [])
        is_pure_tool_result = (
            isinstance(content, list)
            and content
            and all(
                isinstance(b, dict) and b.get("type") == "tool_result"
                for b in content
            )
        )
        if is_pure_tool_result:
            continue

        user_text = ""
        if isinstance(content, str):
            user_text = content
        elif isinstance(content, list):
            for b in content:
                if isinstance(b, dict) and b.get("type") == "text":
                    user_text += b.get("text", "")

        stripped = user_text.strip()
        if not stripped:
            tool_uses_since_prev_user = 0
            continue

        # Pure system reminders are harness-injected, not user input
        if stripped.startswith("<system-reminder>") and stripped.endswith("</system-reminder>"):
            tool_uses_since_prev_user = 0
            continue

        is_command = "<command-name>" in stripped or stripped.startswith("/")

        # v1.9 additive: background-task completion notifications and harness
        # system notifications are injected into the user role but are NOT user
        # input. Flag them so rapports don't miscount them as interventions /
        # new requests (purely additive — never overrides `category`).
        is_harness_injected = (
            "<task-notification>" in stripped
            or stripped.startswith("[SYSTEM NOTIFICATION")
            or "[SYSTEM NOTIFICATION - NOT USER INPUT]" in stripped
        )

        # Strip system-reminder blocks from preview text for readability
        cleaned = re.sub(r"<system-reminder>.*?</system-reminder>", "", stripped,
                         flags=re.DOTALL).strip()
        preview = cleaned[:250] if cleaned else stripped[:250]

        turns.append({
            "ordinal": len(turns) + 1,
            "length": len(stripped),
            "tool_uses_since_prev_user": tool_uses_since_prev_user,
            "is_command_invocation": is_command,
            "harness_injected": is_harness_injected,
            "preview": preview.replace("\n", " "),
        })

        tool_uses_since_prev_user = 0

    return total_user_events, turns


def classify_user_turns(turns):
    """Bucket user turns into likely categories based on observable signals.

    Categories:
      - stop_hook_feedback: harness-injected "Stop hook feedback:" turn (a Stop
            hook blocked the assistant's stop). NOT user input — checked first
            so the harness origin wins over the length heuristics below.
      - command_invocation: slash command or <command-name> wrapper
      - initial_request: first long user turn of the session (no prior tool work)
      - continuation: very short (<= 20 chars) and fits 'go', 'proceed', etc.
      - confirmation: short (<= 60 chars) with positive words
      - short_directive: short (< 30 chars) forward-going instruction after a long
            autonomous run (>= 20 tool uses since prev user turn). Distinct from
            likely_intervention (a correction); short_directive re-engages with a
            brief command. Useful for "when did the orchestrator hand back?".
      - local_command_echo: harness-echoed local-command output wrapped in
            <local-command-caveat> (e.g. after /model). NOT user input — checked
            right before likely_intervention so the echo can't read as a
            correction.
      - likely_intervention: short-to-medium (<= 500 chars) after >= 3 tool uses
      - new_request: long (> 500 chars) after work has happened
      - other: everything else
    """
    CONTINUATION_WORDS = {"go", "continue", "proceed", "next", "ok", "yes", "oui",
                          "continuer", "suivant"}
    CONFIRMATION_TOKENS = ("looks good", "bien", "excellent", "super", "parfait",
                           "merci", "thanks", "great", "nice", "correct")

    for turn in turns:
        txt = turn["preview"].lower().strip().strip(".!?,;")
        length = turn["length"]
        tools_before = turn["tool_uses_since_prev_user"]

        # v1.25 additive category: Stop-hook feedback turns. The harness injects
        # "Stop hook feedback:" user-role turns when a Stop hook blocks a stop;
        # their short-to-medium length after tool work mislabeled them
        # `likely_intervention` / `initial_request` (observed 2026-07-01/02:
        # 6 such turns during parallel batches read as user interventions —
        # false intervention signal in the rapport). Existing categories keep
        # their exact semantics for every other turn.
        if turn["preview"].lstrip().lower().startswith("stop hook feedback"):
            turn["category"] = "stop_hook_feedback"
        elif turn["is_command_invocation"]:
            turn["category"] = "command_invocation"
        elif length <= 20 and txt in CONTINUATION_WORDS:
            turn["category"] = "continuation"
        elif length <= 80 and any(c in txt for c in CONFIRMATION_TOKENS):
            turn["category"] = "confirmation"
        elif length < 30 and tools_before >= 20:
            turn["category"] = "short_directive"
        # v1.26 additive category: harness echo of a local command's output,
        # wrapped in <local-command-caveat> (e.g. after /model). Its short-to-
        # medium length after tool work mislabeled it `likely_intervention`
        # (false positive observed 2026-07-02). Tested right before the
        # likely_intervention branch per the approved State-B improvement; every
        # other turn keeps its exact prior classification.
        elif turn["preview"].lstrip().startswith("<local-command-caveat>"):
            turn["category"] = "local_command_echo"
        elif tools_before >= 3 and 20 < length <= 500:
            turn["category"] = "likely_intervention"
        elif length > 500 and tools_before >= 5:
            turn["category"] = "new_request_mid_work"
        elif tools_before == 0 and length > 100:
            turn["category"] = "initial_request"
        else:
            turn["category"] = "other"

        # Additive flag: urgency/frustration keywords elevate the signal of any
        # intervention. Surfaced in rapports as a stronger correction marker than
        # plain `likely_intervention`. Never overrides category — purely additive.
        urgency_tokens = (
            "stop guessing",
            "losing my time",
            "wasting my time",
            "perds mon temps",
            "perd mon temps",
            "stop wasting",
            "you are losing",
            "you're losing",
            "you keep",
            "i told you",
            "je t'ai dit",
            "je vous ai dit",
            "forget it",
            "laisse tomber",
            "for the last time",
            "this is wrong",
            "completely wrong",
            "ridiculous",
        )
        turn["urgency_intervention"] = any(tok in txt for tok in urgency_tokens)

        # Additive flag: correction keywords mark a turn as a correction REGARDLESS
        # of length. A long turn (> 500 chars) that says "you didn't fix X / I
        # thought you'd catch Y" is classified `new_request_mid_work` by the
        # length heuristic, but it is really an intervention. This flag lets the
        # rapport author treat such turns as corrections without narrowing the
        # length-based categories (which stay intact — purely additive).
        correction_tokens = (
            "you didn't", "you did not", "you forgot", "you missed", "you should have",
            "tu n'as pas", "tu nas pas", "tu as oublié", "tu as oublie", "t'as pas",
            "vous n'avez pas", "tu aurais dû", "tu aurais du", "you haven't",
            "please also", "don't forget", "n'oublie pas", "je pensais que t",
            "je pensais que tu", "ce n'est pas", "c'est pas", "not premium",
            "pas premium", "pas joli", "n'est pas bien", "mal analysé", "mal analyse",
            "you also", "aussi corrige", "tu n'as pas pensé", "tu nas pas pensé",
            "tu n'as pas capté", "i thought you", "thought you would",
            # v1.22 widening — "you fail to see it's actually X" / data-model
            # corrections. Missed on 2026-06-16 turn 17 ("gg_compagnienom est une
            # colonne calcule. tu ne voois pas cela dans le lexique"), classified
            # `other` with no correction flag. Low-false-positive correction phrasings
            # (incl. the exact observed typo "voois"). Purely additive widening.
            "tu ne vois pas", "tu ne voois pas", "tu vois pas", "ne vois-tu pas",
            "you don't see", "you do not see", "don't you see", "you didn't see",
            "est une colonne", "en fait c'est", "actually it's", "actually it is",
        )
        turn["correction_keyword_detected"] = any(tok in txt for tok in correction_tokens)

        # Additive flag: imperative directive detection. A moderate-length turn
        # with 0-2 tools-before that issues a concrete command (e.g. "merge to
        # master, push et delete <branch>") falls into `other` today — too long
        # for `confirmation`/`short_directive`, too short for `initial_request`
        # (>100) or `new_request_mid_work` (>500). This flag marks such turns as
        # real forward-going instructions so the rapport doesn't mis-read them as
        # noise. Never overrides category — purely additive. Bilingual leading verbs.
        imperative_tokens = (
            "merge", "push", "delete", "supprime", "supprimer", "rebase", "revert",
            "commit", "run ", "lance", "lancer", "deploy", "déploie", "build",
            "rename", "renomme", "move ", "déplace", "create ", "crée", "fix ",
            "corrige", "implement", "implémente", "add ", "ajoute", "remove ",
            "retire", "open a pr", "ouvre", "squash", "cherry-pick", "tag ",
        )
        first_word = txt.split()[0] if txt.split() else ""
        turn["imperative_directive"] = (
            tools_before <= 2
            and 20 < length <= 500
            and (first_word in {t.strip() for t in imperative_tokens}
                 or any(txt.startswith(tok) for tok in imperative_tokens))
        )

        # Additive flag: reasoning-directive detection. The user can explicitly
        # request deeper reasoning via keywords the harness honors (ultrathink,
        # ultracode, "think hard/harder/step by step"). These turns explain WHY a
        # given assistant response is longer/more thorough, but the length/category
        # heuristics drop them into `initial_request`/`other` with no trace. This
        # flag lets the rapport author attribute extra depth to an explicit ask.
        # Never overrides category — purely additive. Bilingual.
        reasoning_directive_tokens = (
            "ultrathink", "ultra think", "ultracode", "ultra code",
            "think hard", "think harder", "think deeply", "think step by step",
            "réfléchis bien", "reflechis bien", "réfléchis fort", "reflechis fort",
            "raisonne en profondeur", "approfondis", "deep reasoning",
            "extended thinking", "megathink", "mega think",
        )
        turn["reasoning_directive_detected"] = any(
            tok in txt for tok in reasoning_directive_tokens
        )

        # v1.18 additive flag: image-echo detection. When the assistant Reads an
        # image file, the harness re-injects a mechanical user turn of the form
        # "[Image: original WxH, displayed at WxH. Multiply coordinates by N…]".
        # These short turns arrive after several tool uses, so the length/tools
        # heuristic mislabels them `likely_intervention` (observed 2026-06-10:
        # 4 of 6 likely_intervention turns were image echoes, inflating the
        # apparent intervention count). Never overrides category — purely additive.
        preview_txt = (turn.get("preview") or "").lstrip()
        turn["image_echo_detected"] = preview_txt.startswith("[Image: original")

        # v1.28 additive flag: external-interruption detection. A turn interrupted
        # by the ENVIRONMENT (rate-limit, machine restart, API overloaded, session
        # limit) reads as a user correction to the length/category heuristics and
        # falls into `other` / `likely_intervention`, forcing the rapport author to
        # manually requalify "the user corrected me" vs "the environment broke".
        # This flag marks turns whose text mentions an environment-side interruption
        # so the author can discount them from genuine user interventions. Matched
        # case-insensitively over the lowercased preview (`txt`). Never overrides
        # category — purely additive.
        external_interruption_tokens = (
            "rate-limit", "rate limit", "overloaded", "redémarr", "redemarr",
            "restart", "crashed", "session limit", "api error", "api overloaded",
        )
        turn["external_interruption_detected"] = any(
            tok in txt for tok in external_interruption_tokens
        )

    return turns


def detect_retries_and_failures(events):
    """Look for patterns indicating retries or tool failures."""
    patterns = {
        "empty_output_observed": 0,
        "tool_errors": 0,
        "bash_exit_nonzero": 0,
        # v1.12 additive: classify each is_error tool_result by signature, so the
        # rapport can tell "stale-read churn" (Edit after a script mutated the file)
        # apart from genuine bugs. Sub-counts sum to <= tool_errors (an error with no
        # known signature falls into "other"). Purely additive — tool_errors stays.
        "tool_error_kinds": {},
    }
    for ev in events:
        if ev.get("type") != "user":
            continue
        content = ev.get("message", {}).get("content", [])
        if not isinstance(content, list):
            continue
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_result":
                result_content = block.get("content", "")
                if isinstance(result_content, list):
                    result_content = " ".join(
                        b.get("text", "") for b in result_content if isinstance(b, dict)
                    )
                text = str(result_content)
                if block.get("is_error"):
                    patterns["tool_errors"] += 1
                    kind = _classify_tool_error(text)
                    patterns["tool_error_kinds"][kind] = (
                        patterns["tool_error_kinds"].get(kind, 0) + 1
                    )
                if "Exit code 1" in text or "Exit code: 1" in text:
                    patterns["bash_exit_nonzero"] += 1
                if "[Tool result missing]" in text or "0-byte" in text:
                    patterns["empty_output_observed"] += 1
    return patterns


def _classify_tool_error(text):
    """v1.12 additive: map an is_error tool_result to a coarse signature.
    Order matters — most specific first. Returns a single lowercase token."""
    low = text.lower()
    if "modified since read" in low or "has been modified since" in low:
        return "file_modified_since_read"
    if "has not been read yet" in low or "must read the file" in low:
        return "file_not_read_yet"
    if "no such file" in low or "enoent" in low:
        return "file_not_found"
    if "ambiguous" in low or "use a longer, unique" in low:
        return "ambiguous_match"
    if (
        "string to replace not found" in low
        or "no checkbox label contains" in low
        or "does not contain" in low
        or "not found in" in low
    ):
        return "match_not_found"
    if "permission" in low and "denied" in low:
        return "permission_denied"
    return "other"


def detect_harness_events(events):
    """v1.20 additive: count context compactions + autonomous Stop-hook spans.
    Long sessions silently cross one or more compaction boundaries — the rapport
    should grade RECOVERY quality (not punish compaction itself), and attribute
    deep no-user-turn tool runs to a real directive (a /goal session Stop hook or
    a /loop) rather than scope creep. Purely additive — never touches
    failure_patterns or any existing key."""
    compactions = 0
    stop_hook_activations = 0
    for ev in events:
        if ev.get("isCompactSummary") is True or ev.get("subtype") == "compact_boundary":
            compactions += 1
            continue
        t = ev.get("type")
        if t not in ("system", "user"):
            continue
        blob = json.dumps(ev, ensure_ascii=False).lower()
        if t == "system" and "compact" in blob and "boundary" in blob:
            compactions += 1
        if "stop hook is now active" in blob:
            stop_hook_activations += 1
    return {
        "compactions_detected": compactions,
        "stop_hook_activations": stop_hook_activations,
    }


def compute_active_duration(events, idle_threshold_sec=1800):
    """v1.21 additive: wall-clock duration with idle gaps > threshold excluded.

    `duration_seconds` (last_event − first_event) wildly overcounts when a session
    sits open for hours between bursts — observed 2026-06-16 across an htmlshare
    multi-session review: one session reported a 2676-min (≈44 h) "duration" that
    was really minutes of work spread across resumes ("sorry continue. i lost
    connection" / "Continue from where you left off."). Summing only the
    inter-event gaps <= idle_threshold (default 30 min) yields a work-span the
    rapport can cite without mislabeling idle time as effort. Purely additive —
    `duration_seconds` / `duration_minutes_rounded` are left untouched."""
    ts = []
    for ev in events:
        raw = ev.get("timestamp")
        parsed = iso_from_timestamp(raw) if raw else None
        if parsed is not None:
            ts.append(parsed)
    if len(ts) < 2:
        return {
            "active_seconds": 0,
            "active_minutes_rounded": 0.0,
            "idle_gap_threshold_sec": idle_threshold_sec,
            "idle_gaps_excluded": 0,
        }
    ts.sort()
    active = 0.0
    excluded = 0
    for a, b in zip(ts, ts[1:]):
        delta = (b - a).total_seconds()
        if 0 <= delta <= idle_threshold_sec:
            active += delta
        elif delta > idle_threshold_sec:
            excluded += 1
    return {
        "active_seconds": int(active),
        "active_minutes_rounded": round(active / 60, 1),
        "idle_gap_threshold_sec": idle_threshold_sec,
        "idle_gaps_excluded": excluded,
    }


# ─── Main analysis ──────────────────────────────────────────────────────────


def extract_commits_during_session(cwd, first_ts, last_ts):
    """v1.7 additive: git commits landed within the session's time window.

    Shells `git log` filtered by commit date to [first_ts, last_ts] so the
    rapport can cite a revert map without running git by hand. Degrades
    gracefully — returns count 0 plus a note when cwd is unknown, git is
    absent, or the directory is not a repo.
    """
    if not cwd or first_ts is None or last_ts is None:
        return {"count": 0, "commits": [], "note": "no cwd or time window"}
    sep = "\x1f"
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "log", "--no-merges",
             f"--since={first_ts.isoformat()}", f"--until={last_ts.isoformat()}",
             f"--pretty=format:%h{sep}%s"],
            capture_output=True, text=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return {"count": 0, "commits": [], "note": "git unavailable"}
    if out.returncode != 0:
        return {"count": 0, "commits": [], "note": "not a git repo or git error"}
    commits = []
    for line in out.stdout.splitlines():
        if sep in line:
            h, subj = line.split(sep, 1)
            commits.append({"hash": h, "subject": subj})
    return {
        "count": len(commits),
        "commits": commits,
        "window": {"since": first_ts.isoformat(), "until": last_ts.isoformat()},
    }


def count_git_commit_tool_calls(events):
    """v1.16 additive: count Bash tool calls that actually run `git commit`
    (excluding --dry-run). extract_commits_during_session attributes commits by
    TIME WINDOW alone, so concurrent / out-of-band commits get mis-credited to
    the session. Cross-checking against observed `git commit` tool calls lets the
    rapport flag window-attributed commits the session did not author."""
    n = 0
    for ev in events:
        for name, inp in extract_tool_uses(ev):
            if name != "Bash":
                continue
            cmd = (inp or {}).get("command", "") if isinstance(inp, dict) else ""
            if re.search(r"\bgit\s+commit\b", cmd) and "--dry-run" not in cmd:
                n += 1
    return n


def extract_branches_created(events):
    """v1.17 additive: branches created/switched DURING the session via Bash
    (`git checkout -b X`, `git switch -c X`, plain `git checkout X`/`git switch X`).
    The header's `git branch` field is read from the session START and goes stale
    when the session creates its own feature branch — the rapport then cites the
    wrong branch unless cross-checked by hand (observed 2026-06-10: header said
    feature/loop-autonomy-system while all 8 commits landed on
    feature/refonte-grille-saisie-temps, created at turn ~20)."""
    created, switched = [], []
    for ev in events:
        for name, inp in extract_tool_uses(ev):
            if name != "Bash":
                continue
            cmd = (inp or {}).get("command", "") if isinstance(inp, dict) else ""
            for m in re.finditer(
                r"\bgit\s+(?:checkout\s+-b|switch\s+-c)\s+([\w./-]+)", cmd
            ):
                if m.group(1) not in created:
                    created.append(m.group(1))
            for m in re.finditer(
                r"\bgit\s+(?:checkout|switch)\s+(?!-)([\w./-]+)", cmd
            ):
                branch = m.group(1)
                if branch not in ("--", ".") and branch not in switched:
                    switched.append(branch)
    return {"created": created, "switched_to": switched}


def extract_slash_commands(user_turns):
    """v1.8 additive: extract skill / command names invoked via the
    `<command-name>` wrapper. `skills_invoked` only counts Skill() tool calls;
    skills launched as slash commands (/quality-gate, /systematic-debug, …)
    never appear there. This recovers them from command_invocation turns so the
    skill inventory in the rapport is complete."""
    counter = Counter()
    for turn in user_turns:
        if turn.get("category") != "command_invocation":
            continue
        txt = turn.get("preview", "")
        m = re.search(r"<command-name>\s*/?([\w:-]+)\s*</command-name>", txt)
        if not m and txt.strip().startswith("/"):
            m = re.match(r"/([\w:-]+)", txt.strip())
        if m:
            counter[m.group(1)] += 1
    return {"total": sum(counter.values()), "by_name": dict(counter)}


def extract_workflow_fanout(events):
    """v1.15 additive: extract Workflow fan-out metrics from task-notification
    <usage> blocks. A Workflow's internally-spawned agents (via the script's
    agent()/pipeline()/parallel() hooks) are INVISIBLE to the `subagents` block,
    which counts only direct Agent() tool calls. The workflow-completion
    task-notification carries the true totals in a <usage> block
    (agent_count / subagent_tokens / tool_uses / duration_ms). Surfacing them lets
    the rapport cite real fan-out + token cost without grepping the raw JSONL.
    Purely additive — never affects existing fields."""
    def _to_int(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    out = []
    for ev in events:
        content = ev.get("message", {}).get("content", [])
        text = ""
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            for b in content:
                if not isinstance(b, dict):
                    continue
                if isinstance(b.get("text"), str):
                    text += b["text"]
                # task-notifications can arrive as a tool_result block
                inner = b.get("content")
                if isinstance(inner, str):
                    text += inner
                elif isinstance(inner, list):
                    for ib in inner:
                        if isinstance(ib, dict) and isinstance(ib.get("text"), str):
                            text += ib["text"]
        if "<task-notification>" not in text or "<usage>" not in text:
            continue

        def g(key):
            m = re.search(rf"<{key}>(\d+)</{key}>", text)
            return _to_int(m.group(1)) if m else None

        agent_count = g("agent_count")
        # Guard against false positives: assistant messages that QUOTE a
        # task-notification (e.g. a session-review rapport reproducing the
        # <usage> block, or an Edit's new_string) contain the literal tags but
        # no real metric values. Only count entries with a parsed agent_count.
        if agent_count is None:
            continue
        tid = re.search(r"<task-id>([^<]+)</task-id>", text)
        entry = {
            "task_id": tid.group(1) if tid else None,
            "agent_count": agent_count,
            "subagent_tokens": g("subagent_tokens"),
            "tool_uses": g("tool_uses"),
            "duration_ms": g("duration_ms"),
        }
        # Dedupe by task_id — the same completion is persisted both as a
        # `queue-operation` event and as a `user` task-notification event.
        if not any(
            e["task_id"] == entry["task_id"] and e["agent_count"] == entry["agent_count"]
            for e in out
        ):
            out.append(entry)
    return out


def _browser_verification(tool_usage):
    """v1.23 additive — aggregate browser/visual-verification tool calls.

    Derived read-only from the tool_usage Counter; does not mutate it. Buckets:
      - chrome_mcp:   mcp__Claude_in_Chrome__* (DOM/JS/navigate/console/screenshot)
      - claude_preview: preview_* and mcp__Claude_Preview__* (dev-server preview)
      - computer_use: mcp__computer-use__* (desktop screenshots/clicks)
    Surfaces whether previewable UI was actually exercised in a browser vs only
    asserted via API/unit tests.
    """
    chrome = preview = computer = 0
    by_tool = {}
    for name, count in tool_usage.items():
        low = name.lower()
        is_browser = False
        if "claude_in_chrome" in low or "claude-in-chrome" in low:
            chrome += count
            is_browser = True
        elif low.startswith("preview_") or "claude_preview" in low or "claude-preview" in low:
            preview += count
            is_browser = True
        elif "computer-use" in low or "computer_use" in low:
            computer += count
            is_browser = True
        if is_browser:
            by_tool[name] = count
    total = chrome + preview + computer
    return {
        "total_calls": total,
        "chrome_mcp": chrome,
        "claude_preview": preview,
        "computer_use": computer,
        "used": total > 0,
        "by_tool": by_tool,
    }


def analyze(jsonl_path: Path):
    """Read the JSONL and produce the structured report."""
    events = list(parse_jsonl(jsonl_path))
    if not events:
        return {"error": f"no events in {jsonl_path}"}

    session_id = None
    cwd = None
    git_branch = None
    version = None
    forked_from = None  # v1.6: parent sessionId when this JSONL is a /branch fork
    first_ts = None
    last_ts = None

    type_counts = Counter()
    tool_usage = Counter()
    subagent_names = Counter()
    subagent_types = Counter()
    skill_names = Counter()
    # v1.2 additive: track Agent count per assistant message to surface
    # parallel-dispatch failures (N agents in N messages vs 1 multi-tool-use).
    agent_calls_per_assistant_msg = []
    # v1.3 additive: timestamp-cluster parallel detection + orphan detection.
    # Each entry: (datetime|None, tool_use_id|None, description, subagent_type)
    agent_dispatches_with_ts = []
    # v1.3 additive: Agent tool_use_ids dispatched and ids that received a
    # tool_result. Orphaned = dispatched − received.
    agent_tool_use_ids = []  # list, not set, to preserve order
    tool_result_ids = set()
    # v1.10 additive: Workflow tool calls spawn subagents INTERNALLY (via the
    # workflow script's agent()/pipeline()/parallel() hooks). Those internal
    # subagents are NOT visible in the `subagents` block (which only counts
    # direct Agent() tool calls), so any workflow-orchestrated session
    # undercounts its true subagent fan-out. Record each Workflow call so the
    # rapport can flag the blind spot.
    workflow_calls = []  # each: {"ref": str, "mode": "inline|named|scriptPath"}

    for ev in events:
        t = ev.get("type")
        type_counts[t] += 1
        ts = ev.get("timestamp")
        ts_parsed = iso_from_timestamp(ts) if ts else None
        if ts_parsed:
            if first_ts is None or ts_parsed < first_ts:
                first_ts = ts_parsed
            if last_ts is None or ts_parsed > last_ts:
                last_ts = ts_parsed

        if session_id is None:
            session_id = ev.get("sessionId")
        if cwd is None:
            cwd = ev.get("cwd")
        if git_branch is None:
            git_branch = ev.get("gitBranch")
        if version is None:
            version = ev.get("version")
        if forked_from is None:
            ff = ev.get("forkedFrom")
            if isinstance(ff, dict):
                forked_from = ff.get("sessionId")

        if t == "assistant":
            # v1.2 additive: count Agents in this single assistant message
            agents_in_this_msg = 0
            # v1.3 additive: use richer extractor that exposes tool_use_id
            for name, inp, tuid in extract_tool_uses_with_id(ev):
                tool_usage[name] += 1
                if name == "Agent":
                    agents_in_this_msg += 1
                    # Extract subagent description + subagent_type
                    desc = inp.get("description", "(no description)")
                    stype = inp.get("subagent_type", "general-purpose")
                    subagent_names[desc] += 1
                    subagent_types[stype] += 1
                    # v1.3 additive: record dispatch with timestamp + id for
                    # later clustering + orphan detection.
                    agent_dispatches_with_ts.append(
                        (ts_parsed, tuid, desc, stype)
                    )
                    if tuid:
                        agent_tool_use_ids.append(tuid)
                elif name == "Skill":
                    skill_names[inp.get("skill", "?")] += 1
                elif name == "Workflow":
                    # v1.10 additive: identify the workflow without assuming a
                    # schema. Prefer an explicit name, then scriptPath, then a
                    # meta.name regex-sniffed from an inline script body.
                    ref = inp.get("name") or inp.get("scriptPath")
                    mode = "named" if inp.get("name") else (
                        "scriptPath" if inp.get("scriptPath") else "inline"
                    )
                    if not ref:
                        script_body = inp.get("script", "") or ""
                        m = re.search(r"name\s*:\s*['\"]([^'\"]+)['\"]", script_body)
                        ref = m.group(1) if m else "(inline workflow)"
                    workflow_calls.append({"ref": ref, "mode": mode})
            # v1.2 additive: record only if message had at least 1 Agent
            if agents_in_this_msg > 0:
                agent_calls_per_assistant_msg.append(agents_in_this_msg)

        # v1.3 additive: harvest tool_result ids from user events to compute
        # orphaned Agents (dispatched but no result returned).
        if t == "user":
            ucontent = ev.get("message", {}).get("content", [])
            if isinstance(ucontent, list):
                for block in ucontent:
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        rid = block.get("tool_use_id")
                        if rid:
                            tool_result_ids.add(rid)

    duration_s = (
        int((last_ts - first_ts).total_seconds()) if (first_ts and last_ts) else None
    )
    # v1.21 additive: active (idle-trimmed) duration, so a 44h "open" session is
    # not mistaken for 44h of work. Existing duration_* keys are preserved.
    active_dur = compute_active_duration(events)

    total_user_events, user_turns = collect_user_turns(events)
    user_turns = classify_user_turns(user_turns)
    turn_category_counts = Counter(t["category"] for t in user_turns)
    failure_patterns = detect_retries_and_failures(events)

    # v1.3 additive: cluster Agent dispatches within 60s windows. Per-message
    # uuid counting (v1.2) misses intent-based parallelism because each tool_use
    # is persisted in a separate assistant message even when composed in one
    # function_calls block by the orchestrator. Timestamp clustering recovers
    # the dispatch intent.
    ts_clusters = []
    if agent_dispatches_with_ts:
        sorted_dispatches = sorted(
            [d for d in agent_dispatches_with_ts if d[0] is not None],
            key=lambda x: x[0],
        )
        current = []
        prev_ts = None
        WINDOW_SEC = 60
        for ts, tuid, desc, stype in sorted_dispatches:
            if prev_ts is not None and (ts - prev_ts).total_seconds() >= WINDOW_SEC:
                if len(current) >= 2:
                    ts_clusters.append(current)
                current = []
            current.append({"ts": ts.isoformat(), "id": tuid, "desc": desc, "type": stype})
            prev_ts = ts
        if len(current) >= 2:
            ts_clusters.append(current)

    # v1.3 additive: orphaned agents — dispatched but no tool_result returned.
    # These are zombie agents the orchestrator lost track of (the failure mode
    # that surfaced T15 in the 2026-05-13 B1 backlog cleanup session).
    orphaned_agent_ids = [
        tuid for tuid in agent_tool_use_ids if tuid and tuid not in tool_result_ids
    ]
    # Map orphans back to their description for human-readable reporting.
    orphan_id_to_desc = {
        tuid: desc for (_, tuid, desc, _) in agent_dispatches_with_ts if tuid
    }
    orphaned_agents_detail = [
        {"id": tuid, "desc": orphan_id_to_desc.get(tuid, "(unknown)")}
        for tuid in orphaned_agent_ids
    ]
    # v1.3 additive: extend failure_patterns dict with orphan count. Pure
    # additive: existing keys preserved.
    failure_patterns["orphaned_agents"] = {
        "count": len(orphaned_agents_detail),
        "items": orphaned_agents_detail[:10],
    }

    signals_for_tier = {
        "tool_usage": dict(tool_usage),
        "subagents_count_total": sum(subagent_types.values()),
        "user_turns_nontrivial": len(user_turns),
    }
    scope_tier = classify_scope_tier(signals_for_tier)

    # v1.7 additive: commits landed during the session's time window.
    commits_during_session = extract_commits_during_session(cwd, first_ts, last_ts)
    # v1.16 additive: cross-check window-attributed commits against `git commit`
    # tool calls actually observed, to flag out-of-band / concurrent commits.
    if isinstance(commits_during_session, dict):
        _git_commit_calls = count_git_commit_tool_calls(events)
        commits_during_session["git_commit_tool_calls_observed"] = _git_commit_calls
        if commits_during_session.get("count", 0) > 0 and _git_commit_calls == 0:
            commits_during_session["attribution_note"] = (
                "commits in window but no `git commit` tool call observed this "
                "session — likely out-of-band / concurrent, not session-authored"
            )

    report = {
        "session": {
            "id": session_id,
            "cwd": cwd,
            "git_branch": git_branch,
            "claude_code_version": version,
            "jsonl_path": str(jsonl_path),
            "first_event_utc": first_ts.isoformat() if first_ts else None,
            "last_event_utc": last_ts.isoformat() if last_ts else None,
            "duration_seconds": duration_s,
            "duration_minutes_rounded": round(duration_s / 60, 1) if duration_s else None,
            # v1.21 additive: idle-trimmed work-span (gaps > 30 min excluded).
            "active_duration_seconds": active_dur["active_seconds"],
            "active_duration_minutes_rounded": active_dur["active_minutes_rounded"],
            "idle_gaps_excluded": active_dur["idle_gaps_excluded"],
            "forked_from": forked_from,
        },
        "scope_tier": scope_tier,
        "event_counts": dict(type_counts),
        "turns": {
            "user_total_events": total_user_events,
            "user_nontrivial": len(user_turns),
            "assistant": type_counts.get("assistant", 0),
            "user_turns_by_category": dict(turn_category_counts),
            # v1.9 additive: how many "user" turns were actually harness-injected
            # background-task / system notifications (not genuine user input).
            "harness_injected_turns": sum(
                1 for t in user_turns if t.get("harness_injected")
            ),
        },
        "user_turns_detail": user_turns,
        "tool_usage": dict(tool_usage.most_common()),
        "tool_usage_total": sum(tool_usage.values()),
        # v1.23 additive — browser/visual verification footprint (derived from
        # tool_usage keys; never mutates them).
        "browser_verification": _browser_verification(tool_usage),
        "subagents": {
            "total_dispatches": sum(subagent_types.values()),
            "by_type": dict(subagent_types),
            "by_description": dict(subagent_names.most_common(20)),
        },
        # v1.2 additive — surface parallel-dispatch failures.
        # `solo_messages`: count of assistant messages with exactly 1 Agent call
        # `parallel_messages`: count of assistant messages with 2+ Agent calls
        # `max_parallelism`: largest N of agents in a single message
        # `messages_with_agents`: total messages that dispatched ≥1 Agent
        # When subagents.total_dispatches > messages_with_agents, the orchestrator
        # batched well. When equal, every Agent was solo (parallel-dispatch failure
        # if the dispatches were known to be independent — see
        # .claude/rules/parallel-dispatch.md).
        "agent_dispatch_pattern": {
            "solo_messages": sum(
                1 for n in agent_calls_per_assistant_msg if n == 1
            ),
            "parallel_messages": sum(
                1 for n in agent_calls_per_assistant_msg if n >= 2
            ),
            "max_parallelism": (
                max(agent_calls_per_assistant_msg)
                if agent_calls_per_assistant_msg
                else 0
            ),
            "messages_with_agents": len(agent_calls_per_assistant_msg),
            "per_message_distribution": list(agent_calls_per_assistant_msg),
        },
        # v1.3 additive: timestamp-based parallel detection. Each cluster is a
        # group of ≥2 Agents dispatched within 60s — the orchestrator's
        # intent-level parallelism even when persisted as separate messages.
        "agent_dispatch_pattern_v1_3": {
            "timestamp_clusters": [
                {
                    "size": len(cl),
                    "first_ts": cl[0]["ts"],
                    "last_ts": cl[-1]["ts"],
                    "descriptions": [c["desc"][:60] for c in cl],
                    "subagent_types": list({c["type"] for c in cl}),
                }
                for cl in ts_clusters
            ],
            "max_cluster_size": (
                max((len(cl) for cl in ts_clusters), default=0)
            ),
            "total_clusters": len(ts_clusters),
            "agents_in_clusters": sum(len(cl) for cl in ts_clusters),
        },
        "skills_invoked": {
            "total": sum(skill_names.values()),
            "by_name": dict(skill_names),
        },
        # v1.10 additive: Workflow tool calls + the subagent-undercount warning.
        # `internal_subagents_uncounted` is True whenever a Workflow ran, because
        # its internally-spawned agents are NOT in the `subagents` block above —
        # the reviewer must read the workflow transcript dir to count them.
        "workflows_invoked": {
            "total": len(workflow_calls),
            "calls": workflow_calls,
            "internal_subagents_uncounted": len(workflow_calls) > 0,
        },
        # v1.15 additive: true fan-out metrics parsed from workflow-completion
        # <usage> blocks (agent_count / subagent_tokens / tool_uses / duration_ms).
        # Complements `workflows_invoked.internal_subagents_uncounted` by giving
        # the actual numbers the reviewer would otherwise grep from the JSONL.
        "workflow_fanout": extract_workflow_fanout(events),
        # v1.8 additive: skills/commands launched via slash command (not Skill()).
        "slash_commands_invoked": extract_slash_commands(user_turns),
        "failure_patterns": failure_patterns,
        # v1.20 additive: context compactions + autonomous Stop-hook (/goal, /loop)
        # spans, so the rapport can grade compaction-recovery quality and attribute
        # long no-user-turn tool runs to a real directive instead of scope creep.
        "harness_events": detect_harness_events(events),
        # v1.7 additive: git commits within [first_event, last_event].
        "commits_during_session": commits_during_session,
        # v1.17 additive: branches created/switched via Bash during the session
        # (the session-start `git branch` header goes stale otherwise).
        "branches_created": extract_branches_created(events),
        # v1.19 additive: every *.jsonl in the project dir (so the reviewer can
        # spot wrong auto-selection). Does not change which session was analyzed.
        "candidate_sessions": enumerate_candidate_sessions(cwd, jsonl_path),
    }
    return report


# ─── Markdown rendering ─────────────────────────────────────────────────────


def render_markdown(report):
    """Render a concise markdown summary of the report."""
    if "error" in report:
        return f"**ERROR:** {report['error']}\n"

    s = report["session"]
    lines = [
        "## Session signals (deterministic)",
        "",
        f"- **Session ID:** `{s['id']}`",
        f"- **Project cwd:** `{s['cwd']}`",
        f"- **Git branch:** `{s['git_branch']}`",
        f"- **Duration:** {s['duration_minutes_rounded']} min ({s['duration_seconds']}s)",
        # v1.21 additive: active (idle-trimmed) span. Only surface when it
        # materially differs from wall-clock (idle gaps were excluded), so short
        # continuous sessions stay uncluttered.
        *(
            [
                f"- **Active span (idle-trimmed):** "
                f"{s.get('active_duration_minutes_rounded')} min "
                f"({s.get('idle_gaps_excluded')} idle gap(s) > 30 min excluded — "
                f"wall-clock above overcounts work effort)"
            ]
            if s.get("idle_gaps_excluded")
            else []
        ),
        f"- **Scope tier (auto-detected):** **{report['scope_tier']}**",
        "",
    ]
    if s.get("forked_from"):
        lines += [
            f"> ⚠️ **Forked session** — this JSONL was created by `/branch` from parent "
            f"`{s['forked_from']}`. The counts below may be INCOMPLETE: a fork often "
            f"omits subagent dispatches and tool calls from before the branch point. "
            f"For an accurate retrospective, re-run against the parent: "
            f"`analyze_session.py --session {s['forked_from']}`.",
            "",
        ]
    # v1.19 additive: multi-session ambiguity warning. Auto-selection picks the
    # most-recently-modified JSONL; when a parallel session was touched in the same
    # ~60 min window, that pick can be wrong. Surface the siblings so the reviewer
    # can verify the ID or re-run with --session. Purely additive.
    cands = report.get("candidate_sessions", [])
    if len(cands) > 1:
        sel = next((c for c in cands if c.get("is_selected")), None)
        sel_m = sel.get("mtime_epoch") if sel else None
        near = [
            c for c in cands
            if not c.get("is_selected")
            and sel_m is not None and c.get("mtime_epoch") is not None
            and abs(c["mtime_epoch"] - sel_m) <= 3600
        ]
        if near:
            lines += [
                "> ⚠ **Multiple sessions detected** — auto-selection (most-recent "
                "mtime) may be wrong; verify the ID above or pass "
                "`--session <uuid>`. Sibling sessions modified within ~60 min:",
            ]
            for c in near:
                lines.append(
                    f">   - `{c['session_id']}` — {c['user_turn_count']} user turns, "
                    f"{c['size_bytes']:,} bytes, mtime {c['mtime'][11:19]}"
                )
            lines.append("")
    lines += [
        "### Turns",
        f"- User turns (non-trivial): **{report['turns']['user_nontrivial']}**",
        f"- Assistant turns: **{report['turns']['assistant']}**",
        "",
        "### Tool usage (total: "
        f"{report['tool_usage_total']})",
    ]
    for name, count in list(report["tool_usage"].items())[:12]:
        lines.append(f"- `{name}`: {count}")
    bv = report.get("browser_verification")
    if bv and bv.get("total_calls"):
        lines.append("")
        lines.append(
            f"### Browser / visual verification ({bv['total_calls']} calls)"
        )
        lines.append(
            f"- chrome_mcp: {bv['chrome_mcp']} · claude_preview: "
            f"{bv['claude_preview']} · computer_use: {bv['computer_use']}"
        )
        lines.append(
            "- _Signal: previewable UI was exercised in a real browser, "
            "not only via API/unit tests._"
        )
    if report["subagents"]["total_dispatches"]:
        lines.append("")
        lines.append(
            f"### Subagents dispatched ({report['subagents']['total_dispatches']} total)"
        )
        lines.append("- By `subagent_type`:")
        for stype, count in report["subagents"]["by_type"].items():
            lines.append(f"    - `{stype}`: {count}")
        by_desc = report["subagents"].get("by_description", {})
        if by_desc:
            lines.append("- By dispatch `description`:")
            for desc, count in by_desc.items():
                lines.append(f"    - `{desc}`: {count}")
        # v1.2 additive: render Agent dispatch pattern (solo vs parallel)
        adp = report.get("agent_dispatch_pattern", {})
        if adp and adp.get("messages_with_agents", 0) > 0:
            lines.append("")
            lines.append("### Agent dispatch pattern (parallel vs solo)")
            lines.append(
                f"- Messages with ≥1 Agent: **{adp['messages_with_agents']}**"
            )
            lines.append(f"- Solo (1 Agent/msg): **{adp['solo_messages']}**")
            lines.append(
                f"- Parallel (2+ Agents/msg): **{adp['parallel_messages']}**"
            )
            lines.append(f"- Max parallelism in a single msg: **{adp['max_parallelism']}**")
            dist = adp.get("per_message_distribution", [])
            if dist:
                lines.append(f"- Per-message distribution: {dist}")
            # Heuristic flag: total dispatches == messages_with_agents AND
            # multiple dispatches → all solo, suspect of parallel-dispatch failure.
            total_disp = report["subagents"]["total_dispatches"]
            if (
                total_disp >= 3
                and adp["solo_messages"] == adp["messages_with_agents"]
                and adp["parallel_messages"] == 0
            ):
                lines.append(
                    "- ⚠️ **All Agents dispatched solo** (no parallel batching). "
                    "If any of these were independent, see "
                    "`.claude/rules/parallel-dispatch.md` — should have been 1 message."
                )
                # v1.5 additive: cross-reference timestamp clusters. If the
                # cluster detector found ≥2 agents in a tight window, the
                # warning above is likely a false positive (harness split
                # tool_uses). Surface the nuance rather than mute the warning.
                _adp13_check = report.get("agent_dispatch_pattern_v1_3", {})
                _clusters_check = _adp13_check.get("timestamp_clusters", [])
                _max_cluster_check = max(
                    (c.get("size", 0) for c in _clusters_check), default=0
                )
                if _max_cluster_check >= 2:
                    lines.append(
                        f"  - ℹ️ **However, timestamp-cluster detector found "
                        f"max cluster size = {_max_cluster_check}** (see next "
                        f"section). Parallel intent likely present — the warning "
                        f"above may be a harness-split artifact, not an actual "
                        f"rule violation. Cross-check the cluster section to "
                        f"decide if `parallel-dispatch.md` was respected."
                    )

        # v1.3 additive: render timestamp-clustered parallel dispatches. This
        # surfaces intent-level parallelism the v1.2 per-message counter misses.
        adp13 = report.get("agent_dispatch_pattern_v1_3", {})
        clusters = adp13.get("timestamp_clusters", [])
        if clusters:
            lines.append("")
            lines.append(
                "### Agent dispatch — timestamp clusters (60s window, intent-based)"
            )
            lines.append(
                "_Recovers parallel-dispatch intent even when the harness splits "
                "tool_uses into separate persisted messages._"
            )
            lines.append(
                f"- Total clusters: **{adp13['total_clusters']}** · "
                f"Max cluster size: **{adp13['max_cluster_size']}** · "
                f"Agents in clusters: **{adp13['agents_in_clusters']}**"
            )
            for i, cl in enumerate(clusters, 1):
                first = cl["first_ts"][11:19] if len(cl["first_ts"]) >= 19 else cl["first_ts"]
                desc_preview = ", ".join(cl["descriptions"][:4])
                if len(cl["descriptions"]) > 4:
                    desc_preview += f", … (+{len(cl['descriptions']) - 4} more)"
                lines.append(f"  {i}. **{cl['size']}** agents @ {first} — {desc_preview}")
    if report["skills_invoked"]["total"]:
        lines.append("")
        lines.append(
            f"### Skills invoked ({report['skills_invoked']['total']} total)"
        )
        for name, count in report["skills_invoked"]["by_name"].items():
            lines.append(f"- `{name}`: {count}")
    wf = report.get("workflows_invoked", {})
    if wf.get("total"):
        lines.append("")
        lines.append(f"### Workflows invoked ({wf['total']} total)")
        for call in wf.get("calls", []):
            lines.append(f"- `{call['ref']}` ({call['mode']})")
        if wf.get("internal_subagents_uncounted"):
            lines.append(
                "- ⚠️ **Subagent undercount:** workflow-internal agents "
                "(spawned via `agent()`/`pipeline()`/`parallel()`) are NOT in the "
                "`subagents` block above. Read the workflow transcript dir "
                "(`.../subagents/workflows/wf_*/agent-*.jsonl`) for the true fan-out."
            )
    fanout = report.get("workflow_fanout", [])
    if fanout:
        lines.append("")
        lines.append("### Workflow fan-out (true cost, from <usage> blocks)")
        for f in fanout:
            toks = f.get("subagent_tokens")
            toks_str = f"{toks:,}" if isinstance(toks, int) else "?"
            dur = f.get("duration_ms")
            dur_str = f"{round(dur / 60000, 1)} min" if isinstance(dur, int) else "?"
            lines.append(
                f"- `{f.get('task_id') or '?'}` — **{f.get('agent_count') or '?'}** agents, "
                f"**{toks_str}** subagent tokens, {f.get('tool_uses') or '?'} tool uses, {dur_str}"
            )
    sci = report.get("slash_commands_invoked", {})
    if sci.get("total"):
        lines.append("")
        lines.append(f"### Slash commands invoked ({sci['total']} total)")
        for name, count in sci["by_name"].items():
            lines.append(f"- `/{name}`: {count}")
    lines.append("")
    lines.append("### User turns by category")
    for cat, count in report["turns"]["user_turns_by_category"].items():
        lines.append(f"- `{cat}`: {count}")
    lines.append("")
    lines.append("### User turns detail (for qualitative interpretation)")
    lines.append(
        "_Each turn shows: category, length, tool-uses since previous user message. "
        "Short turns after many tool uses are typically interventions/corrections; "
        "long turns with zero prior tools are new requests._"
    )
    for t in report["user_turns_detail"]:
        # v1.4 additive: surface urgency_intervention with a marker so the
        # rapport author sees harsh corrections distinctly from plain ones.
        urgency_marker = " ⚠️URGENT" if t.get("urgency_intervention") else ""
        # v1.9 additive: mark harness-injected (background-task / system) turns so
        # the rapport author discounts them from genuine user interventions.
        harness_marker = " 🤖harness-injected" if t.get("harness_injected") else ""
        # v1.11 additive: mark correction-keyword turns so a long turn that is
        # really "you didn't fix X" is not read as a fresh request by length alone.
        correction_marker = " ✏️CORRECTION" if t.get("correction_keyword_detected") else ""
        # v1.14 additive: mark turns that explicitly requested deeper reasoning
        # (ultrathink/ultracode/think hard) so the author attributes response depth
        # to an explicit ask rather than reading it as scope creep.
        reasoning_marker = " 🧠REASONING-ASK" if t.get("reasoning_directive_detected") else ""
        # v1.18 additive: mark harness image echoes ("[Image: original WxH…]") so
        # likely_intervention turns that are mechanical Read-image side effects
        # are discounted from genuine user interventions.
        image_echo_marker = " 🖼️IMAGE-ECHO" if t.get("image_echo_detected") else ""
        # v1.28 additive: mark turns interrupted by the ENVIRONMENT (rate-limit,
        # restart, API overloaded, session limit) so they aren't read as user
        # corrections when they land in `other`/`likely_intervention`.
        external_interruption_marker = " 🌐EXTERNAL-INTERRUPT" if t.get("external_interruption_detected") else ""
        lines.append(
            f"{t['ordinal']}. [{t['category']}]{urgency_marker}{harness_marker}{correction_marker}{reasoning_marker}{image_echo_marker}{external_interruption_marker} {t['length']} chars, "
            f"{t['tool_uses_since_prev_user']} tools since prev user — "
            f"{t['preview'][:140]!r}"
        )
    fp = report["failure_patterns"]
    # v1.3 additive: orphaned_agents is now a dict; render it specially so the
    # simple "if v" loop doesn't print {count: N, items: [...]} verbatim.
    orph = fp.get("orphaned_agents", {}) if isinstance(fp, dict) else {}
    # v1.12 additive: tool_error_kinds is a dict — render it as sub-bullets, not
    # verbatim, so exclude it from the flat loop (same pattern as orphaned_agents).
    err_kinds = fp.get("tool_error_kinds", {}) if isinstance(fp, dict) else {}
    flat_fp_keys = [
        k for k in fp.keys() if k not in ("orphaned_agents", "tool_error_kinds")
    ]
    has_flat = any(fp.get(k) for k in flat_fp_keys)
    has_orph = isinstance(orph, dict) and orph.get("count", 0) > 0
    has_err_kinds = isinstance(err_kinds, dict) and len(err_kinds) > 0
    if has_flat or has_orph or has_err_kinds:
        lines.append("")
        lines.append("### Failure patterns detected")
        for k in flat_fp_keys:
            v = fp.get(k)
            if v:
                lines.append(f"- {k}: **{v}**")
        if has_err_kinds:
            kinds_str = ", ".join(
                f"{k} ×{v}" for k, v in sorted(err_kinds.items(), key=lambda kv: -kv[1])
            )
            lines.append(f"- tool_error_kinds: {kinds_str}")
        if has_orph:
            lines.append(
                f"- ⚠️ **orphaned_agents: {orph['count']}** "
                "(Agent dispatched, no tool_result returned — zombie agent the "
                "orchestrator lost track of)"
            )
            for item in orph.get("items", []):
                lines.append(f"    - `{item['id']}` — {item['desc'][:60]}")
    # v1.20 additive: harness events — compactions + autonomous Stop-hook spans.
    he = report.get("harness_events", {})
    if isinstance(he, dict) and (he.get("compactions_detected") or he.get("stop_hook_activations")):
        lines.append("")
        lines.append("### Harness events")
        if he.get("compactions_detected"):
            lines.append(
                f"- compactions_detected: **{he['compactions_detected']}** "
                "(grade context-recovery quality, not the compaction itself)"
            )
        if he.get("stop_hook_activations"):
            lines.append(
                f"- stop_hook_activations: **{he['stop_hook_activations']}** "
                "(/goal or /loop autonomous span — attribute deep no-user-turn tool runs to this)"
            )
    # v1.7 additive: commits landed during the session's time window.
    cds = report.get("commits_during_session", {})
    lines.append("")
    lines.append("### Commits during session")
    if cds.get("count"):
        lines.append(f"- **{cds['count']}** commit(s) landed in the session window:")
        for c in cds["commits"][:30]:
            lines.append(f"    - `{c['hash']}` {c['subject']}")
        if cds.get("attribution_note"):
            lines.append(
                f"- ⚠️ {cds['attribution_note']} "
                f"(observed `git commit` tool calls: "
                f"{cds.get('git_commit_tool_calls_observed', 0)})"
            )
    else:
        lines.append(f"- 0 commits ({cds.get('note', 'none')}).")
        # v1.29 additive: cwd-scoped `git log` misses commits landed in OTHER
        # repos the session cd'd into. When Bash tool calls DID run `git commit`,
        # surface the observed count so "0 commits" isn't misread as "none authored".
        _observed_zero_case = cds.get("git_commit_tool_calls_observed", 0)
        if _observed_zero_case:
            lines.append(
                f"- ⚠️ **{_observed_zero_case} `git commit` tool call(s) observed in Bash** despite 0 commits "
                f"in the session cwd's git log — commits likely landed in OTHER repos "
                f"(session cd'd into them). Cite them via each repo's `git log`, not this section."
            )

    # v1.17 additive: branches created/switched during the session.
    bc = report.get("branches_created", {})
    if bc.get("created") or bc.get("switched_to"):
        lines.append("")
        lines.append("### Branches created/switched during session")
        if bc.get("created"):
            lines.append(
                f"- Created: {', '.join('`' + b + '`' for b in bc['created'])}"
                " — ⚠️ the header `git branch` reflects session START; commits"
                " above likely landed on the created branch."
            )
        if bc.get("switched_to"):
            lines.append(
                f"- Switched to: {', '.join('`' + b + '`' for b in bc['switched_to'])}"
            )

    lines.append("")
    return "\n".join(lines)


# ─── Cross-session rollup (v1.21 additive) ──────────────────────────────────


def rollup(cwd, limit=None, idle_threshold_sec=1800):
    """v1.21 additive: aggregate the N most-recent sessions for a project.

    The single-session analyzer was complete for one transcript, but a *project*
    retrospective (observed 2026-06-16: "analyze the last ~10 sessions of this
    project") forced a hand-written aggregator over per-session JSON dumps. This
    builds that rollup natively: a per-session summary row plus merged totals
    (subagent types, skills, slash commands, tool-error kinds, parallelism,
    commits, harness events). Purely additive — runs ONLY under `--rollup`; the
    default single-session path and schema are untouched.

    `limit` = None → all sessions in the project dir; an int → the N most recent
    by mtime. Each session is analyzed with the same `analyze()` used standalone,
    so every per-session field stays consistent with single-session output.
    """
    cands = enumerate_candidate_sessions(cwd, None)
    if limit is not None:
        cands = cands[:limit]

    per_session = []
    sub_types = Counter()
    skills = Counter()
    slash = Counter()
    err_kinds = Counter()
    tool_usage_all = Counter()
    tot = {
        "tool_uses": 0, "agents": 0, "commits": 0, "tool_errors": 0,
        "parallel_messages": 0, "compactions": 0, "stop_hooks": 0,
    }
    max_par = 0
    sessions_with_parallel = 0

    for c in cands:
        path = find_session_by_id(c["session_id"], cwd)
        if not path:
            continue
        rep = analyze(path)
        if "error" in rep:
            continue
        s = rep["session"]
        adp = rep.get("agent_dispatch_pattern", {})
        fp = rep.get("failure_patterns", {})
        he = rep.get("harness_events", {})
        cds = rep.get("commits_during_session", {})
        par_msgs = adp.get("parallel_messages", 0)
        if par_msgs > 0:
            sessions_with_parallel += 1
        max_par = max(max_par, adp.get("max_parallelism", 0))

        per_session.append({
            "session_id": s.get("id"),
            "date": (s.get("first_event_utc") or "")[:10],
            "git_branch": s.get("git_branch"),
            "scope_tier": rep.get("scope_tier"),
            "duration_minutes_rounded": s.get("duration_minutes_rounded"),
            "active_duration_minutes_rounded": s.get("active_duration_minutes_rounded"),
            "tool_total": rep.get("tool_usage_total", 0),
            "agents": rep.get("subagents", {}).get("total_dispatches", 0),
            "max_parallelism": adp.get("max_parallelism", 0),
            "parallel_messages": par_msgs,
            "commits": cds.get("count", 0),
            "tool_errors": fp.get("tool_errors", 0),
            "compactions": he.get("compactions_detected", 0),
            "stop_hook_activations": he.get("stop_hook_activations", 0),
        })

        for k, v in rep.get("subagents", {}).get("by_type", {}).items():
            sub_types[k] += v
        for k, v in rep.get("skills_invoked", {}).get("by_name", {}).items():
            skills[k] += v
        for k, v in rep.get("slash_commands_invoked", {}).get("by_name", {}).items():
            slash[k] += v
        for k, v in fp.get("tool_error_kinds", {}).items():
            err_kinds[k] += v
        for k, v in rep.get("tool_usage", {}).items():
            tool_usage_all[k] += v
        tot["tool_uses"] += rep.get("tool_usage_total", 0)
        tot["agents"] += rep.get("subagents", {}).get("total_dispatches", 0)
        tot["commits"] += cds.get("count", 0)
        tot["tool_errors"] += fp.get("tool_errors", 0)
        tot["parallel_messages"] += par_msgs
        tot["compactions"] += he.get("compactions_detected", 0)
        tot["stop_hooks"] += he.get("stop_hook_activations", 0)

    return {
        "project_cwd": cwd,
        "sessions_available": len(enumerate_candidate_sessions(cwd, None)),
        "sessions_analyzed": len(per_session),
        "limit": limit,
        "per_session": per_session,
        "aggregate": {
            "totals": tot,
            "max_parallelism_any_session": max_par,
            "sessions_with_parallel_dispatch": sessions_with_parallel,
            "subagent_types": dict(sub_types.most_common()),
            "skills_invoked": dict(skills.most_common()),
            "slash_commands_invoked": dict(slash.most_common()),
            "tool_error_kinds": dict(err_kinds.most_common()),
            "tool_usage": dict(tool_usage_all.most_common(20)),
        },
    }


def render_rollup_markdown(r):
    """v1.21 additive: markdown table + aggregate blocks for a `--rollup` report."""
    if not r.get("per_session"):
        return f"**No analyzable sessions found for** `{r.get('project_cwd')}`\n"
    lines = [
        "## Cross-session rollup (deterministic)",
        "",
        f"- **Project:** `{r['project_cwd']}`",
        f"- **Sessions analyzed:** {r['sessions_analyzed']} "
        f"(of {r['sessions_available']} in project dir"
        + (f", limited to {r['limit']} most recent)" if r.get("limit") else ")"),
        "",
        "### Per-session map",
        "",
        "| id | date | branch | tier | wall(min) | active(min) | tools | agents | par | commits | errs |",
        "|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|",
    ]
    for p in r["per_session"]:
        br = (p.get("git_branch") or "?")[:24]
        sid = (p.get("session_id") or "?")[:8]
        lines.append(
            f"| `{sid}` | {p.get('date','')} | {br} | {p.get('scope_tier','?')} | "
            f"{p.get('duration_minutes_rounded') or 0:.0f} | "
            f"{p.get('active_duration_minutes_rounded') or 0:.0f} | "
            f"{p.get('tool_total',0)} | {p.get('agents',0)} | "
            f"{p.get('max_parallelism',0)} | {p.get('commits',0)} | "
            f"{p.get('tool_errors',0)} |"
        )
    agg = r["aggregate"]
    tot = agg["totals"]
    lines += [
        "",
        "### Aggregate totals",
        f"- Tool uses: **{tot['tool_uses']}** · Agents: **{tot['agents']}** · "
        f"Commits: **{tot['commits']}** · Tool errors: **{tot['tool_errors']}**",
        f"- Parallel-dispatch messages (all sessions): **{tot['parallel_messages']}** · "
        f"Max parallelism in any session: **{agg['max_parallelism_any_session']}** · "
        f"Sessions that ever dispatched in parallel: "
        f"**{agg['sessions_with_parallel_dispatch']}/{r['sessions_analyzed']}**",
        f"- Compactions: **{tot['compactions']}** · Stop-hook spans: **{tot['stop_hooks']}**",
    ]
    if agg["subagent_types"]:
        lines.append("")
        lines.append("### Subagent types (all sessions)")
        for k, v in agg["subagent_types"].items():
            lines.append(f"- `{k}`: {v}")
    if agg["skills_invoked"]:
        lines.append("")
        lines.append("### Skills (all sessions)")
        for k, v in agg["skills_invoked"].items():
            lines.append(f"- `{k}`: {v}")
    if agg["slash_commands_invoked"]:
        lines.append("")
        lines.append("### Slash commands (all sessions)")
        for k, v in agg["slash_commands_invoked"].items():
            lines.append(f"- `/{k}`: {v}")
    if agg["tool_error_kinds"]:
        lines.append("")
        lines.append("### Tool-error kinds (all sessions)")
        for k, v in agg["tool_error_kinds"].items():
            lines.append(f"- {k}: {v}")
    lines.append("")
    return "\n".join(lines)


# ─── CLI ────────────────────────────────────────────────────────────────────


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--cwd", default=None,
                   help="Project cwd (default: current working directory)")
    p.add_argument("--session", default=None,
                   help="Session UUID (overrides auto-detect)")
    p.add_argument("--file", default=None,
                   help="Direct path to .jsonl (overrides other flags)")
    p.add_argument("--json", action="store_true",
                   help="Output machine-readable JSON only")
    p.add_argument("--md", action="store_true",
                   help="Output human-readable markdown only")
    # v1.21 additive: cross-session rollup. `--rollup` alone = all sessions in the
    # project dir; `--rollup N` = the N most recent. Emits a per-session table +
    # merged aggregate. Single-session behavior is unchanged when --rollup is absent.
    p.add_argument("--rollup", nargs="?", const="all", default=None,
                   help="Aggregate sessions for the project (optional: N most recent)")
    # v1.24 additive: --last N is an ergonomic alias for --rollup N ("review the
    # last N sessions" / "review les N dernieres sessions"). It folds into --rollup
    # just below, so --rollup keeps its exact meaning and the single-session path
    # is untouched when neither flag is passed.
    p.add_argument("--last", nargs="?", const="all", default=None,
                   help="Alias for --rollup: aggregate the last N sessions (or all)")
    args = p.parse_args()

    # v1.24 additive: fold --last into --rollup (alias). If both are given, --rollup wins.
    if args.rollup is None and args.last is not None:
        args.rollup = args.last

    # v1.21 additive: rollup mode short-circuits the single-session path.
    if args.rollup is not None:
        cwd = args.cwd or os.getcwd()
        limit = None
        if args.rollup != "all":
            try:
                limit = int(args.rollup)
            except (TypeError, ValueError):
                print(f"ERROR: --rollup expects an integer or no value, got "
                      f"{args.rollup!r}", file=sys.stderr)
                sys.exit(1)
        r = rollup(cwd, limit=limit)
        if args.json:
            print(json.dumps(r, indent=2, ensure_ascii=False))
        elif args.md:
            print(render_rollup_markdown(r))
        else:
            print("```json")
            print(json.dumps(r, indent=2, ensure_ascii=False))
            print("```")
            print()
            print(render_rollup_markdown(r))
        return

    if args.file:
        jsonl_path = Path(args.file)
    else:
        cwd = args.cwd or os.getcwd()
        if args.session:
            jsonl_path = find_session_by_id(args.session, cwd)
            if not jsonl_path:
                print(f"ERROR: session {args.session} not found for cwd {cwd}",
                      file=sys.stderr)
                sys.exit(1)
        else:
            jsonl_path = find_current_session_jsonl(cwd)
            if not jsonl_path:
                print(f"ERROR: no session JSONL found for cwd {cwd}",
                      file=sys.stderr)
                print(
                    f"  Looked in: ~/.claude/projects/{encode_cwd_for_projects_dir(cwd)}/",
                    file=sys.stderr,
                )
                sys.exit(1)

    report = analyze(jsonl_path)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    elif args.md:
        print(render_markdown(report))
    else:
        # Default: both. JSON first (for programmatic consumption), then markdown.
        print("```json")
        print(json.dumps(report, indent=2, ensure_ascii=False))
        print("```")
        print()
        print(render_markdown(report))


if __name__ == "__main__":
    main()
