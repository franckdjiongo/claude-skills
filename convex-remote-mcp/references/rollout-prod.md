# Phase 5 — Production rollout

**Key principle:** dev and prod are **separate DBs + separate env-stores**, so every
step is re-done explicitly with `--prod`. The audience is computed from
`CONVEX_SITE_URL` → **no code change** between environments.

If the deploy is coupled to Vercel, **a merge to `main` redeploys the MCP backend**:

```json
// vercel.json
{
  "buildCommand": "npx convex deploy --cmd 'npm run build'",
  "outputDirectory": "dist",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Rollout steps

Env vars are the **canonical table in `references/architecture.md`** (do not re-list).

```bash
# 1. (optional) deploy explicitly — otherwise: merge to main
bunx convex deploy

# 2. Prod env vars (copied from dev, same WorkOS tenant; never print the secret)
bunx convex env set MCP_UPSTREAM_ISSUER <AUTHKIT_DOMAIN> --prod
bunx convex env set WORKOS_API_KEY      sk_...           --prod
#    Do NOT set MCP_UPSTREAM_CLIENT_ID / MCP_UPSTREAM_USERINFO_URL (vestigial, not read)

# 3. Prod allowlist (SEPARATE DB; the `add` mutation needs a session → direct import, append)
echo '{"email":"you@example.com","name":"You","role":"admin","addedAt":"2026-01-01T00:00:00.000Z","addedBy":"mcp-prod-setup"}' > prod-user.jsonl
bunx convex import --append --table <ALLOWLIST_TABLE> --yes --prod prod-user.jsonl
rm -f prod-user.jsonl     # email LOWERCASE (matches the lowercased lookup in isEmailAllowed)

# 4. Enable OAuth discovery in prod (internalMutation, one-shot, PERSISTS across redeploys)
bunx convex run mcp/gateway:configureOAuth '{"authServerUrl":"<AUTHKIT_DOMAIN>"}' --prod

# 5. (WorkOS dashboard, manual) MCP resource indicators → add the PROD URL with AND without slash:
#      <DEPLOYMENT_PROD><MCP_PATH>
#      <DEPLOYMENT_PROD><MCP_PATH>/

# 6. Prod smoke test (expect: 401 + WWW-Authenticate; metadata → AuthKit domain)
CONVEX_SITE_URL=<DEPLOYMENT_PROD> ./scripts/mcp-smoke-test.sh

# State checks (idempotent)
bunx convex env list --prod | sed -E 's/=.*/=***/'    # names only
bunx convex data <ALLOWLIST_TABLE> --prod
curl -s <DEPLOYMENT_PROD>/.well-known/oauth-protected-resource<MCP_PATH>
#   "No matching routes found"        = code not deployed
#   "OAuth discovery not configured"  = configureOAuth --prod not run yet
```

**7. claude.ai:** Settings → Connectors → Add custom connector → URL
`<DEPLOYMENT_PROD><MCP_PATH>` → **Advanced OAuth fields EMPTY** → Add → log in with WorkOS
(an allowlisted email) → Authorize. The tools appear. **dev→prod migration: delete the
dev connector first.**

## Rollout pitfalls

- **`configureOAuth` BEFORE adding the connector**, else
  `/.well-known/oauth-protected-resource<MCP_PATH>` → `"OAuth discovery not configured"`
  → can't connect.
- **BOTH resource indicators (slash + no-slash)**, else 401 on every `tools/call` despite
  a successful login (`invalid_target`).
- **dev and prod = separate DBs:** re-seed `<ALLOWLIST_TABLE>`, replay
  `configureOAuth --prod` (the last brick, easy to forget), probe with `--prod`.
- **Allowlist via `convex import --append`, NOT the `add` mutation** (which needs a
  session). Email **lowercase** required.
- **`convex/_cleanup_tmp.ts` is pushed by `convex dev --once`:** delete the FILE **and**
  redeploy, otherwise orphan `internalMutation`s stay live.
- **`actions` referencing `internal.*`** (including their own module) → circular type
  inference; give an explicit `Promise<…>` return type. **This is a DISTINCT site** from
  the `tools: McpToolRegistration[]` array annotation — **two fixes for two different
  circular-inference sites.**
- **`v.id('table')` rejects a foreign id but not a malformed same-table id** → keep the
  `'someUniqueField' in r` guard.
- **`tsc --noEmit` passing ≠ Convex content valid:** you also need `bunx convex dev --once`.
- **The adversarial sentinel is keyed to HEAD:** amending/adding a commit after the
  review invalidates it and re-blocks `gh pr create`. Run the review last.
- **Multi-account git:** use the SSH-alias remote, never HTTPS (else a 404 "Repository
  not found").
- **Merge to `main` = a prod Convex deploy via Vercel:** don't merge a PR with broken
  Convex code thinking it only touches the front-end. The final rollout (WorkOS resource
  indicators + claude.ai connector) has manual steps the CLI can't perform.
