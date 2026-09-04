#!/usr/bin/env bash
# verify-release.sh — read-only checks on a built artifact (.app, .pkg, .dmg, or .zip of an .app).
# Reports: signature validity, signing identity type, Hardened Runtime, secure timestamp,
# embedded entitlements (Sandbox, network, files, temporary exceptions), notarization staple,
# and Gatekeeper assessment. Exits 1 if any hard check fails.
#
# Usage: bash scripts/verify-release.sh <artifact> [--method app-store|developer-id] [--expect-sandbox yes|no]
#   --method          which distribution rules to apply (default: inferred from the signing identity)
#   --expect-sandbox  fail if the Sandbox state differs from expectation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

ARTIFACT=""; METHOD=""; EXPECT_SANDBOX=""
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --method) METHOD="$2"; shift 2 ;;
    --expect-sandbox) EXPECT_SANDBOX="$2"; shift 2 ;;
    -*) die "Unknown option: $1 (see --help)" ;;
    *) ARTIFACT="$1"; shift ;;
  esac
done
[ -n "$ARTIFACT" ] || die "usage: verify-release.sh <artifact> [--method ...]"
[ -e "$ARTIFACT" ] || die "not found: $ARTIFACT"
require_macos

PASS=0; FAILED=0; WARNED=0
check_ok()   { PASS=$((PASS+1));   printf '  ✓ %s\n' "$*"; }
check_fail() { FAILED=$((FAILED+1)); printf '  ✗ %s\n' "$*"; }
check_warn() { WARNED=$((WARNED+1)); printf '  ⚠ %s\n' "$*"; }

TMP=""
cleanup() { if [ -n "$TMP" ]; then rm -rf "$TMP"; fi; }
trap cleanup EXIT

case "$ARTIFACT" in
  *.zip)
    TMP="$(mktemp -d)"
    ditto -x -k "$ARTIFACT" "$TMP"
    APP="$(find "$TMP" -maxdepth 2 -name '*.app' | head -n 1 || true)"
    [ -n "$APP" ] || die "no .app inside the zip"
    ;;
  *.dmg)
    section "Disk image"
    if codesign -dv "$ARTIFACT" >/dev/null 2>&1; then check_ok "dmg is signed"; else check_warn "dmg is not signed (sign and notarize the dmg itself for direct distribution)"; fi
    if xcrun stapler validate "$ARTIFACT" >/dev/null 2>&1; then check_ok "dmg has a stapled notarization ticket"; else check_warn "dmg not stapled (fine before notarization; required before shipping)"; fi
    spctl --assess --type open --context context:primary-signature -v "$ARTIFACT" 2>&1 | sed 's/^/  gatekeeper: /'
    log "Mount the image and run this script on the .app inside for the full checks."
    exit $(( FAILED > 0 ? 1 : 0 ))
    ;;
  *.pkg)
    section "Installer package"
    if pkgutil --check-signature "$ARTIFACT" 2>&1 | grep -q 'signed by'; then check_ok "pkg signature present"; else check_fail "pkg is unsigned"; fi
    pkgutil --check-signature "$ARTIFACT" 2>&1 | grep -E 'Developer ID Installer|3rd Party Mac Developer Installer|Apple Distribution' | sed 's/^/  identity: /' || true
    if xcrun stapler validate "$ARTIFACT" >/dev/null 2>&1; then check_ok "pkg stapled"; else check_warn "pkg not stapled"; fi
    spctl --assess --type install -v "$ARTIFACT" 2>&1 | sed 's/^/  gatekeeper: /' || true
    hr; log "pass: $PASS  warn: $WARNED  fail: $FAILED"
    exit $(( FAILED > 0 ? 1 : 0 ))
    ;;
  *.app) APP="$ARTIFACT" ;;
  *) die "unsupported artifact type: $ARTIFACT" ;;
esac

section "Signature — $(basename "$APP")"
if codesign --verify --deep --strict --verbose=2 "$APP" >/dev/null 2>&1; then
  check_ok "codesign --verify --deep --strict passes"
else
  check_fail "codesign verification failed:"; codesign --verify --deep --strict --verbose=2 "$APP" 2>&1 | head -n 10 | sed 's/^/      /'
fi

DETAILS="$(codesign -dvvv "$APP" 2>&1 || true)"
AUTHORITY="$(printf '%s\n' "$DETAILS" | grep '^Authority=' | head -n 1 | sed 's/^Authority=//')"
log "  identity: ${AUTHORITY:-<none>}"
case "$AUTHORITY" in
  *"Developer ID Application"*) INFERRED="developer-id" ;;
  *"Apple Distribution"*|*"3rd Party Mac Developer Application"*) INFERRED="app-store" ;;
  *"Apple Development"*|*"Mac Developer"*) INFERRED="development" ;;
  *) INFERRED="adhoc-or-unsigned" ;;
esac
[ -n "$METHOD" ] || METHOD="$INFERRED"
if [ "$INFERRED" = "development" ] || [ "$INFERRED" = "adhoc-or-unsigned" ]; then
  check_fail "signed with a $INFERRED identity — not distributable"
