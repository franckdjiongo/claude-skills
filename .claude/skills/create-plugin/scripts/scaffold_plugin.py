#!/usr/bin/env python3
"""Scaffold an installable Claude Code + Codex plugin in this repo.

Generates the canonical plugin layout that BOTH runtimes discover, both
manifests, optional component stubs, a README, and (idempotently) registers
the plugin in both marketplace catalogs.

It does NOT touch skills-registry.yaml / skills-app / CLAUDE.md — those need
human judgment (category, counts, description) and are handled in the skill
workflow, then enforced by validate_plugin.py.

Usage:
  scaffold_plugin.py <name> --description "..." [options]

Options:
  --description TEXT     One-line plugin description (required)
  --display-name TEXT    Human label (default: Title Case of name)
  --author TEXT          Author name (default: Franck Djiongo)
  --repo-url URL         Repo URL (default: https://github.com/franckdjiongo/claude-skills)
  --category TEXT        Codex/marketplace category (default: Specialized Workflows)
  --components LIST       Comma list of components to stub. Any of:
                         skill,agents,hooks,mcp,commands,lsp  (default: skill)
  --keywords LIST        Comma list of keywords (default: derived from name)
  --repo-root PATH       Repo root holding the marketplace catalogs (default: cwd)
  --dest PATH            Where to create the plugin dir (default: <repo-root>)
  --force                Overwrite an existing plugin directory

Example:
  scaffold_plugin.py acme-tools \
    --description "Tools for the Acme workflow" \
    --components skill,agents,mcp --category "Development & DevOps"
"""
import argparse
import json
import os
import re
import sys

VALID_COMPONENTS = {"skill", "agents", "hooks", "mcp", "commands", "lsp"}


def title_case(name: str) -> str:
    return " ".join(w.capitalize() for w in name.replace("_", "-").split("-"))


def write(path: str, content: str, force: bool) -> str:
    if os.path.exists(path) and not force:
        return f"skip (exists)  {path}"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    return f"create         {path}"


def claude_manifest(name, display, desc, author, repo_url, keywords) -> str:
    return json.dumps({
        "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
        "name": name,
        "displayName": display,
        "version": "0.1.0",
        "description": desc,
        "author": {"name": author, "url": repo_url},
        "homepage": f"{repo_url}/tree/main/{name}",
        "repository": repo_url,
        "license": "MIT",
        "keywords": keywords,
    }, indent=2) + "\n"


def codex_manifest(name, display, desc, author, repo_url, keywords, category, comps) -> str:
    m = {
        "name": name,
        "version": "0.1.0",
        "description": desc,
        "author": {"name": author},
        "homepage": f"{repo_url}/tree/main/{name}",
        "repository": repo_url,
        "license": "MIT",
        "keywords": keywords,
        # Codex points at the CONTAINER directory; it finds skills/<name>/SKILL.md inside.
        "skills": "./skills/",
    }
    # Codex supports these component pointers (NOT agents — those are standalone TOML).
    if "mcp" in comps:
        m["mcpServers"] = "./.mcp.json"
    if "hooks" in comps:
        m["hooks"] = "./hooks/"
    m["interface"] = {
        "displayName": display,
        "shortDescription": desc[:80],
        "longDescription": desc,
        "category": category,
    }
    return json.dumps(m, indent=2) + "\n"


def skill_stub(name, display) -> str:
    return f"""---
name: {name}
description: >-
  TODO: what this skill does AND specific triggers/contexts for when to use it.
  This text is the ONLY thing loaded until the skill triggers, so make it
  comprehensive. Include trigger phrases the user would say.
---

# {display}

TODO: lean workflow and guidance (<500 lines). Reference bundled files in this
skill directory with relative paths (e.g. `references/foo.md`) — for a skill,
those resolve relative to this SKILL.md.
"""


def agent_stub(name, display) -> str:
    return f"""---
name: {name}-agent
description: >-
  TODO: what this specialist does and when Claude should invoke it.
model: inherit
---

# {display} — Specialist

TODO: the specialist's operating manual.

**Bundled knowledge files.** Every `references/…` and `assets/…` path below is
bundled with this plugin under `${{CLAUDE_PLUGIN_ROOT}}/skills/{name}/`. Read them
from there — e.g. `references/foo.md` lives at
`${{CLAUDE_PLUGIN_ROOT}}/skills/{name}/references/foo.md`. (`${{CLAUDE_PLUGIN_ROOT}}`
expands to the plugin's absolute install path at runtime.)
"""


def command_stub(name) -> str:
    return f"""---
description: TODO one-line description of the /{name} command
---

TODO: the prompt this command expands into. Use $ARGUMENTS for user input.
"""


def readme_stub(name, display, desc, repo_url, comps) -> str:
    comp_lines = []
    if "skill" in comps:
        comp_lines.append(f"| Skill | `{name}` | TODO |")
    if "agents" in comps:
        comp_lines.append(f"| Agent | `{name}-agent` | TODO (Claude Code only) |")
    if "mcp" in comps:
        comp_lines.append("| MCP server | see `.mcp.json` | TODO |")
    if "hooks" in comps:
        comp_lines.append("| Hooks | see `hooks/hooks.json` | TODO |")
    if "commands" in comps:
        comp_lines.append(f"| Command | `/{name}` | TODO |")
    comp_table = "\n".join(comp_lines) or "| — | — | — |"
    market = repo_url.replace("https://github.com/", "")
    return f"""# {display}

> {desc}

Works in **Claude Code** and **OpenAI Codex**.

## What you get

| Component | Name | Role |
|---|---|---|
{comp_table}

> In **Codex**, agents are not a plugin component (they are standalone TOML in
> `~/.codex/agents/`). Any `agents/` here load in **Claude Code only**.

## Installation

### Claude Code
```bash
/plugin marketplace add {market}
/plugin install {name}@claude-skills
/reload-plugins
```

### OpenAI Codex
```bash
codex plugin marketplace add {market}
```
Then install from the `/plugins` browser (CLI) or **Add to Codex** (App/IDE).

> Marketplace installs pull from GitHub — push changes, then Update/reinstall.

## Directory layout
```
{name}/
├── .claude-plugin/plugin.json
├── .codex-plugin/plugin.json
├── README.md
└── skills/{name}/SKILL.md   (+ references/ assets/)
```
"""


