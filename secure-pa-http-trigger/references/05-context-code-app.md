# 05 — Caller context: PowerApps Code App

Source: §7.2 of the brief. Code Apps reached **GA on 5 February 2026**.

## Why custom connector is mandatory

The Microsoft Power Platform Blog post _"Generally available: host and run code
apps in Power Apps"_ (Jordan Chodak, 2026-02-05) states:

> Zero-config authentication through Microsoft Entra ID — no custom auth flows
> to build · Built-in connector authorization with automatic consent flows ·
> DLP policy enforcement at runtime — protecting your data without code
> changes.

The `@microsoft/power-apps` SDK exposes only `initialize()`; it does **not**
expose a public `getAccessToken()` API.

Effective **30 January 2026**, Microsoft Message Center notice **MC1218747**
introduced strict CSP enforcement for Code Apps — requests to non-Power-Apps
domains are blocked by default. `service.flow.microsoft.com` is **not** a
Power Apps domain.

The Power Apps team's February 2026 Office Hours guidance
(powerappsguide.com): _"The team recommends using the connector framework. …
wrapping an Azure Function in a custom connector is a viable GA path."_ The
same applies to wrapping an HTTP-triggered flow.

## Architecture

```
Code App (Vite + React + TypeScript)
   └─ generated TS service from `pac code add-data-source --apiId shared_<connector>...`
       └─ Power Apps host injects auth → Connector runtime
           └─ HTTPS to Power Automate flow trigger (aud=service.flow.microsoft.com, delegated user)
```

## Step-by-step (recommended)

1. Build the custom connector per `references/08-connector-wrapper.md`.
2. In **make.powerapps.com → Connections → + New connection**, create a
   connection to the connector once.
3. In the Code App project:
   ```bash
   pac connection list
   pac code add-data-source -a "shared_yourconnector" -c "<connectionId>"
   ```
   This generates `src/Models/YourConnectorModel.ts` and
   `src/Services/YourConnectorService.ts`.
4. Wire up React. Templates:
   - `assets/code-app/PowerProvider.tsx` — calls `initialize()` from
     `@microsoft/power-apps/app` and gates render until ready.
   - `assets/code-app/InvokeFlowButton.tsx` — invokes
     `YourConnectorService.TriggerFlow(...)` with a correlation ID.

## Direct-fetch SPA fallback (community pattern, NOT recommended)

If a custom connector is genuinely impossible:

1. Add `https://service.flow.microsoft.com` to the environment **Content
   Security Policy** allowlist via PPAC → Environment → Content Security Policy
   or `Set-CodeAppContentSecurityPolicy` PowerShell.
2. Acquire a token using `@azure/msal-browser` against a dedicated SPA app
   registration.

Microsoft does not currently publish the exact delegated scope name for this
feature, so the scope is kept as configuration. `[Inference]`

Template: `assets/code-app/flowToken-fallback.ts` (full SPA helper with retry).

## Configuration checklist

- [ ] **Code Apps** feature toggled on in PPAC → Environment → Settings →
      Features.
- [ ] Custom connector exists and a Connection is created in
      `make.powerapps.com`.
- [ ] `power.config.json` includes `"region": "prod"` (works around the known
      `Invalid URI format` in `pac code add-data-source`).
- [ ] CI uses the new node-based CLI (`pac code` is being deprecated per
      March/April 2026 Office Hours).
- [ ] Connection References used for cross-environment ALM (PAC CLI ≥ 1.51.1,
      December 2025).
- [ ] If using direct-fetch fallback: `https://service.flow.microsoft.com`
      added to environment CSP allowlist via PPAC.

## Test procedure

- Local: `npm run dev`, then open the **Play URL** emitted by `pac code init`
  in the **same browser profile** signed into the tenant. A different profile
  or incognito breaks auth.
- Click the button → expect 202 → flow Run history shows triggered-by =
  signed-in user.
- For SPA fallback verify:
  1. first run prompts or signs in correctly,
  2. subsequent runs succeed silently from cache where tenant policy allows,
  3. a forced token-expiry test triggers the 401 refresh path,
  4. a wrong resource scope produces an invalid-audience or similar auth
     failure,
  5. connection-reference based environments resolve the right backend in
     dev/test/prod.

## Limitations and support status

Microsoft's current code-app docs strongly support **connector-based access**
and document that the host manages end-user auth and connector services. They
do **not** document a first-class host API for "give me the current raw Flow
access token", so a direct `fetch` pattern is `[Inference]` even though it uses
standard Entra SPA auth. If you want the cleanest production support story,
use a custom connector instead.

## Licensing note

Effective 2 January 2026, the Power Apps per app SKU is no longer available
for purchase by new customers. Power Apps Premium ($20/user/month) is the
licensing path for end-users of Code Apps.