elif [ "$METHOD" != "$INFERRED" ]; then
  check_fail "identity implies $INFERRED but --method $METHOD was requested"
else
  check_ok "identity matches $METHOD distribution"
fi

if printf '%s\n' "$DETAILS" | grep -q 'flags=.*runtime'; then check_ok "Hardened Runtime enabled"; else
  if [ "$METHOD" = "developer-id" ]; then check_fail "Hardened Runtime disabled (required for notarization)"; else check_warn "Hardened Runtime disabled"; fi
fi
if printf '%s\n' "$DETAILS" | grep -q 'Timestamp='; then check_ok "secure timestamp present"; else check_warn "no secure timestamp (sign with --timestamp; Xcode does this for distribution exports)"; fi

section "Entitlements (as embedded)"
ENT="$(codesign -d --entitlements :- "$APP" 2>/dev/null || codesign -d --entitlements - --xml "$APP" 2>/dev/null || true)"
if [ -z "$ENT" ]; then
  log "  <no entitlements embedded>"
  SANDBOX="no"
else
  printf '%s\n' "$ENT" | grep -o '<key>[^<]*</key>' | sed 's/<key>//; s/<\/key>//' | sed 's/^/  /'
  if printf '%s\n' "$ENT" | grep -q 'com.apple.security.app-sandbox'; then SANDBOX="yes"; else SANDBOX="no"; fi
fi
if [ "$SANDBOX" = "yes" ]; then check_ok "App Sandbox enabled"; else
  if [ "$METHOD" = "app-store" ]; then check_fail "App Sandbox missing (required for the Mac App Store)"; else check_warn "App Sandbox disabled (recommended for Developer ID; record the decision in an ADR)"; fi
fi
if [ -n "$EXPECT_SANDBOX" ] && [ "$EXPECT_SANDBOX" != "$SANDBOX" ]; then check_fail "sandbox is $SANDBOX, expected $EXPECT_SANDBOX"; fi
if printf '%s\n' "$ENT" | grep -q 'temporary-exception'; then check_warn "temporary-exception entitlement present — justify in PRIVACY_INVENTORY.md and plan its removal"; fi
if printf '%s\n' "$ENT" | grep -q 'get-task-allow'; then check_fail "get-task-allow present (debug entitlement) — this is not a distribution build"; fi
if printf '%s\n' "$ENT" | grep -q 'cs.disable-library-validation'; then check_warn "library validation disabled — required only for third-party plug-ins; justify it"; fi
if printf '%s\n' "$ENT" | grep -q -E 'cs\.allow-jit|cs\.allow-unsigned-executable-memory'; then check_warn "JIT / unsigned executable memory entitlement present — justify it"; fi

section "Notarization and Gatekeeper"
if xcrun stapler validate "$APP" >/dev/null 2>&1; then check_ok "notarization ticket stapled"; else
  if [ "$METHOD" = "developer-id" ]; then check_warn "not stapled — expected before notarization; required before shipping (xcrun notarytool submit … then xcrun stapler staple)"; else log "  stapling not applicable for App Store builds"; fi
fi
ASSESS="$(spctl --assess --type execute --verbose=4 "$APP" 2>&1 || true)"
if printf '%s\n' "$ASSESS" | grep -q 'accepted'; then check_ok "Gatekeeper: $(printf '%s\n' "$ASSESS" | grep -o 'source=.*' | head -n 1)"; else
  if [ "$METHOD" = "developer-id" ]; then check_warn "Gatekeeper rejected (normal before notarization): $(printf '%s\n' "$ASSESS" | head -n 1)"; else log "  Gatekeeper assessment does not apply to App Store builds before installation via the store"; fi
fi

section "Bundle sanity"
PLIST="$APP/Contents/Info.plist"
if [ -f "$PLIST" ]; then
  log "  bundle id: $(defaults read "$PLIST" CFBundleIdentifier 2>/dev/null || echo '?')   version: $(defaults read "$PLIST" CFBundleShortVersionString 2>/dev/null || echo '?') ($(defaults read "$PLIST" CFBundleVersion 2>/dev/null || echo '?'))"
  log "  minimum system: $(defaults read "$PLIST" LSMinimumSystemVersion 2>/dev/null || echo '?')"
  ARCHS="$(lipo -archs "$APP/Contents/MacOS/$(defaults read "$PLIST" CFBundleExecutable 2>/dev/null)" 2>/dev/null || echo '?')"
  log "  architectures: $ARCHS"
  case "$ARCHS" in *arm64*x86_64*|*x86_64*arm64*) check_ok "universal binary" ;; *arm64*) check_warn "arm64 only — intentional? (references/platform-baseline.md)" ;; esac
  if find "$APP/Contents" -name 'PrivacyInfo.xcprivacy' | grep -q .; then check_ok "privacy manifest bundled"; else check_warn "no PrivacyInfo.xcprivacy in the bundle (run scripts/privacy-audit.sh)"; fi
fi

hr
log "pass: $PASS  warn: $WARNED  fail: $FAILED"
if [ "$FAILED" -eq 0 ]; then ok "artifact verification passed"; exit 0; fi
fail "artifact verification failed"
exit 1
