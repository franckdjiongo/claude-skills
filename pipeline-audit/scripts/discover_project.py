#!/usr/bin/env python3
"""
discover_project.py — project-agnostic convention discovery for `pipeline-audit`.

Resolves WHERE a project keeps its design/plan artifacts and WHICH skills author
and execute them, WITHOUT hardcoding any one project's layout. `pipeline-audit`
runs this first. Anything that cannot be resolved confidently is emitted under
`unresolved` so the skill ASKS the user (AskUserQuestion) rather than guessing —
that is the whole point: a wrong guess about where plans live silently audits
the wrong corpus.

Resolution priority:
  1. A path resolver if the project has one — `docs/docs-map.json` or any
     `**/docs-map.json`. Its `artifactDirs` / `sourcesOfTruth` / `conventions`
     win over heuristics.
  2. Heuristic filesystem scan — directories named specs/plans/designs/
     superpowers, files matching *-design.* and *-plan.*.

Output: ONE JSON object on stdout. Never raises on a normal project; on a hard
error it still emits JSON carrying an `error` field so the caller can react.

Usage:
  python3 discover_project.py [--cwd <path>] [--analyzer <path-to-analyze_session.py>]
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

DEFAULT_ANALYZER = Path.home() / ".claude" / "skills" / "session-review" / "scripts" / "analyze_session.py"

# Skill-name patterns. The DESIGN/PLAN buckets are the *generators* (author the
# artifacts); EXEC is the *executors*. Patterns are kept tight enough to avoid
# obvious false positives (design-elevation, domain-driven-design are NOT design
# generators), but the skill still CONFIRMS ambiguous hits with the user.
DESIGN_SKILL_RE = re.compile(r"(brainstorm|spec-writing|writing-spec|design-doc|feature-design)", re.I)
PLAN_SKILL_RE = re.compile(r"(writing-plan|write-plan|plan-writing|^planning$)", re.I)
EXEC_SKILL_RE = re.compile(r"(execute-plan|executing-plan|subagent-driven|test-driven|^tdd$|-tdd$|implement)", re.I)
# Names that look plan-ish but are NOT plan *generators*.
PLAN_SKILL_EXCLUDE_RE = re.compile(r"(qa-plan|plan-execution|schedule|test-plan|state-machine|execut|subagent)", re.I)


def encode_cwd_for_projects_dir(cwd: str) -> str:
    """Claude Code encodes cwd under ~/.claude/projects/ by replacing / with -."""
    return "-" + str(cwd).lstrip("/").replace("/", "-")


def load_docs_map(root: Path):
    """Find and parse a docs-map.json path resolver if one exists."""
    candidates = [root / "docs" / "docs-map.json"]
    # also accept a docs-map.json anywhere shallow (depth <= 3) without scanning node_modules
    for p in root.glob("docs-map.json"):
        candidates.append(p)
    for p in root.glob("*/docs-map.json"):
        candidates.append(p)
    for cand in candidates:
        if cand.is_file():
            try:
                return cand, json.loads(cand.read_text(encoding="utf-8"))
            except Exception:
                continue
    return None, None


def first_existing(root: Path, rels):
    for rel in rels:
        if rel and (root / rel).is_dir():
            return str((root / rel).resolve())
    return None


def detect_doc_format(*dirs):
    html = md = 0
    for d in dirs:
        if not d:
            continue
        p = Path(d)
        if not p.is_dir():
            continue
        html += sum(1 for _ in p.rglob("*.html"))
        md += sum(1 for _ in p.rglob("*.md"))
    if html and not md:
        return "html"
    if md and not html:
        return "markdown"
    if html or md:
        return "html" if html >= md else "markdown"
    return "unknown"


def count_glob(d, patterns):
    if not d:
        return 0
    p = Path(d)
    n = 0
    for pat in patterns:
        n += sum(1 for _ in p.rglob(pat))
    return n


def find_skills(root: Path):
    """Scan both project-level and global skill roots; classify by name."""
    roots = [
        root / ".claude" / "skills",
        Path.home() / ".claude" / "skills",
    ]
    seen = {}
    for sr in roots:
        if not sr.is_dir():
            continue
        for child in sorted(sr.iterdir()):
            if not child.is_dir():
                continue
            name = child.name
            if name in seen:
                continue
            seen[name] = str(child)
    design, plan, execu = [], [], []
    for name in seen:
        if DESIGN_SKILL_RE.search(name):
            design.append(name)
        if PLAN_SKILL_RE.search(name) and not PLAN_SKILL_EXCLUDE_RE.search(name):
            plan.append(name)
        if EXEC_SKILL_RE.search(name):
            execu.append(name)
    return {"roots": [str(r) for r in roots if r.is_dir()],
            "design": sorted(design), "plan": sorted(plan), "execution": sorted(execu)}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--cwd", default=os.getcwd())
    ap.add_argument("--analyzer", default=str(DEFAULT_ANALYZER))
    args = ap.parse_args()

    out = {"unresolved": []}
    try:
        root = Path(args.cwd).resolve()
        out["project_root"] = str(root)
        # project name: package.json > dir name
        name = root.name
        pkg = root / "package.json"
        if pkg.is_file():
            try:
                name = json.loads(pkg.read_text(encoding="utf-8")).get("name", name) or name
            except Exception:
                pass
        out["project_name"] = name

        map_path, dm = load_docs_map(root)
        out["docs_map"] = {"found": dm is not None, "path": str(map_path) if map_path else None}

        specs_dir = plans_dir = report_dir = scaffold_tool = theme_css = None
        spec_glob = plan_glob = None

        if dm:
            ad = dm.get("artifactDirs", {}) or {}
            conv = dm.get("conventions", {}) or {}
            out["docs_map"]["sources_of_truth"] = dm.get("sourcesOfTruth", {})
            out["docs_map"]["artifact_dirs"] = ad
            specs_dir = first_existing(root, [ad.get("specs")])
            plans_dir = first_existing(root, [ad.get("plans")])
            report_dir = first_existing(root, [ad.get("audits"), ad.get("reports")])
            # scaffold command hint from conventions (project-specific tool)
            spec_conv = conv.get("specFile", {}) if isinstance(conv.get("specFile"), dict) else {}
            plan_conv = conv.get("planFile", {}) if isinstance(conv.get("planFile"), dict) else {}
            out["docs_map"]["spec_pattern"] = spec_conv.get("pattern")
            out["docs_map"]["plan_pattern"] = plan_conv.get("pattern")
            out["docs_map"]["spec_scaffold"] = spec_conv.get("scaffold")

        # Heuristic fallback for any dir not resolved via docs-map.
        if not specs_dir:
            specs_dir = first_existing(root, [
                "docs/superpowers/specs", "docs/specs", "docs/designs",
                "specs", "designs", "plans/specs"])
        if not plans_dir:
            plans_dir = first_existing(root, [
                "docs/superpowers/plans", "docs/plans", "plans"])
        if not report_dir:
            report_dir = first_existing(root, ["docs/audits", "docs/reports", "audits", "reports"])

        # Globs: prefer suffix-based detection (works HTML or MD).
        fmt = detect_doc_format(specs_dir, plans_dir)
        if fmt == "markdown":
            spec_glob = "**/*design*.md"
            plan_glob = "**/*plan*.md"
        else:
            spec_glob = "**/*design*.html"
            plan_glob = "**/*plan*.html"

        out["doc_format"] = fmt
        out["specs_dir"] = specs_dir
        out["plans_dir"] = plans_dir
        out["report_dir"] = report_dir
        out["design_glob"] = spec_glob
        out["plan_glob"] = plan_glob
        out["design_count"] = count_glob(specs_dir, [spec_glob.replace("**/", "")]) or count_glob(specs_dir, [spec_glob])
        out["plan_count"] = count_glob(plans_dir, [plan_glob.replace("**/", "")]) or count_glob(plans_dir, [plan_glob])

        # Scaffold tool + theme (for report generation in the project's own style).
        for rel in [".claude/scripts/docs-html/scaffold.mjs", "scripts/docs-html/scaffold.mjs",
                    ".claude/scripts/scaffold.mjs"]:
            if (root / rel).is_file():
                scaffold_tool = str((root / rel).resolve())
                break
        for rel in ["docs/assets/css/docs-theme.css", "docs/assets/docs-theme.css"]:
            if (root / rel).is_file():
                theme_css = str((root / rel).resolve())
                break
        out["scaffold"] = {"tool": scaffold_tool, "doc_type": "audit", "theme_css": theme_css}

        # Pipeline skills.
        out["skills"] = find_skills(root)

        # Session transcripts.
        encoded = encode_cwd_for_projects_dir(str(root))
        proj_dir = Path.home() / ".claude" / "projects" / encoded
        out["session_project_dir"] = str(proj_dir)
        out["session_dir_exists"] = proj_dir.is_dir()
        out["session_jsonl_count"] = sum(1 for _ in proj_dir.rglob("*.jsonl")) if proj_dir.is_dir() else 0
        out["analyzer_present"] = Path(args.analyzer).is_file()
        out["analyzer_path"] = args.analyzer

        # Flag anything the skill should confirm with the user.
        if not specs_dir:
            out["unresolved"].append("specs_dir (designs corpus location)")
        if not plans_dir:
            out["unresolved"].append("plans_dir (plans corpus location)")
        if not report_dir:
            out["unresolved"].append("report_dir (where the audit HTML should be written)")
        if not (out["skills"]["design"] or out["skills"]["plan"]):
            out["unresolved"].append("generator_skills (brainstorming / writing-plan)")
        if not out["skills"]["execution"]:
            out["unresolved"].append("execution_skills (execute-plan / TDD)")
        if not out["session_dir_exists"] or out["session_jsonl_count"] == 0:
            out["unresolved"].append("session transcripts (none found — sessions leg may be empty)")

    except Exception as e:  # never crash the caller
        out["error"] = f"{type(e).__name__}: {e}"

    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
