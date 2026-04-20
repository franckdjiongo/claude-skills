#!/usr/bin/env python3
# ANALYZER_VERSION = "v1.0 — initial extraction: session meta, tool usage, subagents,
#                         skills, turn classification (7 categories), failure patterns.
#                         Baseline established 2026-04-17."
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
    """Yield (tool_name, input) tuples from an assistant event's content."""
    content = event.get("message", {}).get("content", [])
    if not isinstance(content, list):
        return
    for block in content:
        if isinstance(block, dict) and block.get("type") == "tool_use":
            yield block.get("name", "?"), block.get("input", {})


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

        # Strip system-reminder blocks from preview text for readability
        cleaned = re.sub(r"<system-reminder>.*?</system-reminder>", "", stripped,
                         flags=re.DOTALL).strip()
        preview = cleaned[:250] if cleaned else stripped[:250]

        turns.append({
            "ordinal": len(turns) + 1,
            "length": len(stripped),
            "tool_uses_since_prev_user": tool_uses_since_prev_user,
            "is_command_invocation": is_command,
            "preview": preview.replace("\n", " "),
        })

        tool_uses_since_prev_user = 0

    return total_user_events, turns


def classify_user_turns(turns):
    """Bucket user turns into likely categories based on observable signals.

    Categories:
      - command_invocation: slash command or <command-name> wrapper
      - initial_request: first long user turn of the session (no prior tool work)
      - continuation: very short (<= 20 chars) and fits 'go', 'proceed', etc.
      - confirmation: short (<= 60 chars) with positive words
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

        if turn["is_command_invocation"]:
            turn["category"] = "command_invocation"
        elif length <= 20 and txt in CONTINUATION_WORDS:
            turn["category"] = "continuation"
        elif length <= 80 and any(c in txt for c in CONFIRMATION_TOKENS):
            turn["category"] = "confirmation"
        elif tools_before >= 3 and 20 < length <= 500:
            turn["category"] = "likely_intervention"
        elif length > 500 and tools_before >= 5:
            turn["category"] = "new_request_mid_work"
        elif tools_before == 0 and length > 100:
            turn["category"] = "initial_request"
        else:
            turn["category"] = "other"

    return turns


def detect_retries_and_failures(events):
    """Look for patterns indicating retries or tool failures."""
    patterns = {
        "empty_output_observed": 0,
        "tool_errors": 0,
        "bash_exit_nonzero": 0,
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
                if "Exit code 1" in text or "Exit code: 1" in text:
                    patterns["bash_exit_nonzero"] += 1
                if "[Tool result missing]" in text or "0-byte" in text:
                    patterns["empty_output_observed"] += 1
    return patterns


# ─── Main analysis ──────────────────────────────────────────────────────────


def analyze(jsonl_path: Path):
    """Read the JSONL and produce the structured report."""
    events = list(parse_jsonl(jsonl_path))
    if not events:
        return {"error": f"no events in {jsonl_path}"}

    session_id = None
    cwd = None
    git_branch = None
    version = None
    first_ts = None
    last_ts = None

    type_counts = Counter()
    tool_usage = Counter()
    subagent_names = Counter()
    subagent_types = Counter()
    skill_names = Counter()

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

        if t == "assistant":
            for name, inp in extract_tool_uses(ev):
                tool_usage[name] += 1
                if name == "Agent":
                    # Extract subagent description + subagent_type
                    desc = inp.get("description", "(no description)")
                    stype = inp.get("subagent_type", "general-purpose")
                    subagent_names[desc] += 1
                    subagent_types[stype] += 1
                elif name == "Skill":
                    skill_names[inp.get("skill", "?")] += 1

    duration_s = (
        int((last_ts - first_ts).total_seconds()) if (first_ts and last_ts) else None
    )

    total_user_events, user_turns = collect_user_turns(events)
    user_turns = classify_user_turns(user_turns)
    turn_category_counts = Counter(t["category"] for t in user_turns)
    failure_patterns = detect_retries_and_failures(events)

    signals_for_tier = {
        "tool_usage": dict(tool_usage),
        "subagents_count_total": sum(subagent_types.values()),
        "user_turns_nontrivial": len(user_turns),
    }
    scope_tier = classify_scope_tier(signals_for_tier)

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
        },
        "scope_tier": scope_tier,
        "event_counts": dict(type_counts),
        "turns": {
            "user_total_events": total_user_events,
            "user_nontrivial": len(user_turns),
            "assistant": type_counts.get("assistant", 0),
            "user_turns_by_category": dict(turn_category_counts),
        },
        "user_turns_detail": user_turns,
        "tool_usage": dict(tool_usage.most_common()),
        "tool_usage_total": sum(tool_usage.values()),
        "subagents": {
            "total_dispatches": sum(subagent_types.values()),
            "by_type": dict(subagent_types),
            "by_description": dict(subagent_names.most_common(20)),
        },
        "skills_invoked": {
            "total": sum(skill_names.values()),
            "by_name": dict(skill_names),
        },
        "failure_patterns": failure_patterns,
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
        f"- **Scope tier (auto-detected):** **{report['scope_tier']}**",
        "",
        "### Turns",
        f"- User turns (non-trivial): **{report['turns']['user_nontrivial']}**",
        f"- Assistant turns: **{report['turns']['assistant']}**",
        "",
        "### Tool usage (total: "
        f"{report['tool_usage_total']})",
    ]
    for name, count in list(report["tool_usage"].items())[:12]:
        lines.append(f"- `{name}`: {count}")
    if report["subagents"]["total_dispatches"]:
        lines.append("")
        lines.append(
            f"### Subagents dispatched ({report['subagents']['total_dispatches']} total)"
        )
        for stype, count in report["subagents"]["by_type"].items():
            lines.append(f"- `{stype}`: {count}")
    if report["skills_invoked"]["total"]:
        lines.append("")
        lines.append(
            f"### Skills invoked ({report['skills_invoked']['total']} total)"
        )
        for name, count in report["skills_invoked"]["by_name"].items():
            lines.append(f"- `{name}`: {count}")
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
        lines.append(
            f"{t['ordinal']}. [{t['category']}] {t['length']} chars, "
            f"{t['tool_uses_since_prev_user']} tools since prev user — "
            f"{t['preview'][:140]!r}"
        )
    fp = report["failure_patterns"]
    if any(fp.values()):
        lines.append("")
        lines.append("### Failure patterns detected")
        for k, v in fp.items():
            if v:
                lines.append(f"- {k}: **{v}**")
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
    args = p.parse_args()

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
