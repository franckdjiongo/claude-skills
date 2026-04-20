#!/usr/bin/env bash
# Usage: find_app.sh <search_term>
# Searches /Applications and ~/Applications for apps matching the term.
# Prints one matching .app path per line. Exit 0 if found, 1 if not.

set -euo pipefail

SEARCH="${1:-}"
if [[ -z "$SEARCH" ]]; then
  echo "Usage: find_app.sh <search_term>" >&2
  exit 2
fi

RESULTS=()

while IFS= read -r match; do
  RESULTS+=("$match")
done < <(find /Applications "$HOME/Applications" -maxdepth 2 -iname "*${SEARCH}*.app" 2>/dev/null | sort)

if [[ ${#RESULTS[@]} -eq 0 ]]; then
  echo "No app found matching: $SEARCH" >&2
  exit 1
fi

for r in "${RESULTS[@]}"; do
  echo "$r"
done
