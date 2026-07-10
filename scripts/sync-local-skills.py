#!/usr/bin/env python3
"""
sync-local-skills.py — Mirror skills from ~/.claude/skills into this repo.

Runs unattended (via a launchd LaunchAgent, twice a week). On each run it:
  1. Finds skills present in ~/.claude/skills (dirs with SKILL.md) but ABSENT here.
  2. Copies each missing skill dir in (stripping any nested .git so it is tracked
     as regular files, not a gitlink).
  3. Registers each new skill in all four data/doc sources, applying the project's
     CLAUDE.md "update in three places" rule (+ AGENTS.md for runtime parity):
       - skills-registry.yaml         (category block + skill_index)
       - skills-app/src/data/skills.ts (skill object + category/all/repo counts)
       - CLAUDE.md / AGENTS.md         (Skill Categories bullet)
  4. VALIDATES before committing (YAML parses, `registry-manager scan` reports
     "up to date", skills.ts delimiters balance). On ANY failure it discards all
     changes (git reset --hard + clean) and notifies — it never pushes broken data.
  5. Commits and pushes to main. No commit if nothing was synced.

Categorization is heuristic (keyword-based, default "specialized"); review in git.
This is deterministic (no AI) so it can run unattended without API credits.
"""

import os
import re
import sys
import json
import shutil
import subprocess
from datetime import datetime

SRC = os.environ.get("SYNC_SRC", os.path.expanduser("~/.claude/skills"))
REPO = os.environ.get("SYNC_REPO", "/Users/elmabi/Desktop/my-projets/claude-skills")
REGISTRY = os.path.join(REPO, "skills-registry.yaml")
SKILLS_TS = os.path.join(REPO, "skills-app/src/data/skills.ts")
CLAUDE_MD = os.path.join(REPO, "CLAUDE.md")
AGENTS_MD = os.path.join(REPO, "AGENTS.md")

CATEGORY_NAME = {
    "power-platform": "Power Platform & Microsoft",
    "claude-code": "Claude Code & AI Extensibility",
    "convex": "Convex Database",
    "text-processing": "Text & Document Processing",
    "meetings": "Meeting & Transcript Analysis",
    "development": "Development & DevOps",
    "specialized": "Specialized Workflows",
    "email": "Email (Resend)",
}
# Heading text used in CLAUDE.md / AGENTS.md (note: docs use "Extensibility")
DOC_HEADING = {
    "power-platform": "**Power Platform & Microsoft**",
    "claude-code": "**Claude Code Extensibility**",
    "convex": "**Convex Database**",
    "text-processing": "**Text & Document Processing**",
    "meetings": "**Meeting & Transcript Analysis**",
    "development": "**Development & DevOps**",
    "specialized": "**Specialized Workflows**",
    "email": "**Email (Resend)**",
}
ACRONYMS = {"pp": "PP", "ui": "UI", "cli": "CLI", "api": "API", "seo": "SEO",
            "html": "HTML", "pa": "PA", "ai": "AI", "ddd": "DDD", "i18n": "i18n",
            "csharp": "C#", "http": "HTTP", "gpt5": "GPT-5"}


def log(msg):
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}", flush=True)


def notify(title, message):
    try:
        subprocess.run(
            ["osascript", "-e",
             f'display notification {json.dumps(message)} with title {json.dumps(title)}'],
            check=False, capture_output=True)
    except Exception:
        pass


def run(cmd, **kw):
    return subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, **kw)


def ensure_yaml():
    """Fail fast if PyYAML is missing for the running interpreter.

    PyYAML is needed twice: here (to validate the written registry parses) and
    by registry-manager.py, which we invoke as a subprocess with THIS SAME
    interpreter (sys.executable). If the interpreter lacks PyYAML, the sync
    would otherwise abort mid-run with a misleading error (registry-manager
    silently falls back to a degraded parser and the scan check fails). Better
    to stop cleanly, before any file mutation, with an actionable message.
    """
    try:
        import yaml  # noqa: F401
    except ImportError:
        log(f"FATAL: PyYAML not available for interpreter {sys.executable}. "
            f"Install it (pip install pyyaml) or launch with an interpreter "
            f"that has it, e.g.: /usr/bin/python3 {os.path.abspath(__file__)}")
        sys.exit(1)


def has_skill_md(path):
    return os.path.isfile(os.path.join(path, "SKILL.md"))


def list_skill_dirs(root):
    if not os.path.isdir(root):
        return {}
    out = {}
    for name in os.listdir(root):
        p = os.path.join(root, name)
        if os.path.isdir(p) and has_skill_md(p):
            out[name] = p
    return out


