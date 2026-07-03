# Phase 2 — OAuth (WorkOS AuthKit)

The complete, self-contained OAuth contract for the remote MCP server. The
verified-working setup is **WorkOS-direct**: claude.ai discovers WorkOS's OAuth
metadata and registers itself (DCR/CIMD); the gateway points discovery at the AuthKit
domain and **validates the token locally**.

## Table of contents
- [Auth flow, step by step](#auth-flow-step-by-step)
- [WorkOS dashboard configuration](#workos-dashboard-configuration-manual-shared-devprod)
- [Local token verification (the core)](#local-token-verification-the-core)
- [The authorization gate](#the-authorization-gate)
- [configureOAuth — internalMutation, default = issuer](#configureoauth--internalmutation-default--issuer)
- [Well-known routes](#well-known-routes)
- [Bridge mode (non-WorkOS IdP)](#bridge-mode-non-workos-idp)
- [OAuth pitfalls](#oauth-pitfalls)

## Auth flow, step by step

1. claude.ai POST `<MCP_PATH>` → `401 + WWW-Authenticate` → reads the
   **protected-resource metadata** (`/.well-known/oauth-protected-resource<MCP_PATH>`),
   whose `authorization_servers` points at the **WorkOS AuthKit domain**.
2. claude.ai discovers WorkOS's OAuth metadata, **registers dynamically** (DCR/CIMD — a
   public PKCE client, no secret), logs in (redirect `https://claude.ai/api/mcp/auth_callback`).
3. WorkOS issues a **resource-bound JWT access token** (`aud = <DEPLOYMENT><MCP_PATH>`).
4. `resolveIdentity` **validates the JWT locally against the upstream JWKS** — RS256 via
   `crypto.subtle` (no `jose` dependency) + `iss`/`aud`/`exp`. We do **NOT** call
   userinfo (a resource-bound token is rejected there).
5. The token carries `sub` but not necessarily `email` → email resolved via the
   **Management API** (per-isolate cache, 10-min TTL, successes only) then checked
   against the allowlist in `authorize`. **Exception:** a token with `email` +
   `email_verified:true` → trusted directly; Management API and `WORKOS_API_KEY` are
   skipped for that request.

## WorkOS dashboard configuration (manual, shared dev+prod)

```
1. Domains → note the AuthKit domain: <AUTHKIT_DOMAIN>   (= ISSUER)
2. Connect → Configuration → MCP Auth → Enable
   → "Dynamic Client Registration" AND "Client ID Metadata Document" = Enabled
   → default scopes: openid profile email offline_access
3. Connect → Configuration → MCP resource indicators → Edit MCP resources
   → add the URL WITH AND WITHOUT the trailing slash (BOTH forms):
        <DEPLOYMENT><MCP_PATH>
        <DEPLOYMENT><MCP_PATH>/
4. Developer → API Keys → copy the Secret Key (sk_...)
```

> No manual "Application" / redirect-URI: claude.ai registers its own client via DCR. A
> **manual** WorkOS app `client_id` is rejected → `application_not_found` at
> `/oauth2/authorize`.

## Local token verification (the core)

In `verifyAccessToken` (see `assets/templates/gateway.ts`):

- Split into 3 parts; require `alg === 'RS256'` and a string `kid`; import the JWK via
  `crypto.subtle.importKey('jwk', {kty,n,e,alg:'RS256',ext:false}, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify'])`, then `crypto.subtle.verify`.
- **Mandatory claims:** `iss` (compared via `issuerMatches`, slash-insensitive), `exp`
  (60 s leeway, `nbf` honored when present), and **`aud`** confined to
  `audiences = [`${site}<MCP_PATH>`, `${site}<MCP_PATH>/`]`.
- **JWKS:** `resolveJwksUri` reads `jwks_uri` from `${issuer}/.well-known/openid-configuration`,
  else falls back to `${issuer}/oauth2/jwks`; `MCP_UPSTREAM_JWKS_URI` overrides. Cache
  1 h; forced refetch on a **kid miss** rate-limited to 1/60 s; a failed fetch falls
  back to the last good keys (never poisons the cache).
- **Fail closed:** `null` if `MCP_UPSTREAM_ISSUER` or `CONVEX_SITE_URL` is missing, or
  the token isn't a JWT → 401. Guard `audiences.length > 0`.

## The authorization gate

`authorize` (see `assets/templates/gateway.ts`):

```ts
// Only a VERIFIED email is trusted. Test each candidate claim independently as a
// string so a non-string `email` can't short-circuit the fallback. No
// `preferred_username` fallback — that is unverified and spoofable.
const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : undefined
if (!email) return { allowed: false, reason: 'No verified email resolved for this token.' }
const result = await runQuery(internal.mcp.functions.isEmailAllowed, { email })
if (!result.allowed) return { allowed: false, reason: `Email ${email} not allowed.` }
return { allowed: true }
// A future read-only mode is a one-liner here: if (args.toolMetadata?.write) deny.
```

The allowlist gate lives in `authorize` (resolved once), **not per-tool** — a dispatched
tool **cannot read the caller** (`ctx.auth` is stripped at the component boundary), and
an `identityArg` accepted from caller-supplied args would be spoofable (Phase 3).

## configureOAuth — internalMutation, default = issuer

`configureOAuth` is an **`internalMutation`** (NOT a public mutation) → only the trusted
CLI can run it (`convex run` can invoke `internal*` fns), consistent with the
"everything is `internal*`" theme. It calls `gateway.setOAuthConfig`.

**Its default is `MCP_UPSTREAM_ISSUER`, NOT `CONVEX_SITE_URL`** — pointing discovery at
our own origin would route clients to `/oauth/register` (503 without a bridge client
id). One-shot, idempotent, **persists across redeploys** (written to DB, not the
bundle). Until it runs, `/.well-known/oauth-protected-resource<MCP_PATH>` returns
`"OAuth discovery not configured"`.

```bash
bunx convex run mcp/gateway:configureOAuth '{"authServerUrl":"<AUTHKIT_DOMAIN>"}'
```

## Well-known routes

In `convex/http.ts` (see `assets/templates/http.ts`):

- `pathPrefix: '/.well-known/oauth-protected-resource/'` (RFC 9728) — **only the
  suffixed form** (`…<MCP_PATH>`) is served; the bare form would advertise the site root
  as the resource (rejected). claude.ai reads the URL from the
  `WWW-Authenticate: resource_metadata=…` header.
- `/.well-known/oauth-authorization-server` (RFC 8414) — **inert in WorkOS-direct**;
  exact override object:

```ts
gateway.serveAuthorizationServerMetadata(ctx, req, {
  upstreamIssuer,
  registrationPath: '/oauth/register',
  overrides: { issuer: upstreamIssuer },   // issuer MUST match the `iss` of the tokens
})
```

- `/oauth/register` (RFC 7591) — DCR shim, **inert in WorkOS-direct**, returns 503
  without `MCP_UPSTREAM_CLIENT_ID` (fail closed).

## Bridge mode (non-WorkOS IdP)

Only a **resource-bound JWT access token** is accepted. **REJECTED (fail closed, 401):**
**opaque** tokens; tokens with **`aud = client_id`**. Fronting a non-JWT / non-RFC-8707
IdP lets **login succeed** but **every MCP call returns 401**. The email→allowlist via
Management API is **WorkOS-specific** (`sub` = WorkOS user id): a non-WorkOS IdP
(Auth0/Clerk/Pocket-ID) **must** mint `email` + `email_verified:true`, otherwise
`authorize` denies everything after login. Set `MCP_UPSTREAM_JWKS_URI` /
`MCP_UPSTREAM_CLIENT_ID` only in this mode.

## OAuth pitfalls (lived through)

- **`application_not_found`**: a manual-app `client_id` → enable DCR/CIMD, let claude.ai
  create its own client.
- **`invalid_target`**: the registered resource indicator (`…<MCP_PATH>/`) ≠ what
  claude.ai sends (`…<MCP_PATH>`) → register **both forms** in WorkOS **and** accept both
  in `audiences`.
- **userinfo rejects the token**: a resource-bound token isn't accepted at userinfo →
  use **local JWKS validation** (`USERINFO_URL` is vestigial).
- **Wrong well-known path (client/debug pitfall)**: fetching metadata at the **bare**
  `/.well-known/oauth-protected-resource` instead of the **suffixed**
  `/.well-known/oauth-protected-resource<MCP_PATH>`. The server mounts ONLY the suffixed
  form. When debugging a client, always target `…/oauth-protected-resource<MCP_PATH>`.
- **`HTTP 406` on the anonymous POST** = an `Accept`-header artifact (see Phase 4), not a
  broken gateway.
