# 11 — Known bugs, gotchas, and workarounds

Empirically discovered while debugging real flows. Read this **before** writing
any sample — it short-circuits the most painful failure modes.

## Critical: Entra v2 strips the trailing slash from `aud`

### Symptom

You did everything right per Microsoft Learn — App registered, admin consent
granted, scope `https://service.flow.microsoft.com/.default`, flow set to
`Any user in my tenant`, valid same-tenant delegated user token — and you
still get:

```
HTTP 403
{"error":{"code":"MisMatchingOAuthClaims","message":"One or more claims either missing or does not match with the open authentication access control policy."}}
```

The flow does **not** appear in Run history (rejection happens before the flow
runs).

### Root cause

Microsoft Learn (`oauth-authentication`) mandates `aud =
https://service.flow.microsoft.com/` with **trailing slash**. But Entra v2's
token endpoint **strips trailing slashes** from the resource URI when you pass
`scope=https://service.flow.microsoft.com/.default`. The resulting token has:

```
"aud": "https://service.flow.microsoft.com"   ← no slash
```

Power Automate's claim validator does an exact-string match on `aud` and
rejects. This affects **all callers on the new
`environment.api.powerplatform.com` URL format** (Self-Host Multitenant,
post-30 Nov 2025). It may have been more lenient on the legacy
`logic.azure.com` endpoint, which is part of why this trips so many people.

### Fix — double slash in the scope

Pass the scope with a **double slash** before `.default`:

```
scope = "https://service.flow.microsoft.com//.default"
```

Entra trims one slash, leaving `https://service.flow.microsoft.com/` as the
resource. The issued `aud` claim then contains the required trailing slash.

Apply this in **every** sample that targets the Flow service audience:

| Caller             | Where to apply                                                              |
|--------------------|-----------------------------------------------------------------------------|
| Plugin (Pattern A) | `IManagedIdentityService.AcquireToken("https://service.flow.microsoft.com//.default")` |
| Plugin (MSAL.NET)  | `app.AcquireTokenForClient(new[] { "https://service.flow.microsoft.com//.default" })` |
| Code App (connector path) | Set on the connector's `resourceUri` — slash already correct there |
| External Node script | `scopes: ["https://service.flow.microsoft.com//.default"]`              |
| Custom connector   | `resourceUri: https://service.flow.microsoft.com/` (single slash, the connector framework doesn't strip it) |

**Sovereign clouds:** apply the same double-slash trick to the cloud-specific
audience (e.g. `https://gov.service.flow.microsoft.us//.default` for GCC).

### How to verify

Decode the token at https://jwt.ms (or `Buffer.from(jwt.split('.')[1],
'base64url').toString()`) and confirm `aud` ends in `/`. If yes, the call will
either succeed or fail for a different reason (502 NoResponse, etc.) — but
not 403 `MisMatchingOAuthClaims`.

### Sources

- Meenavalli, "How to invoke a flow with OAuth authentication HTTP trigger"
- Reshmee Auckloo, "Triggering a Power Automate HTTP Trigger from External Apps"
- Honza Hájek, "Dynamically executing Power Automate flows from client" (May 2025)
- Microsoft Q&A: "Power Automate OAuth2 with HTTP Trigger"

---

## App-only client credentials no longer work on Self-Host Multitenant URLs

### Symptom

Client-credentials (app-only) token + `Specific users in my tenant` + SPN
Object ID allow-listed → **403 `MisMatchingOAuthClaims`** consistently. The
SPN OID matches the allow-list, the audience is correct (after the
double-slash fix), but the call is still rejected.

Switching the scope to `https://api.powerplatform.com/.default` returns 500
`InternalServerError` instead — call is still not reaching the flow.

### Empirical finding (2026-05)

The new `environment.api.powerplatform.com/powerautomate/automations/direct/...`
URL format does **not** accept pure app-only tokens, regardless of the trigger
setting (`Any user` or `Specific users + SPN OID`). This contradicts community
guidance that was correct for the legacy `logic.azure.com` endpoint and is
flagged as `[Inference]` in the brief — but on the new architecture, it
empirically does **not** work.

