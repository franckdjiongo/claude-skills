# This repo's plugin bookkeeping

Read before committing a new/updated plugin in `claude-skills`. The scaffolder
handles the plugin skeleton + both marketplace catalogs; the items below need
human judgment, so do them by hand, then run `validate_plugin.py`.

## Dual data sources (MANDATORY when the plugin ships a library skill)

A distributable plugin lives at the **repo root** (e.g. `my-plugin/`) and its
skill is cataloged in TWO places that do not auto-sync:

1. **`skills-registry.yaml`**
   - Add the skill under the right category in `categories:`.
   - Add an entry to `skill_index:` (name, repository, `path:
     my-plugin/skills/my-plugin/SKILL.md`, description, tags).
   - Bump `last_updated` (`"YYYY-MM-DD"`).
2. **`skills-app/src/data/skills.ts`**
   - Add the skill object to the `skills` array (`path:
     'my-plugin/skills/my-plugin/SKILL.md'`).
   - Increment `skillCount` on the matching category, on the `'all'` category,
     and on the repository entry.
3. **`CLAUDE.md`** — add the skill to the Skill Categories section.

> The `path` must point at `my-plugin/skills/my-plugin/SKILL.md` (the nested
> layout), never the plugin root.

## Marketplace catalogs (scaffolder does this; verify)

- `.claude-plugin/marketplace.json` — Claude Code catalog (`source: "./my-plugin"`).
- `.agents/plugins/marketplace.json` — Codex catalog (`source: {source:"local",
  path:"./my-plugin"}`).

## Project-local skills are exempt

Skills under `.claude/skills/` (like this one) are tools for working IN this
repo. They are **not** distributable plugins and must **not** be added to
`skills-registry.yaml`, `skills-app`, or the marketplace catalogs.

## Git identity & commits

- This machine has two GitHub accounts via SSH aliases. This repo's remote is
  `git@github-perso:franckdjiongo/claude-skills.git` (perso). Commit identity
  follows the alias automatically — never switch with `gh`/https.
- **Never add `Co-Authored-By` or any AI attribution** to commit messages.
- Commit/push to `main` only when the user asks.

## Validation gate (before commit)

1. `validate_plugin.py <plugin-dir>` → no FAIL.
2. JSON/YAML parse for every edited manifest/catalog/registry file.
3. `python scripts/registry-manager.py info <skill>` resolves to the local file.

Require a PASS before committing.
