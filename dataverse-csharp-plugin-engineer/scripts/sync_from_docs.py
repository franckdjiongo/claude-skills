#!/usr/bin/env python3
"""Generate source-grounded references and code snippets from source markdown files."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Sequence

DOC_FILES = [
    "Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md",
    "C# plugin development for Dataverse - exhaustive technical reference.md",
    "Power Platform Plugin Development Reference.md",
    "Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md",
]

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
FENCE_RE = re.compile(r"^```([a-zA-Z0-9#+._-]*)\s*$")
NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
MARKDOWN_FMT_RE = re.compile(r"[*_`~]+")

LANG_TO_EXT = {
    "c#": "cs",
    "csharp": "cs",
    "cs": "cs",
    "powershell": "ps1",
    "ps1": "ps1",
    "ps": "ps1",
    "bash": "sh",
    "shell": "sh",
    "sh": "sh",
    "yaml": "yml",
    "yml": "yml",
    "json": "json",
    "xml": "xml",
    "sql": "sql",
    "text": "txt",
    "txt": "txt",
    "md": "md",
    "markdown": "md",
}


@dataclass
class Heading:
    level: int
    title: str
    line: int


@dataclass
class Section:
    index: int
    level: int
    title: str
    line_start: int
    line_end: int
    parents: List[str]
    raw_text: str
    chunk_relpath: str


def slugify(text: str, max_length: int = 64) -> str:
    cleaned = MARKDOWN_FMT_RE.sub("", text).lower()
    cleaned = NON_ALNUM_RE.sub("-", cleaned).strip("-")
    if not cleaned:
        cleaned = "section"
    return cleaned[:max_length].strip("-") or "section"


def normalize_title(title: str) -> str:
    title = MARKDOWN_FMT_RE.sub("", title).strip()
    return title if title else "Untitled"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def parse_headings(lines: Sequence[str]) -> List[Heading]:
    headings: List[Heading] = []
    for idx, line in enumerate(lines, start=1):
        match = HEADING_RE.match(line)
        if not match:
            continue
        level = len(match.group(1))
        title = normalize_title(match.group(2))
        headings.append(Heading(level=level, title=title, line=idx))
    return headings


def build_sections(lines: Sequence[str], doc_slug: str) -> List[Section]:
    headings = parse_headings(lines)
    if not headings:
        return []

    sections: List[Section] = []
    stack: List[Heading] = []

    for i, heading in enumerate(headings):
        while stack and stack[-1].level >= heading.level:
            stack.pop()
        parents = [h.title for h in stack]
        stack.append(heading)

        # Skip the top-level title section to keep chunking focused.
        if heading.level == 1:
            continue
        # Skip decorative separator headings such as "## ---".
        if heading.title and set(heading.title.replace(" ", "")) == {"-"}:
            continue

        next_line = headings[i + 1].line - 1 if i + 1 < len(headings) else len(lines)
        line_start = heading.line
        line_end = next_line
        raw_text = "\n".join(lines[line_start - 1 : line_end]).strip() + "\n"
        section_index = len(sections) + 1
        chunk_name = f"{section_index:03d}-{slugify(heading.title)}.md"
        chunk_relpath = f"references/source-chunks/{doc_slug}/{chunk_name}"

        sections.append(
            Section(
                index=section_index,
                level=heading.level,
                title=heading.title,
                line_start=line_start,
                line_end=line_end,
                parents=parents,
                raw_text=raw_text,
                chunk_relpath=chunk_relpath,
            )
        )
    return sections


def detect_ext(language: str) -> str:
    return LANG_TO_EXT.get(language.lower(), "txt")


def extract_code_blocks(section_text: str) -> List[Dict[str, str]]:
    blocks: List[Dict[str, str]] = []
    lines = section_text.splitlines()
    in_block = False
    language = ""
    buf: List[str] = []

    for line in lines:
        fence = FENCE_RE.match(line)
        if fence:
            if not in_block:
                in_block = True
                language = fence.group(1).strip() or "text"
                buf = []
            else:
                blocks.append({"language": language, "code": "\n".join(buf).rstrip() + "\n"})
                in_block = False
                language = ""
                buf = []
            continue
        if in_block:
            buf.append(line)
    return blocks


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def render_chunk(section: Section, source_rel: str) -> str:
    parents = " > ".join(section.parents) if section.parents else "(none)"
    return (
        f"# {section.title}\n\n"
        f"- Source file: `{source_rel}`\n"
        f"- Source lines: {section.line_start}-{section.line_end}\n"
        f"- Parent headings: {parents}\n\n"
        "---\n\n"
        f"{section.raw_text}"
    )


def build_index_markdown(generated_at: str, doc_entries: List[Dict[str, object]], total_sections: int, total_snippets: int) -> str:
    lines: List[str] = []
    lines.append("# Source Index")
    lines.append("")
    lines.append("Generated from the four authoritative source docs for `dataverse-csharp-plugin-engineer`.")
    lines.append("")
    lines.append(f"- Generated at (UTC): `{generated_at}`")
    lines.append(f"- Total docs: `{len(doc_entries)}`")
    lines.append(f"- Total section chunks: `{total_sections}`")
    lines.append(f"- Total extracted code snippets: `{total_snippets}`")
    lines.append("")
    lines.append("## Documents")
    lines.append("")
    lines.append("| Doc ID | Source | Lines | SHA256 | Sections | Snippets |")
    lines.append("|---|---|---:|---|---:|---:|")
    for doc in doc_entries:
        lines.append(
            "| {id} | `{source}` | {line_count} | `{sha256}` | {section_count} | {snippet_count} |".format(
                **doc
            )
        )
    lines.append("")

    for doc in doc_entries:
        lines.append(f"## {doc['title']}")
        lines.append("")
        lines.append(f"- Source: `{doc['source']}`")
        lines.append(f"- Chunks directory: `{doc['chunks_dir']}`")
        lines.append("")
        lines.append("| # | Heading | Level | Lines | Chunk | Snippets |")
        lines.append("|---:|---|---:|---|---|---:|")
        for section in doc["sections"]:
            lines.append(
                "| {index} | {title} | {level} | {line_start}-{line_end} | `{chunk_relpath}` | {snippet_count} |".format(
                    **section
                )
            )
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def run(skill_root: Path, docs_root: Path, clean: bool) -> int:
    references_dir = skill_root / "references"
    assets_dir = skill_root / "assets"
    chunks_root = references_dir / "source-chunks"
    snippets_root = assets_dir / "snippets"
    index_path = references_dir / "source-index.md"
    manifest_path = references_dir / "source-manifest.json"
    snippets_manifest_path = snippets_root / "snippets-manifest.json"

    if clean and chunks_root.exists():
        shutil.rmtree(chunks_root)
    if clean and snippets_root.exists():
        shutil.rmtree(snippets_root)

    chunks_root.mkdir(parents=True, exist_ok=True)
    snippets_root.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    doc_entries: List[Dict[str, object]] = []
    snippet_manifest: Dict[str, object] = {"generated_at": generated_at, "docs": []}
    total_sections = 0
    total_snippets = 0

    for file_name in DOC_FILES:
        doc_path = docs_root / file_name
        if not doc_path.exists():
            raise FileNotFoundError(f"Missing source doc: {doc_path}")

        source_rel = doc_path.relative_to(skill_root.parent).as_posix()
        text = doc_path.read_text(encoding="utf-8")
        lines = text.splitlines()
        doc_slug = slugify(doc_path.stem)
        doc_title = normalize_title(lines[0].lstrip("# ").strip()) if lines else doc_path.stem
        sha = sha256_text(text)
        sections = build_sections(lines, doc_slug)
        chunk_dir = chunks_root / doc_slug
        chunk_dir.mkdir(parents=True, exist_ok=True)
        snippets_doc_dir = snippets_root / doc_slug
        snippets_doc_dir.mkdir(parents=True, exist_ok=True)

        doc_snippets: List[Dict[str, object]] = []
        doc_section_entries: List[Dict[str, object]] = []
        doc_snippet_count = 0

        for section in sections:
            chunk_path = skill_root / section.chunk_relpath
            write_file(chunk_path, render_chunk(section, source_rel))

            blocks = extract_code_blocks(section.raw_text)
            section_snippet_entries: List[Dict[str, object]] = []

            for block_idx, block in enumerate(blocks, start=1):
                ext = detect_ext(block["language"])
                snippet_name = (
                    f"{section.index:03d}-{slugify(section.title, 48)}-"
                    f"{block_idx:02d}.{ext}"
                )
                snippet_rel = f"assets/snippets/{doc_slug}/{snippet_name}"
                snippet_path = skill_root / snippet_rel
                write_file(snippet_path, block["code"])

                snippet_entry = {
                    "section_index": section.index,
                    "section_title": section.title,
                    "language": block["language"],
                    "snippet_relpath": snippet_rel,
                }
                section_snippet_entries.append(snippet_entry)
                doc_snippets.append(snippet_entry)

            doc_snippet_count += len(section_snippet_entries)
            doc_section_entries.append(
                {
                    "index": section.index,
                    "title": section.title,
                    "level": section.level,
                    "line_start": section.line_start,
                    "line_end": section.line_end,
                    "parents": section.parents,
                    "chunk_relpath": section.chunk_relpath,
                    "snippet_count": len(section_snippet_entries),
                }
            )

        doc_entry = {
            "id": doc_slug,
            "title": doc_title,
            "source": source_rel,
            "sha256": sha,
            "line_count": len(lines),
            "section_count": len(doc_section_entries),
            "snippet_count": doc_snippet_count,
            "chunks_dir": f"references/source-chunks/{doc_slug}",
            "sections": doc_section_entries,
        }
        doc_entries.append(doc_entry)
        snippet_manifest["docs"].append(
            {
                "id": doc_slug,
                "source": source_rel,
                "snippet_count": doc_snippet_count,
                "snippets": doc_snippets,
            }
        )

        total_sections += len(doc_section_entries)
        total_snippets += doc_snippet_count

    index_content = build_index_markdown(generated_at, doc_entries, total_sections, total_snippets)
    write_file(index_path, index_content)

    manifest = {
        "generated_at": generated_at,
        "docs": doc_entries,
        "totals": {
            "doc_count": len(doc_entries),
            "section_count": total_sections,
            "snippet_count": total_snippets,
        },
    }
    write_file(manifest_path, json.dumps(manifest, indent=2))
    write_file(snippets_manifest_path, json.dumps(snippet_manifest, indent=2))

    print(f"Generated index: {index_path}")
    print(f"Generated manifest: {manifest_path}")
    print(f"Generated snippets manifest: {snippets_manifest_path}")
    print(f"Generated sections: {total_sections}")
    print(f"Generated snippets: {total_snippets}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skill-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to skill root (default: parent of scripts/).",
    )
    parser.add_argument(
        "--docs-root",
        default="",
        help="Path to docs root. Default resolves to <repo>/docs.",
    )
    parser.add_argument(
        "--no-clean",
        action="store_true",
        help="Do not clean generated folders before writing.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    skill_root = Path(args.skill_root).resolve()
    if args.docs_root:
        docs_root = Path(args.docs_root).resolve()
    else:
        internal_docs = (skill_root / "references" / "raw-sources").resolve()
        legacy_docs = (skill_root.parent / "docs").resolve()
        docs_root = internal_docs if internal_docs.exists() else legacy_docs
    return run(skill_root=skill_root, docs_root=docs_root, clean=not args.no_clean)


if __name__ == "__main__":
    raise SystemExit(main())
