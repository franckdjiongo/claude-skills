#!/bin/bash
# sync.sh — Syncs the current Power Apps Code App to the Fernand Gilbert Ltée
# Azure DevOps repository under code-apps/<app-name>/.
#
# Usage: bash ~/.claude/skills/sync-to-azure/scripts/sync.sh

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────────
FGL_DIR="$HOME/.fgl-azure"
PAT_FILE="$FGL_DIR/.pat"
CLONE_DIR="$FGL_DIR/repo"
SOURCE_DIR="$(pwd)"

# ── Helpers ────────────────────────────────────────────────────────────────────
info()  { echo "  --> $*"; }
ok()    { echo "  [OK] $*"; }
error() { echo "  [ERROR] $*" >&2; exit 1; }

# Cache cygpath availability once — avoids forking on every to_win call
if command -v cygpath &>/dev/null; then HAS_CYGPATH=1; else HAS_CYGPATH=0; fi

# Convert a Unix-style path (/c/Users/...) to a Windows path (C:\Users\...)
# for robocopy. cygpath is always present in Git Bash; the elif is a fallback.
to_win() {
  if [ "$HAS_CYGPATH" -eq 1 ]; then
    cygpath -w "$1"
  elif [[ "$1" =~ ^/([a-zA-Z])/(.*) ]]; then
    echo "${BASH_REMATCH[1]^^}:\\$(echo "${BASH_REMATCH[2]}" | sed 's|/|\\|g')"
  else
    echo "$1"
  fi
}

# ── Mode parsing ───────────────────────────────────────────────────────────────
# Three modes decide how the commit message is produced:
#   (no args)        auto   — stat-based summary message, then commit + push
#   --stage-only     stage  — clone + copy + stage, PRINT the delta, stop (no commit)
#   -m "<message>"   commit — commit the delta with the given message, then push
# The two-phase stage→commit flow lets the caller analyse the REAL diff since the
# last sync and write a logical Conventional-Commits message — the old behaviour
# of reusing the source branch's last commit subject is gone.
MODE="auto"
COMMIT_MSG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --stage-only|--stage) MODE="stage"; shift ;;
    -m|--message)
      MODE="commit"
      COMMIT_MSG="${2:-}"
      [ -z "$COMMIT_MSG" ] && error "-m requires a commit message."
      shift 2 ;;
    -h|--help)
      echo "Usage: sync.sh [--stage-only | -m \"<commit message>\"]"
      exit 0 ;;
    *) error "Unknown argument: $1 (use --stage-only or -m \"<message>\")." ;;
  esac
done

echo ""
echo "══════════════════════════════════════════════"
echo "  Sync Code App → Azure DevOps (FGL)"
echo "══════════════════════════════════════════════"
echo ""

# ── 0. Load PAT (prompt once, save for all future runs) ───────────────────────
mkdir -p "$FGL_DIR"   # covers both $PAT_FILE and $CLONE_DIR parent
if [ -f "$PAT_FILE" ]; then
  PAT=$(< "$PAT_FILE")
else
  echo "  First-time setup: enter your Azure DevOps Personal Access Token."
  echo "  (Saved to $PAT_FILE — readable only by you)"
  echo ""
  read -s -p "  PAT: " PAT
  echo ""
  printf '%s' "$PAT" > "$PAT_FILE"
  chmod 600 "$PAT_FILE"
  info "PAT saved. You won't be prompted again."
  echo ""
fi
# Embed PAT in URL so git never prompts for credentials
AZURE_REPO_URL="https://anything:${PAT}@dev.azure.com/FGL-PowerPlatform/Fernand%20Gilbert%20Lt%C3%A9e/_git/Fernand%20Gilbert%20Lt%C3%A9e"

# ── 1. Validate project root ───────────────────────────────────────────────────
[ -f "package.json" ] || error "No package.json found. Run from the root of a Code App project."

# ── 2. Detect app name ────────────────────────────────────────────────────────
APP_NAME=""
if [ -f "power.config.json" ] && command -v node &>/dev/null; then
  APP_NAME=$(node -e "try{console.log(require('./power.config.json').name||'')}catch(e){}" \
    2>/dev/null || true)
fi
[ -z "$APP_NAME" ] && APP_NAME=$(basename "$SOURCE_DIR")

info "App      : $APP_NAME"
info "Source   : $SOURCE_DIR"
info "Target   : code-apps/$APP_NAME/"
echo ""

