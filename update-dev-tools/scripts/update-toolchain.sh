#!/usr/bin/env bash
# update-toolchain.sh
# Autonomous macOS dev-toolchain updater. Encodes the hard-won steps + gotchas
# from a real session: Python (mise, current stable) + document libraries, Node
# (mise, LTS) + reinstalled global CLIs, bun, Homebrew formulae & casks, with
# resilient logging and end-to-end verification. See ../SKILL.md and
# ../references/gotchas.md for the WHY behind every step.
#
# Safe by design: read-only survey first; mutating steps tolerate individual
# failures (one broken package never aborts the run); nothing is force-removed;
# old runtime versions are KEPT unless --prune-old; anything that needs YOUR
# password (e.g. a .pkg cask) is detected and REPORTED, never hung on.
#
# Targets a mise + Homebrew + zsh setup (this machine's stack). Each section
# checks its prerequisite tool and skips cleanly if absent.
#
# Usage: update-toolchain.sh [options]
#   --python <stable|X.Y|skip>    default: stable (= mise latest python)
#   --node   <lts|latest|X|skip>  default: lts
#   --skip-brew | --skip-npm | --skip-bun | --skip-casks
#   --prune-old                   remove superseded mise runtime versions (off by default)
#   --dry-run                     show the plan; change nothing
#   --log <path>                  full log destination (default: a temp file)
#   -h | --help
#
# Kept bash 3.2-compatible (macOS system bash): no associative arrays, no mapfile.

set -uo pipefail

# ---------------------------------------------------------------------------
# Config / flags
# ---------------------------------------------------------------------------
PYTHON_REQ="stable"
NODE_REQ="lts"
DO_BREW=1; DO_NPM=1; DO_BUN=1; DO_CASKS=1
DRY_RUN=0; PRUNE_OLD=0
LOG="${TMPDIR:-/tmp}/update-toolchain-$(date +%Y%m%d-%H%M%S).log"

# Document/data libraries the docx/pdf/pptx/xlsx skills drive. Always ensured.
DOC_LIBS="python-docx openpyxl python-pptx pypdf pdfplumber pillow markitdown pandas"

usage() { sed -n '/^# Usage:/,/^# Kept bash/p' "$0"; }   # self-delimiting; survives header edits
need() { [ "$1" -ge 2 ] || { echo "$2 requires a value" >&2; exit 2; }; }  # guard value-flags under set -u

while [ $# -gt 0 ]; do
  case "$1" in
    --python) need $# --python; PYTHON_REQ="$2"; shift 2;;
    --node)   need $# --node;   NODE_REQ="$2"; shift 2;;
    --skip-brew)  DO_BREW=0; shift;;
    --skip-npm)   DO_NPM=0; shift;;
    --skip-bun)   DO_BUN=0; shift;;
    --skip-casks) DO_CASKS=0; shift;;
    --prune-old)  PRUNE_OLD=1; shift;;
    --dry-run)    DRY_RUN=1; shift;;
    --log)        need $# --log; LOG="$2"; shift 2;;
    -h|--help)    usage; exit 0;;
    *) echo "unknown option: $1" >&2; usage; exit 2;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers + report accumulators
# ---------------------------------------------------------------------------
UPDATED=""   # "label: before -> after"
PLANNED=""   # dry-run: "label" that WOULD update
SKIPPED=""   # "label: reason"
FAILED=""    # "label: reason"
MANUAL=""    # "action you must run yourself"
WARN=""      # non-fatal advisory (e.g. mise shims absent from the non-interactive PATH)

have() { command -v "$1" >/dev/null 2>&1; }
sec()  { printf '\n\033[1m── %s\033[0m\n' "$1" | tee -a "$LOG" || true; }
log()  { printf '%s\n' "$*" | tee -a "$LOG" || true; }
add() {  # append "  <text>" as a new line to the named list var (no eval gymnastics)
  local cur=${!1-}
  if [ -n "$cur" ]; then printf -v "$1" '%s\n  %s' "$cur" "$2"; else printf -v "$1" '  %s' "$2"; fi
}
# Route runtime "updated" lines: under --dry-run they're only PLANNED (before==after),
# so the report stays honest about having changed nothing.
addupd() { if [ "$DRY_RUN" -eq 1 ]; then add PLANNED "$1"; else add UPDATED "$1"; fi; }

