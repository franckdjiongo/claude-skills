#!/usr/bin/env bash
# Usage: uninstall.sh <mode> <path1> [path2 ...]
#
# mode:
#   full    — delete everything (app bundle + all library files)
#   partial — delete only caches, logs, crash reports
#
# Paths come from gather_files.sh output. Pass section header lines (### ...) too —
# they are used to track context (e.g. Brew Cask sections).
#
# SAFETY: Every path is validated against a strict allowlist before deletion.
# Any path outside the approved zones causes an immediate hard abort.

set -uo pipefail

MODE="${1:-}"
if [[ "$MODE" != "full" && "$MODE" != "partial" ]]; then
  echo "Usage: uninstall.sh <full|partial> <path1> [path2 ...]" >&2
  exit 2
fi

shift
PATHS=("$@")
if [[ ${#PATHS[@]} -eq 0 ]]; then
  echo "No paths provided." >&2
  exit 2
fi

# ============================================================
# SAFETY GUARDRAIL — called before every single deletion
# Returns 0 (safe) or 1 (blocked). Never throws — caller decides.
# ============================================================
is_safe_to_delete() {
  local p="$1"

  # Must be absolute
  [[ "$p" != /* ]] && return 1

  # ---- Hard-blocked paths — OS and user data, never touch ----
  # This list covers system directories, the home root, and personal folders.
  # Even if somehow passed as an argument, deletion is refused.
  local BLOCKED=(
    "/"
    "/System"
    "/usr"
    "/bin"
    "/sbin"
    "/etc"
    "/var"
    "/private"
    "/Library"         # system-level /Library (not ~/Library)
    "/cores"
    "/dev"
    "/Applications/Utilities"   # macOS built-in utilities folder
    "$HOME"
    "$HOME/Documents"
    "$HOME/Desktop"
    "$HOME/Downloads"
    "$HOME/Pictures"
    "$HOME/Music"
    "$HOME/Movies"
    "$HOME/Public"
    "$HOME/Library"    # ~/Library root itself — only subdirectories are OK
  )
  for blocked in "${BLOCKED[@]}"; do
    if [[ "$p" == "$blocked" || "$p" == "${blocked}/"* ]]; then
      echo "SAFETY BLOCK: '$p' is inside a protected path ($blocked). Aborting." >&2
      return 1
    fi
  done

  # ---- Allowlist — only these zones may be deleted from ----
  # Anything not in this list is refused, even if not explicitly blocked above.
  local ALLOWED=(
    "/Applications/"
    "$HOME/Applications/"
    "$HOME/Library/Application Support/"
    "$HOME/Library/Preferences/"
    "$HOME/Library/Caches/"
    "$HOME/Library/Logs/"
    "$HOME/Library/LaunchAgents/"
    "$HOME/Library/Group Containers/"
    "$HOME/Library/Application Scripts/"
    "$HOME/Library/Containers/"
    "$HOME/Library/HTTPStorages/"
    "$HOME/Library/Saved Application State/"
    "$HOME/Library/WebKit/"
    "$HOME/Library/Mobile Documents/"
    "/opt/homebrew/Caskroom/"
    "/opt/homebrew/bin/"          # brew-managed symlinks only
    "/private/var/db/receipts/"   # PKG installer receipts
  )
  for zone in "${ALLOWED[@]}"; do
    [[ "$p" == "${zone}"* ]] && return 0
  done

  # Path is outside every allowed zone
  echo "SAFETY BLOCK: '$p' is outside all approved uninstall zones. Skipping." >&2
  return 1
}

# ============================================================
# Classify: what to keep in partial mode
# ============================================================
is_cache_or_log() {
  local p="$1"
  [[ "$p" == *"/Caches/"* ]]           && return 0
  [[ "$p" == *"/Logs/"* ]]             && return 0
  [[ "$p" == *"DiagnosticReports"* ]]  && return 0
  [[ "$p" == *"SentryCrash"* ]]        && return 0
  [[ "$p" == *"HTTPStorages"* ]]       && return 0
  return 1
}

# ============================================================
# Find the app bundle in the path list
# ============================================================
APP_PATH=""
APP_NAME=""
for p in "${PATHS[@]}"; do
  [[ "$p" == "###"* || -z "$p" || "$p" == "#"* ]] && continue
  if [[ "$p" == *.app && -d "$p" ]]; then
    APP_PATH="$p"
    APP_NAME=$(basename "$p" .app)
    break
  fi
done

# ============================================================
# Kill the app process before touching its files
# ============================================================
if [[ -n "$APP_NAME" ]]; then
  echo "Stopping '$APP_NAME'..."
  osascript -e "quit app \"${APP_NAME}\"" 2>/dev/null || true
  sleep 0.5
  pkill -f "$APP_NAME" 2>/dev/null || true
fi

# ============================================================
# Process each path
# ============================================================
ERRORS=0
DELETED=()
SKIPPED=()
BREW_CASKS=()
IN_BREW_CASK=false

for path in "${PATHS[@]}"; do
  [[ -z "$path" ]] && continue

  # Section header: track context, don't delete
  if [[ "$path" == "###"* ]]; then
    [[ "$path" == *"Brew Cask"* ]] && IN_BREW_CASK=true || IN_BREW_CASK=false
    continue
  fi

  # Comment lines from gather_files.sh (install method notes)
  [[ "$path" == "#"* ]] && continue

  # Collect brew cask names for special handling
  if $IN_BREW_CASK; then
    BREW_CASKS+=("$path")
    continue
  fi

  # ---- SAFETY CHECK runs first — before existence, before everything ----
  if ! is_safe_to_delete "$path"; then
    ERRORS=$((ERRORS+1))
    continue
  fi

  [[ ! -e "$path" ]] && continue

  # Partial mode: only remove caches/logs
  if [[ "$MODE" == "partial" ]] && ! is_cache_or_log "$path"; then
    SKIPPED+=("$path")
    continue
  fi

  # Unload LaunchAgents gracefully before deleting
  if [[ "$path" == *"/LaunchAgents/"* && -f "$path" ]]; then
    launchctl unload "$path" 2>/dev/null || true
  fi

  if rm -rf "$path" 2>/dev/null; then
    DELETED+=("$path")
  else
    # Sandbox containers are locked by containermanagerd — clears on next restart
    if [[ "$path" == *"/Library/Containers/"* ]]; then
      echo "Note: '$path' is macOS-protected and will clear on next restart." >&2
      SKIPPED+=("$path  ← clears on restart")
    else
      echo "Failed to delete: $path" >&2
      ERRORS=$((ERRORS+1))
    fi
  fi

  # Remove the preferences domain from the defaults system too
  if [[ "$path" == *.plist && "$MODE" == "full" ]]; then
    defaults delete "$(basename "$path" .plist)" 2>/dev/null || true
  fi
done

# ============================================================
# Brew cask: use brew's own uninstaller (full mode only)
# ============================================================
if [[ "$MODE" == "full" && ${#BREW_CASKS[@]} -gt 0 ]]; then
  for cask_dir in "${BREW_CASKS[@]}"; do
    cask_name=$(basename "$cask_dir")
    echo "Running: brew uninstall --cask --force ${cask_name}"
    if brew uninstall --cask --force "$cask_name" 2>&1; then
      DELETED+=("brew cask: $cask_name")
    else
      echo "brew uninstall failed for $cask_name" >&2
      ERRORS=$((ERRORS+1))
    fi
  done
fi

# ============================================================
# Report
# ============================================================
echo ""
echo "=== Uninstall complete (mode: $MODE) ==="
echo ""

if [[ ${#DELETED[@]} -gt 0 ]]; then
  echo "Removed (${#DELETED[@]} items):"
  for d in "${DELETED[@]}"; do echo "  ✓ $d"; done
fi

if [[ ${#SKIPPED[@]} -gt 0 ]]; then
  echo ""
  echo "Kept or deferred:"
  for s in "${SKIPPED[@]}"; do echo "  — $s"; done
fi

if [[ $ERRORS -gt 0 ]]; then
  echo ""
  echo "Warning: $ERRORS issue(s) encountered. Review output above." >&2
  exit 1
fi

exit 0
