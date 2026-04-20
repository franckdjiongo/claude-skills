#!/usr/bin/env bash
# Usage: gather_files.sh <path/to/App.app>
# Finds all files and folders associated with the app in ~/Library (and brew cask).
# Prints one path per line grouped by ### category headers.
# Exits with code 3 and a clear message if the app is a protected macOS system app.

set -uo pipefail

APP_PATH="${1:-}"
if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  echo "Usage: gather_files.sh <path/to/App.app>" >&2
  exit 2
fi

# Normalize path (resolve symlinks, clean trailing slash)
APP_PATH=$(cd "$APP_PATH" 2>/dev/null && pwd -P || echo "$APP_PATH")

# ============================================================
# SAFETY: Refuse to operate on macOS system apps
# ============================================================
# Apps inside /System/ are core OS components. Deleting them
# would break macOS. We hard-stop here before doing anything.
if [[ "$APP_PATH" == /System/* ]]; then
  echo "BLOCKED: '$APP_PATH' is a macOS system component inside /System/." >&2
  echo "System apps cannot be uninstalled — they are part of macOS itself." >&2
  exit 3
fi

# Extract identifiers from the bundle
BUNDLE_ID=$(defaults read "${APP_PATH}/Contents/Info" CFBundleIdentifier 2>/dev/null || true)
APP_NAME=$(basename "$APP_PATH" .app)

# Warn (but don't block) for built-in Apple apps in /Applications/
# These are apps like GarageBand or iMovie that Apple ships but users can delete.
IS_APPLE_BUILTIN=false
if [[ "$BUNDLE_ID" == com.apple.* ]]; then
  IS_APPLE_BUILTIN=true
  echo "### WARNING: Apple built-in app"
  echo "# '$APP_NAME' is an Apple app (bundle: $BUNDLE_ID)."
  echo "# It can be removed, but only do so if you are sure you don't need it."
  echo "# macOS core apps like Finder, Safari, and System Settings cannot actually"
  echo "# be deleted even if listed here — the OS protects them at a lower level."
fi

# ============================================================
# Detect install method — informs the user, doesn't change behavior
# ============================================================
INSTALL_METHOD="unknown"

# App Store: contains _MASReceipt/receipt inside the bundle
if [[ -f "${APP_PATH}/Contents/_MASReceipt/receipt" ]]; then
  INSTALL_METHOD="app_store"
  echo ""
  echo "### Install method: App Store"
  echo "# This app was downloaded from the Mac App Store."
  echo "# Removing it here is fine, but the App Store may prompt to re-download it."
  echo "# To also remove it from your purchase history, use Launchpad (hold Option, click X)."
fi

# Brew cask: check Caskroom
BREW_PREFIX=$(brew --prefix 2>/dev/null || echo "/opt/homebrew")
CASK_NAME=$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]')
CASK_DIR="${BREW_PREFIX}/Caskroom/${CASK_NAME}"
if [[ -d "$CASK_DIR" ]]; then
  INSTALL_METHOD="brew_cask"
fi

# PKG installer: check system receipts (covers many DMG+PKG combos)
PKG_RECEIPTS=()
if [[ -n "$BUNDLE_ID" ]]; then
  while IFS= read -r r; do
    PKG_RECEIPTS+=("$r")
  done < <(find /private/var/db/receipts -maxdepth 1 -name "*${BUNDLE_ID}*" 2>/dev/null | sort)
fi

# DMG drag-and-drop: no installer record → detected by elimination
if [[ "$INSTALL_METHOD" == "unknown" && ${#PKG_RECEIPTS[@]} -eq 0 ]]; then
  INSTALL_METHOD="dmg_or_direct"
  echo ""
  echo "### Install method: Direct / DMG"
  echo "# This app was likely installed by dragging from a DMG or downloading directly."
  echo "# No installer record found — only the app bundle and its Library files will be removed."
fi

# ============================================================
# Derive a safe short name from bundle ID for extra search coverage
# ============================================================
GENERIC_SUFFIXES=("mac" "app" "macos" "desktop" "client" "osx" "application" "release" "helper")
BUNDLE_SHORT=""
if [[ -n "$BUNDLE_ID" ]]; then
  candidate=$(echo "$BUNDLE_ID" | awk -F'.' '{print tolower($NF)}')
  is_generic=false
  for g in "${GENERIC_SUFFIXES[@]}"; do
    [[ "$candidate" == "$g" ]] && is_generic=true && break
  done
  candidate_lc=$(echo "$candidate" | tr '[:upper:]' '[:lower:]')
  appname_lc=$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]')
  [[ "$candidate_lc" == "$appname_lc" ]] && is_generic=true
  [[ ${#candidate} -le 3 ]] && is_generic=true
  $is_generic || BUNDLE_SHORT="$candidate"
fi

echo ""
echo "### App bundle"
echo "$APP_PATH"

# ============================================================
# Search all known Library locations
# ============================================================
search_location() {
  local label="$1"
  local base="$2"
  local depth="${3:-2}"
  local found=()

  [[ ! -d "$base" ]] && return

  local name_expr=( \( -iname "*${APP_NAME}*" -o -iname "*${BUNDLE_ID}*" \) )
  if [[ -n "$BUNDLE_SHORT" ]]; then
    name_expr=( \( -iname "*${APP_NAME}*" -o -iname "*${BUNDLE_ID}*" -o -iname "*${BUNDLE_SHORT}*" \) )
  fi

  while IFS= read -r match; do
    [[ "$match" == "$APP_PATH" ]] && continue
    found+=("$match")
  done < <(find "$base" -maxdepth "$depth" "${name_expr[@]}" 2>/dev/null | sort -u)

  if [[ ${#found[@]} -gt 0 ]]; then
    echo ""
    echo "### $label"
    for f in "${found[@]}"; do echo "$f"; done
  fi
}

search_location "Application Support"  "$HOME/Library/Application Support"     2
search_location "Preferences"          "$HOME/Library/Preferences"              1
search_location "Caches"               "$HOME/Library/Caches"                   3
search_location "Logs"                 "$HOME/Library/Logs"                     2
search_location "Launch Agents"        "$HOME/Library/LaunchAgents"             1
search_location "Group Containers"     "$HOME/Library/Group Containers"         1
search_location "Application Scripts"  "$HOME/Library/Application Scripts"      1
search_location "Containers"           "$HOME/Library/Containers"               1
search_location "HTTP Storages"        "$HOME/Library/HTTPStorages"             1
search_location "Saved App State"      "$HOME/Library/Saved Application State"  1
search_location "WebKit"               "$HOME/Library/WebKit"                   2
search_location "iCloud (Mobile Docs)" "$HOME/Library/Mobile Documents"         2
search_location "Crash Reports"        "$HOME/Library/Logs/DiagnosticReports"   1

# PKG installer receipts (common for DMG+PKG combos and some direct downloads)
if [[ ${#PKG_RECEIPTS[@]} -gt 0 ]]; then
  echo ""
  echo "### PKG Receipts"
  for r in "${PKG_RECEIPTS[@]}"; do echo "$r"; done
fi

# Brew cask metadata
if [[ "$INSTALL_METHOD" == "brew_cask" ]]; then
  echo ""
  echo "### Brew Cask (run: brew uninstall --cask ${CASK_NAME})"
  echo "$CASK_DIR"
fi
