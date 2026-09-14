#!/usr/bin/env bash
# export-apple-skills.sh — export Apple's Xcode agent skills (SwiftUI specialist, what's new, …)
# so the agent reads Apple's current API guidance instead of this skill's snapshots.
# Requires an Xcode whose toolchain provides `xcrun agent skills export` (present on Xcode 26.6+).
# Writes to ./.apple-skills/ (or --out) plus a manifest.json recording the producing Xcode.
#
# Usage: bash scripts/export-apple-skills.sh [--out DIR] [--force] [--list]
#   --out DIR   destination (default: .apple-skills)
#   --force     re-export even if the manifest matches the installed Xcode
#   --list      only list what the installed Xcode can export, do not write
# Exit codes: 0 exported/up to date · 2 unsupported on this Xcode · 1 error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

OUT=".apple-skills"; FORCE=0; LIST=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --out) OUT="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --list) LIST=1; shift ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

require_xcode
XCODE_VERSION="$(xcodebuild -version 2>/dev/null | tr '\n' ' ' | sed 's/ *$//')"

if ! xcrun --find agent >/dev/null 2>&1; then
  log "This Xcode ($XCODE_VERSION) does not provide 'xcrun agent'."
  log "Fall back to: SDK inspection (doctor.sh), then current Apple documentation. See references/source-refresh.md."
  exit 2
fi

# The subcommand surface may evolve; probe before relying on a flag.
HELP="$(xcrun agent skills export --help 2>&1 || xcrun agent skills --help 2>&1 || xcrun agent --help 2>&1 || true)"
if ! printf '%s' "$HELP" | grep -qi 'skill'; then
  log "'xcrun agent' exists but no skills subcommand responded. Output:"
  printf '%s\n' "$HELP" | head -n 20 | sed 's/^/  /'
  exit 2
fi

if [ "$LIST" = "1" ]; then
  section "Skills the installed Xcode reports"
  xcrun agent skills list 2>&1 | sed 's/^/  /' || printf '%s\n' "$HELP" | sed 's/^/  /'
  exit 0
fi

MANIFEST="$OUT/manifest.json"
if [ "$FORCE" = "0" ] && [ -f "$MANIFEST" ] && grep -q -F "$XCODE_VERSION" "$MANIFEST"; then
  ok "Apple skills already exported for $XCODE_VERSION → $OUT (use --force to re-export)"
  find "$OUT" -name 'SKILL.md' | sed 's/^/  /'
  exit 0
fi

mkdir -p "$OUT"
# The tool resolves a relative --output-dir against "/" (a read-only volume),
# so always hand it an absolute path computed from the created directory.
OUT_ABS="$(cd "$OUT" && pwd)"
section "Exporting Apple agent skills ($XCODE_VERSION)"
set +e
# Current syntax (Xcode 26.6+): `--output-dir <absolute path>` with `--replace-existing`
# to overwrite. Keep a fallback to the older `--output` flag in case a future
# toolchain renames it; if the tool wants something else its stderr is shown below.
xcrun agent skills export --output-dir "$OUT_ABS" --replace-existing 2>"$OUT/.export-stderr" \
  || xcrun agent skills export --output "$OUT_ABS" 2>>"$OUT/.export-stderr"
STATUS=$?
set -e
if [ "$STATUS" -ne 0 ]; then
  fail "export failed (exit $STATUS). Tool output:"
  sed 's/^/  /' "$OUT/.export-stderr" | head -n 20
  log "Check the current syntax with: xcrun agent skills export --help"
  exit 1
fi
rm -f "$OUT/.export-stderr"

SKILLS="$(find "$OUT" -name 'SKILL.md' 2>/dev/null | sort || true)"
COUNT="$(printf '%s\n' "$SKILLS" | sed '/^$/d' | wc -l | tr -d ' ')"
[ "$COUNT" != "0" ] || warn "export ran but no SKILL.md files were found under $OUT — the installed Xcode reports no exportable agent skills (none installed, or Xcode is not running). The capability is present; there is simply nothing to export."

{
  printf '{\n  "xcode": "%s",\n  "exported_at": "%s",\n  "sdk_macos": "%s",\n  "skills": [' \
    "$(json_escape "$XCODE_VERSION")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$(json_escape "$(xcodebuild -showsdks 2>/dev/null | grep -i macos | head -n 1 | sed 's/^[ \t]*//')")"
  first=1
  printf '%s\n' "$SKILLS" | sed '/^$/d' | while IFS= read -r s; do
    name="$(grep -m1 '^name:' "$s" 2>/dev/null | sed 's/^name:[ ]*//')"
    [ "$first" = "1" ] || printf ','
    printf '\n    {"path": "%s", "name": "%s"}' "$(json_escape "$s")" "$(json_escape "${name:-$(basename "$(dirname "$s")")}")"
    first=0
  done
  printf '\n  ]\n}\n'
} > "$MANIFEST"

ok "$COUNT skill(s) exported → $OUT"
printf '%s\n' "$SKILLS" | sed 's/^/  /'
hr
log "Read the SwiftUI specialist / what's-new skills before writing version-sensitive UI code."
log "Apple's guidance wins on API facts; this skill wins on process (references/source-refresh.md)."
log "Add $OUT to .gitignore unless the team wants the export versioned."
