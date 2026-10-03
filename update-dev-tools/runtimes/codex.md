Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:path-warning -->
5. **Relay any `WARNINGS`** (non-fatal — they don't fail the run). The key one flags
   that mise's runtimes aren't resolvable in a non-interactive shell, so **hooks or
   GUI apps that launch `node` through `/bin/sh -c` can hit `node: command not found`**
   after a Node bump (this includes Codex hooks if any of yours run a `node` script;
   check `~/.codex/hooks.json` to see how they are launched). Pass on the remedy the
   report prints (put mise's shims dir on a PATH those tools inherit), but **do not edit
   any agent configuration yourself** (`~/.codex/config.toml`, `~/.codex/hooks.json`)
   unless the user asks — the script deliberately only warns. Note that the printed
   remedy names `~/.claude/settings.json`, which is Claude Code's settings file: it
   applies only if the user also runs Claude Code; for Codex, do not assume an
   equivalent `env` setting exists, check the Codex documentation or ask. See
   `references/gotchas.md`.
<!-- /slot:path-warning -->
