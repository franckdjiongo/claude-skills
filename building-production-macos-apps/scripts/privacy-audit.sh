#!/usr/bin/env bash
# privacy-audit.sh — read-only cross-check of everything that must agree before release:
# entitlements files, PrivacyInfo.xcprivacy, Info.plist / build-setting usage strings,
# required-reason API usage in source, and PRIVACY_INVENTORY.md.
# Exits 1 on blockers (missing inventory entries, missing usage strings, missing manifest declarations).
#
# Usage: bash scripts/privacy-audit.sh [dir] [--inventory PATH] [--strict]
#   --inventory  path to PRIVACY_INVENTORY.md (default: auto-detect)
#   --strict     treat warnings as blockers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

DIR="."; INVENTORY=""; STRICT=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --inventory) INVENTORY="$2"; shift 2 ;;
    --strict) STRICT=1; shift ;;
    -*) die "Unknown option: $1" ;;
    *) DIR="$1"; shift ;;
  esac
done
cd "$DIR" || exit 1

BLOCKERS=0; WARNINGS=0
blocker() { BLOCKERS=$((BLOCKERS+1)); printf '  ✗ %s\n' "$*"; }
warning() { WARNINGS=$((WARNINGS+1)); printf '  ⚠ %s\n' "$*"; }
fine()    { printf '  ✓ %s\n' "$*"; }

EXCLUDES='-not -path */DerivedData/* -not -path */.build/* -not -path */.artifacts/* -not -path */Pods/* -not -path */.git/*'

# shellcheck disable=SC2086
ENT_FILES="$(find . -name '*.entitlements' $EXCLUDES 2>/dev/null || true)"
# shellcheck disable=SC2086
MANIFESTS="$(find . -name 'PrivacyInfo.xcprivacy' $EXCLUDES 2>/dev/null || true)"
# shellcheck disable=SC2086
PLISTS="$(find . -name 'Info.plist' $EXCLUDES 2>/dev/null || true)"
# shellcheck disable=SC2086
PBXPROJS="$(find . -name 'project.pbxproj' $EXCLUDES 2>/dev/null || true)"
# shellcheck disable=SC2086
SWIFT_FILES="$(find . -name '*.swift' $EXCLUDES -not -path '*Tests*' 2>/dev/null || true)"

if [ -z "$INVENTORY" ]; then
  INVENTORY="$( [ -f PRIVACY_INVENTORY.md ] && echo PRIVACY_INVENTORY.md || find . -maxdepth 3 -name 'PRIVACY_INVENTORY.md' 2>/dev/null | head -n 1 || true)"
fi

section "Inventory"
if [ -n "$INVENTORY" ] && [ -f "$INVENTORY" ]; then
  fine "$INVENTORY"
  INV="$(cat "$INVENTORY")"
  if printf '%s' "$INV" | grep -q '<[A-Za-z][^>]*>' ; then warning "inventory still contains <placeholders> from the template"; fi
else
  blocker "no PRIVACY_INVENTORY.md — seed it from templates/PRIVACY_INVENTORY.md"
  INV=""
fi
inventory_mentions() { [ -n "$INV" ] && printf '%s' "$INV" | grep -q -F -- "$1"; }

section "Entitlements"
if [ -z "$ENT_FILES" ]; then
  warning "no .entitlements file found (unsandboxed app, or entitlements generated elsewhere)"
