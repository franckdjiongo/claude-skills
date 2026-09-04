#!/usr/bin/env bash
# release-build.sh — archive in Release, export with the chosen distribution method, verify.
# Produces .artifacts/release/<Scheme>.xcarchive and an exported app/pkg under .artifacts/release/export/.
# NEVER uploads, submits for notarization, staples, tags, or touches signing identities.
# It ends by printing the commands the user runs to publish.
#
# Usage: bash scripts/release-build.sh --method app-store|developer-id [--scheme NAME]
#          [--configuration Release] [--team-id TEAMID] [--export-options PATH] [--dir DIR] [--skip-verify]
#   --method          app-store (Mac App Store) or developer-id (direct distribution)
#   --team-id         Apple Developer Team ID written into ExportOptions.plist (optional if the project sets it)
#   --export-options  use an existing ExportOptions.plist instead of generating one
#   --skip-verify     do not run verify-release.sh on the exported artifact

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

METHOD=""; SCHEME="${SCHEME:-}"; CONF="Release"; TEAM_ID=""; EXPORT_OPTS=""; DIR="."; VERIFY=1
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --method) METHOD="$2"; shift 2 ;;
    --scheme) SCHEME="$2"; shift 2 ;;
    --configuration) CONF="$2"; shift 2 ;;
    --team-id) TEAM_ID="$2"; shift 2 ;;
    --export-options) EXPORT_OPTS="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --skip-verify) VERIFY=0; shift ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
done

case "$METHOD" in
  app-store|developer-id) ;;
  "") die "--method app-store|developer-id is required. Distribution is a decision, not a default (references/distribution-security.md)." ;;
  *) die "Unknown --method '$METHOD' (use app-store or developer-id)." ;;
esac

require_xcode
cd "$DIR" || exit 1
find_container "."
[ -n "${CONTAINER_FLAG:-}" ] || die "Archiving needs an .xcodeproj or .xcworkspace (a bare package cannot be archived as an app)."
resolve_scheme

RELEASE_DIR="$ARTIFACTS_DIR/release"
EXPORT_DIR="$RELEASE_DIR/export"
ARCHIVE="$RELEASE_DIR/$SCHEME.xcarchive"
mkdir -p "$RELEASE_DIR"
rm -rf "$ARCHIVE" "$EXPORT_DIR"

if [ -z "$TEAM_ID" ]; then
  TEAM_ID="$(build_setting DEVELOPMENT_TEAM "$CONF" || true)"
fi

# Git state is a release input: an archive from a dirty tree cannot be reproduced.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  DIRTY="$(git status --porcelain | wc -l | tr -d ' ')"
  [ "$DIRTY" = "0" ] || warn "working tree has $DIRTY uncommitted change(s); this archive is not reproducible from a commit."
  git log -1 --format='%H %s' > "$RELEASE_DIR/commit.txt" 2>/dev/null || true
fi

section "1/3 Archive ($SCHEME, $CONF)"
LOG="$RELEASE_DIR/archive-$(timestamp).log"
set +e
xcodebuild "$CONTAINER_FLAG" "$CONTAINER_PATH" -scheme "$SCHEME" -configuration "$CONF" \
  -destination "generic/platform=macOS" -archivePath "$ARCHIVE" archive 2>&1 | tee "$LOG" | xcb_format
STATUS=${PIPESTATUS[0]}
set -e
summarize_log "$LOG"
[ "$STATUS" -eq 0 ] || die "archive failed (exit $STATUS)."
ok "archive: $ARCHIVE"

section "2/3 Export ($METHOD)"
if [ -z "$EXPORT_OPTS" ]; then
  EXPORT_OPTS="$RELEASE_DIR/ExportOptions-$METHOD.plist"
  # Method names differ across Xcode versions (app-store vs app-store-connect); verify-release and the
  # export error message will tell you if the installed Xcode wants the other spelling.
  case "$METHOD" in
    app-store)    PLIST_METHOD="app-store-connect" ;;
    developer-id) PLIST_METHOD="developer-id" ;;
  esac
  cat > "$EXPORT_OPTS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>$PLIST_METHOD</string>
  <key>destination</key><string>export</string>
  <key>signingStyle</key><string>automatic</string>
  ${TEAM_ID:+<key>teamID</key><string>$TEAM_ID</string>}
</dict>
</plist>
EOF
  info "generated $EXPORT_OPTS (destination=export: nothing is uploaded)"
fi
if grep -q '<string>upload</string>' "$EXPORT_OPTS" 2>/dev/null; then
  die "ExportOptions has destination=upload. This script does not publish; set destination to export or upload yourself deliberately."
fi

set +e
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist "$EXPORT_OPTS" -exportPath "$EXPORT_DIR" 2>&1 | tee -a "$LOG" | xcb_format
STATUS=${PIPESTATUS[0]}
set -e
if [ "$STATUS" -ne 0 ]; then
  if [ "$METHOD" = "app-store" ] && grep -q 'method' "$LOG"; then
    warn "If the error names the method, the installed Xcode may want 'app-store' instead of 'app-store-connect'; edit $EXPORT_OPTS and rerun with --export-options."
  fi
  die "export failed (exit $STATUS)."
fi
ARTIFACT="$(find "$EXPORT_DIR" -maxdepth 1 \( -name '*.app' -o -name '*.pkg' \) | head -n 1 || true)"
[ -n "$ARTIFACT" ] || die "export finished but no .app or .pkg found in $EXPORT_DIR."
ok "exported: $ARTIFACT"

section "3/3 Verify"
if [ "$VERIFY" = "1" ]; then
  bash "$SCRIPT_DIR/verify-release.sh" "$ARTIFACT" --method "$METHOD" || warn "verification reported problems — resolve before publishing."
else
  log "  skipped (--skip-verify)"
fi

hr
log "Release candidate ready. Publishing is your explicit action; the skill does not run these:"
case "$METHOD" in
  developer-id)
    ZIP="$RELEASE_DIR/$(basename "$ARTIFACT" .app).zip"
    cat <<EOF
  # 1. Zip for notarization (preserves signatures):
  ditto -c -k --keepParent "$ARTIFACT" "$ZIP"
  # 2. Submit to Apple's notary service with YOUR stored credential profile:
  xcrun notarytool submit "$ZIP" --keychain-profile "<profile-name>" --wait
  # 3. Staple the ticket and re-verify:
  xcrun stapler staple "$ARTIFACT"
  bash scripts/verify-release.sh "$ARTIFACT" --method developer-id
  # 4. Package for download (dmg/pkg), sign it, notarize and staple that too.
EOF
    ;;
  app-store)
    cat <<EOF
  # Upload with Xcode Organizer (Distribute App) or Transporter, using YOUR App Store Connect account.
  # The archive is at: $ARCHIVE
  # Then complete metadata, screenshots, review notes, and submit in App Store Connect.
EOF
    ;;
esac
log "  # Git tag/push are also yours: git tag -a v<version> -m '<message>' && git push origin v<version>"
