Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:session-drift -->
- **Session drift check (Claude Code only)** → `scripts/session-drift-notice.sh` is a Claude Code
  SessionStart hook; Codex does not wire it, so no notice fires at session start. When the user
  talks about syncing, run `sh ~/.agents/skills/sync-to-azure/scripts/drift-status.sh` from the
  project: `BEHIND <n>` means remind the user to sync, `IN_SYNC` and `UNKNOWN …` need no reminder.
  Whether a Codex hook can automate this is unverified; check `~/.codex/hooks.json` first.
<!-- /slot:session-drift -->
