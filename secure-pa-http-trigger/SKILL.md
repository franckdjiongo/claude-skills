---
name: secure-pa-http-trigger
description: |
  Secures a Power Automate "When an HTTP request is received" flow by migrating it
  from the legacy "Anyone" setting to "Any user in my tenant" with Microsoft Entra
  ID bearer-token auth, and rewires every caller (Dataverse C# plugin, PowerApps
  Code App, Model-Driven app ribbon button or custom page, external service) to
  send the right token. Use this skill whenever the user mentions: securing /
  locking down / protecting a Power Automate HTTP trigger or HTTP-triggered flow,
  switching off "Anyone" / SAS-only, getting DirectApiAuthorizationRequired or
  MisMatchingOAuthClaims errors, calling a flow from a plugin / code app / ribbon
  button / external API, or the audience https://service.flow.microsoft.com/.
  Also triggers on phrases like "I built a flow with HTTP trigger, how do I
  secure it", "make my flow auth-only", "my flow URL is exposed", "use Entra
  token to call my Power Automate flow", "OAuth my Power Automate flow", or
  "custom connector wrapper for a flow". The user describes the flow they built,
  what they want to do with it, and how it will be called; the skill returns a
  concrete recommendation, the exact migration steps, and customised, ready-to-use
  scripts (C# plugin Pattern A or B, OpenAPI 2.0 custom-connector wrapper YAML,
  TypeScript / JS samples for code apps and ribbon buttons, and Azure CLI /
  PowerShell app-registration provisioning).
---

# Secure Power Automate HTTP-Triggered Flows

This skill helps migrate a Power Automate `When an HTTP request is received`
flow from the open `Anyone` setting to authenticated `Any user in my tenant`,
and rewires the callers. It is grounded entirely in the brief stored under
`references/`. Load only the sections you actually need.

## Why this matters

`Anyone` makes the flow URL anonymously callable by anyone who has it. The
modern `Any user in my tenant` setting forces every request to carry
`Authorization: Bearer <jwt>` whose `aud` is exactly
`https://service.flow.microsoft.com/` (Public cloud, **trailing slash
mandatory**; sovereign clouds differ — see §1 of
`references/01-protocol-and-claims.md`).

> **The trailing-slash trap (read §11 first).** Entra v2's token endpoint
> silently strips the trailing slash from `https://service.flow.microsoft.com/`
> when you request `.default`. The resulting token's `aud` is
> `https://service.flow.microsoft.com` (no slash) and Power Automate rejects
> with `403 MisMatchingOAuthClaims`. The fix is a **double slash** in the
> scope: `https://service.flow.microsoft.com//.default`. This bites every
> caller — every sample in this skill applies the doubling.

Switching the setting **regenerates the URL** and **immediately invalidates
every legacy caller**. There is no in-place coexistence. So the migration is
always a clone-and-cut, with a Dataverse environment variable holding the URL
so callers swing in one flip.

## Intake — three questions

Ask only those that are unclear; never re-ask what the user already gave you.

1. **What does the flow do?** — surfaces secure inputs/outputs and PII concerns.
2. **What is the caller context?** — pick exactly one:
   `dataverse-plugin`, `code-app`, `mda-button`, `external-service`. Multiple
   callers means do the workflow once per caller.
3. **What environment / cloud?** — Public / GCC / GCC High / China / DoD. Affects
   the audience value (table below). Default to Public if the user doesn't say.

## Workflow

Do these in order. Read each reference only when it applies.

1. **Always:** read `references/01-protocol-and-claims.md`. The protocol contract
   is the same regardless of caller, and you cannot generate a working sample
   without it.
2. **Always:** read `references/02-entra-prerequisites.md`. App A is always
   needed; App B (SPA) only when the user insists on direct-fetch from MDA
   ribbon JS — rare, and not the default recommendation.
3. **One of, depending on caller:**
   - `dataverse-plugin` → `references/04-context-plugin.md`
   - `code-app` → `references/05-context-code-app.md`
   - `mda-button` → `references/06-context-mda-button.md`
   - `external-service` → `references/07-context-external.md`
4. **If the chosen path uses a custom connector** (mandatory for `code-app`,
   recommended for `mda-button`, optional otherwise): read
   `references/08-connector-wrapper.md`.
5. **Always:** read `references/03-migration-procedure.md`. The 12-step cutover
   doesn't change; quote the relevant steps with the user's flow name filled in.
6. **Skim:** `references/09-troubleshooting.md` so you can pre-empt the errors
   they're most likely to hit.
7. **Always:** read `references/11-known-bugs-and-workarounds.md` before
   emitting any code that requests a Flow service token. The `aud` trailing-
   slash bug (Entra v2 strips it → 403 `MisMatchingOAuthClaims`) bites every
   caller and the workaround is non-obvious. Also covers the 502 `NoResponse`
   gotcha (no `Response` action on the trigger), the empirical failure of
   client_credentials on Self-Host Multitenant URLs, and the public-client
   prerequisites for device code testing.
8. **Optional:** `references/10-recent-developments.md` for 2025-2026 platform
   changes and `[Inference]` flags.

## What to deliver — always all three

### 1. Recommendation paragraph

Two to four sentences. State target trigger setting, chosen pattern (e.g.
"Pattern A: Managed Identity direct call" or "Custom connector wrapper"), and
why it fits their context. If their stated path is suboptimal, say so and offer
the better alternative — but execute what they asked for unless they accept the
alternative.

