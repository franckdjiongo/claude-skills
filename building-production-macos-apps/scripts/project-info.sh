#!/usr/bin/env bash
# project-info.sh — read-only inventory of an Xcode project or workspace.
# Reports container, schemes, targets, deployment target, Swift settings, signing/sandbox/hardened
# runtime, entitlements, privacy manifest, packages, test targets, and Git state.
#
# Usage: bash scripts/project-info.sh [dir] [--scheme NAME] [--configuration Debug|Release] [--json]
#   dir              project directory (default: current directory)
#   --scheme NAME    scheme to read build settings from (default: the only scheme, or ask)
#   --json           machine-readable output instead of text

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

DIR="."; SCHEME="${SCHEME:-}"; CONF="Debug"; JSON=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --scheme) SCHEME="$2"; shift 2 ;;
    --configuration) CONF="$2"; shift 2 ;;
    --json) JSON=1; shift ;;
    -*) die "Unknown option: $1" ;;
    *) DIR="$1"; shift ;;
  esac
done

require_xcode
cd "$DIR" || exit 1

find_container "."
[ -n "$CONTAINER_PATH" ] || die "No .xcworkspace, .xcodeproj, or Package.swift found in $(pwd)."

resolve_scheme

# --- gather ---------------------------------------------------------------
LIST="$(xcb -list 2>/dev/null || true)"
TARGETS="$(printf '%s\n' "$LIST" | awk '/Targets:/{f=1; next} f && NF==0 {f=0} f {sub(/^[ \t]+/, ""); print}')"
SCHEMES="$(printf '%s\n' "$LIST" | awk '/Schemes:/{f=1; next} f && NF==0 {f=0} f {sub(/^[ \t]+/, ""); print}')"
CONFIGS="$(printf '%s\n' "$LIST" | awk '/Build Configurations:/{f=1; next} f && NF==0 {f=0} f {sub(/^[ \t]+/, ""); print}')"
TEST_TARGETS="$(printf '%s\n' "$TARGETS" | grep -i 'tests\?$' || true)"

SETTINGS="$(xcb -scheme "$SCHEME" -configuration "$CONF" -showBuildSettings 2>/dev/null || true)"
setting() { printf '%s\n' "$SETTINGS" | awk -v k="$1" '$1 == k && $2 == "=" { $1=""; $2=""; sub(/^  */, ""); print; exit }'; }

PRODUCT_NAME="$(setting PRODUCT_NAME)"
BUNDLE_ID="$(setting PRODUCT_BUNDLE_IDENTIFIER)"
DEPLOY="$(setting MACOSX_DEPLOYMENT_TARGET)"
SWIFT_VERSION="$(setting SWIFT_VERSION)"
STRICT="$(setting SWIFT_STRICT_CONCURRENCY)"
ARCHS="$(setting ARCHS)"
SANDBOX="$(setting ENABLE_APP_SANDBOX)"
HARDENED="$(setting ENABLE_HARDENED_RUNTIME)"
SIGN_STYLE="$(setting CODE_SIGN_STYLE)"
TEAM="$(setting DEVELOPMENT_TEAM)"
ENTITLEMENTS="$(setting CODE_SIGN_ENTITLEMENTS)"
MARKETING="$(setting MARKETING_VERSION)"
BUILDNUM="$(setting CURRENT_PROJECT_VERSION)"
SDKROOT="$(setting SDKROOT)"

ENT_KEYS=""
if [ -n "$ENTITLEMENTS" ] && [ -f "$ENTITLEMENTS" ]; then
  ENT_KEYS="$(plutil -p "$ENTITLEMENTS" 2>/dev/null | grep -E '^\s*"' | sed -E 's/^[ ]*"([^"]+)".*=>[ ]*(.*)$/\1 = \2/' || true)"
fi

PRIVACY_MANIFESTS="$(find . -name 'PrivacyInfo.xcprivacy' -not -path '*/DerivedData/*' -not -path '*/.build/*' 2>/dev/null || true)"
PRIVACY_INVENTORY="$( [ -f PRIVACY_INVENTORY.md ] && echo PRIVACY_INVENTORY.md || find . -maxdepth 3 -name 'PRIVACY_INVENTORY.md' 2>/dev/null | head -n 1 || true)"