else
  printf '%s\n' "$ENT_FILES" | while IFS= read -r f; do log "  file: $f"; done
  ALL_KEYS="$(printf '%s\n' "$ENT_FILES" | while IFS= read -r f; do plutil -p "$f" 2>/dev/null | grep -E '^\s*"com\.apple\.' | sed -E 's/^[ ]*"([^"]+)".*=>[ ]*(.*)$/\1|\2/'; done | sort -u || true)"
  printf '%s\n' "$ALL_KEYS" | sed '/^$/d' | while IFS='|' read -r key val; do
    case "$key" in
      com.apple.security.app-sandbox) if [ "$val" = "1" ] || [ "$val" = "true" ]; then log "  sandbox: enabled"; fi ;;
      *)
        if inventory_mentions "$key"; then fine "$key = $val (in inventory)"; else printf '  ✗ %s = %s — not mentioned in PRIVACY_INVENTORY.md\n' "$key" "$val"; fi
        case "$key" in *temporary-exception*) printf '  ⚠ %s is a temporary exception — plan its removal\n' "$key" ;; esac
        ;;
    esac
  done
  # Subshell above cannot mutate counters; recount here.
  MISSING="$(printf '%s\n' "$ALL_KEYS" | sed '/^$/d' | grep -v 'app-sandbox' | cut -d'|' -f1 | while IFS= read -r k; do inventory_mentions "$k" || echo "$k"; done | wc -l | tr -d ' ')"
  BLOCKERS=$((BLOCKERS + MISSING))
  printf '%s\n' "$ALL_KEYS" | grep -q -E 'app-sandbox\|(1|true)' || warning "App Sandbox not enabled in entitlements (required for Mac App Store; recommended for Developer ID)"
fi

section "Permission usage strings"
# Keys may live in Info.plist or as INFOPLIST_KEY_* build settings inside project.pbxproj.
USAGE_KEYS="$( { printf '%s\n' "$PLISTS" | while IFS= read -r p; do [ -n "$p" ] && grep -o 'NS[A-Za-z]*UsageDescription' "$p"; done; \
                 printf '%s\n' "$PBXPROJS" | while IFS= read -r p; do [ -n "$p" ] && grep -o 'INFOPLIST_KEY_NS[A-Za-z]*UsageDescription' "$p" | sed 's/INFOPLIST_KEY_//'; done; } 2>/dev/null | sort -u || true)"
if [ -z "$USAGE_KEYS" ]; then
  log "  none declared"
else
  printf '%s\n' "$USAGE_KEYS" | while IFS= read -r k; do
    [ -n "$k" ] || continue
    if inventory_mentions "$k"; then printf '  ✓ %s (in inventory)\n' "$k"; else printf '  ✗ %s — permission declared but not in PRIVACY_INVENTORY.md\n' "$k"; fi
  done
  MISSING="$(printf '%s\n' "$USAGE_KEYS" | sed '/^$/d' | while IFS= read -r k; do inventory_mentions "$k" || echo "$k"; done | wc -l | tr -d ' ')"
  BLOCKERS=$((BLOCKERS + MISSING))
fi
# Frameworks that prompt without a usage string still fail at runtime or review.
for pair in "AVCaptureDevice:NSCameraUsageDescription" "AVAudioSession:NSMicrophoneUsageDescription" "AVAudioEngine:NSMicrophoneUsageDescription" "CNContactStore:NSContactsUsageDescription" "EKEventStore:NSCalendarsUsageDescription" "CLLocationManager:NSLocationUsageDescription" "SCShareableContent:NSScreenCaptureUsageDescription" "NSAppleScript:NSAppleEventsUsageDescription" "SFSpeechRecognizer:NSSpeechRecognitionUsageDescription"; do
  api="${pair%%:*}"; key="${pair##*:}"
  if [ -n "$SWIFT_FILES" ] && printf '%s\n' "$SWIFT_FILES" | tr '\n' '\0' | xargs -0 grep -l -- "$api" >/dev/null 2>&1; then
    if printf '%s\n' "$USAGE_KEYS" | grep -q "^$key$" || printf '%s\n' "$USAGE_KEYS" | grep -q "^${key%UsageDescription}"; then :; else blocker "source uses $api but no $key usage string is declared"; fi
  fi
done

section "Privacy manifest (PrivacyInfo.xcprivacy)"
if [ -z "$MANIFESTS" ]; then
  warning "no PrivacyInfo.xcprivacy — add one if the app uses required-reason APIs, tracks, or collects data (verify current Apple rules; references/source-refresh.md)"
else
  printf '%s\n' "$MANIFESTS" | while IFS= read -r m; do log "  file: $m"; done
