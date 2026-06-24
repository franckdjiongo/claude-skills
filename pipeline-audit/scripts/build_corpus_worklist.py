#!/usr/bin/env python3
"""
build_corpus_worklist.py — design↔plan corpus work-list builder for `pipeline-audit` (WF2 leg).

Scans the project's designs and plans directories, groups by theme (the shared
subfolder convention NN-theme when present, else by top-level folder), pairs each
design with its plan, flags ORPHANS (a design with no plan, or a plan with no
design — both are findings), and chunks every theme into agent batches of <=N docs
so no single WF2 agent is handed more than it can read carefully.

The emitted JSON is meant to be EMBEDDED AS A LITERAL into the WF2 workflow script
(NEVER passed through Workflow `args` — large work-lists arrive unparsed there).

Pairing is heuristic (theme + nearest topic/date token). It is good enough to point
each agent at "these designs and these plans for theme X"; the agent does the real
fidelity judgment. Orphan detection is the valuable deterministic signal here.

Usage:
  python3 build_corpus_worklist.py --specs-dir <dir> --plans-dir <dir> \
      [--design-glob '**/*design*.html'] [--plan-glob '**/*plan*.html'] [--chunk-size 7]
"""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

THEME_RE = re.compile(r"(\d{2}-[a-z0-9][a-z0-9-]*)", re.I)  # e.g. 12-sous-traitance
DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def theme_of(path: Path, base: Path):
    """Theme = first NN-theme folder under base; else the top-level subfolder; else '_root'."""
    try:
        rel = path.relative_to(base)
    except Exception:
        rel = path
    for part in rel.parts:
        if THEME_RE.fullmatch(part) or THEME_RE.match(part):
            return part
    parts = rel.parts
    if len(parts) > 1:
        return parts[0]
    return "_root"


def topic_key(path: Path):
    """A loose key to pair a design with its plan: date + a few topic tokens."""
    stem = path.stem.lower()
    stem = re.sub(r"-(design|plan|spec)$", "", stem)
    date = DATE_RE.search(stem)
    date = date.group(1) if date else ""
    tokens = [t for t in re.split(r"[^a-z0-9]+", DATE_RE.sub("", stem)) if len(t) > 2]
    return date, tokens


def overlap(a_tokens, b_tokens):
    sa, sb = set(a_tokens), set(b_tokens)
    if not sa or not sb:
        return 0
    return len(sa & sb)


def collect(base: Path, glob: str):
    if not base or not base.is_dir():
        return []
    return sorted(p for p in base.rglob(glob.replace("**/", "")) if p.is_file()) or \
        sorted(p for p in base.rglob(glob) if p.is_file())


def main():
    ap = argparse.ArgumentParser(description="Corpus work-list builder for pipeline-audit WF2.")
    ap.add_argument("--specs-dir", required=True)
    ap.add_argument("--plans-dir", required=True)
    ap.add_argument("--design-glob", default="**/*design*.html")
    ap.add_argument("--plan-glob", default="**/*plan*.html")
    ap.add_argument("--chunk-size", type=int, default=7)
    args = ap.parse_args()

    specs_base = Path(args.specs_dir).resolve()
    plans_base = Path(args.plans_dir).resolve()
    designs = collect(specs_base, args.design_glob)
    plans = collect(plans_base, args.plan_glob)

    by_theme_designs = defaultdict(list)
    by_theme_plans = defaultdict(list)
    for d in designs:
        by_theme_designs[theme_of(d, specs_base)].append(d)
    for p in plans:
        by_theme_plans[theme_of(p, plans_base)].append(p)

    all_themes = sorted(set(by_theme_designs) | set(by_theme_plans))
    themes_out = []
    chunks = []
    total_orphan_designs = total_orphan_plans = total_pairs = 0

    for theme in all_themes:
        ds = by_theme_designs.get(theme, [])
        ps = by_theme_plans.get(theme, [])
        plan_keys = [(p, topic_key(p)) for p in ps]
        used_plans = set()
        pairs = []
        for d in ds:
            ddate, dtok = topic_key(d)
            best, best_score = None, -1
            for p, (pdate, ptok) in plan_keys:
                if p in used_plans:
                    continue
                score = overlap(dtok, ptok) + (2 if (ddate and ddate == pdate) else 0)
                if score > best_score:
                    best, best_score = p, score
            if best is not None and best_score > 0:
                used_plans.add(best)
                pairs.append({"design": str(d), "plan": str(best)})
        orphan_designs = [str(d) for d in ds
                          if not any(pr["design"] == str(d) for pr in pairs)]
        orphan_plans = [str(p) for p in ps if p not in used_plans]
        total_pairs += len(pairs)
        total_orphan_designs += len(orphan_designs)
        total_orphan_plans += len(orphan_plans)
        themes_out.append({
            "theme": theme,
            "design_count": len(ds),
            "plan_count": len(ps),
            "pairs": pairs,
            "orphan_designs": orphan_designs,
            "orphan_plans": orphan_plans,
        })
        # Chunk this theme's docs (designs+plans) into <=chunk_size batches.
        docs = [str(d) for d in ds] + [str(p) for p in ps]
        for i in range(0, len(docs), args.chunk_size):
            chunks.append({
                "theme": theme,
                "batch_index": i // args.chunk_size,
                "docs": docs[i:i + args.chunk_size],
            })

    out = {
        "specs_dir": str(specs_base),
        "plans_dir": str(plans_base),
        "totals": {
            "designs": len(designs),
            "plans": len(plans),
            "themes": len(all_themes),
            "pairs": total_pairs,
            "orphan_designs": total_orphan_designs,
            "orphan_plans": total_orphan_plans,
            "chunks": len(chunks),
            "chunk_size": args.chunk_size,
        },
        "themes": themes_out,
        "chunks": chunks,
        "note": ("Pairing is heuristic (theme + topic/date overlap); the WF2 agent makes the real "
                 "design->plan fidelity call. Orphans are deterministic findings. EMBED this JSON as a "
                 "literal in the WF2 script — do NOT pass it via Workflow args."),
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
