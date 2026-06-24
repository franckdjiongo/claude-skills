# 04 — Caller context: Dataverse C# plugin

Source: §7.1 of the brief.

Two patterns. Pick **A** when Managed Identity is GA in the target region and
governance tolerates the `[Inference]` on app-only acceptance for `Any user in
my tenant`. Pick **B** when governance forbids that `[Inference]` or you want
to keep audit/policy in front of the flow.

## Pattern A — direct call with Managed Identity (recommended)

```
Dataverse event → Plugin Sandbox container (subnet-injected if VNet-enabled)
                  ├─ IManagedIdentityService.AcquireToken("https://service.flow.microsoft.com//.default")
                  │  → app-only JWT (aud=service.flow.microsoft.com, no oid)
                  └─ HttpClient.PostAsync(flowUrl, json) — sync, ConnectionClose=true, 13 s timeout
                                          ↑
                  Power Automate validates aud/iss/tid → 202 Accepted
```

**GA date:** 15 June 2025 for Power Platform Managed Identity for Dataverse
plug-ins.

**Configure FIC** on a UAMI or App Registration with subject:

```
component:pluginassembly,thumbprint:<thumbprint>,environment:<envid>
```

and issuer:

```
https://<env-prefix>.<env-suffix>.environment.api.powerplatform.com/sts
```

**Provision the `managedidentities` Dataverse record** (REST POST):

```http
POST https://<orgURL>/api/data/v9.0/managedidentities
Content-Type: application/json

{
  "applicationid": "<UAMI client ID or App Registration appId>",
  "managedidentityid": "<any new GUID>",
  "credentialsource": 2,
  "subjectscope": 1,
  "tenantid": "<tenant id>",
  "version": 1
}
```

Helper: `assets/provisioning/managed-identity-record.http`.

In the plugin, request the token via `IManagedIdentityService.AcquireToken(scopes)`.

**Code:** `assets/plugin/InvokeFlowPlugin.cs` and
`assets/plugin/PluginAssembly.csproj.snippet`.

### Pattern A — MSAL.NET certificate fallback

Use only when Managed Identity is unavailable in the environment.
`Microsoft.Identity.Client` 4.83.3 (current stable as of May 2026) targets
.NET Standard 2.0 and .NET Framework 4.6.2.

```csharp
var app = ConfidentialClientApplicationBuilder
    .Create(clientId)
    .WithAuthority(new Uri($"https://login.microsoftonline.com/{tenantId}"))
    .WithCertificate(LoadCertFromBase64(certPfxBase64, certPassword))
    .Build();

var result = app
    // Double slash on the audience — Entra v2 strips one trailing slash;
    // without doubling, the issued aud has no slash and Power Automate
    // rejects with 403 MisMatchingOAuthClaims. See §11.
    .AcquireTokenForClient(new[] { "https://service.flow.microsoft.com//.default" })
    .ExecuteAsync().GetAwaiter().GetResult();

string token = result.AccessToken;
```

Acquire on every `Execute` (sandbox AppDomain recycles between invocations).
Store certificate base64 in Secure Configuration, or — better — fetch from
Azure Key Vault using the same Managed Identity pattern.

## Pattern B — broker API (conservative)

```
Dataverse event → Plugin Sandbox (.NET 4.6.2)
                  ├─ Token endpoint: client_credentials → JWT for broker API audience
                  └─ HttpClient.PostAsync(brokerUrl, json) — sync, ConnectionClose=true
                                          ↓
                                    Broker API (your service)
                                          ↓
                                    Flow trigger or equivalent orchestration
```

The plugin **does not call the secured flow directly**. It acquires an
app-only token for a broker API you own, sends a short JSON payload plus
correlation metadata, and the broker performs the downstream flow invocation.
This keeps undocumented token-acquisition assumptions out of the plug-in
sandbox.

**Code:** `assets/plugin/SecureFlowBrokerPlugin.cs`.

