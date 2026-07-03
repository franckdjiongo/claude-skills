#!/bin/sh
# drift-status.sh — Is the Fernand Gilbert Ltée Azure mirror behind local master
# for the code app in the CURRENT git repo? Reads the `Source-commit:` provenance
# trailer written by sync.sh on the LAST commit that touched this app's folder in
# the mirror (~/.fgl-azure/repo), and compares it to local `master`.
#
# Prints ONE line; first token is machine-readable:
#   IN_SYNC               mirror matches local master
#   BEHIND <n>            master is <n> commit(s) ahead of the last sync
#   UNKNOWN <reason>      can't determine (no mirror / no trailer / stale sha / …)
#
# ALWAYS exits 0 — this is a status reporter, never a gate. Run from anywhere
# inside the project (it resolves the repo root itself).
set +e

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "UNKNOWN not-a-repo"; exit 0; }

# App name: power.config.json "name" wins, else the repo folder name (mirrors sync.sh).
APP_NAME=""
if [ -f "$ROOT/power.config.json" ] && command -v node >/dev/null 2>&1; then
  APP_NAME=$(node -e "try{process.stdout.write(require('$ROOT/power.config.json').name||'')}catch(e){}" 2>/dev/null)
fi
[ -z "$APP_NAME" ] && APP_NAME=$(basename "$ROOT")

MIRROR="$HOME/.fgl-azure/repo"
[ -d "$MIRROR/.git" ] || { echo "UNKNOWN no-mirror"; exit 0; }

# Last synced source SHA = Source-commit trailer of the most recent mirror
# commit carrying this app's `Sync-app:` marker (grep, not path filter — so it
# also finds empty provenance-marker commits).
PREV=$(git -C "$MIRROR" log -E --grep="^Sync-app: $APP_NAME$" -1 --pretty=%B 2>/dev/null \
  | sed -n 's/^Source-commit:[[:space:]]*//p' | head -1)
[ -z "$PREV" ] && { echo "UNKNOWN no-trailer"; exit 0; }

MASTER=$(git -C "$ROOT" rev-parse master 2>/dev/null) || { echo "UNKNOWN no-master"; exit 0; }
git -C "$ROOT" cat-file -e "${PREV}^{commit}" 2>/dev/null || { echo "UNKNOWN stale-sha"; exit 0; }

if [ "$PREV" = "$MASTER" ]; then
  echo "IN_SYNC"
else
  N=$(git -C "$ROOT" rev-list --count "${PREV}..master" 2>/dev/null)
  [ -z "$N" ] && N="?"
  echo "BEHIND $N"
fi
exit 0