# run MUTATING commands; honor --dry-run; everything is logged.
run() {
  if [ "$DRY_RUN" -eq 1 ]; then log "DRY-RUN: $*"; return 0; fi
  log "+ $*"; "$@" >>"$LOG" 2>&1
}

log "toolchain update — $(date)    log: $LOG    dry-run: $DRY_RUN"

# ---------------------------------------------------------------------------
# 0. Survey (read-only — always runs)
# ---------------------------------------------------------------------------
sec "Survey (current state)"
log "python3 : $(command -v python3 2>/dev/null) $(python3 --version 2>&1)"
log "node    : $(have node && node --version 2>&1)   npm $(have npm && npm --version 2>&1)"
log "bun     : $(have bun && bun --version 2>&1)"
log "mise    : $(have mise && mise --version 2>&1 | head -1)"
log "brew    : $(have brew && brew --version 2>&1 | head -1)"
if have mise; then log "mise tools:"; mise ls --current 2>/dev/null | sed 's/^/   /' | tee -a "$LOG"; fi

# ---------------------------------------------------------------------------
# 1. mise itself (so it installs the newest runtimes)
# ---------------------------------------------------------------------------
if have mise; then
  sec "Update mise"
  before_mise="$(mise --version 2>&1 | head -1)"
  if have brew && brew list --formula 2>/dev/null | grep -qx mise; then
    run brew upgrade mise || true
  else
    run mise self-update -y || true
  fi
  addupd "mise: ${before_mise} -> $(mise --version 2>&1 | head -1)"
else
  add SKIPPED "mise: not installed — Python/Node management skipped (install mise or adapt)"
fi

# ---------------------------------------------------------------------------
# 2. Python via mise (+ preserve & update the user's pip packages, ensure doc libs)
#    WHY: pip packages live PER python version. Bumping python loses them unless
#    we snapshot the old version's top-level packages and reinstall into the new.
# ---------------------------------------------------------------------------
if have mise && [ "$PYTHON_REQ" != "skip" ]; then
  sec "Python (mise)"
  if [ "$PYTHON_REQ" = "stable" ]; then PYTARGET="$(mise latest python 2>/dev/null)"; else PYTARGET="$PYTHON_REQ"; fi
  before_py="$(python3 --version 2>&1)"
  log "target python: ${PYTARGET:-<unresolved>}"

  # Snapshot old top-level pip packages (names only) before switching.
  PIP_KEEP=""
  OLDPY="$(mise which python 2>/dev/null || true)"
  if [ -n "$OLDPY" ]; then
    while IFS= read -r p; do
      case "$p" in pip|setuptools|wheel|"") ;; *) PIP_KEEP="$PIP_KEEP $p";; esac
    done < <("$OLDPY" -m pip list --not-required --format=freeze 2>/dev/null | cut -d= -f1)
  fi

  if [ -n "$PYTARGET" ]; then
    run mise use -g "python@${PYTARGET}" || add FAILED "python@${PYTARGET}: mise install failed"
  fi
  NEWPY="$(mise which python 2>/dev/null || true)"
  if [ -n "$NEWPY" ]; then
    run "$NEWPY" -m pip install --upgrade pip || true
    # Union of (preserved user packages) + (doc libs), de-duplicated. Bulk first;
    # fall back per-pkg so one bad package can't abort the rest.
    WANT="$(printf '%s %s' "$PIP_KEEP" "$DOC_LIBS" | tr ' ' '\n' | grep -v '^$' | sort -u | tr '\n' ' ')"
    PYFAIL=0
    if [ "$DRY_RUN" -eq 1 ]; then
      log "DRY-RUN: pip install --upgrade$WANT"
    elif ! "$NEWPY" -m pip install --upgrade $WANT >>"$LOG" 2>&1; then
      log "bulk pip install hit a snag — retrying per-package (resilient)"
      for p in $WANT; do "$NEWPY" -m pip install --upgrade "$p" >>"$LOG" 2>&1 || { add FAILED "pip:$p"; PYFAIL=1; }; done
    fi
    pynote=""; [ "$PYFAIL" -eq 1 ] && pynote="  (some packages failed — see Failed)"
    addupd "python: ${before_py} -> $(mise exec -- python3 --version 2>&1)${pynote}"
  fi