fi
# Required-reason API families (heuristic; Apple's list is authoritative and changes — verify live).
check_reason_api() { # pattern, category-id, label
  if [ -n "$SWIFT_FILES" ] && printf '%s\n' "$SWIFT_FILES" | tr '\n' '\0' | xargs -0 grep -l -E -- "$1" >/dev/null 2>&1; then
    if [ -n "$MANIFESTS" ] && printf '%s\n' "$MANIFESTS" | tr '\n' '\0' | xargs -0 grep -l -- "$2" >/dev/null 2>&1; then
      printf '  ✓ %s used and declared (%s)\n' "$3" "$2"
    else
      printf '  ✗ %s used in source but %s not declared in the privacy manifest\n' "$3" "$2"; return 1
    fi
  fi
  return 0
}
check_reason_api 'UserDefaults' 'NSPrivacyAccessedAPICategoryUserDefaults' 'UserDefaults' || BLOCKERS=$((BLOCKERS+1))
check_reason_api 'creationDate|modificationDate|\.fileModificationDate|contentModificationDateKey|stat\(' 'NSPrivacyAccessedAPICategoryFileTimestamp' 'file timestamp APIs' || BLOCKERS=$((BLOCKERS+1))
check_reason_api 'systemUptime|mach_absolute_time|ProcessInfo\.processInfo\.systemUptime' 'NSPrivacyAccessedAPICategorySystemBootTime' 'system boot time APIs' || BLOCKERS=$((BLOCKERS+1))
check_reason_api 'volumeAvailableCapacity|systemFreeSize|statfs' 'NSPrivacyAccessedAPICategoryDiskSpace' 'disk space APIs' || BLOCKERS=$((BLOCKERS+1))
check_reason_api 'activeInputModes' 'NSPrivacyAccessedAPICategoryActiveKeyboards' 'active keyboard APIs' || BLOCKERS=$((BLOCKERS+1))

section "Network destinations"
if [ -n "$ENT_FILES" ] && printf '%s\n' "$ENT_FILES" | tr '\n' '\0' | xargs -0 grep -l 'network.client' >/dev/null 2>&1; then
  if [ -n "$INV" ] && printf '%s' "$INV" | grep -q -i -E 'network destination|destination'; then fine "network client entitlement present and inventory has a destination section"; else blocker "network client entitlement present but inventory lists no network destination"; fi
  if [ -n "$SWIFT_FILES" ]; then
    HOSTS="$(printf '%s\n' "$SWIFT_FILES" | tr '\n' '\0' | xargs -0 grep -h -o -E 'https?://[A-Za-z0-9._-]+' 2>/dev/null | sort -u || true)"
    printf '%s\n' "$HOSTS" | sed '/^$/d' | while IFS= read -r h; do
      host="${h#*://}"
      if inventory_mentions "$host"; then printf '  ✓ %s (in inventory)\n' "$host"; else printf '  ⚠ %s appears in source but not in the inventory\n' "$host"; fi
    done
  fi
elif [ -n "$SWIFT_FILES" ] && printf '%s\n' "$SWIFT_FILES" | tr '\n' '\0' | xargs -0 grep -l 'URLSession' >/dev/null 2>&1; then
  warning "URLSession used but no network client entitlement — requests will fail under the Sandbox"
else
  log "  no network usage detected"
fi

section "Secrets in source (quick scan)"
if [ -n "$SWIFT_FILES" ]; then
  HITS="$(printf '%s\n' "$SWIFT_FILES" | tr '\n' '\0' | xargs -0 grep -n -E -i '(api[_-]?key|secret|password|bearer )[[:space:]]*[:=][[:space:]]*"[^"]{8,}"' 2>/dev/null | head -n 10 || true)"
  if [ -n "$HITS" ]; then blocker "possible hard-coded secrets:"; printf '%s\n' "$HITS" | sed 's/^/      /'; else fine "no obvious hard-coded secrets"; fi
fi

hr
log "blockers: $BLOCKERS   warnings: $WARNINGS"
if [ "$BLOCKERS" -gt 0 ]; then fail "privacy audit failed — align code, entitlements, manifest, and PRIVACY_INVENTORY.md"; exit 1; fi
if [ "$STRICT" = "1" ] && [ "$WARNINGS" -gt 0 ]; then fail "warnings treated as blockers (--strict)"; exit 1; fi
ok "privacy audit passed"
