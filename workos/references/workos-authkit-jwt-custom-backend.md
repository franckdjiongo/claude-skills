# AuthKit access tokens in a custom backend (Convex, custom JWKS verifier) — field-tested pitfalls

Battle-tested on 2026-07-11 (second-brain V5, AuthKit React SPA + Convex; commits
dc2dcf4/e48a61b in that repo). Every rule below was a REAL failure that cost a
debugging round. Read this whenever a project verifies AuthKit access tokens
itself (Convex `auth.config.ts`, any JWKS middleware) or debugs a login loop /
403 after an apparently-successful WorkOS sign-in.

## The 15-second triage table

| Symptom | Cause | Fix (below) |
| --- | --- | --- |
| CORS error on `POST api.workos.com/user_management/authenticate` | SPA origin not allowlisted | §1 |
| Backend loops "No auth provider found matching the given token" | issuer mismatch — tokens carry the ENVIRONMENT client id, not the app's | §2 |
| Backend/platform refuses an issuer-only provider for `https://api.workos.com/` | shared issuer requires audience check, but AuthKit tokens have NO `aud` | §3 |
| Auth accepted but guard rejects "email not verified / missing email" | access tokens carry NO `email`/`email_verified` claims by default | §4 |
| Claims ARE in the token but the guard still rejects | verifier exposes claims verbatim (`email_verified` stays snake_case) | §5 |
| Works on localhost, login-LOOPS on the deployed domain (~1.4s cycles; backend logs alternate authed successes / UNAUTHENTICATED failures) | non-localhost sessions ride a THIRD-PARTY cookie; refresh 401s when the browser blocks it | §6 |

## 1. CORS — the SPA does the PKCE exchange in the browser

`@workos-inc/authkit-react` calls `api.workos.com/user_management/authenticate`
with a direct browser `fetch()`. The calling origin (e.g. `http://localhost:5173`,
the production domain) must be allowlisted in the WorkOS dashboard's
Authentication area under Sessions → CORS — SEPARATELY from the Redirect URIs.
Docs: https://workos.com/docs/user-management/client-only

## 2. The real issuer is the ENVIRONMENT client id — not the application's

The docs and templates (including the official Convex+AuthKit guide) suggest
`iss = https://api.workos.com/user_management/<clientId>` where `<clientId>` is
the app client the SDK uses. In reality the minted access token can carry the
WorkOS **environment** client id — a DIFFERENT `client_...` value (observed:
app used `client_01KWHE890…`, tokens carried
`iss=https://api.workos.com/user_management/client_01KWHCY66X…`). The AuthKit
domain's OIDC discovery issuer is a THIRD value and does not match either.

**Never trust the documented issuer — capture the real one**: temporarily log
the decoded claims (names + `iss`/`aud` ONLY, never the raw token) inside the
SPA's token callback (e.g. the `fetchAccessToken` adapter), read the console,
remove the log. Do NOT try to monkeypatch `WebSocket`/`fetch` from a browser
extension — extension JS runs in an isolated world and never sees the page's
prototypes.

Convex shape (parameterized, fail-closed):

```ts
const issuerClientId = process.env.WORKOS_ISSUER_CLIENT_ID; // environment client
...(issuerClientId ? [{
  type: "customJwt" as const,
  issuer: `https://api.workos.com/user_management/${issuerClientId}`,
  algorithm: "RS256" as const,
  jwks: `https://api.workos.com/sso/jwks/${issuerClientId}`,
}] : []),
```

Sanity-check the JWKS URL serves keys before deploying (`curl … | jq .keys`).

## 3. No `aud` claim — and shared issuers demand one

AuthKit access tokens carry NO `aud`. Convex refuses a provider on the shared
issuer `https://api.workos.com/` without `applicationID` ("issuer shared among
many applications"), and WITH `applicationID` it checks `aud === applicationID`
→ AuthKit tokens can never match that form. Use the
`user_management/<environment client>` issuer form from §2 instead; signature
verification against the client-scoped JWKS carries the security.

## 4. No `email`/`email_verified` claims by default → JWT Template

Default claims are only `iss,sub,sid,jti,auth_time,client_id,exp,iat`. Any
email-allowlist guard needs a JWT Template (dashboard → Authentication →
Features → JWT Template):

```json
{
  "email": {{ user.email }},
  "email_verified": {{ user.email_verified }}
}
```

NO quotes around the interpolations — the engine types the values itself.
Docs: https://workos.com/docs/authkit/jwt-templates
Tokens are short-lived (~5 min): after saving, a reload (or sign-out/in)
picks the new claims up quickly.

## 5. Convex customJwt exposes claims VERBATIM

`ctx.auth.getUserIdentity()` on a customJwt provider does NOT remap snake_case
OIDC claims: `identity.email_verified === true` while `identity.emailVerified`
is undefined (same token). Guards must accept BOTH casings — and note that
`convex-test`'s `withIdentity()` populates the camelCase form, so tests pass
while production rejects unless both are read:

```ts
const raw = identity as unknown as Record<string, unknown>;
const emailVerified = identity.emailVerified === true || raw.email_verified === true;
```

## 6. `devMode` is hostname-magic — production domains silently switch to third-party cookies

authkit-js defaults `devMode = (hostname === "localhost" || "127.0.0.1")` and
derives `useCookie = !devMode`. The two modes are STRUCTURALLY different:

- `devMode=true` (localhost): refresh token in localStorage, sent in the POST
  body of the refresh grant. Self-contained; always works.
- `devMode=false` (any real domain): the refresh token is NEVER sent in the
  body — the session rides an HttpOnly cookie set by `api.workos.com`, which
  is a THIRD-PARTY cookie from the app's origin. Browser blocks it (Chrome
  third-party-cookie policy, incognito) ⇒ every refresh 401s (`RefreshError`)
  ⇒ SDK wipes the session and fires `onRefreshFailure` ⇒ an
  `onRefreshFailure: signIn()` handler produces a full redirect loop at
  ~1.4s (the SDK's internal refresh scheduler ticks every 1s).

Field signature (observed 2026-07-11, second-brain prod): dev flawless,
prod loops; the backend logs show the SAME queries alternating
authenticated-success / UNAUTHENTICATED-failure every ~1.4s (auth is
established, then dies at the first refresh). CORS probes pass (the cookie,
not CORS, is the blocker — verify with an OPTIONS preflight before blaming
CORS).

Fix (official, from the client-only docs): **"If you have not set up a custom
authentication domain in WorkOS, set `devMode={true}` on
`<AuthKitProvider />`"** — localStorage refresh tokens on every domain. The
clean production exit is a custom auth domain (CNAME, e.g.
`auth.<apex>`) + the `apiHostname` prop, making the session cookie same-site.
Docs: https://workos.com/docs/user-management/client-only

## 7. Debug hygiene

- The verifier's auth-failure retry loop (e.g. Convex WS reconnect) re-hits
  `user_management/authenticate` every few seconds. Park/close the tab while
  reconfiguring — pointless load against WorkOS rate limits.
- Read the SERVER's view with the platform's function logs (e.g.
  `bunx convex logs --history N`): the guard's exact error message tells you
  which branch rejected.
- One controlled reproduction beats a running loop: load once, capture, park.