else
  add SKIPPED "python: skipped"
fi

# ---------------------------------------------------------------------------
# 3. Node via mise (+ reinstall global CLIs — they live PER node version)
#    WHY: a node version switch drops the previous version's global npm packages.
#    Snapshot their names, then reinstall into the new node. Do NOT self-update
#    npm — it ships bundled with node and self-update races ("Cannot find module
#    'promise-retry'") and rolls back; the bundled npm is the supported pairing.
# ---------------------------------------------------------------------------
if have mise && [ "$NODE_REQ" != "skip" ]; then
  sec "Node (mise)"
  NODEFAIL=0
  before_node="$(node --version 2>&1)"; before_npm="$(npm --version 2>&1)"
  log "target node: node@${NODE_REQ} ($(mise latest node@${NODE_REQ} 2>/dev/null || echo '?'))"

  # Snapshot current global npm package names (handles @scoped); drop npm/corepack.
  NPM_KEEP=""
  if have npm; then
    while IFS= read -r n; do
      case "$n" in npm|corepack|"") ;; *) NPM_KEEP="$NPM_KEEP $n";; esac
    done < <(npm ls -g --depth=0 --parseable 2>/dev/null | sed -n '2,$p' | sed 's|.*/node_modules/||')
  fi
  log "global CLIs to carry over:${NPM_KEEP:- (none)}"

  run mise use -g "node@${NODE_REQ}" || add FAILED "node@${NODE_REQ}: mise install failed"

  if [ -n "$NPM_KEEP" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
      log "DRY-RUN: (new node) npm i -g$NPM_KEEP"
    elif ! mise exec -- npm i -g $NPM_KEEP >>"$LOG" 2>&1; then
      log "bulk global reinstall hit a snag — retrying per-package"
      for n in $NPM_KEEP; do mise exec -- npm i -g "$n" >>"$LOG" 2>&1 || { add FAILED "npm-global:$n"; NODEFAIL=1; }; done
    fi
  fi
  nodenote=""; [ "$NODEFAIL" -eq 1 ] && nodenote="  (some global CLIs failed to reinstall — see Failed)"
  addupd "node: ${before_node} -> $(mise exec -- node --version 2>&1)   npm: ${before_npm} -> $(mise exec -- npm --version 2>&1) (bundled)${nodenote}"
else
  add SKIPPED "node: skipped"
fi

# ---------------------------------------------------------------------------
# 4. bun
# ---------------------------------------------------------------------------
if [ "$DO_BUN" -eq 1 ] && have bun; then
  sec "bun"
  b="$(bun --version 2>&1)"; run bun upgrade || true
  addupd "bun: ${b} -> $(bun --version 2>&1)"
fi

# ---------------------------------------------------------------------------
# 5. Homebrew formulae
# ---------------------------------------------------------------------------
if [ "$DO_BREW" -eq 1 ] && have brew; then
  sec "Homebrew formulae"
  run brew update || true
  out="$(brew outdated --formula 2>/dev/null)"
  if [ -n "$out" ]; then log "outdated formulae:"; echo "$out" | sed 's/^/   /' | tee -a "$LOG"; run brew upgrade --formula || true
  else log "formulae already current"; fi
fi

# ---------------------------------------------------------------------------
# 6. Homebrew casks — attempt each; .pkg casks need sudo, stale casks (app gone)
#    can't upgrade. Neither HANGS: non-tty sudo fails fast. Both are reported,
#    not forced. (Never wrap in `timeout` — macOS has no such command.)
# ---------------------------------------------------------------------------
if [ "$DO_CASKS" -eq 1 ] && have brew; then
  sec "Homebrew casks"
  ocasks="$(brew outdated --cask 2>/dev/null | awk '{print $1}')"
  if [ -z "$ocasks" ]; then log "casks already current"; fi
  for c in $ocasks; do
    if [ "$DRY_RUN" -eq 1 ]; then log "DRY-RUN: brew upgrade --cask $c"; continue; fi
    log "+ brew upgrade --cask $c"
    # Capture THIS cask's own output so classification is deterministic, regardless
    # of trailing brew caveats or how many casks ran before (don't read tail of the
    # shared log).
    co="$(mktemp "${TMPDIR:-/tmp}/utc-cask.XXXXXX")"
    if brew upgrade --cask "$c" >"$co" 2>&1; then
      cat "$co" >>"$LOG"; add UPDATED "cask $c"
    else
      cat "$co" >>"$LOG"
      msg="$(tr '\n' ' ' <"$co")"
      case "$msg" in
        *"a terminal is required"*|*"sudo: "*|*"password is required"*|*"requires the sudo"*)
          add MANUAL "brew upgrade --cask $c    # needs your Mac password (.pkg installer)";;
        *"It seems the App source"*|*"is not there"*)
          add MANUAL "brew reinstall --cask $c  # OR: brew uninstall --cask $c  (stale: app not present)";;
        *) add FAILED "cask $c (see log)";;
      esac
    fi
    rm -f "$co"
  done
