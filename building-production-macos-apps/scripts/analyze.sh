#!/usr/bin/env bash
# analyze.sh — static analysis: xcodebuild's analyzer plus SwiftLint when installed.
# Produces .artifacts/analyze-<timestamp>.log and .artifacts/swiftlint-<timestamp>.txt.
#
# Usage: bash scripts/analyze.sh [--scheme NAME] [--configuration Debug|Release] [--dir DIR]
#                                [--no-swiftlint] [--strict]
#   --strict   exit non-zero if the analyzer or SwiftLint reports anything

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

SCHEME="${SCHEME:-}"; CONF="Debug"; DIR="."; LINT=1; STRICT=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --scheme) SCHEME="$2"; shift 2 ;;
    --configuration) CONF="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --no-swiftlint) LINT=0; shift ;;
    --strict) STRICT=1; shift ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

require_xcode
cd "$DIR" || exit 1
find_container "."
[ -n "$CONTAINER_PATH" ] || die "No Xcode project, workspace, or Package.swift in $(pwd)."
resolve_scheme
ensure_artifacts

STAMP="$(timestamp)"
LOG="$ARTIFACTS_DIR/analyze-$STAMP.log"
PROBLEMS=0

section "xcodebuild analyze ($SCHEME, $CONF)"
ARGS=()
[ -n "${CONTAINER_FLAG:-}" ] && ARGS+=("$CONTAINER_FLAG" "$CONTAINER_PATH")
ARGS+=(-scheme "$SCHEME" -configuration "$CONF" -destination "platform=macOS")
set +e
xcodebuild "${ARGS[@]}" analyze 2>&1 | tee "$LOG" | xcb_format
STATUS=${PIPESTATUS[0]}
set -e
ANALYZER_HITS="$(grep -E 'warning: .*(leak|null|dead store|uninitialized|garbage|dereference)|error:' "$LOG" | sort -u || true)"
if [ -n "$ANALYZER_HITS" ]; then
  log "Analyzer findings:"; printf '%s\n' "$ANALYZER_HITS" | head -n 40 | sed 's/^/  /'
  PROBLEMS=$((PROBLEMS + $(printf '%s\n' "$ANALYZER_HITS" | wc -l | tr -d ' ')))
else
  ok "analyzer: no findings"
fi
[ "$STATUS" -ne 0 ] && { fail "analyze step exited $STATUS (see $LOG)"; PROBLEMS=$((PROBLEMS+1)); }

if [ "$LINT" = "1" ]; then
  section "SwiftLint"
  if have_cmd swiftlint; then
    LINT_OUT="$ARTIFACTS_DIR/swiftlint-$STAMP.txt"
    set +e
    swiftlint lint --quiet --reporter emoji > "$LINT_OUT" 2>&1
    LINT_STATUS=$?
    set -e
    LINT_COUNT="$(grep -c -E '(⚠️|⛔️)' "$LINT_OUT" 2>/dev/null || true)"
    if [ "${LINT_COUNT:-0}" = "0" ] && [ "$LINT_STATUS" -eq 0 ]; then
      ok "swiftlint: clean"
    else
      log "swiftlint: ${LINT_COUNT:-?} findings (full list: $LINT_OUT)"
      head -n 25 "$LINT_OUT" | sed 's/^/  /'
      PROBLEMS=$((PROBLEMS + ${LINT_COUNT:-1}))
    fi
    [ -f .swiftlint.yml ] || warn "no .swiftlint.yml — defaults in effect; add one to make findings project-specific."
  else
    log "  swiftlint not installed (brew install swiftlint); skipping."
  fi
fi

hr
log "Total findings: $PROBLEMS"
if [ "$STRICT" = "1" ] && [ "$PROBLEMS" -gt 0 ]; then exit 1; fi
exit 0