def register_marketplace(repo_root, name, desc, category, kind):
    """Idempotently add a plugin entry to a marketplace catalog. kind: 'claude'|'codex'."""
    if kind == "claude":
        path = os.path.join(repo_root, ".claude-plugin", "marketplace.json")
        entry = {
            "name": name,
            "source": f"./{name}",
            "description": desc,
            "version": "0.1.0",
            "author": {"name": "Franck Djiongo"},
        }
    else:
        path = os.path.join(repo_root, ".agents", "plugins", "marketplace.json")
        entry = {
            "name": name,
            "source": {"source": "local", "path": f"./{name}"},
            "policy": {"installation": "AVAILABLE"},
            "category": category,
        }
    if not os.path.exists(path):
        return f"skip (no catalog)  {path}"
    with open(path) as f:
        data = json.load(f)
    plugins = data.setdefault("plugins", [])
    if any(p.get("name") == name for p in plugins):
        return f"already listed     {path}"
    plugins.append(entry)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    return f"registered         {path}"


def main():
    ap = argparse.ArgumentParser(description="Scaffold a Claude Code + Codex plugin.")
    ap.add_argument("name")
    ap.add_argument("--description", required=True)
    ap.add_argument("--display-name")
    ap.add_argument("--author", default="Franck Djiongo")
    ap.add_argument("--repo-url", default="https://github.com/franckdjiongo/claude-skills")
    ap.add_argument("--category", default="Specialized Workflows")
    ap.add_argument("--components", default="skill")
    ap.add_argument("--keywords", default="")
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--dest")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    name = args.name
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
        sys.exit(f"ERROR: name must be kebab-case (got '{name}')")

    comps = {c.strip() for c in args.components.split(",") if c.strip()}
    bad = comps - VALID_COMPONENTS
    if bad:
        sys.exit(f"ERROR: unknown components {bad}. Valid: {sorted(VALID_COMPONENTS)}")
    comps.add("skill")  # a plugin without a skill is unusual; keep one by default

    display = args.display_name or title_case(name)
    keywords = [k.strip() for k in args.keywords.split(",") if k.strip()] or \
        name.split("-")
    repo_root = os.path.abspath(args.repo_root)
    dest = os.path.abspath(args.dest) if args.dest else repo_root
    root = os.path.join(dest, name)

    if os.path.exists(root) and not args.force:
        sys.exit(f"ERROR: {root} already exists (use --force to overwrite files)")

    log = []
    log.append(write(os.path.join(root, ".claude-plugin", "plugin.json"),
                     claude_manifest(name, display, args.description, args.author,
                                     args.repo_url, keywords), args.force))
    log.append(write(os.path.join(root, ".codex-plugin", "plugin.json"),
                     codex_manifest(name, display, args.description, args.author,
                                    args.repo_url, keywords, args.category, comps),
                     args.force))
    log.append(write(os.path.join(root, "README.md"),
                     readme_stub(name, display, args.description, args.repo_url, comps),
                     args.force))
    if "skill" in comps:
        log.append(write(os.path.join(root, "skills", name, "SKILL.md"),
                         skill_stub(name, display), args.force))
        os.makedirs(os.path.join(root, "skills", name, "references"), exist_ok=True)
        os.makedirs(os.path.join(root, "skills", name, "assets"), exist_ok=True)
    if "agents" in comps:
        log.append(write(os.path.join(root, "agents", f"{name}-agent.md"),
                         agent_stub(name, display), args.force))
    if "hooks" in comps:
        log.append(write(os.path.join(root, "hooks", "hooks.json"),
                         '{\n  "hooks": {}\n}\n', args.force))
    if "mcp" in comps:
        log.append(write(os.path.join(root, ".mcp.json"),
                         '{\n  "mcpServers": {}\n}\n', args.force))
    if "commands" in comps:
        log.append(write(os.path.join(root, "commands", f"{name}.md"),
                         command_stub(name), args.force))
    if "lsp" in comps:
        log.append(write(os.path.join(root, ".lsp.json"),
                         '{\n  "lspServers": {}\n}\n', args.force))

    log.append(register_marketplace(repo_root, name, args.description, args.category, "claude"))
    log.append(register_marketplace(repo_root, name, args.description, args.category, "codex"))

    print(f"\nScaffolded plugin '{name}' ({display})\n")
    for line in log:
        print("  " + line)
    print("\nNext:")
    print("  1. Fill skills/{0}/SKILL.md (description = trigger; <500 lines).".format(name))
    if "agents" in comps:
        print("  2. Flesh out agents/ ; reference bundled files via ${CLAUDE_PLUGIN_ROOT}/skills/" + name + "/.")
    print("  3. Update skills-registry.yaml + skills-app/src/data/skills.ts + CLAUDE.md")
    print("     (see references/repo-conventions.md).")
    print("  4. Run: validate_plugin.py " + os.path.relpath(root, os.getcwd()))


if __name__ == "__main__":
    main()