### Workaround for daemon callers

If you absolutely need a daemon to call the flow:

- **Pattern B (broker API)** — Stand up a thin API that authenticates the daemon
  via client_credentials, then invokes the flow with a delegated token (or via
  a custom connector). This is now the only Tier-1 daemon path.
- **Pattern C (delegated service account)** — Provision a non-MFA service user
  account, store the credentials in Key Vault, and use the auth-code flow with
  a refresh token. Less safe than Pattern B but simpler for low-risk scenarios.
- **Custom connector with managed-identity auth** — The connector handles the
  token; the daemon just invokes the connector. See §08.

If you only need to test/develop, use **device code flow** (interactive
delegated) — see §07.

---

## HTTP trigger without a Response action returns 502

### Symptom

You finally get past the 403, but now you get:

```
HTTP 502
{"error":{"code":"NoResponse","message":"The server did not receive a response from an upstream server."}}
```

The flow **does** run successfully (Run history shows it), but the caller gets
502.

### Root cause

The HTTP trigger waits synchronously for the flow to return a response. If the
flow has no explicit **Response** action (the Request connector's `Response`
action), Power Automate eventually times out the upstream wait and returns 502.

### Fix — two options

**Option A (synchronous response).** Add a **Response** action to the flow:

- Status Code: `200` (or whatever applies)
- Headers: `Content-Type: application/json`
- Body: `{"status": "ok"}` (or the actual payload the caller expects)

The caller then receives the body inline. Use this when the caller needs a
synchronous result.

**Option B (asynchronous trigger).** On the HTTP trigger:

- Open the trigger → Settings → enable **Asynchronous Response**
- Save

The caller receives `202 Accepted` immediately with a `Location` header
pointing at a status URL it can poll. Use this when the flow takes longer than
~30 s or the caller doesn't need the result inline.

---

## URL regeneration nuances

The trigger URL regenerates **only** when toggling between `Anyone` and an
authenticated mode (`Any user in my tenant` or `Specific users in my tenant`).
Switching **between** the two authenticated modes does **not** change the URL.
This matters for cutover planning:

| Transition                                            | URL changes? |
|-------------------------------------------------------|--------------|
| `Anyone` → `Any user in my tenant`                    | **Yes**      |
| `Anyone` → `Specific users in my tenant`              | **Yes**      |
| `Any user in my tenant` ↔ `Specific users in my tenant` | **No**     |
| `Any user in my tenant` → `Anyone` (rollback)         | **Yes** — and the new SAS URL is **different** from the original |
| `Anyone` → `Anyone` (re-save)                         | **No** unless you regenerate the SAS key |

So once you've cut over to OAuth, you can safely toggle between `Any user` and
`Specific users` without breaking callers — useful for tightening access mid-
flight.

---

## Public-client app registration prerequisites for testing

If you're using device code flow or any other public-client pattern (auth code
without secret, ROPC, integrated Windows auth) to test, the App registration
needs **two** things, not one:

1. **Authentication → Advanced settings → "Allow public client flows" = Yes**
2. **Authentication → + Add a platform → Mobile and desktop applications** with
   the redirect URI `https://login.microsoftonline.com/common/oauth2/nativeclient`

Setting only #1 produces `invalid_client` after the user successfully signs in
in the browser. Both are required.

(For confidential-client patterns — client_credentials with a secret or
certificate — neither setting applies.)

---

## Don't confuse App Registration display name with Enterprise Application display name

These are two views of the same underlying app, but they can be renamed
independently. If you've ever renamed one of them, the breadcrumbs in Entra
will show different names and you can easily end up configuring auth on the
wrong app while your script targets a different `client_id`.

**To verify you're configuring the right app:** Open the App Registration's
**Overview** page and confirm the **Application (client) ID** matches what
your script uses (e.g. the `appid` claim in the JWT, or the `CLIENT_ID` env
var).
