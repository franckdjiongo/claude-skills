# Assets catalog — templates per caller

Read the matching template, fill in known values (flow name, tenant ID, audience, scopes, redirect URIs) and output it inline.

Canonical assets per caller:

- **dataverse-plugin** →
  - `assets/plugin/InvokeFlowPlugin.cs` (Pattern A, default — Managed Identity
    direct call, GA 2025-06-15)
  - `assets/plugin/SecureFlowBrokerPlugin.cs` (Pattern B, conservative — broker
    API, no `[Inference]`)
  - `PluginAssembly.csproj.snippet` (same folder: assembly references to paste into your plug-in project file)
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