### 2. Numbered migration steps

Concrete steps with the flow name, environment, and tenant filled in. Don't
emit raw `<tenant-id>` placeholders. If a value is missing, ask once in this
same response (don't trickle one question at a time).

### 3. The customised script(s)

Read the matching template from `assets/<context>/...`, fill in known values
(flow name, tenant ID, audience, scopes, redirect URIs), and output the
result inline. Anything still unknown stays as a clearly-named placeholder
like `${TENANT_ID}` with a note on where to get it.

Canonical assets per caller:

- **dataverse-plugin** →
  - `assets/plugin/InvokeFlowPlugin.cs` (Pattern A, default — Managed Identity
    direct call, GA 2025-06-15)
  - `assets/plugin/SecureFlowBrokerPlugin.cs` (Pattern B, conservative — broker
    API, no `[Inference]`)
  - `assets/plugin/PluginAssembly.csproj.snippet`
- **code-app** →
  - `assets/code-app/PowerProvider.tsx`
  - `assets/code-app/InvokeFlowButton.tsx`
  - `assets/code-app/flowToken-fallback.ts` (only when CSP allowlist is in place)
- **mda-button** →
  - `assets/mda/InvokeFlowPage.js` (recommended — opens custom page that calls
    the connector)
  - `assets/mda/InvokeFlowDirect.js` (community fallback — direct fetch)
  - `assets/mda/blank.html` (companion redirect page for the fallback)
- **external-service** →
  - `assets/external/invokeFlow.ts` (Node 20+ MSAL ConfidentialClient — production)
  - `assets/external/test-device-code.mjs` (Node 20+ MSAL PublicClient device
    code — for end-to-end test of a secured flow before wiring production
    callers; decodes the JWT, warns if `aud` is missing the trailing slash)

The custom-connector wrapper:

- `assets/connector/apiDefinition.swagger.yaml` (primary OpenAPI 2.0)
- `assets/connector/apiDefinition.envvar.swagger.yaml` (env-parameterised
  variant — preserves SAS query for legacy URL bridging)

Entra app-registration provisioning:

- `assets/provisioning/provision-app-a.sh` — Azure CLI
- `assets/provisioning/provision-app-a.ps1` — Microsoft.Graph PowerShell
- `assets/provisioning/managed-identity-record.http` — Dataverse REST POST for
  the `managedidentities` record (Pattern A only)

## Decision shortcuts

If everything else is on fire, use this table directly. Source: §2 of the brief.

| Caller context           | Use…                                                                              | Custom connector?        | Token type                                |
|--------------------------|-----------------------------------------------------------------------------------|--------------------------|-------------------------------------------|
| Dataverse C# plugin      | Pattern A: Managed Identity (FIC). Fallback: MSAL.NET cert. Or Pattern B: broker. | No                       | App-only                                   |
| PowerApps Code App       | Custom connector (mandatory after CSP enforcement 2026-01-30, MC1218747).         | **Yes**                  | Delegated, connector-managed               |
| Model-Driven app button  | Custom Page → connector. Fallback: `@azure/msal-browser` ribbon JS + `blank.html`.| Yes                      | Delegated, connector-managed               |
| External service         | Delegated authcode. Client credentials only with "Specific users + SPN allow-list". | Usually no               | Delegated for `Any user`; app-only for `Specific users + SPN` |

If the user pushes for client_credentials directly into `Any user in my tenant`,
flag it as `[Inference]`: community-confirmed but not Microsoft-documented
verbatim. Recommend either changing to `Specific users in my tenant` with the
SPN object ID allow-listed, or putting a broker API in front (Pattern B).

## Audience values per cloud

State this explicitly in every sample — silently defaulting to Public is the #1
cause of `MisMatchingOAuthClaims`. Source: §4.1 of the brief.

| Cloud      | Audience                                          |
|------------|---------------------------------------------------|
| Public     | `https://service.flow.microsoft.com/`             |
| GCC        | `https://gov.service.flow.microsoft.us/`          |
| GCC High   | `https://high.service.flow.microsoft.us/`         |
| China      | `https://service.powerautomate.cn/`               |
| DoD        | `https://service.flow.appsplatform.us/`           |

Trailing slash is mandatory.

The Flow Service first-party app id is
`7df0a125-d3be-4c96-aa54-591f83ff541c` — same in every cloud.

## What this skill does NOT do

- It does **not** push the secured URL anywhere. The user updates their
  Dataverse environment variable (recommend `pa_flowEndpoint`) themselves.
- It does **not** provision Entra apps. It generates the CLI / PS the user runs.
- It does **not** smoke-test the flow. It produces the four-probe test plan
  (anonymous, valid same-tenant, wrong-tenant, wrong-audience) for the user.
- It does **not** flip the trigger setting on a live flow. The user clones,
  cuts, and disables per `references/03-migration-procedure.md`.

## Authority and freshness

The brief was last verified **2026-05-05** against Microsoft Learn 2026-04-29.
Empirical findings in `references/11-known-bugs-and-workarounds.md` were
captured **2026-05-08** debugging a real flow on Self-Host Multitenant (the
trailing-slash bug, the 502 NoResponse, the client-credentials regression).
If the user is in a sovereign cloud whose audience is not in the table above,
or working past a known platform shift (new Code Apps CSP defaults, an
announced deprecation date for `Anyone`, a new Managed Identity rollout in
their region), say so and direct them to verify against current Microsoft Learn
before cutover.