def parse_frontmatter(skill_md):
    """Return (name, description) from YAML frontmatter (best effort)."""
    name, desc = None, None
    try:
        text = open(skill_md, encoding="utf-8").read()
    except Exception:
        return name, desc
    if not text.startswith("---"):
        return name, desc
    end = text.find("\n---", 3)
    if end == -1:
        return name, desc
    block = text[3:end]
    m = re.search(r"^name:\s*(.+)$", block, re.M)
    if m:
        name = m.group(1).strip().strip("'\"")
    # description may be inline or a block scalar (>- , | , >)
    m = re.search(r"^description:\s*(.*)$", block, re.M)
    if m:
        first = m.group(1).strip()
        if first in (">", "|", ">-", "|-", ">+", "|+", ""):
            # collect following indented lines
            lines = block[m.end():].split("\n")
            collected = []
            for ln in lines:
                if ln.strip() == "":
                    if collected:
                        break
                    continue
                if re.match(r"^\s+\S", ln):
                    collected.append(ln.strip())
                else:
                    break
            desc = " ".join(collected)
        else:
            desc = first.strip("'\"")
    return name, desc


def first_sentence(text, limit=150):
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text).strip()
    m = re.search(r"(.+?[.!?])(\s|$)", text)
    s = m.group(1) if m else text
    if len(s) > limit:
        s = s[:limit].rsplit(" ", 1)[0] + "…"
    return s.strip()


def prettify(dirname):
    parts = dirname.split("-")
    out = []
    for p in parts:
        out.append(ACRONYMS.get(p.lower(), p.capitalize()))
    return " ".join(out)


def guess_category(name, desc):
    t = f"{name} {desc}".lower()

    def any_in(words):
        return any(w in t for w in words)

    if any_in(["resend", "inbox", "smtp", "email"]):
        return "email"
    if "convex" in t:
        return "convex"
    if any_in(["power automate", "power apps", "powerapps", "dataverse",
               "power platform", "pac cli", "sharepoint", "model-driven",
               "canvas app", "copilot studio", "entra", "http trigger",
               "http-trigger", "solution export", "pp-"]):
        return "power-platform"
    if any_in(["meeting", "transcript", "rencontre", "minutes", "procès",
               "proces-verbaux", "standup", "follow-up extract"]):
        return "meetings"
    if any_in(["whatsapp", "refine text", "consolidat", "document format",
               "convert document"]):
        return "text-processing"
    if any_in(["hook", "subagent", "sub-agent", "claude code", "claude-code",
               "governance", "skill", "insight", "loop", "schedule", "prompt",
               "session", "handoff", "pipeline", "slash command", "agent",
               "mcp", "coaching", "overnight", "autonomous", "routine"]):
        return "claude-code"
    if any_in(["vercel", "bun", "vite", "firestore", "i18n", "localiz",
               "api test", "github issue", "cli", "deploy", "react",
               "typescript", "supacode", "supabase"]):
        return "development"
    return "specialized"


def make_tags(catid, name, desc):
    t = f"{name} {desc}".lower()
    tags = [catid]
    for kw in ["power-automate", "dataverse", "power-apps", "email", "resend",
               "hooks", "subagents", "governance", "automation", "ui", "design",
               "security", "cli", "qa", "webhooks", "api"]:
        bare = kw.replace("-", r"[ -]")
        if re.search(r"\b%s\b" % bare, t) and kw not in tags:
            tags.append(kw)
        if len(tags) >= 5:
            break
    return tags


# ----------------------------------------------------------------------------
# Textual insertion helpers
# ----------------------------------------------------------------------------

def registry_has_skill(text, name):
    return re.search(r"^\s*-\s*name:\s*%s\s*$" % re.escape(name), text, re.M) is not None


def registry_add_to_category(text, catid, name, dirname, desc, tags):
    lines = text.split("\n")
    start = None
    for i, l in enumerate(lines):
        if l == f"  {catid}:":
            start = i
            break
    if start is None:
        raise RuntimeError(f"registry: category '{catid}' not found")
    # boundary = first non-blank line at indent <= 2 after the category header
    end = len(lines)
    for j in range(start + 1, len(lines)):
        l = lines[j]
        if l.strip() == "":
            continue
        indent = len(l) - len(l.lstrip(" "))
        if indent <= 2:
            end = j
            break
    # back up over trailing blanks so we insert right after the last content line
    k = end
    while k - 1 > start and lines[k - 1].strip() == "":
        k -= 1
    entry = [
        "",
        f"      - name: {name}",
        f"        repository: claude-skills",
        f"        path: {dirname}/SKILL.md",
        f"        description: {json.dumps(desc, ensure_ascii=False)}",
        f"        tags: [{', '.join(tags)}]",
    ]
    return "\n".join(lines[:k] + entry + lines[k:])


