#!/usr/bin/env bash
# collect-diagnostics.sh — gather evidence for a bug report into one folder.
# Collects: environment (doctor), project facts, recent crash reports for the app, unified-log
# entries for the process, sandbox denials, the latest build/test logs, and the result bundle
# summary. Reads system logs; writes only under .artifacts/diagnostics/<timestamp>/.
#
# Usage: bash scripts/collect-diagnostics.sh --app NAME [--bundle-id ID] [--since 1h|30m|2d]
#                                            [--dir DIR] [--no-log]
#   --app        process/product name as it appears in crash reports and `log` (required)
#   --bundle-id  bundle identifier, improves crash-report matching
#   --since      how far back to read unified logs (default: 1h)
#   --no-log     skip unified-log collection (it can be slow on busy systems)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

APP=""; BUNDLE=""; SINCE="1h"; DIR="."; DO_LOG=1
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --app) APP="$2"; shift 2 ;;
    --bundle-id) BUNDLE="$2"; shift 2 ;;
    --since) SINCE="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --no-log) DO_LOG=0; shift ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done
[ -n "$APP" ] || die "--app NAME is required (product name, e.g. --app MyApp)."

require_macos
cd "$DIR" || exit 1
ensure_artifacts
OUT="$ARTIFACTS_DIR/diagnostics/$(timestamp)"
mkdir -p "$OUT"
info "collecting into $OUT"

section "Environment"
bash "$SCRIPT_DIR/doctor.sh" > "$OUT/doctor.txt" 2>&1 || true
if [ -n "$(find . -maxdepth 2 \( -name '*.xcodeproj' -o -name '*.xcworkspace' -o -name Package.swift \) 2>/dev/null | head -n 1)" ]; then
  bash "$SCRIPT_DIR/project-info.sh" ${SCHEME:+--scheme "$SCHEME"} > "$OUT/project-info.txt" 2>&1 || true
fi
ok "doctor.txt, project-info.txt"

section "Crash reports"
CRASH_DIRS="$HOME/Library/Logs/DiagnosticReports /Library/Logs/DiagnosticReports"
FOUND=0
for d in $CRASH_DIRS; do
  [ -d "$d" ] || continue
  # .ips is the current crash format; .crash/.hang/.spin are older or complementary.
  find "$d" -maxdepth 1 -type f \( -name "${APP}*.ips" -o -name "${APP}*.crash" -o -name "${APP}*.hang" -o -name "${APP}*.spin" \) -mtime -14 2>/dev/null \
    | sort | tail -n 5 | while IFS= read -r f; do
      cp "$f" "$OUT/" 2>/dev/null && log "  $(basename "$f")"
    done
  n="$(find "$d" -maxdepth 1 -type f -name "${APP}*" -mtime -14 2>/dev/null | wc -l | tr -d ' ')"
  FOUND=$((FOUND + n))
done
[ "$FOUND" -gt 0 ] || log "  none in the last 14 days for '$APP'"

if [ "$DO_LOG" = "1" ]; then
  section "Unified log (last $SINCE)"
  PRED="process == \"$APP\""
  [ -n "$BUNDLE" ] && PRED="$PRED OR subsystem == \"$BUNDLE\""
  log show --last "$SINCE" --style compact --info --debug --predicate "$PRED" > "$OUT/app-log.txt" 2>&1 || true
  log "  app-log.txt: $(wc -l < "$OUT/app-log.txt" | tr -d ' ') lines"
  # Sandbox denials and TCC (permission) decisions are the usual hidden causes of "it just doesn't work".
  log show --last "$SINCE" --style compact --predicate "(process == \"sandboxd\" OR process == \"kernel\") AND eventMessage CONTAINS \"$APP\"" > "$OUT/sandbox-denials.txt" 2>&1 || true
  log "  sandbox-denials.txt: $(wc -l < "$OUT/sandbox-denials.txt" | tr -d ' ') lines"
  log show --last "$SINCE" --style compact --predicate "subsystem == \"com.apple.TCC\" AND eventMessage CONTAINS \"$APP\"" > "$OUT/tcc.txt" 2>&1 || true
  log "  tcc.txt: $(wc -l < "$OUT/tcc.txt" | tr -d ' ') lines"
fi

section "Build and test artifacts"
LATEST_BUILD="$(ls -t "$ARTIFACTS_DIR"/build-*.log 2>/dev/null | head -n 1 || true)"
LATEST_TEST="$(ls -t "$ARTIFACTS_DIR"/test-*.log 2>/dev/null | head -n 1 || true)"
[ -n "$LATEST_BUILD" ] && cp "$LATEST_BUILD" "$OUT/last-build.log" && log "  last-build.log ← $(basename "$LATEST_BUILD")"
[ -n "$LATEST_TEST" ] && cp "$LATEST_TEST" "$OUT/last-test.log" && log "  last-test.log ← $(basename "$LATEST_TEST")"
if [ -d "$ARTIFACTS_DIR/Tests.xcresult" ] && xcrun --find xcresulttool >/dev/null 2>&1; then
  xcrun xcresulttool get test-results summary --path "$ARTIFACTS_DIR/Tests.xcresult" > "$OUT/test-summary.json" 2>/dev/null \
    && log "  test-summary.json" || true
fi

cat > "$OUT/README.md" <<EOF
# Diagnostics bundle — $APP — $(date '+%Y-%m-%d %H:%M')

Read in this order:
1. doctor.txt / project-info.txt — the environment the bug was observed in.
2. *.ips / *.crash / *.hang — crash or hang reports (newest last). Symbolicate against the matching dSYM if frames show addresses.
3. sandbox-denials.txt, tcc.txt — permission and sandbox causes.
4. app-log.txt — the app's own Logger output (filter by category).
5. last-build.log / last-test.log / test-summary.json — what the toolchain said.

Next step: classify the failure with references/debugging-observability.md, then write a falsifiable hypothesis.
EOF
hr
ok "diagnostics collected: $OUT"
