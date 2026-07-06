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

## Packaging EXISTING skills into a plugin — anti-duplication (MANDATORY)

When a plugin bundles skills that were ALREADY cataloged as standalone
distributable skills (e.g. `design-studio` packaging `brand-forge`,
`ship-polished-ui`, `design-elevation`), the registry must NOT list each skill
twice — once standalone and once "inside" the plugin. Do this instead:

1. **Do NOT add a fresh standalone entry** for each bundled skill. Keep the
   existing entries (users still search for `brand-forge`), but:
   - **`skills-registry.yaml`** — on each bundled skill's `skill_index` entry,
     repoint `path` to `my-plugin/skills/<skill>/SKILL.md` and note it in the
     description/tags as **"part of the `<plugin>` plugin"**. Do NOT bump the
     category `skillCount` for these (they were already counted).
   - **`skills-app/src/data/skills.ts`** — update each bundled skill object's
     `path` to `my-plugin/skills/<skill>/SKILL.md` and annotate it as
     part of `<plugin>`. Do NOT re-increment any `skillCount` for a skill that
     already existed.
   - **`CLAUDE.md`** — annotate each existing bullet with "(part of `<plugin>`
     plugin)" rather than adding new bullets.
2. **Add exactly ONE new plugin entry** describing the container itself
   (`<plugin>` = the bundle), so the plugin is discoverable as a unit — in the
   marketplace catalogs (scaffolder does this) and, if you list plugins in the
   registry/app, one plugin-level entry there.
3. **Net effect**: N existing skill entries (repointed + annotated) + 1 plugin
   entry. Never N duplicated skill entries. Re-run `validate_plugin.py` and
   `registry-manager.py info <skill>` to confirm each bundled skill still
   resolves to its new in-plugin path and appears only once.

> Skills created fresh WITH the plugin (never cataloged before) follow the normal
> "Dual data sources" section above — one entry each, counts bumped once.

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
