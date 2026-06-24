#!/usr/bin/env python3
"""Validate a Claude Code + Codex plugin in this repo.

Encodes the rules that actually break plugins:
  - skills must live at skills/<name>/SKILL.md (a root SKILL.md loads but is
    NOT shown in the Claude Desktop plugin panel)
  - agents must be at the plugin-root agents/ dir, with name+description
  - agents that reference the skill's references/assets must use
    ${CLAUDE_PLUGIN_ROOT} (relative paths don't resolve across dirs)
  - Codex manifest "skills" must point at the container ("./skills/")
  - the plugin must be registered in BOTH marketplace catalogs
  - the plugin should appear in skills-registry.yaml + skills-app + CLAUDE.md

Usage:  validate_plugin.py <path/to/plugin-dir> [--repo-root PATH]
Exit code 0 = PASS (warnings allowed), 1 = FAIL.
"""
import argparse
import glob
import json
import os
import re
import sys

FAILS, WARNS, OKS = [], [], []


def ok(m): OKS.append(m)
def warn(m): WARNS.append(m)
def fail(m): FAILS.append(m)


def read(path):
    with open(path) as f:
        return f.read()


def load_json(path):
    try:
        return json.load(open(path)), None
    except Exception as e:  # noqa: BLE001
        return None, str(e)


def frontmatter_field(md_text, field):
    m = re.search(r"^---\n(.*?)\n---", md_text, re.S)
    if not m:
        return None
    fm = m.group(1)
    fm_m = re.search(rf"^{field}\s*:\s*(.+)$", fm, re.M)
    return fm_m.group(1).strip() if fm_m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plugin_dir")
    ap.add_argument("--repo-root", default=".")
    args = ap.parse_args()
    root = os.path.abspath(args.plugin_dir)
    repo = os.path.abspath(args.repo_root)
    name = os.path.basename(root.rstrip("/"))

    if not os.path.isdir(root):
        sys.exit(f"ERROR: not a directory: {root}")

    # --- Claude manifest ---
    cl_path = os.path.join(root, ".claude-plugin", "plugin.json")
    if not os.path.exists(cl_path):
        fail(".claude-plugin/plugin.json missing")
    else:
        data, err = load_json(cl_path)
        if err:
            fail(f".claude-plugin/plugin.json invalid JSON: {err}")
        else:
            for req in ("name", "version", "description"):
                if not data.get(req):
                    fail(f".claude-plugin/plugin.json missing '{req}'")
            if data.get("name") and data["name"] != name:
                warn(f"manifest name '{data['name']}' != dir name '{name}'")
            ok(".claude-plugin/plugin.json valid")

    # --- Skill location (the big one) ---
    nested = glob.glob(os.path.join(root, "skills", "*", "SKILL.md"))
    root_skill = os.path.join(root, "SKILL.md")
    if nested:
        ok(f"skill(s) under skills/: {[os.path.relpath(p, root) for p in nested]}")
        for p in nested:
            if not frontmatter_field(read(p), "name"):
                fail(f"{os.path.relpath(p, root)} has no 'name' frontmatter")
    elif os.path.exists(root_skill):
        warn("SKILL.md is at the plugin ROOT — it loads, but the Claude Desktop "
             "plugin panel only lists skills under skills/<name>/. Move it to "
             f"skills/{name}/SKILL.md.")
        if not frontmatter_field(read(root_skill), "name"):
            fail("root SKILL.md has no 'name' frontmatter")
    else:
        warn("no SKILL.md found (plugin may ship only agents/mcp/hooks)")

    # --- Agents at plugin root ---
    agent_dir = os.path.join(root, "agents")
    agents = glob.glob(os.path.join(agent_dir, "*.md")) if os.path.isdir(agent_dir) else []
    for a in agents:
        txt = read(a)
        rel = os.path.relpath(a, root)
        if not frontmatter_field(txt, "name"):
            fail(f"{rel} missing 'name' frontmatter")
        if not frontmatter_field(txt, "description"):
            fail(f"{rel} missing 'description' frontmatter")
        # cross-dir reference check: mentions references/ or assets/ but never anchors them
        mentions = re.search(r"(references/|assets/)", txt)
        if mentions and nested and "CLAUDE_PLUGIN_ROOT" not in txt:
            warn(f"{rel} mentions references/ or assets/ but never uses "
                 "${CLAUDE_PLUGIN_ROOT} — those paths won't resolve from the "
                 f"agent (the files live under skills/{name}/).")
    if agents:
        ok(f"agents at plugin root: {[os.path.basename(a) for a in agents]}")

    # --- Codex manifest ---
    cx_path = os.path.join(root, ".codex-plugin", "plugin.json")
    if os.path.exists(cx_path):
        data, err = load_json(cx_path)
        if err:
            fail(f".codex-plugin/plugin.json invalid JSON: {err}")
        else:
            skills_field = data.get("skills")
            if nested and skills_field not in ("./skills/", "./skills"):
                warn(f".codex-plugin skills='{skills_field}' should be './skills/' "
                     "(the container) for the skills/<name>/ layout.")
            else:
                ok(f".codex-plugin/plugin.json valid (skills={skills_field})")
            if os.path.isdir(agent_dir):
                warn("this plugin has agents/, but Codex plugins cannot bundle "
                     "agents — they load in Claude Code only (Codex agents are "
                     "standalone TOML in ~/.codex/agents/).")

    # --- Marketplace registration (both catalogs) ---
    checks = [
        (".claude-plugin/marketplace.json", os.path.join(repo, ".claude-plugin", "marketplace.json")),
        (".agents/plugins/marketplace.json", os.path.join(repo, ".agents", "plugins", "marketplace.json")),
    ]
    for label, path in checks:
        if not os.path.exists(path):
            warn(f"{label} not found at repo root")
            continue
        data, err = load_json(path)
        if err:
            fail(f"{label} invalid JSON: {err}")
            continue
        if any(p.get("name") == name for p in data.get("plugins", [])):
            ok(f"registered in {label}")
        else:
            fail(f"'{name}' not registered in {label}")

    # --- Repo data sources (this repo's dual-source convention) ---
    reg = os.path.join(repo, "skills-registry.yaml")
    if os.path.exists(reg) and name not in read(reg):
        warn(f"'{name}' not found in skills-registry.yaml")
    elif os.path.exists(reg):
        ok("present in skills-registry.yaml")
    app = os.path.join(repo, "skills-app", "src", "data", "skills.ts")
    if os.path.exists(app) and name not in read(app):
        warn(f"'{name}' not found in skills-app/src/data/skills.ts")
    elif os.path.exists(app):
        ok("present in skills-app/src/data/skills.ts")

    # --- Report ---
    print(f"\n=== validate plugin: {name} ===")
    for m in OKS:
        print(f"  PASS  {m}")
    for m in WARNS:
        print(f"  WARN  {m}")
    for m in FAILS:
        print(f"  FAIL  {m}")
    print(f"\n{len(OKS)} pass, {len(WARNS)} warn, {len(FAILS)} fail")
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