fi

# ---------------------------------------------------------------------------
# 7. Optional prune of superseded mise runtime versions
#    Off by default: a project's .tool-versions may pin an older runtime.
# ---------------------------------------------------------------------------
if [ "$PRUNE_OLD" -eq 1 ] && have mise; then
  sec "Prune superseded mise versions"
  run mise prune -y || mise prune 2>>"$LOG" || true
fi

# ---------------------------------------------------------------------------
# 8. Verification (proves it actually works, not just that commands ran)
# ---------------------------------------------------------------------------
sec "Verification"
if have mise; then
  log "python3 (mise): $(mise exec -- python3 --version 2>&1) @ $(mise which python 2>&1)"
  log "node/npm (mise): $(mise exec -- node --version 2>&1) / $(mise exec -- npm --version 2>&1)"
  # Doc libraries import under the (new) python?
  mise exec -- python3 - <<'PY' 2>&1 | tee -a "$LOG"
import importlib
for m,n in {"docx":"python-docx","openpyxl":"openpyxl","pptx":"python-pptx","pypdf":"pypdf","pdfplumber":"pdfplumber","PIL":"pillow","markitdown":"markitdown","pandas":"pandas"}.items():
    try: importlib.import_module(m); print(f"  import OK : {n}")
    except Exception as e: print(f"  import XX : {n}: {e}")
PY
  # If wrangler is global, confirm its native runtime binary executes (npm 11
  # defers postinstall scripts, but the binary arrives via optionalDependencies).
  GROOT="$(mise exec -- npm root -g 2>/dev/null)"
  WK="$(ls "$GROOT"/wrangler/node_modules/@cloudflare/workerd-*/bin/workerd 2>/dev/null | head -1)"
  if [ -n "$WK" ] && [ -x "$WK" ]; then log "workerd binary: $("$WK" --version 2>&1 | head -1) (wrangler dev OK)"; fi
fi
if have brew; then
  miss="$(brew missing 2>/dev/null)"
  if [ -z "$miss" ]; then log "brew missing: none (no broken dependents — safe)"; else log "brew missing (ATTENTION):"; echo "$miss" | sed 's/^/   /' | tee -a "$LOG"; add FAILED "brew missing reported broken dependents"; fi
