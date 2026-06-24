# 10 — Recent developments, recommendations, caveats

Source: §10, §11, §12 of the brief. Last verified 2026-05-05.

## 2025–2026 changes that affect this skill

- **HTTP trigger URL migration off `logic.azure.com`** — old URLs **stopped
  working on 30 November 2025** for environments on the new Self-Host
  Multitenant architecture. **Verify URL host before changing the auth
  setting** (§03 pre-cutover check).
- **Power Platform Managed Identity for Dataverse plug-ins — GA 15 June 2025.**
  Replaces Secure Configuration secrets with Federated Identity Credentials.
  Pattern A in §04 depends on this.
- **Power Apps Code Apps — GA 5 February 2026** (Microsoft Power Platform
  Blog, Jordan Chodak). Platform handles auth, hosting, connector
  orchestration. Power Apps Premium ($20/user/month) is the licensing path
  for end-users; Power Apps per app SKU is no longer available for new
  customers as of 2 January 2026. Power Apps CLI 1.51.1 (December 2025)
  added connection references for code apps.
- **Code App CSP enforcement — effective 30 January 2026** per Microsoft
  Message Center notice **MC1218747**. External `connect-src` is blocked
  unless allowlisted in PPAC. This effectively forces Code Apps to call
  HTTP-trigger flows via a custom connector.
- **OAuth-on-HTTP-triggers Learn article updated 2026-04-29** and states the
  feature is still rolling out, with `Any user in my tenant` as the default
  for any new flows.
- **Cloud-flow security guidance updated 2025**, recommending Microsoft Entra
  token enforcement and Power Platform environment IP firewalling for
  HTTP-triggered flows.
- **Custom connectors gained a documented managed identity authentication
  path** for Entra user-delegated connections (FIC setup documented; updated
  2026-04-29).
- **Workload Identity Federation for Power Platform service connections**
  entered preview in early 2025 — increasingly viable for ALM/CI scenarios.
- **DLP / Connector Action Control** can now block or allow specific
  _triggers_ (in addition to actions) via PowerShell. Tenant admins can
  effectively forbid `Anyone` on HTTP-trigger flows.
- **No new tenant-level switch to enforce OAuth on HTTP triggers** has been
  announced as of May 2026; governance is via DLP, environment strategy, and
  admin training.
- **Dataverse plug-ins remain on .NET Framework 4.6.2** today; Microsoft
  states **.NET 4.8** support is planned for **Q4 2026**. The two-minute
  server-operation ceiling and outbound HTTP sandbox guidance remain
  unchanged.

## Items where no current Microsoft source was found

- Power Platform admin center enforcement that forces HTTP-trigger
  authentication on all flows
- A tenant-level policy dedicated specifically to
  `When an HTTP request is received` authentication settings
- An announced deprecation or retirement timeline for anonymous **Anyone**
  HTTP triggers
- A 2025-2026 Microsoft source explicitly documenting direct app-only
  support for **Any user in my tenant**
- A 2025-2026 Microsoft source documenting how authenticated caller identity
  is rendered in flow run history for this trigger

## Recommendations (by stage)

### Stage 1 — within 1 week

1. Inventory every HTTP-triggered flow in production set to `Anyone`. Filter
   run history for any flow whose **Triggered by** equals `Anonymous`.
2. Confirm trigger URL host is **not** `logic.azure.com`.
3. Provision App A and configure Power Platform Managed Identity FIC against
   the production plugin assembly (Pattern A) **or** stand up the broker app
   registration (Pattern B).
4. Smoke-test plugin / broker with a low-traffic table and a cloned flow.

### Stage 2 — within 1 month

1. Build the custom connector (§08) and create a Connection in each
   environment.
2. Migrate the Code App to `pac code add-data-source` referencing the
   connector. Remove any direct-fetch code paths.
3. Build the MDA Custom Page hosting the Canvas app that calls the connector.
   Deploy as a managed solution.
