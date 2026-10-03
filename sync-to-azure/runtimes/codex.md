Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:session-drift -->
- **Session drift check (Claude Code only)** → `scripts/session-drift-notice.sh` is a
  Claude Code SessionStart hook payload; this Codex install does not wire it, and you must
  not assume Codex has an equivalent. So no automatic notice fires at session start. When
  the user talks about syncing, or at the start of a sync-related session, run
  `sh ~/.agents/skills/sync-to-azure/scripts/drift-status.sh` from the project: `BEHIND <n>`
  means the mirror is behind local `master` (remind the user to sync), `IN_SYNC` and
  `UNKNOWN …` need no reminder. Whether a Codex hook can automate this is unverified here;
  check `~/.codex/hooks.json` and the Codex documentation before promising it.
<!-- /slot:session-drift -->
