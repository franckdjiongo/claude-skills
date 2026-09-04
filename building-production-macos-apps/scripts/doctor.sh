#!/usr/bin/env bash
# doctor.sh — read-only environment discovery for macOS development.
# Prints the machine, toolchain, SDKs, Swift, Git, signing capability, and whether the
# installed Xcode can export Apple's agent skills. Never writes anything; safe to run anytime.
#
# Usage: bash scripts/doctor.sh [--help]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
. "$SCRIPT_DIR/_common.sh"

usage() {
  sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $arg (see --help)" ;;
  esac
done

if [ "$(uname -s)" != "Darwin" ]; then
  warn "Not macOS ($(uname -s)). Planning and review can proceed; build/run steps need a Mac."
  exit 0
fi

section "Machine"
sw_vers 2>/dev/null | sed 's/^/  /'
log "  arch: $(uname -m)"
log "  cpu:  $(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo unknown)"
log "  memory: $(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1073741824 )) GB"
log "  free disk (home): $(df -h "$HOME" 2>/dev/null | awk 'NR==2 {print $4}')"

section "Xcode"
if have_cmd xcode-select; then
  DEV_DIR="$(xcode-select -p 2>/dev/null || true)"
  log "  active developer dir: ${DEV_DIR:-<none — run: sudo xcode-select -s /Applications/Xcode.app>}"
fi
if have_cmd xcodebuild && xcodebuild -version >/dev/null 2>&1; then
  xcodebuild -version 2>/dev/null | sed 's/^/  /'
else
  warn "xcodebuild unusable (Xcode missing, license not accepted, or only Command Line Tools installed)."
fi
INSTALLS="$(ls -d /Applications/Xcode*.app 2>/dev/null || true)"
if [ -n "$INSTALLS" ]; then
  log "  installed Xcode apps:"
  printf '%s\n' "$INSTALLS" | while IFS= read -r app; do
    ver="$(defaults read "$app/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo '?')"
    log "    $app  (version $ver)"
  done
fi
[ -n "${DEVELOPER_DIR:-}" ] && log "  DEVELOPER_DIR override: $DEVELOPER_DIR"

section "SDKs (macOS)"
if have_cmd xcodebuild; then
  xcodebuild -showsdks 2>/dev/null | grep -i 'macos' | sed 's/^/  /' || log "  <none listed>"
fi

section "Swift"
if have_cmd xcrun; then
  xcrun swift --version 2>/dev/null | head -n 1 | sed 's/^/  /' || warn "swift not found via xcrun"
fi

section "Tooling"
for tool in git swiftlint xcbeautify xcpretty swiftformat; do
  if have_cmd "$tool"; then
    log "  $tool: $("$tool" --version 2>/dev/null | head -n 1)"
  else
    log "  $tool: not installed"
  fi
done
if have_cmd xcrun; then
  xcrun --find notarytool >/dev/null 2>&1 && log "  notarytool: available" || log "  notarytool: not found"
  xcrun --find xcresulttool >/dev/null 2>&1 && log "  xcresulttool: available" || log "  xcresulttool: not found"
  xcrun --find xctrace >/dev/null 2>&1 && log "  xctrace (Instruments CLI): available" || log "  xctrace: not found"
fi

section "Code signing"
if have_cmd security; then
  IDENTITIES="$(security find-identity -v -p codesigning 2>/dev/null | grep -E '"' || true)"
  if [ -z "$IDENTITIES" ]; then
    log "  no code-signing identities in the keychain (Xcode > Settings > Accounts to install)"
  else
    count_ids() { printf '%s\n' "$IDENTITIES" | grep -c -E "$1" || true; }
    log "  Developer ID Application identities: $(count_ids 'Developer ID Application')"
    log "  App Store distribution identities:   $(count_ids 'Apple Distribution|3rd Party Mac Developer Application')"
    log "  Development identities:              $(count_ids 'Apple Development|Mac Developer')"
  fi
fi

section "Apple agent skills (Xcode)"
if have_cmd xcrun && xcrun --find agent >/dev/null 2>&1; then
  if xcrun agent skills --help >/dev/null 2>&1 || xcrun agent --help 2>/dev/null | grep -qi skills; then
    ok "xcrun agent skills export is supported — run: bash scripts/export-apple-skills.sh"
  else
    log "  'xcrun agent' exists but the skills subcommand did not respond; check: xcrun agent --help"
  fi
else
  log "  not available in this Xcode (no 'agent' tool via xcrun). Fall back to SDK inspection + live docs."
fi

section "Git"
if have_cmd git; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    log "  branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
    log "  head:   $(git log -1 --format='%h %s' 2>/dev/null)"
    DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
    log "  uncommitted changes: $DIRTY"
  else
    log "  not inside a git repository"
  fi
fi

section "Next"
log "  For a project: bash scripts/project-info.sh [dir]"
log "  Version-sensitive facts above are for this machine today; see references/source-refresh.md."
