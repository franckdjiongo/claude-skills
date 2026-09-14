#!/usr/bin/env bash
# test.sh — run tests with xcodebuild, keep an .xcresult bundle, and print a structured summary.
# The .xcresult is the evidence the agent should read instead of console noise.
#
# Usage: bash scripts/test.sh [--scheme NAME] [--configuration Debug|Release] [--test-plan NAME]
#                             [--only TARGET[/Class[/test]]] [--skip TARGET] [--ui]
#                             [--result-bundle-path PATH] [--derived-data PATH] [--dir DIR]
#   --only / --only-testing   restrict to a target, class, or test (repeatable)
#   --skip / --skip-testing   exclude a target, class, or test (repeatable)
#   --ui                      run only targets whose name ends in UITests (critical journeys)
#   --test-plan               use a named test plan from the scheme
#   --result-bundle-path      default .artifacts/Tests.xcresult (replaced on each run)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

SCHEME="${SCHEME:-}"; CONF="Debug"; PLAN=""; DERIVED=""; DIR="."; UI=0
RESULT="$ARTIFACTS_DIR/Tests.xcresult"
ONLY=(); SKIP=()
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --scheme) SCHEME="$2"; shift 2 ;;
    --configuration) CONF="$2"; shift 2 ;;
    --test-plan) PLAN="$2"; shift 2 ;;
    --only|--only-testing) ONLY+=("$2"); shift 2 ;;
    --skip|--skip-testing) SKIP+=("$2"); shift 2 ;;
    --ui) UI=1; shift ;;
    --result-bundle-path) RESULT="$2"; shift 2 ;;
    --derived-data) DERIVED="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

require_xcode
cd "$DIR" || exit 1
find_container "."
[ -n "$CONTAINER_PATH" ] || die "No Xcode project, workspace, or Package.swift in $(pwd)."
resolve_scheme
ensure_artifacts

if [ "$UI" = "1" ] && [ "${#ONLY[@]}" -eq 0 ]; then
  UI_TARGETS="$(xcb -list 2>/dev/null \
    | awk '/Targets:/{f=1; next} f && NF==0 {f=0} f {sub(/^[ \t]+/, ""); print}' | grep 'UITests$' || true)"
  [ -n "$UI_TARGETS" ] || die "--ui requested but no *UITests target exists."
  while IFS= read -r t; do ONLY+=("$t"); done <<EOF
$UI_TARGETS
EOF
fi

# xcodebuild refuses to overwrite an existing result bundle.
[ -e "$RESULT" ] && rm -rf "$RESULT"
LOG="$ARTIFACTS_DIR/test-$CONF-$(timestamp).log"

ARGS=()
[ -n "${CONTAINER_FLAG:-}" ] && ARGS+=("$CONTAINER_FLAG" "$CONTAINER_PATH")
ARGS+=(-scheme "$SCHEME" -configuration "$CONF" -destination "platform=macOS" -resultBundlePath "$RESULT")
[ -n "$PLAN" ] && ARGS+=(-testPlan "$PLAN")
[ -n "$DERIVED" ] && ARGS+=(-derivedDataPath "$DERIVED")
i=0; while [ $i -lt "${#ONLY[@]}" ]; do ARGS+=("-only-testing:${ONLY[$i]}"); i=$((i+1)); done
i=0; while [ $i -lt "${#SKIP[@]}" ]; do ARGS+=("-skip-testing:${SKIP[$i]}"); i=$((i+1)); done

info "xcodebuild test — scheme $SCHEME, $CONF${PLAN:+, plan $PLAN}${ONLY[0]:+, only ${ONLY[*]}}"
info "result bundle → $RESULT   log → $LOG"

set +e
xcodebuild "${ARGS[@]}" test 2>&1 | tee "$LOG" | xcb_format
STATUS=${PIPESTATUS[0]}
set -e

# --- summary from the result bundle -----------------------------------------
hr
if [ -d "$RESULT" ] && xcrun --find xcresulttool >/dev/null 2>&1; then
  # Newer xcresulttool exposes a summary subcommand; older ones need the legacy JSON graph.
  if SUMMARY="$(xcrun xcresulttool get test-results summary --path "$RESULT" 2>/dev/null)"; then
    printf '%s\n' "$SUMMARY" | awk '
      /"totalTestCount"/  {gsub(/[^0-9]/,""); total=$0}
      /"passedTests"/     {gsub(/[^0-9]/,""); passed=$0}
      /"failedTests"/     {gsub(/[^0-9]/,""); failed=$0}
      /"skippedTests"/    {gsub(/[^0-9]/,""); skipped=$0}
      /"result"/ && !seen {seen=1; r=$0; sub(/.*: *"/,"",r); sub(/".*/,"",r); result=r}
      END {printf "tests: %s  passed: %s  failed: %s  skipped: %s  result: %s\n", total, passed, failed, skipped, result}'
    FAILS="$(xcrun xcresulttool get test-results tests --path "$RESULT" 2>/dev/null \
      | grep -B2 -A4 '"result" *: *"Failed"' | grep -E '"(name|nodeIdentifier)"' | sed -E 's/.*: *"([^"]*)".*/  \1/' | sort -u | head -n 40 || true)"
    if [ -n "$FAILS" ]; then log "Failed tests:"; printf '%s\n' "$FAILS"; fi
  else
    log "Summary (legacy xcresulttool):"
    xcrun xcresulttool get --format json --path "$RESULT" --legacy 2>/dev/null \
      | grep -E '"(testsCount|testsFailedCount|testsSkippedCount)"' -A1 | grep '"_value"' \
      | sed -E 's/.*"_value" *: *"?([0-9]+)"?.*/  \1/' | paste - - - 2>/dev/null \
      | awk '{printf "  tests: %s  failed: %s  skipped: %s\n", $1, $2, $3}' || true
  fi
  log "Inspect: xcrun xcresulttool get test-results tests --path $RESULT   (or open it in Xcode)"
else
  warn "No result bundle produced; falling back to the log."
  grep -E 'Test Case .* (failed|passed)|Executed [0-9]+ tests?' "$LOG" | tail -n 20 | sed 's/^/  /' || true
fi
summarize_log "$LOG"

if [ "$STATUS" -eq 0 ]; then ok "TESTS PASSED ($SCHEME)"; else fail "TESTS FAILED ($SCHEME) — exit $STATUS"; fi
exit "$STATUS"
