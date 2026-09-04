#!/usr/bin/env bash
# build.sh — build a scheme with xcodebuild and keep a log under .artifacts/.
# Exits non-zero on build failure and prints the first errors so the agent can act on them.
#
# Usage: bash scripts/build.sh [--scheme NAME] [--configuration Debug|Release] [--clean]
#                              [--derived-data PATH] [--destination 'platform=macOS'] [--dir DIR]
#                              [--] [extra xcodebuild args]
#   --scheme          scheme to build (default: the only scheme)
#   --configuration   Debug (default) or Release
#   --clean           run clean before build
#   --derived-data    custom DerivedData path (default: Xcode's; use .artifacts/DerivedData for isolation)
#   --dir             project directory (default: current directory)
#   --warnings-as-errors  add SWIFT_TREAT_WARNINGS_AS_ERRORS=YES

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

SCHEME="${SCHEME:-}"; CONF="Debug"; CLEAN=0; DERIVED=""; DEST="platform=macOS"; DIR="."; WAE=0
EXTRA=""
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --scheme) SCHEME="$2"; shift 2 ;;
    --configuration) CONF="$2"; shift 2 ;;
    --clean) CLEAN=1; shift ;;
    --derived-data) DERIVED="$2"; shift 2 ;;
    --destination) DEST="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --warnings-as-errors) WAE=1; shift ;;
    --) shift; EXTRA="$*"; break ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

require_xcode
cd "$DIR" || exit 1
find_container "."
[ -n "$CONTAINER_PATH" ] || die "No Xcode project, workspace, or Package.swift in $(pwd)."
resolve_scheme
ensure_artifacts

LOG="$ARTIFACTS_DIR/build-$CONF-$(timestamp).log"
ACTIONS="build"; [ "$CLEAN" = "1" ] && ACTIONS="clean build"

info "xcodebuild ${CONTAINER_FLAG:-} ${CONTAINER_PATH} -scheme $SCHEME -configuration $CONF -destination '$DEST' $ACTIONS"
info "log → $LOG"

ARGS=()
[ -n "${CONTAINER_FLAG:-}" ] && ARGS+=("$CONTAINER_FLAG" "$CONTAINER_PATH")
ARGS+=(-scheme "$SCHEME" -configuration "$CONF" -destination "$DEST")
[ -n "$DERIVED" ] && ARGS+=(-derivedDataPath "$DERIVED")
[ "$WAE" = "1" ] && ARGS+=(SWIFT_TREAT_WARNINGS_AS_ERRORS=YES)

set +e
# shellcheck disable=SC2086
xcodebuild "${ARGS[@]}" $EXTRA $ACTIONS 2>&1 | tee "$LOG" | xcb_format
STATUS=${PIPESTATUS[0]}
set -e

summarize_log "$LOG"
if [ "$STATUS" -eq 0 ]; then
  ok "BUILD SUCCEEDED ($SCHEME, $CONF)"
else
  fail "BUILD FAILED ($SCHEME, $CONF) — exit $STATUS. Classify the failure with references/debugging-observability.md before editing."
fi
exit "$STATUS"
