Texte Codex de chaque emplacement runtime de ../SKILL.md. Construit par
scripts/build-runtime-variant.mjs (racine de claude-skills) ; format décrit dans son en-tête.

<!-- slot:session-def -->
"This session" means the current Codex thread, including any delegated threads. Inspect thread final states and file-change summaries when threads were used. Attribution is read from thread evidence, not from timestamps, file names, a `codex/` branch name, or `git status` alone.
<!-- /slot:session-def -->

<!-- slot:policy-files -->
- Read `AGENTS.md` and governing instructions. Honor required gates and commit conventions.
<!-- /slot:policy-files -->

<!-- slot:account-alias -->
- Confirm the intended remote account and SSH alias only in push-enabled modes (an SSH alias URL, never `https://github.com/…`, with a matching `git config user.email`).
<!-- /slot:account-alias -->

<!-- slot:session-branch -->
Temporary session branches are named `codex/session-<id>`. Archive a completed Codex task only when the user explicitly requested task/thread cleanup.
<!-- /slot:session-branch -->