def registry_add_index(text, name, catid):
    marker = "  # External skills (superpowers)"
    idx = text.find(marker)
    if idx == -1:
        raise RuntimeError("registry: skill_index external marker not found")
    line = f"  {name}: {{ repo: claude-skills, category: {catid} }}\n"
    return text[:idx] + line + text[idx:]


def ts_has_skill(text, skid):
    return re.search(r"id:\s*'%s'\s*," % re.escape(skid), text) is not None


def ts_add_skill(text, skid, name, dirname, desc, catid, tags):
    marker = "  // Superpowers: Testing & Debugging"
    idx = text.find(marker)
    if idx == -1:
        raise RuntimeError("skills.ts: local-block end marker not found")
    tags_js = ", ".join("'%s'" % t for t in tags)
    obj = (
        "  {\n"
        f"    id: '{skid}',\n"
        f"    name: {json.dumps(name, ensure_ascii=False)},\n"
        f"    description: {json.dumps(desc, ensure_ascii=False)},\n"
        f"    repository: 'claude-skills',\n"
        f"    category: '{catid}',\n"
        f"    categoryName: {json.dumps(CATEGORY_NAME[catid], ensure_ascii=False)},\n"
        f"    tags: [{tags_js}],\n"
        f"    path: '{dirname}/SKILL.md',\n"
        f"    isLocal: true,\n"
        "  },\n"
    )
    return text[:idx] + obj + text[idx:]


def ts_bump_category(text, catid, delta):
    pat = re.compile(r"(\{ id: '%s',[^}]*?skillCount: )(\d+)" % re.escape(catid))
    m = pat.search(text)
    if not m:
        raise RuntimeError(f"skills.ts: category count for '{catid}' not found")
    return text[:m.start(2)] + str(int(m.group(2)) + delta) + text[m.end(2):]


def ts_bump_repo(text, delta):
    m = re.search(r"(id: 'claude-skills',.*?skillCount: )(\d+)", text, re.S)
    if not m:
        raise RuntimeError("skills.ts: claude-skills repo count not found")
    return text[:m.start(2)] + str(int(m.group(2)) + delta) + text[m.end(2):]


def doc_has_skill(text, skid):
    return re.search(r"^- `%s`" % re.escape(skid), text, re.M) is not None


def doc_add_bullet(text, catid, skid, desc):
    heading = DOC_HEADING.get(catid)
    if not heading:
        return text, False
    lines = text.split("\n")
    h = None
    for i, l in enumerate(lines):
        if l.strip() == heading:
            h = i
            break
    if h is None:
        return text, False
    # find last consecutive bullet line after the heading
    last = h
    for j in range(h + 1, len(lines)):
        if lines[j].startswith("- "):
            last = j
        elif lines[j].strip() == "":
            break
        else:
            break
    bullet = f"- `{skid}` - {desc}"
    return "\n".join(lines[:last + 1] + [bullet] + lines[last + 1:]), True


def update_registry_date(text):
    return re.sub(r'^last_updated:\s*".*"$',
                  f'last_updated: "{datetime.now():%Y-%m-%d}"',
                  text, count=1, flags=re.M)


def delimiters_balanced(text):
    pairs = {"(": ")", "[": "]", "{": "}"}
    closers = set(pairs.values())
    stack = []
    instr = None
    esc = False
    for c in text:
        if instr:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == instr:
                instr = None
            continue
        if c in ("'", '"', "`"):
            instr = c
            continue
        if c in pairs:
            stack.append(c)
        elif c in closers:
            if not stack or pairs[stack.pop()] != c:
                return False
    return not stack and instr is None


def abort(reason):
    log(f"ABORT: {reason}")
    run(["git", "reset", "--hard", "HEAD"])
    run(["git", "clean", "-fd"])
    notify("claude-skills sync FAILED", reason[:200])
    sys.exit(1)


