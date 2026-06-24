#!/usr/bin/env python3
"""
mine_friction.py — deterministic friction miner for `pipeline-audit` (WF3 leg).

Walks every transcript under ~/.claude/projects/<encoded-cwd>/ (main sessions AND
sub-agent sessions — both land as flat *.jsonl in the project dir), scans each for
friction signals, RANKS sessions by a coarse friction score, and writes readable
per-session DOSSIERS for the top-N so deep-read agents can classify root causes.

It COMPOSES session-review's analyze_session.py rather than re-implementing it:
the canonical per-session map (subagent types, skills, commits, active duration,
tool-error kinds) comes from `analyze_session.py --rollup --json`; this script
only adds the regex friction layer + dossier extraction on top.

CRITICAL CALIBRATION CONTRACT (read this before trusting any number):
  The regex signals are COARSE. They exist to ANSWER "where should a human/agent
  LOOK", not to draw conclusions. "deferral" and "resumption" hits are dominated
  by HEALTHY process — backlog DEFERRED-XXX routing, normal TDD red→green, gates
  firing, escalations to the user on irreversible steps. A high friction_score
  means "worth a deep read", NOT "defective". The deep-read agent MUST distinguish
  artifact-defect from healthy-process; this script deliberately cannot.

Output: a JSON ranking on stdout + dossier files written under --out.

Usage:
  python3 mine_friction.py [--cwd <path>] [--top 18] [--out <dir>] \
      [--rollup-n N] [--analyzer <path>] [--max-bytes 8000000]
"""
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

DEFAULT_ANALYZER = Path.home() / ".claude" / "skills" / "session-review" / "scripts" / "analyze_session.py"

# Friction signal taxonomy. Weights encode "how artifact-suspicious" a signal is:
# spec gaps / blocks / deviations are likelier to be a real upstream defect;
# deferral / resumption are likelier to be healthy process (hence low weight).
# These weights only shape RANKING — never a verdict.
SIGNALS = {
    "spec_silence_ambiguity": {
        "weight": 3.0,
        "patterns": [r"not specified", r"non sp[eé]cifi", r"unspecified", r"\bambig",
                     r"\bunclear\b", r"\bTBD\b", r"to be decided", r"[àa] d[eé]cider",
                     r"\bassume[sd]?\b", r"je suppose", r"\bguess(ed|ing)?\b",
                     r"design (is )?silent", r"doc(ument)?s? (are )?silent"],
    },
    "blocked": {
        "weight": 2.5,
        "patterns": [r"\bBLOCKER\b", r"\bblocked\b", r"bloqu[eé]", r"can'?t proceed",
                     r"cannot proceed", r"\bstuck\b", r"dead ?end"],
    },
    "deviation": {
        "weight": 2.5,
        "patterns": [r"deviat", r"d[eé]viation", r"instead of (the )?plan", r"diverge",
                     r"overrode", r"override[sd]? the", r"contradict", r"auto-?contradict",
                     r"plan (is )?wrong", r"spec (is )?wrong"],
    },
    "question_to_user": {
        "weight": 2.0,
        "patterns": [r"AskUserQuestion", r"I need to ask", r"need to clarify",
                     r"should I\b", r"do you want", r"veux-tu", r"souhait(es|ez)",
                     r"which (one )?do you", r"can you confirm", r"peux-tu confirmer"],
    },
    "deviation_rework_revert": {
        "weight": 1.5,
        "patterns": [r"\brevert", r"reverted", r"\bredo\b", r"re-?work", r"reprise",
                     r"round[ -]?2", r"round[ -]?two", r"re-?dispatch", r"re-?architect",
                     r"\bamend(ed)?\b", r"redid", r"refait"],
    },
    "deferral": {
        "weight": 0.7,
        "patterns": [r"DEFERRED-\d", r"\bdefer(red|ral)?\b", r"\bbacklog\b",
                     r"\breport[ée]\b", r"out of scope", r"hors[ -]scope", r"hors[ -]p[eé]rim"],
    },
    "resumption": {
        "weight": 0.5,
        "patterns": [r"continue from where", r"resume", r"reprend", r"lost connection",
                     r"perdu la connexion", r"pick(ing)? (this )?back up", r"HANDOFF"],
    },
}
COMPILED = {k: (v["weight"], [re.compile(p, re.I) for p in v["patterns"]]) for k, v in SIGNALS.items()}


