#!/bin/sh
# session-drift-notice.sh — SessionStart hook payload. If the Azure mirror is
# behind local master for this app, inject a context note so Claude proactively
# reminds the user to run /sync-to-azure. Silent (no output) when in sync,
# unknown, or not applicable. ALWAYS exits 0 — never blocks a session.
set +e

HELPER="$(dirname "$0")/drift-status.sh"
[ -f "$HELPER" ] || exit 0

status=$(sh "$HELPER" 2>/dev/null)
case "$status" in
  BEHIND*)
    n=$(echo "$status" | awk '{print $2}')
    ctx="Le miroir Azure DevOps de l'entreprise est EN RETARD de ${n} commit(s) sur master (un ou plusieurs push master n'ont pas ete synchronises vers Azure). Rappelle proactivement a l'utilisateur de lancer /sync-to-azure pour synchroniser le repo de l'entreprise."
    # ctx contains no double-quotes/backslashes/newlines, so it is JSON-safe inline.
    printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}' "$ctx"
    ;;
esac
exit 0
