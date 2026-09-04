#!/usr/bin/env bash
# Shared helpers for the building-production-macos-apps scripts.
# Sourced, never executed. Compatible with the bash 3.2 that ships with macOS:
# no associative arrays, no mapfile, no ${var,,}.

set -euo pipefail

ARTIFACTS_DIR="${ARTIFACTS_DIR:-.artifacts}"

# --- output -----------------------------------------------------------------

log()  { printf '%s\n' "$*"; }
info() { printf '▸ %s\n' "$*"; }
warn() { printf '⚠ %s\n' "$*" >&2; }
ok()   { printf '✓ %s\n' "$*"; }
fail() { printf '✗ %s\n' "$*" >&2; }
die()  { fail "$*"; exit 1; }
hr()   { printf '%s\n' "----------------------------------------------------------------"; }
section() { printf '\n== %s ==\n' "$*"; }

# --- environment guards -----------------------------------------------------

require_macos() {
  [ "$(uname -s)" = "Darwin" ] || die "This script needs macOS (found $(uname -s))."
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1${2:+ — $2}"
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

require_xcode() {
  require_macos
  require_cmd xcodebuild "install Xcode and run: sudo xcode-select -s /Applications/Xcode.app"
  xcodebuild -version >/dev/null 2>&1 || die "xcodebuild is not usable; check xcode-select -p and the Xcode license (sudo xcodebuild -license)."
}

timestamp() { date +%Y%m%d-%H%M%S; }

ensure_artifacts() { mkdir -p "$ARTIFACTS_DIR"; }

# --- project discovery ------------------------------------------------------
# Sets CONTAINER_FLAG and CONTAINER_PATH for xcodebuild.
# A workspace wins over a project; the workspace embedded inside every .xcodeproj is ignored.

find_container() {
  local dir="${1:-.}"
  local ws proj
  ws="$(find "$dir" -maxdepth 2 -name '*.xcworkspace' -not -path '*/.xcodeproj/*' -not -path '*.xcodeproj/*' 2>/dev/null | head -n 1 || true)"
  proj="$(find "$dir" -maxdepth 2 -name '*.xcodeproj' 2>/dev/null | head -n 1 || true)"
  if [ -n "${WORKSPACE:-}" ]; then
    CONTAINER_FLAG="-workspace"; CONTAINER_PATH="$WORKSPACE"
  elif [ -n "${PROJECT:-}" ]; then
    CONTAINER_FLAG="-project"; CONTAINER_PATH="$PROJECT"
  elif [ -n "$ws" ]; then
    CONTAINER_FLAG="-workspace"; CONTAINER_PATH="$ws"
  elif [ -n "$proj" ]; then
    CONTAINER_FLAG="-project"; CONTAINER_PATH="$proj"
  elif [ -f "$dir/Package.swift" ]; then
    CONTAINER_FLAG=""; CONTAINER_PATH="$dir/Package.swift"
  else
    CONTAINER_FLAG=""; CONTAINER_PATH=""
  fi
}

# Prints scheme names, one per line, for the discovered container.
list_schemes() {
  [ -n "${CONTAINER_PATH:-}" ] || return 0
  xcb -list 2>/dev/null \
    | awk '/Schemes:/{flag=1; next} flag && NF==0 {flag=0} flag {sub(/^[ \t]+/, ""); print}'

}

# Resolves SCHEME: explicit flag, else the single scheme, else fail with the list.
resolve_scheme() {
  if [ -n "${SCHEME:-}" ]; then return 0; fi
  local schemes count
  schemes="$(list_schemes || true)"
  count="$(printf '%s\n' "$schemes" | sed '/^$/d' | wc -l | tr -d ' ')"
  if [ "$count" = "1" ]; then
    SCHEME="$(printf '%s\n' "$schemes" | sed '/^$/d')"
    info "Using the only scheme: $SCHEME"
  elif [ "$count" = "0" ]; then
    die "No scheme found. Pass --scheme <name> (shared schemes only are visible to xcodebuild)."
  else
    warn "Several schemes found; pass --scheme <name>:"
    printf '%s\n' "$schemes" | sed 's/^/    /' >&2
    exit 1
  fi
}

# xcodebuild with the discovered container prepended (handles paths with spaces).
xcb() {
  if [ -n "${CONTAINER_FLAG:-}" ]; then
    xcodebuild "$CONTAINER_FLAG" "$CONTAINER_PATH" "$@"
  else
    xcodebuild "$@"
  fi
}

# Reads one build setting for the resolved scheme/configuration.
build_setting() {
  local key="$1" conf="${2:-Debug}"
  xcb -scheme "$SCHEME" -configuration "$conf" -showBuildSettings 2>/dev/null | awk -v k="$key" '$1 == k && $2 == "=" { $1=""; $2=""; sub(/^  */, ""); print; exit }'
}

# Pretty-print xcodebuild output when a formatter is available; otherwise pass through.
xcb_format() {
  if have_cmd xcbeautify; then xcbeautify
  elif have_cmd xcpretty; then xcpretty
  else cat
  fi
}

# Summarize a raw xcodebuild log: error/warning counts and the first errors.
summarize_log() {
  local logfile="$1"
  local errors warnings
  errors="$(grep -c 'error:' "$logfile" 2>/dev/null || true)"
  warnings="$(grep -c 'warning:' "$logfile" 2>/dev/null || true)"
  hr
  log "Log: $logfile"
  log "errors: ${errors:-0}   warnings: ${warnings:-0}"
  if [ "${errors:-0}" != "0" ]; then
    log "First errors:"
    grep 'error:' "$logfile" | head -n 15 | sed 's/^/  /'
  fi
}

# Minimal JSON string escaper for hand-assembled JSON (no python dependency).
json_escape() {
  # awk rather than sed: BSD sed on macOS does not accept the GNU label-join idiom.
  printf '%s' "$1" | awk 'BEGIN{ORS=""} { gsub(/\\/,"\\\\"); gsub(/"/,"\\\""); gsub(/\t/,"\\t"); if (NR>1) printf "\\n"; printf "%s", $0 }'
}