4. Create the Dataverse environment variable `pa_flowEndpoint` and switch all
   callers to read from it.

### Stage 3 — within 1 quarter

1. Execute the cutover (§03 step 6) per flow; allow 7 days of zero-traffic
   on the legacy clone before disabling.
2. Configure DLP to block the HTTP connector outside development environments
   and to disallow `Anyone` setting on HTTP triggers via Connector Action
   Control PowerShell.
3. Stand up Application Insights on the Power Platform environment for
   plug-in crash diagnostics.

## Thresholds that change these recommendations

- **Sovereign cloud** — replace the Public audience with the cloud-specific
  value (§01) and use the matching login authority.
- **Managed Identity not yet rolled out to your region** — fall back to the
  MSAL.NET certificate path with a Key Vault-stored cert, or use Pattern B
  (broker) instead.
- **Conditional Access enforcing device compliance on every API resource** —
  exclude App A/B from the relevant CA policies before cutover, or onboard
  the calling identities to a compliant device pool.
- **External (non-tenant) callers must trigger the flow** — you cannot use
  `Any user in my tenant`. Either keep `Anyone` with an Azure API Management
  front door enforcing OAuth, or expose the flow via Power Pages with
  anonymous-but-rate-limited access.
- **Governance forbids `[Inference]` on app-only acceptance for `Any user`**
  — choose Pattern B (broker API) for plugins, and use **Specific users + SPN
  allow-list** for external services. Compose only Tier-1 documented
  components.

## `[Inference]` items consolidated

These are the assumptions in the brief that are not directly documented by
Microsoft. Flag them when you propose the corresponding pattern.

- The exact delegated scope name for direct flow-trigger callers (audience is
  documented; scope token is not formally published).
- Whether `scp` or `roles` claims are validated by the trigger.
- Whether `Any user in my tenant` accepts app-only (client-credentials) tokens
  (community-confirmed; Microsoft does not say verbatim).
- Whether existing anonymous callers break the instant the setting is changed
  (consistent with the protocol; not stated as a separate "cutover timing"
  article).
- Treating the post-migration trigger URL as secret material despite OAuth
  (defensive default; Microsoft still documents SAS rotation).
- Connector backend Resource URL = `https://service.flow.microsoft.com/`
  (audience and connector resource URI mechanism are documented separately;
  not tied together for HTTP-triggered flows in one Microsoft article).
- Direct OBO from a middle tier to the flow.
- Direct ribbon-JavaScript `fetch` to the flow (CORS / origin concerns).
- Run-history caller-identity rendering (no documented strong field; use
  correlation IDs).

## Source-quality flags

- The Microsoft Learn doc on OAuth for HTTP triggers explicitly says `oid` is
  required only for _Specific users_, and lists only `aud`/`iss`/`tid` as
  required for `Any user in my tenant`. By implication, app-only tokens are
  accepted, but Microsoft Learn does not say so verbatim. The strongest
  direct confirmation is from MVP/community sources (Beringer, Inogic March
  2025, North52 KB-10553, Ghulam Rasool/Medium 2025) — Tier-2 / Tier-3
  evidence. Test in non-production first.
- Application permission for Flow Service is not exposed; only the delegated
  `User → Access Microsoft Flow as signed in user` scope. This is
  deliberate — Power Automate validates by claim matching.
- Power Apps Code Apps SDK has no public `getCurrentUser()` or
  `getAccessToken()` as of GA. Use the Office 365 Users connector for
  current-user identity. Direct token acquisition is unsupported.
- Plugin sandbox AppDomain lifetime is undocumented; treat every Execute as
  a cold start.
- The `Anyone` setting has no announced deprecation date as of May 2026.
  Microsoft documentation continues to call it "legacy"; DLP / Connector
  Action Control are the available enforcement levers.
- The MSAL.js direct-fetch pattern in MDA is community-grade — functional,
  used in production by multiple MVPs, but not documented by Microsoft as a
  supported pattern for ribbon JS. Prefer Custom Page + connector whenever
  possible.