PACKAGES=""
RESOLVED="$(find . -maxdepth 4 -name 'Package.resolved' -not -path '*/.build/*' 2>/dev/null | head -n 1 || true)"
if [ -n "$RESOLVED" ]; then
  PACKAGES="$(grep -E '"(identity|location)"' "$RESOLVED" 2>/dev/null | sed -E 's/.*"(identity|location)"[ ]*:[ ]*"([^"]+)".*/\2/' | awk 'NR%2==1{id=$0; next}{print id" ("$0")"}' || true)"
fi

GIT_BRANCH=""; GIT_HEAD=""; GIT_DIRTY=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  GIT_HEAD="$(git log -1 --format='%h %s' 2>/dev/null)"
  GIT_DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
fi

# --- output ---------------------------------------------------------------
if [ "$JSON" = "1" ]; then
  lines_to_json_array() { printf '%s\n' "$1" | sed '/^$/d' | while IFS= read -r l; do printf '"%s",' "$(json_escape "$l")"; done | sed 's/,$//'; }
  cat <<EOF
{
  "container": {"flag": "$(json_escape "${CONTAINER_FLAG:-package}")", "path": "$(json_escape "$CONTAINER_PATH")"},
  "scheme": "$(json_escape "$SCHEME")",
  "configuration": "$(json_escape "$CONF")",
  "schemes": [$(lines_to_json_array "$SCHEMES")],
  "targets": [$(lines_to_json_array "$TARGETS")],
  "test_targets": [$(lines_to_json_array "$TEST_TARGETS")],
  "configurations": [$(lines_to_json_array "$CONFIGS")],
  "product_name": "$(json_escape "$PRODUCT_NAME")",
  "bundle_id": "$(json_escape "$BUNDLE_ID")",
  "marketing_version": "$(json_escape "$MARKETING")",
  "build_number": "$(json_escape "$BUILDNUM")",
  "deployment_target": "$(json_escape "$DEPLOY")",
  "sdkroot": "$(json_escape "$SDKROOT")",
  "swift_version": "$(json_escape "$SWIFT_VERSION")",
  "swift_strict_concurrency": "$(json_escape "$STRICT")",
  "archs": "$(json_escape "$ARCHS")",
  "app_sandbox": "$(json_escape "$SANDBOX")",
  "hardened_runtime": "$(json_escape "$HARDENED")",
  "code_sign_style": "$(json_escape "$SIGN_STYLE")",
  "development_team_set": $([ -n "$TEAM" ] && echo true || echo false),
  "entitlements_file": "$(json_escape "$ENTITLEMENTS")",
  "entitlements": [$(lines_to_json_array "$ENT_KEYS")],
  "privacy_manifests": [$(lines_to_json_array "$PRIVACY_MANIFESTS")],
  "privacy_inventory": "$(json_escape "$PRIVACY_INVENTORY")",
  "packages": [$(lines_to_json_array "$PACKAGES")],
  "git": {"branch": "$(json_escape "$GIT_BRANCH")", "head": "$(json_escape "$GIT_HEAD")", "uncommitted": "$(json_escape "$GIT_DIRTY")"}
}
EOF
  exit 0
fi

section "Container"
log "  ${CONTAINER_FLAG:-package} $CONTAINER_PATH"
log "  scheme: $SCHEME   configuration: $CONF"
section "Schemes";  printf '%s\n' "$SCHEMES" | sed 's/^/  /'
section "Targets";  printf '%s\n' "$TARGETS" | sed 's/^/  /'
section "Test targets"; [ -n "$TEST_TARGETS" ] && printf '%s\n' "$TEST_TARGETS" | sed 's/^/  /' || log "  <none — see references/testing-quality.md>"
section "Build configurations"; printf '%s\n' "$CONFIGS" | sed 's/^/  /'
section "Product"
log "  name: ${PRODUCT_NAME:-?}   bundle id: ${BUNDLE_ID:-?}"
log "  version: ${MARKETING:-?} (${BUILDNUM:-?})"
log "  deployment target: macOS ${DEPLOY:-?}   sdk: ${SDKROOT:-?}   archs: ${ARCHS:-?}"
log "  swift: ${SWIFT_VERSION:-?}   strict concurrency: ${STRICT:-<default>}"
section "Signing and security"
log "  code sign style: ${SIGN_STYLE:-?}   team set: $([ -n "$TEAM" ] && echo yes || echo no)"
log "  app sandbox: ${SANDBOX:-<not set>}   hardened runtime: ${HARDENED:-<not set>}"
log "  entitlements file: ${ENTITLEMENTS:-<none>}"
[ -n "$ENT_KEYS" ] && printf '%s\n' "$ENT_KEYS" | sed 's/^/    /'
section "Privacy"
[ -n "$PRIVACY_MANIFESTS" ] && printf '%s\n' "$PRIVACY_MANIFESTS" | sed 's/^/  manifest: /' || log "  no PrivacyInfo.xcprivacy found"
[ -n "$PRIVACY_INVENTORY" ] && log "  inventory: $PRIVACY_INVENTORY" || log "  no PRIVACY_INVENTORY.md — seed from templates/PRIVACY_INVENTORY.md"
section "Packages"
[ -n "$PACKAGES" ] && printf '%s\n' "$PACKAGES" | sed 's/^/  /' || log "  <none resolved>"
section "Git"
if [ -n "$GIT_BRANCH" ]; then
  log "  branch: $GIT_BRANCH   head: $GIT_HEAD   uncommitted changes: $GIT_DIRTY"
else
  log "  not a git repository"
fi
