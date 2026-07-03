#!/usr/bin/env bash
# Runs the automatable verification gates for a Convex remote MCP server in order,
# with a clear PASS/FAIL per gate, and prints the manual gates as reminders.
# NEVER commit on a red gate (see references/tests-verification.md).
#
# Gates run here:
#   GATE 1  static validation        (bun run validate, if defined)
#   GATE 2  Convex push/typecheck     (convex dev --once  | --prod: convex deploy)
#   GATE 6  end-to-end smoke test     (scripts/mcp-smoke-test.sh)
# Manual gates printed (not run): 3 configureOAuth · 4 runtime probes · 5 data hygiene
#                                 · 7 adversarial review · 8 re-verify after fixes
#
# Usage:
#   CONVEX_SITE_URL=https://<deployment>.convex.site \
#   [PROD=1] [AUTHKIT_DOMAIN=https://<slug>.authkit.app] \
#   [MCP_PATH=/mcp] [MCP_TOKEN=<bearer>] [MCP_PROBE_TOOL=<tool>] \
#   ./verify-gates.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE="${CONVEX_SITE_URL:?set CONVEX_SITE_URL, e.g. https://agile-hare-487.convex.site}"
PROD="${PROD:-}"
AUTHKIT="${AUTHKIT_DOMAIN:-<AUTHKIT_DOMAIN>}"
FAILED=0

pass() { printf '  \033[32m✔ PASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31m✗ FAIL\033[0m  %s\n' "$1"; FAILED=1; }
hdr()  { printf '\n\033[1m── %s\033[0m\n' "$1"; }

hdr "GATE 1 — static validation (bun run validate)"
if command -v bun >/dev/null 2>&1 && bun run --silent validate >/tmp/vg-validate.log 2>&1; then
  pass "validate (typecheck + lint + format:check)"
else
  if grep -q '"validate"' package.json 2>/dev/null; then
    fail "validate — see /tmp/vg-validate.log"; tail -8 /tmp/vg-validate.log
  else
    echo "  (no \"validate\" script found — run your typecheck/lint/format manually)"
  fi
fi

hdr "GATE 2 — Convex push/typecheck (the REAL gate; tsc doesn't see codegen/internal.*)"
if [ -n "$PROD" ]; then CONVEX_CMD=(bunx convex deploy); else CONVEX_CMD=(bunx convex dev --once); fi
echo "  running: ${CONVEX_CMD[*]}"
if "${CONVEX_CMD[@]}" >/tmp/vg-convex.log 2>&1; then
  pass "${CONVEX_CMD[*]}"; tail -4 /tmp/vg-convex.log
else
  fail "${CONVEX_CMD[*]} — see /tmp/vg-convex.log"; tail -12 /tmp/vg-convex.log
fi

hdr "GATE 6 — end-to-end smoke test"
if CONVEX_SITE_URL="$SITE" "$SCRIPT_DIR/mcp-smoke-test.sh"; then
  pass "smoke test ran (read the assertions above: 401+WWW-Authenticate is a PASS when anonymous)"
else
  fail "smoke test exited non-zero"
fi

hdr "MANUAL GATES — run these yourself"
cat <<EOF
  GATE 3  one-time per deployment:
            bunx convex run mcp/gateway:configureOAuth '{"authServerUrl":"$AUTHKIT"}'${PROD:+ --prod}
  GATE 4  runtime READ-ONLY probes (before any seed), e.g.:
            bunx convex run mcp/functions:<aReadTool> '{}'${PROD:+ --prod}
  GATE 5  test-data hygiene: seed → probe → delete → rm convex/_cleanup_tmp.ts → redeploy → git status CLEAN
  GATE 7  adversarial review (run LAST, after all fixes committed): invoke the adversarial-pr-review skill
  GATE 8  re-verify after fixes (re-run this script), THEN commit. Never commit on a red gate.
EOF

hdr "RESULT"
if [ "$FAILED" -eq 0 ]; then
  pass "all automatable gates green — proceed to the manual gates"
  exit 0
else
  fail "one or more gates failed — fix before committing"
  exit 1
fi
