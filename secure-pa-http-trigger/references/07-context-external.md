# 07 — Caller context: external service

Source: §7.4 of the brief.

## Three patterns

| Pattern               | When                                                                                  | Token type   | Flow trigger setting           |
|-----------------------|---------------------------------------------------------------------------------------|--------------|--------------------------------|
| Delegated auth        | Service acts on behalf of a user; flow stays at `Any user in my tenant`               | Delegated    | `Any user in my tenant`         |
| Device code (test/dev)| Quick end-to-end validation of a secured flow. Interactive, zero-secret, ideal for integration tests | Delegated  | `Any user in my tenant`         |
| Client credentials    | Pure daemon, batch worker, server-to-server. **Requires `Specific users in my tenant` with the SPN object ID allow-listed.** **Empirically broken on Self-Host Multitenant URLs (post-30 Nov 2025) — see §11.** | App-only     | `Specific users in my tenant`   |

If you really need pure client_credentials into `Any user in my tenant`, that
is `[Inference]` per §1 — community-confirmed but Microsoft-undocumented.
**On the new `environment.api.powerplatform.com` URL format (Self-Host
Multitenant), client credentials empirically does not work even with
`Specific users + SPN OID` — see §11 for the empirical evidence and the
broker-API workaround.**

In all cases, the token must target `https://service.flow.microsoft.com/`
(Public cloud — see §1 for sovereign clouds). The scope you pass to MSAL
must use the **double-slash trick** `https://service.flow.microsoft.com//.default`
to preserve the trailing slash in `aud` (Entra v2 strips one slash — full
analysis in §11).

## Code templates

`assets/external/invokeFlow.ts` — Node 20+ MSAL `ConfidentialClientApplication`
with:

- token cache with 5-minute leeway before expiry
- one-shot 401 retry with forced refresh
- correlation header `x-correlation-id`
- timeout 15 s
- `validateStatus: () => true` so 4xx codes don't throw before we can read the
  body

Variables you fill in:

| Var               | Source                                                                                  |
|-------------------|------------------------------------------------------------------------------------------|
| `TENANT_ID`       | Entra Directory ID                                                                       |
| `CLIENT_ID`       | App A (single-tenant confidential client) Application ID                                 |
| `CLIENT_SECRET`   | App A client secret — ideally fetched from Key Vault at startup, never committed         |
| `FLOW_URL`        | The v2-OAuth flow URL from the cloned flow's HTTP trigger                                |
| `FLOW_SCOPE`      | `https://service.flow.microsoft.com//.default` (Public cloud — **double slash**, see §11) |

`assets/external/test-device-code.mjs` — Node 20+ MSAL
`PublicClientApplication` using device code flow. Use this for end-to-end test
of the secured flow before wiring real callers. No secret needed; user logs
in interactively in a browser. Handy diagnostic output (decodes the JWT and
warns if `aud` is missing the trailing slash).

App registration prerequisites for the device code script:

1. Standard App A setup (single-tenant, delegated `User → Access Microsoft
   Flow` permission, admin consent granted).
2. **Authentication → Allow public client flows** = Yes.
3. **Authentication → + Add a platform → Mobile and desktop applications**
   with redirect URI `https://login.microsoftonline.com/common/oauth2/nativeclient`.

Both 2 and 3 are required — setting only the toggle yields `invalid_client`
after browser sign-in.

Prefer **certificate** credentials over client secrets for production —
Microsoft explicitly recommends it. Replace `clientSecret` in the MSAL config
with `clientCertificate: { thumbprint, privateKey }`.

## Provisioning App A for an external service

1. Create App A per `references/02-entra-prerequisites.md` §App A.
2. Add a delegated `User` permission for the Flow service (
   `7df0a125-d3be-4c96-aa54-591f83ff541c`) and grant admin consent — even for
   client_credentials calls Microsoft requires the consent path to exist.
3. If using `Specific users in my tenant`: in the flow's HTTP trigger settings,
   add the SPN's **Object ID** (Enterprise Apps → Service principal → Object
   ID — **not** Application ID).

## Test procedure

Run the four-probe matrix (see §03 step 11):

1. anonymous → 401 `DirectApiAuthorizationRequired`
2. valid same-tenant token → 202
3. wrong-tenant token → 401 `MisMatchingOAuthClaims`
4. wrong-audience token (e.g. Graph) → 401 `MisMatchingOAuthClaims`

If using `Specific users + SPN`, also probe:

5. valid same-tenant SPN token whose `oid` is **not** in the allow-list → 403

## Limitations

- Client credentials directly into `Any user in my tenant` is `[Inference]`.
  Don't promise it to leadership without testing in non-prod.
- ROPC (Resource Owner Password Credentials) is **not** a valid path here. If
  you find an example online using ROPC, ignore it — it cannot satisfy MFA
  policies and is broadly deprecated.
- Conditional Access can block both delegated and app-only tokens. If your
  tenant enforces device compliance, exclude App A from those CA policies (and
  document the exclusion) or onboard the calling identity to a compliant
  device pool.
