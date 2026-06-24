# 02 — Microsoft Entra ID prerequisites

Source: §5 of the brief.

## What you provision

- **App A** — single-tenant confidential client. Always required. Used by:
  - the plugin (Pattern A: as the federated app linked to the UAMI; Pattern B:
    as the broker's caller identity)
  - the custom connector (OAuth 2.0 / Microsoft Entra ID security definition)
  - external services
- **App B** — single-tenant SPA / public client. Required **only** if the MDA
  ribbon button must do direct `fetch` (community fallback in §06). The Custom
  Page recommended path does **not** need App B.

Use single-tenant unless you have a separately justified multi-tenant
requirement.

## Auth-flow choices

### Interactive delegated user (browser apps, MDA buttons, Code App users)

- SPA platform with **authorization code flow + PKCE**.
- `redirect_uri` must exactly match a registered redirect URI.
- Grant admin consent if your tenant blocks user consent.

For direct calls to a protected flow, request the token against
`https://service.flow.microsoft.com//.default` — **double slash before
`.default`**. Entra v2 strips one trailing slash from the resource URI; without
the doubling the issued `aud` has no slash and Power Automate rejects with
`403 MisMatchingOAuthClaims`. See `references/11-known-bugs-and-workarounds.md`
for the full root-cause analysis. Microsoft documents the audience, not a
specific scope token name.

### Non-interactive service principal (daemons, plugins via cert)

- Add credentials with **certificate** (preferred), **federated identity
  credential** (preferred for plugin Managed Identity), or **client secret**
  (last resort, with Key Vault rotation).
- For `Any user in my tenant`, app-only acceptance is `[Inference]` — see §1.
- For pure daemon callers, the production-safe routes are:
  - change the flow to `Specific users in my tenant` and allow-list the SPN
    object ID, **or**
  - put a broker API in front and authenticate the daemon to the broker
    (Pattern B in §04).

### On-behalf-of (OBO)

- Works for **user principals only**. Not for app-only/SPN tokens.
- The incoming token to the middle tier must have an audience of the middle-tier
  API, not the downstream API.
- Direct OBO from a middle tier to the flow itself is `[Inference]`. Safer:
  front end → middle-tier API (OBO) → middle-tier business logic → flow via
  connector or verified path.

### Custom-connector connection

- Set the connector backend resource to `https://service.flow.microsoft.com/`
  when wrapping a flow directly (`[Inference]` per §08).
- Connector creation order: app reg → connector → copy connector redirect URL →
  paste into app reg's Authentication → save connector → create connection.
- For connector managed identity authentication: client app must be
  single-tenant and the connector-generated managed identity must be added as a
  **federated credential** on the Entra app.

## Azure Portal walkthrough

### App A (confidential)

1. https://entra.microsoft.com → **Applications → App registrations →
   + New registration**.
2. Name: `pa-http-trigger-server-prod` (or your conventional name);
   _Single tenant_; redirect URI blank → **Register**. Note Application (client)
   ID and Directory (tenant) ID.
3. **Manage → Certificates & secrets**, prefer:
   - (a) certificate (Upload certificate), or
   - (b) **Federated credentials → + Add credential → Other issuer** for Power
     Platform Managed Identity. Subject:
     `component:pluginassembly,thumbprint:<thumbprint>,environment:<envid>`
     and issuer:
     `https://<env-prefix>.<env-suffix>.environment.api.powerplatform.com/sts`.
   - Client secret only as last resort with Key Vault rotation.
4. **Manage → API permissions → + Add a permission → APIs my organization uses →
   Power Automate** (or _Microsoft Flow Service_) → **Delegated permissions →
   User → Access Microsoft Flow as signed in user → Add permissions → Grant
   admin consent**.

### App B (SPA — only for direct-fetch MDA pattern)

1. New registration `pa-http-trigger-spa-prod`; _Single tenant_.
2. **Manage → Authentication → + Add a platform → Single-page application**.
   Redirect URIs:
   - `https://<org>.crm.dynamics.com`
   - `https://<org>.crm.dynamics.com/WebResources/cont_/blank.html` — a
     one-line HTML web resource (`assets/mda/blank.html`) shipped to keep MSAL
     on the same origin and avoid the model-driven shell mutating
     `window.location` and clobbering MSAL iframe checks (Hájek pattern).
3. **API permissions** as in App A step 4.

## Provisioning automation

- Azure CLI script: `assets/provisioning/provision-app-a.sh`
- Microsoft.Graph PowerShell: `assets/provisioning/provision-app-a.ps1`
- Dataverse `managedidentities` REST POST (Pattern A only):
  `assets/provisioning/managed-identity-record.http`

## Redirect URI rules

| Flow                          | Redirect URI?           |
|-------------------------------|-------------------------|
| Interactive delegated (auth code + PKCE) | **Yes**, exact match   |
| Custom connector              | Generated by the connector → paste into app reg |
| Client credentials (daemon)   | **No**                  |
| OBO                           | No (uses front-end's redirect) |

## Credential selection order

1. **Certificate** — Microsoft recommends over client secret for production.
2. **Workload identity federation (FIC)** — when caller is another trusted
   workload (Power Platform Managed Identity, GitHub OIDC, etc.).
3. **Client secret** — only when the above aren't practical, and only with
   Key Vault rotation.

## Where to verify if a region is missing the audience

For sovereign clouds beyond the table in §1, verify:

- `learn.microsoft.com/en-us/power-automate/oauth-authentication`
- `learn.microsoft.com/en-us/connectors/custom-connectors/azure-active-directory-authentication`

Don't guess audiences from URL patterns.