fi

# ---------------------------------------------------------------------------
# 9. Non-interactive PATH check — can GUI/headless tools find the mise runtimes?
#    WHY: mise exposes node/python3 via SHIMS (~/.local/share/mise/shims) or its
#    activate hook, and NEITHER is on the PATH of a non-interactive shell. A login
#    terminal gets them (rc files fire the hook); a tool that spawns `node` with
#    `/bin/sh -c` — notably Claude Code hooks and GUI/menubar apps — does not. So
#    right after a Node bump those tools can hit "node: command not found" while
#    your terminal is perfectly fine. Probe a MINIMAL non-interactive shell (the
#    worst case they see) and WARN — never fix: editing settings.json is the
#    user's call, and a wrong PATH edit is worse than the warning.
# ---------------------------------------------------------------------------
if have mise; then
  sec "Non-interactive PATH check (mise shims)"
  # Probe each mise-managed runtime's user-facing command. python -> python3.
  PROBE=""
  while IFS= read -r t; do
    case "$t" in python) PROBE="$PROBE python3";; "") ;; *) PROBE="$PROBE $t";; esac
  done < <(mise ls --current 2>/dev/null | awk 'NF{print $1}' | sort -u)

  if [ -z "$PROBE" ]; then
    log "no mise-managed runtimes — nothing to probe"
  else
    NI_MISSING=""
    for cmd in $PROBE; do
      # env -i wipes PATH and /bin/sh -c is non-login/non-interactive, so mise's
      # activate hook never fires — exactly what a GUI app / hook `/bin/sh -c` sees.
      if env -i HOME="$HOME" /bin/sh -c "command -v $cmd" >/dev/null 2>&1; then
        log "  non-interactive resolve OK : $cmd"
      else
        log "  non-interactive resolve XX : $cmd  (only on mise's interactive PATH)"
        NI_MISSING="$NI_MISSING $cmd"
      fi
    done
    if [ -n "$NI_MISSING" ]; then
      add WARN "mise runtimes not resolvable in a minimal non-interactive shell:$NI_MISSING"
      add WARN "  Non-interactive tools — Claude Code hooks, GUI/headless apps that run a"
      add WARN "  command via /bin/sh -c — can hit \"command not found\" for these after a bump."
      add WARN "  Remedy (YOUR call — this script will NOT touch it): put mise's shims dir on a"
      add WARN "  PATH those tools inherit. Either add it to ~/.claude/settings.json:"
      add WARN "      \"env\": { \"PATH\": \"$HOME/.local/share/mise/shims:\${PATH}\" }"
      add WARN "  or symlink the runtime where GUI apps already look, e.g.:"
      add WARN "      ln -sf \"$HOME/.local/share/mise/shims/node\" /opt/homebrew/bin/node"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
sec "REPORT"
[ "$DRY_RUN" -eq 1 ] && log "(dry-run — nothing was changed)"
[ -n "$PLANNED" ] && { log "Would update:"; log "$PLANNED"; }
[ -n "$UPDATED" ] && { log "Updated:";  log "$UPDATED"; }
[ -n "$SKIPPED" ] && { log "Skipped:";  log "$SKIPPED"; }
[ -n "$FAILED"  ] && { log "Failed (review the log):"; log "$FAILED"; }
if [ -n "$MANUAL" ]; then
  log ""
  log "NEEDS YOUR ACTION (can't be automated from a non-interactive shell):"
  log "$MANUAL"
fi
if [ -n "$WARN" ]; then
  log ""
  log "WARNINGS (non-fatal — worth fixing so non-interactive tools keep working):"
  log "$WARN"
fi
log ""
log "Note: npm stays at the version BUNDLED with the new Node (self-updating npm under a"
log "      version manager races and rolls back). New terminals already see the new"
log "      python3/node; in an open one run:  exec \$SHELL"
log "Full log: $LOG"
[ -n "$FAILED" ] && exit 1 || exit 0
