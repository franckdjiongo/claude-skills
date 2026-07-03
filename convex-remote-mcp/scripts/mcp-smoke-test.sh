#!/usr/bin/env bash
# Generic smoke test for a Convex remote MCP gateway (Streamable HTTP, MCP 2025-06-18).
#
# Asserts the FULL auth+protocol contract (not just 200s):
#   1. RFC 9728 protected-resource discovery → upstream auth server
#   2. RFC 8414 authorization-server metadata
#   3. initialize → Mcp-Session-Id header OR 401 + WWW-Authenticate (the 401 PROVES
#      the OAuth challenge path works — that is a PASS for an auth-gated server)
#   4. tools/list → the tool names (only reachable with a valid token)
#   5. tools/call <MCP_PROBE_TOOL> → a READ-ONLY, side-effect-free probe
#
# Usage:
#   CONVEX_SITE_URL=https://<deployment>.convex.site \
#   [MCP_PATH=/mcp] [MCP_TOKEN=<bearer>] [MCP_PROBE_TOOL=getCurrentDate] \
#   ./mcp-smoke-test.sh
#
# - CONVEX_SITE_URL : your deployment's .convex.site origin (NO trailing slash). Required.
# - MCP_PATH        : mount path (default /mcp).
# - MCP_TOKEN       : a valid Bearer access token. Without it, expect 401 (auth-gated).
# - MCP_PROBE_TOOL  : a read-only tool to call in step 5. Unset → step 5 is skipped.
#                     NEVER point this at a destructive tool (delete) or one with an
#                     external side effect (sending a notification).
set -euo pipefail

SITE="${CONVEX_SITE_URL:?set CONVEX_SITE_URL, e.g. https://agile-hare-487.convex.site}"
PATH_SEG="${MCP_PATH:-/mcp}"
MCP_URL="${SITE%/}${PATH_SEG}"
TOKEN="${MCP_TOKEN:-}"
PROBE="${MCP_PROBE_TOOL:-}"
ACCEPT='accept: application/json, text/event-stream'   # distinguishes 406 vs 401
AUTH_HEADER=()
[ -n "$TOKEN" ] && AUTH_HEADER=(-H "Authorization: Bearer $TOKEN")

echo "▶ MCP endpoint: $MCP_URL"
echo

echo "── 1. OAuth protected-resource discovery (RFC 9728) ──────────────────────"
curl -sS "${SITE%/}/.well-known/oauth-protected-resource${PATH_SEG}" | head -c 800; echo; echo

echo "── 2. OAuth authorization-server metadata (RFC 8414) ─────────────────────"
curl -sS "${SITE%/}/.well-known/oauth-authorization-server" | head -c 800; echo; echo

echo "── 3. initialize (expect Mcp-Session-Id; 401 here means auth-gated = OK) ──"
# Note the `set -u`-safe array expansion: an empty AUTH_HEADER under `set -u` would
# otherwise error "unbound variable".
INIT_HEADERS=$(curl -sS -D - -o /dev/null -X POST "$MCP_URL" \
  -H 'content-type: application/json' \
  -H "$ACCEPT" \
  "${AUTH_HEADER[@]+"${AUTH_HEADER[@]}"}" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0"}}}')
echo "$INIT_HEADERS" | grep -iE '^HTTP/|^mcp-session-id:|^www-authenticate:' || echo "$INIT_HEADERS" | head -5
SESSION=$(echo "$INIT_HEADERS" | awk 'BEGIN{IGNORECASE=1} /^mcp-session-id:/ {print $2}' | tr -d '\r')
echo

if [ -z "$SESSION" ]; then
  echo "✖ No session id. If you saw 401 + www-authenticate above, auth gating works."
  echo "  Re-run with a valid MCP_TOKEN to exercise tools/list + tools/call."
  exit 0
fi

echo "── 4. tools/list ─────────────────────────────────────────────────────────"
curl -sS -X POST "$MCP_URL" \
  -H 'content-type: application/json' \
  -H "$ACCEPT" \
  -H "mcp-session-id: $SESSION" \
  "${AUTH_HEADER[@]+"${AUTH_HEADER[@]}"}" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | grep -oE '"name":"[a-zA-Z_]+"' | sort -u; echo

if [ -z "$PROBE" ]; then
  echo "ℹ MCP_PROBE_TOOL unset — skipping step 5. Set it to a READ-ONLY tool to probe a call."
  echo "✔ Smoke test complete."
  exit 0
fi

echo "── 5. tools/call $PROBE (read-only, safe) ────────────────────────────────"
curl -sS -X POST "$MCP_URL" \
  -H 'content-type: application/json' \
  -H "$ACCEPT" \
  -H "mcp-session-id: $SESSION" \
  "${AUTH_HEADER[@]+"${AUTH_HEADER[@]}"}" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"$PROBE\",\"arguments\":{}}}" \
  | head -c 800; echo; echo

echo "✔ Smoke test complete."
