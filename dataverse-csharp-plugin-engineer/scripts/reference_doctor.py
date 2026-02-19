#!/usr/bin/env python3
"""Validate generated reference artifacts and optionally self-heal them."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
SYNC_SCRIPT = SCRIPT_DIR / "sync_from_docs.py"


def file_sha256(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha256(data).hexdigest()


def validate(skill_root: Path) -> List[str]:
    errors: List[str] = []
    repo_root = skill_root.parent
    manifest_path = skill_root / "references" / "source-manifest.json"
    index_path = skill_root / "references" / "source-index.md"
    snippets_manifest_path = skill_root / "assets" / "snippets" / "snippets-manifest.json"

    if not manifest_path.exists():
        return [f"Missing manifest: {manifest_path}"]
    if not index_path.exists():
        errors.append(f"Missing source index: {index_path}")
    if not snippets_manifest_path.exists():
        errors.append(f"Missing snippets manifest: {snippets_manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    docs = manifest.get("docs", [])
    if not docs:
        errors.append("Manifest has no docs entries.")
        return errors

    for doc in docs:
        source_path = repo_root / doc["source"]
        expected_sha = doc["sha256"]
        if not source_path.exists():
            errors.append(f"Missing source doc: {source_path}")
            continue
        current_sha = file_sha256(source_path)
        if current_sha != expected_sha:
            errors.append(
                f"Hash drift for {doc['source']}: expected {expected_sha[:12]}, current {current_sha[:12]}"
            )

        for section in doc.get("sections", []):
            chunk_path = skill_root / section["chunk_relpath"]
            if not chunk_path.exists():
                errors.append(f"Missing chunk: {chunk_path}")

    if snippets_manifest_path.exists():
        snippets_manifest = json.loads(snippets_manifest_path.read_text(encoding="utf-8"))
        for doc in snippets_manifest.get("docs", []):
            for snippet in doc.get("snippets", []):
                snippet_path = skill_root / snippet["snippet_relpath"]
                if not snippet_path.exists():
                    errors.append(f"Missing snippet: {snippet_path}")

    return errors


def run_sync(skill_root: Path, docs_root: Path | None) -> int:
    cmd = [sys.executable, str(SYNC_SCRIPT), "--skill-root", str(skill_root)]
    if docs_root is not None:
        cmd.extend(["--docs-root", str(docs_root)])
    return subprocess.call(cmd)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fix", action="store_true", help="Auto-regenerate artifacts when drift is detected.")
    parser.add_argument(
        "--skill-root",
        default=str(SKILL_ROOT),
        help="Path to skill root (default: parent of scripts/).",
    )
    parser.add_argument(
        "--docs-root",
        default="",
        help="Optional docs root override.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    skill_root = Path(args.skill_root).resolve()
    docs_root = Path(args.docs_root).resolve() if args.docs_root else None

    errors = validate(skill_root)
    if not errors:
        print("Reference doctor: healthy.")
        return 0

    print("Reference doctor: detected issues:")
    for err in errors:
        print(f"- {err}")

    if not args.fix:
        return 1

    print("Attempting self-heal via sync_from_docs.py ...")
    rc = run_sync(skill_root=skill_root, docs_root=docs_root)
    if rc != 0:
        print(f"Self-heal failed with exit code {rc}")
        return rc

    post_errors = validate(skill_root)
    if post_errors:
        print("Self-heal completed, but issues remain:")
        for err in post_errors:
            print(f"- {err}")
        return 1

    print("Reference doctor: self-heal successful.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