def encode_cwd_for_projects_dir(cwd: str) -> str:
    return "-" + str(cwd).lstrip("/").replace("/", "-")


def run_rollup(analyzer: Path, cwd: str, rollup_n):
    """Compose analyze_session.py for the canonical per-session aggregate. Best-effort."""
    if not analyzer.is_file():
        return None
    cmd = [sys.executable, str(analyzer), "--cwd", cwd, "--json", "--rollup"]
    if rollup_n:
        cmd.append(str(rollup_n))
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if res.returncode == 0 and res.stdout.strip():
            # --json --rollup may print a JSON doc; take the first parseable object.
            txt = res.stdout.strip()
            try:
                return json.loads(txt)
            except Exception:
                # tolerate trailing markdown if both were emitted
                start = txt.find("{")
                if start >= 0:
                    try:
                        return json.loads(txt[start:txt.rfind("}") + 1])
                    except Exception:
                        return {"_raw_first_line": txt.splitlines()[0][:200]}
    except Exception:
        return None
    return None


def extract_readable_text(line):
    """Pull human-readable text from one JSONL transcript entry. Returns (role, text)."""
    try:
        obj = json.loads(line)
    except Exception:
        return None, line  # fall back to raw — still useful for coarse signal counts
    role = obj.get("type") or obj.get("role") or "?"
    msg = obj.get("message", obj)
    content = msg.get("content") if isinstance(msg, dict) else None
    parts = []
    if isinstance(content, str):
        parts.append(content)
    elif isinstance(content, list):
        for b in content:
            if not isinstance(b, dict):
                continue
            if b.get("type") == "text" and isinstance(b.get("text"), str):
                parts.append(b["text"])
            elif b.get("type") == "tool_result":
                c = b.get("content")
                if isinstance(c, str):
                    parts.append(c)
                elif isinstance(c, list):
                    parts.extend(x.get("text", "") for x in c if isinstance(x, dict))
    return role, "\n".join(p for p in parts if p)


def scan_session(path: Path, max_bytes: int):
    """Scan one transcript: signal counts, weighted score, excerpts, user turns."""
    counts = {k: 0 for k in SIGNALS}
    score = 0.0
    excerpts = {k: [] for k in SIGNALS}
    user_turns = []
    session_id = path.stem
    try:
        size = path.stat().st_size
    except Exception:
        size = 0
    truncated = size > max_bytes
    try:
        with path.open("r", encoding="utf-8", errors="replace") as fh:
            read = 0
            for line in fh:
                read += len(line)
                if read > max_bytes:
                    break
                role, text = extract_readable_text(line)
                if not text:
                    continue
                if role == "user":
                    t = text.strip().replace("\n", " ")
                    if t and not t.startswith("<") and len(t) > 3:
                        user_turns.append(t[:300])
                low_for_match = text
                for cat, (weight, regexes) in COMPILED.items():
                    for rx in regexes:
                        m = rx.search(low_for_match)
                        if m:
                            counts[cat] += 1
                            score += weight
                            if len(excerpts[cat]) < 4:
                                s = max(0, m.start() - 90)
                                e = min(len(text), m.end() + 90)
                                snip = text[s:e].replace("\n", " ").strip()
                                excerpts[cat].append(snip[:240])
                            break  # one hit per line per category
    except Exception:
        pass
    total = sum(counts.values())
    return {
        "file": path.name,
        "session_id": session_id,
        "size_bytes": size,
        "scan_truncated": truncated,
        "friction_score": round(score, 1),
        "total_signals": total,
        "by_category": counts,
        "excerpts": excerpts,
        "user_turns": user_turns[:25],
        "user_turn_count": len(user_turns),
    }