def main():
    log("=== sync-local-skills start ===")
    ensure_yaml()
    if not os.path.isdir(REPO) or not os.path.isdir(os.path.join(REPO, ".git")):
        log(f"Repo not found at {REPO}; nothing to do.")
        return
    # Require a clean tree so we never tangle with in-progress work.
    st = run(["git", "status", "--porcelain"])
    if st.stdout.strip():
        notify("claude-skills sync skipped", "Working tree not clean; skipped.")
        log("Working tree dirty; skipping this run.")
        return
    run(["git", "pull", "--ff-only"])  # best effort; offline is fine

    src = list_skill_dirs(SRC)
    dst = list_skill_dirs(REPO)
    missing = sorted(set(src) - set(dst))
    if not missing:
        log("No new skills to sync.")
        return
    log(f"New skills to sync ({len(missing)}): {', '.join(missing)}")

    # 1) copy directories (strip nested .git / cruft)
    ignore = shutil.ignore_patterns(".git", ".DS_Store", "__pycache__", "node_modules")
    for name in missing:
        dest = os.path.join(REPO, name)
        shutil.copytree(src[name], dest, ignore=ignore)

    # 2) load files
    reg = open(REGISTRY, encoding="utf-8").read()
    ts = open(SKILLS_TS, encoding="utf-8").read()
    cmd_ = open(CLAUDE_MD, encoding="utf-8").read()
    agm = open(AGENTS_MD, encoding="utf-8").read()

    per_cat = {}
    registered = []
    for name in missing:
        fm_name, fm_desc = parse_frontmatter(os.path.join(REPO, name, "SKILL.md"))
        desc = first_sentence(fm_desc) or f"{prettify(name)} skill."
        disp = prettify(name)
        catid = guess_category(fm_name or name, fm_desc or "")
        tags = make_tags(catid, fm_name or name, fm_desc or "")

        # skip data edits if already registered (e.g. dir was missing but entry existed)
        if not registry_has_skill(reg, name):
            reg = registry_add_to_category(reg, catid, name, name, desc, tags)
            if f"\n  {name}: {{ repo: claude-skills" not in reg:
                reg = registry_add_index(reg, name, catid)
        if not ts_has_skill(ts, name):
            ts = ts_add_skill(ts, name, disp, name, desc, catid, tags)
            per_cat[catid] = per_cat.get(catid, 0) + 1
            registered.append(name)
        if not doc_has_skill(cmd_, name):
            cmd_, _ = doc_add_bullet(cmd_, catid, name, desc)
        if not doc_has_skill(agm, name):
            agm, _ = doc_add_bullet(agm, catid, name, desc)
        log(f"  registered {name} -> {catid}")

    # 3) bump skills.ts counts
    total_new = sum(per_cat.values())
    if total_new:
        for catid, k in per_cat.items():
            ts = ts_bump_category(ts, catid, k)
        ts = ts_bump_category(ts, "all", total_new)
        ts = ts_bump_repo(ts, total_new)
    reg = update_registry_date(reg)

    # 4) write
    open(REGISTRY, "w", encoding="utf-8").write(reg)
    open(SKILLS_TS, "w", encoding="utf-8").write(ts)
    open(CLAUDE_MD, "w", encoding="utf-8").write(cmd_)
    open(AGENTS_MD, "w", encoding="utf-8").write(agm)

    # 5) VALIDATE — discard everything on any failure
    try:
        import yaml
        yaml.safe_load(open(REGISTRY, encoding="utf-8"))
    except Exception as e:
        abort(f"registry YAML failed to parse: {e}")

    scan = run([sys.executable, "scripts/registry-manager.py", "scan"])
    if "Registry is up to date with local skills" not in scan.stdout:
        abort("registry-manager scan did not report 'up to date':\n" +
              (scan.stdout + scan.stderr)[-500:])

    if not delimiters_balanced(open(SKILLS_TS, encoding="utf-8").read()):
        abort("skills.ts delimiter balance check failed")

    for name in missing:
        if not registry_has_skill(reg, name):
            abort(f"post-check: {name} missing from registry")

    # 6) commit + push
    run(["git", "add", "-A"])
    title = ("Sync %d skill%s from ~/.claude/skills"
             % (len(missing), "" if len(missing) == 1 else "s"))
    body = "Auto-synced by sync-local-skills.py.\n\nAdded: " + ", ".join(missing)
    c = run(["git", "commit", "-m", title, "-m", body])
    if c.returncode != 0:
        abort("git commit failed:\n" + (c.stdout + c.stderr)[-500:])
    p = run(["git", "push", "origin", "main"])
    if p.returncode != 0:
        notify("claude-skills synced (push failed)",
               f"Committed {len(missing)} skill(s) locally but push failed (offline?).")
        log("Push FAILED (committed locally). " + (p.stdout + p.stderr)[-300:])
        return
    log(f"Pushed {len(missing)} new skill(s).")
    notify("claude-skills synced",
           f"Added {len(missing)}: {', '.join(missing)[:150]}")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        abort(f"unexpected error: {e}")
    finally:
        log("=== sync-local-skills end ===")