# ── 3. Maintain a persistent local clone of the Azure repo ────────────────────
if [ -d "$CLONE_DIR/.git" ]; then
  info "Updating local Azure clone..."

  # Reset dirty state left by a previous failed run (one status call vs. two diffs)
  if [ -n "$(git -C "$CLONE_DIR" status --porcelain 2>/dev/null)" ]; then
    info "Cleaning uncommitted state in local clone..."
    git -C "$CLONE_DIR" reset --quiet --hard HEAD
    git -C "$CLONE_DIR" clean -fd --quiet
  fi

  # Always refresh the remote URL with the current PAT (handles PAT rotation)
  git -C "$CLONE_DIR" remote set-url origin "$AZURE_REPO_URL"
  # Keep LF line endings in the clone — suppresses noisy CRLF conversion warnings
  git -C "$CLONE_DIR" config core.autocrlf false

  # Prefer fast-forward; fall back to hard reset to origin/main if history diverged
  if ! git -C "$CLONE_DIR" pull origin main --ff-only --quiet 2>/dev/null; then
    info "Fast-forward not possible — resetting to origin/main..."
    git -C "$CLONE_DIR" fetch origin --quiet
    git -C "$CLONE_DIR" reset --quiet --hard origin/main
  fi
else
  info "First run — cloning Azure DevOps repo..."
  git clone "$AZURE_REPO_URL" "$CLONE_DIR" --quiet \
    || error "Clone failed. Check your PAT and network/VPN. To reset PAT: rm $PAT_FILE"
  git -C "$CLONE_DIR" config core.autocrlf false
fi

# Propagate global git identity into the clone if not already configured
if [ -z "$(git -C "$CLONE_DIR" config user.email 2>/dev/null)" ]; then
  GLOBAL_EMAIL=$(git config --global user.email 2>/dev/null || true)
  GLOBAL_NAME=$(git config --global user.name 2>/dev/null || echo 'Developer')
  [ -z "$GLOBAL_EMAIL" ] \
    && error "git user.email not configured. Run: git config --global user.email 'you@example.com'"
  git -C "$CLONE_DIR" config user.email "$GLOBAL_EMAIL"
  git -C "$CLONE_DIR" config user.name "$GLOBAL_NAME"
fi

# ── 4. Copy source → code-apps/<app-name>/ ────────────────────────────────────
TARGET_DIR="$CLONE_DIR/code-apps/$APP_NAME"
mkdir -p "$TARGET_DIR"

info "Copying files (excluding .claude, .agents, .codex, CLAUDE.md, AGENTS.md, node_modules, dist, docs, .env*, *.local)..."

# Cross-platform copy: robocopy on Windows/Git Bash, rsync on macOS/Linux.
# Both mirror robocopy /E semantics — recursive, overwrite, and KEEP files
# that were removed from the source (no --delete), so behavior is identical
# regardless of OS.
if command -v robocopy &>/dev/null; then
  WIN_SRC=$(to_win "$SOURCE_DIR")
  WIN_TGT=$(to_win "$TARGET_DIR")

  # robocopy exit codes: 0 = nothing to copy, 1–7 = success, 8+ = error.
  # Must use || — set -e would kill the script on any non-zero exit,
  # including code 1 which means "files were copied successfully".
  ROBOCOPY_EXIT=0
  MSYS_NO_PATHCONV=1 robocopy \
    "$WIN_SRC" "$WIN_TGT" \
    /E \
    /XD ".claude" ".agents" ".codex" ".git" "node_modules" "dist" "docs" \
    /XF "CLAUDE.md" "AGENTS.md" "*.local" ".env*" "pre-push" \
    /NFL /NDL /NJH /NJS \
    || ROBOCOPY_EXIT=$?

  [ "$ROBOCOPY_EXIT" -ge 8 ] \
    && error "robocopy failed with exit code $ROBOCOPY_EXIT."
elif command -v rsync &>/dev/null; then
  # Trailing slash on the source copies its CONTENTS into the target (parity
  # with robocopy). Excludes without a leading slash match by name at any depth.
  rsync -a \
    --exclude='.claude/' --exclude='.agents/' --exclude='.codex/' \
    --exclude='.git/'    --exclude='node_modules/' --exclude='dist/' \
    --exclude='docs/' \
    --exclude='CLAUDE.md' --exclude='AGENTS.md' \
    --exclude='*.local'   --exclude='.env*' \
    --exclude='/.husky/pre-push' \
    "$SOURCE_DIR"/ "$TARGET_DIR"/ \
    || error "rsync failed while copying source to the Azure clone."