## Sandbox constraints (apply to BOTH patterns)

From Microsoft Learn — _Access external web services (Microsoft Dataverse)_:

> Only the HTTP and HTTPS protocols are allowed. Access to localhost
> (loopback) isn't permitted. IP addresses can't be used. You must use a
> named web address that requires DNS name resolution. Anonymous
> authentication is supported and recommended.

- **15-second** wall-clock timeout for outbound HTTP. Otherwise
  `TaskCanceledException`. Always set `client.Timeout = TimeSpan.FromSeconds(13)`
  to keep a 2 s budget.
- Dataverse imposes a hard **two-minute** server-operation ceiling and
  recommends plug-in execution of about two seconds when possible.
- Plug-ins target **.NET Framework 4.6.2** today; **.NET 4.8** support is
  planned for Q4 2026.
- **Per-`Execute` `HttpClient`** (sandbox AppDomain recycles; no static
  lifetime concerns). Always dispose; set
  `DefaultRequestHeaders.ConnectionClose = true`. Force synchronous via
  `.GetAwaiter().GetResult()`.
- Plugin assembly **must** be Sandbox isolation and signed.
- Pattern A: register Managed Identity using **Plugin Identity Manager**
  (XrmToolBox) or PowerShell `managedidentities` POST.
- Plug-in is stateless; Dataverse caches plug-in instances and can execute
  them concurrently. Store non-secret settings in unsecure configuration and
  secrets in secure configuration.
- Sandbox AppDomain lifetime is undocumented. Treat every Execute as a cold
  start; do not rely on static MSAL caches.

## Configuration checklist

- [ ] Plugin assembly signed and registered with **Sandbox** isolation.
- [ ] **Pattern A** unsecure config:
      `{"FlowUrl":"<url>","Resource":"https://service.flow.microsoft.com//.default"}`
      (note **double slash** before `.default` — see §11)
      — **no secrets**.
- [ ] **Pattern A** Managed Identity FIC subject identifier matches
      `component:pluginassembly,thumbprint:<>,environment:<>`.
- [ ] **Pattern A** `managedidentities` Dataverse record provisioned via REST
      POST.
- [ ] **Pattern A** trigger flow set to **Any user in my tenant** (or
      **Specific users in my tenant** with the UAMI/App Object ID added).
- [ ] **Pattern B** secure config holds `TenantId;ClientId;ClientSecret`.
- [ ] **Pattern B** unsecure config holds `BrokerUrl;Scope`.
- [ ] **Pattern B** broker app registration exposes the right scope for
      `client_credentials`.
- [ ] Application Insights linked for plug-in crash diagnostics.

## Test procedure

### Pattern A

1. Create a record on the registered table; observe **Plug-in Trace Log**.
2. Confirm `Flow response: HTTP 202`.
3. Power Automate **Run history** shows the SPN/UAMI display name in
   _Triggered by_.
4. Negative test: revoke `User` permission on App A → next run logs HTTP 401
   `MisMatchingOAuthClaims`.

### Pattern B

Register the plug-in **asynchronous** if business latency permits. Execute a
test event and verify:

1. the plug-in completes within the timeout budget,
2. the broker receives `x-correlation-id`,
3. a forced token-expiry test triggers the 401 refresh path once,
4. a role/policy denial returns 403 and is not retried,
5. telemetry appears in Plug-in Trace Log and, if enabled, Application Insights.

## Limitations and support status

Microsoft documents direct sandbox HTTP calls (HTTPS, DNS names, no interactive
prompts). What Microsoft does **not** document verbatim is a supported direct
path from plug-in code to a flow at `Any user in my tenant` using **app-only
token acquisition**. Pattern A leans on the GA'd Managed Identity service plus
community-confirmed app-only acceptance for `Any user` (Tier-2/Tier-3); Pattern
B avoids the inference entirely by composing only Tier-1 documented components.