def write_dossier(out_dir: Path, rank: int, s: dict):
    out_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", s["session_id"])[:60]
    path = out_dir / f"{rank:02d}-{safe}.md"
    lines = [
        f"# Dossier #{rank} — session `{s['session_id']}`",
        "",
        f"- File: `{s['file']}`",
        f"- Friction score (coarse, ranking-only): **{s['friction_score']}**  ·  total signals: {s['total_signals']}",
        f"- User turns captured: {s['user_turn_count']}"
        + ("  ·  ⚠️ scan truncated (large transcript)" if s["scan_truncated"] else ""),
        "",
        "> CALIBRATION: these are regex hits, not defects. Classify each episode as",
        "> artifact-defect vs healthy-process (gate firing / backlog routing / TDD red→green /",
        "> escalation to user on irreversible steps). Many high-count categories are healthy.",
        "",
        "## Signal counts by category",
        "",
        "| Category | Count |",
        "|---|---|",
    ]
    for cat, n in sorted(s["by_category"].items(), key=lambda kv: -kv[1]):
        lines.append(f"| {cat} | {n} |")
    lines += ["", "## Matched excerpts (where to look)", ""]
    for cat, snips in s["excerpts"].items():
        if not snips:
            continue
        lines.append(f"### {cat}")
        for sn in snips:
            lines.append(f"- …{sn}…")
        lines.append("")
    lines += ["## User turns (what the human steered)", ""]
    for t in s["user_turns"]:
        lines.append(f"- {t}")
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")
    return str(path)


def main():
    ap = argparse.ArgumentParser(description="Friction miner for pipeline-audit WF3.")
    ap.add_argument("--cwd", default=os.getcwd())
    ap.add_argument("--top", type=int, default=18, help="how many dossiers to write")
    ap.add_argument("--out", default=None, help="dossier output dir (default: <cwd>/.pipeline-audit/dossiers)")
    ap.add_argument("--rollup-n", default=None, help="pass N to analyze_session.py --rollup (default: all)")
    ap.add_argument("--analyzer", default=str(DEFAULT_ANALYZER))
    ap.add_argument("--max-bytes", type=int, default=8_000_000, help="cap per-transcript scan to bound cost")
    args = ap.parse_args()

    cwd = str(Path(args.cwd).resolve())
    out_dir = Path(args.out) if args.out else Path(cwd) / ".pipeline-audit" / "dossiers"
    encoded = encode_cwd_for_projects_dir(cwd)
    proj_dir = Path.home() / ".claude" / "projects" / encoded

    result = {
        "project_dir": str(proj_dir),
        "weights": {k: v["weight"] for k, v in SIGNALS.items()},
        "note": ("Coarse regex signals for RANKING ONLY. High score = worth a deep read, "
                 "NOT a defect. deferral/resumption are usually healthy process. The deep-read "
                 "agent must label each episode artifact-defect vs healthy-process."),
    }

    if not proj_dir.is_dir():
        result["error"] = f"No session project dir at {proj_dir} (encoded cwd). Sessions leg is empty."
        result["transcripts_scanned"] = 0
        result["ranking"] = []
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    transcripts = sorted(proj_dir.rglob("*.jsonl"))
    scans = [scan_session(p, args.max_bytes) for p in transcripts]
    scans.sort(key=lambda s: (s["friction_score"], s["total_signals"]), reverse=True)

    dossiers = []
    for i, s in enumerate(scans[: args.top], start=1):
        try:
            dossiers.append(write_dossier(out_dir, i, s))
        except Exception:
            pass

    # Compose the canonical rollup (best-effort).
    rollup = run_rollup(Path(args.analyzer), cwd, args.rollup_n)
    result["rollup_attached"] = rollup is not None
    if rollup is not None:
        result["rollup"] = rollup

    result["transcripts_scanned"] = len(transcripts)
    result["dossiers_dir"] = str(out_dir)
    result["dossiers_written"] = dossiers
    # Emit the ranking WITHOUT the bulky excerpts/user_turns (those live in dossiers).
    result["ranking"] = [
        {k: s[k] for k in ("file", "session_id", "friction_score", "total_signals",
                            "by_category", "user_turn_count", "scan_truncated")}
        for s in scans[: max(args.top, 40)]
    ]
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