else
  error "No copy tool found — need robocopy (Windows) or rsync (macOS/Linux)."
fi

# ── 5. Stage the delta ────────────────────────────────────────────────────────
cd "$CLONE_DIR"
trap 'cd "$SOURCE_DIR"' EXIT   # restore caller's dir on any exit

git add "code-apps/$APP_NAME"

# ── 5a. Stage-only: print the delta since last sync, then stop ────────────────
# This is what lets the commit message be written from analysis of the REAL diff
# (last synced state → current state) instead of the source branch's commits.
if [ "$MODE" = "stage" ]; then
  if git diff --cached --quiet; then
    ok "No changes since last sync — nothing to commit."
  else
    echo ""
    echo "  ── Changes since last sync (code-apps/$APP_NAME) ──"
    echo ""
    git diff --cached --stat
    echo ""
    git diff --cached --name-status
    echo ""
    # Source-side changelog since the last sync, derived from the provenance
    # trailer (Source-commit:) of the PREVIOUS Azure commit. This is the raw
    # material for a MEANINGFUL message (what was actually done), not a file list.
    PREV_SRC=$(git -C "$CLONE_DIR" log -E --grep="^Sync-app: $APP_NAME$" -1 --pretty=%B 2>/dev/null \
      | sed -n 's/^Source-commit:[[:space:]]*//p' | head -1)
    if [ -n "$PREV_SRC" ] && git -C "$SOURCE_DIR" cat-file -e "${PREV_SRC}^{commit}" 2>/dev/null; then
      echo "  ── Source commits since last sync (${PREV_SRC}..HEAD) ──"
      echo ""
      git -C "$SOURCE_DIR" log --pretty='  - %s' "${PREV_SRC}..HEAD"
    else
      echo "  ── No provenance trailer on the last Azure commit ──"
      echo "  (first trailer-tracked sync, or pre-trailer baseline — using recent commits)"
      echo ""
      git -C "$SOURCE_DIR" log -n 20 --pretty='  - %s'
    fi
    echo ""
    info "Staged, not committed. Re-run with -m \"<message>\" to commit & push."
  fi
  exit 0
fi

# ── 5b. Commit & push ─────────────────────────────────────────────────────────
if git diff --cached --quiet; then
  ok "No changes detected — Azure DevOps is already up to date."
  exit 0
fi

# Commit message: explicit -m wins; otherwise a stat-based auto-summary.
# (The old "reuse the source branch's last commit subject" behaviour is gone.)
if [ "$MODE" = "commit" ]; then
  MSG="$COMMIT_MSG"
else
  TOUCHED=$(git diff --cached --name-only \
    | sed "s|^code-apps/$APP_NAME/||" | awk -F/ '{print $1}' \
    | sort -u | awk 'NR>1{printf ", "}{printf "%s", $0}')
  NFILES=$(git diff --cached --name-only | wc -l | tr -d ' ')
  MSG="$APP_NAME: sync — $NFILES fichier(s) modifié(s) (${TOUCHED:-divers})"
fi

# Stamp provenance trailers so the NEXT sync (and the drift check) can find
# THIS app's last-synced point. Sync-app names the app — looked up via
# `git log --grep`, which is robust to a multi-app mirror AND to empty marker
# commits (a path filter would miss those). Source-commit pins the source SHA
# used to derive the changelog `git log <Source-commit>..HEAD`.
SRC_SHA=$(git -C "$SOURCE_DIR" rev-parse HEAD 2>/dev/null || true)
if [ -n "$SRC_SHA" ]; then
  git commit -m "$MSG" -m "Sync-app: $APP_NAME
Source-commit: $SRC_SHA" --quiet
else
  git commit -m "$MSG" --quiet
fi
info "Commit: $MSG"

info "Pushing to Azure DevOps..."
if ! git push origin main --quiet; then
  info "Push rejected — pulling remote changes and retrying..."
  git pull origin main --rebase --quiet \
    || error "Rebase failed. Resolve conflicts manually in: $CLONE_DIR"
  git push origin main --quiet \
    || error "Push failed after rebase. Inspect the Azure repo for conflicts."
fi

echo ""
ok "Done! '$APP_NAME' synced → code-apps/$APP_NAME/"
echo ""
