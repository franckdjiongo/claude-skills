# Power Apps Code Apps - Deployment, ALM & Observability Reference

## 1. Build & Push

```bash
# Modern workflow: npm + npx
npm run build
npx power-apps push                              # uses preferred solution
npx power-apps push --solutionName <name>         # target specific solution

# Legacy workflow: npm + pac code push
npm run build | pac code push
pac code push --solutionName <solutionName>
```

If the environment has a preferred solution configured, new apps save to that solution by default when deployed with `pac code push`. This avoids the default solution and enables healthy ALM from day one.

---

## 2. ALM Workflow

### Prerequisites

- A Power Platform environment with Dataverse.
- Power Platform CLI (PAC) installed (latest version).
- A non-default solution for your work (ideally set as the preferred solution).

### Adding an app to a solution via UI

If the code app was already deployed with `pac code push`, add it to a solution in Power Apps:

1. Go to [Power Apps](https://make.powerapps.com).
2. Navigate to **Solutions**.
3. Select the solution.
4. Select **Add existing** > **App** > **Code app** and select the app.

### Deploy using Power Platform Pipelines

Once the app is in a solution, use Power Platform Pipelines to deploy across stages:

```
Dev --> Test --> Prod
```

Pipelines provide preflight checks for:
- Dependencies
- Connection references
- Other solution components

Reference: [Power Platform Pipelines documentation](https://learn.microsoft.com/en-us/power-platform/alm/pipelines)

### Connection references

Use connection references to add data sources. This is important for ALM because connection references allow different connections per environment without modifying the app.

Reference: the "Use connection references to add a data source" section in the How to: Connect your code app to data page.

### ALM Limitations

Code apps currently:
- **Do not support** use of solution packager.
- **Do not support** source code integration (git integration for code apps).

---

## 3. Content Security Policy (CSP)

CSP settings are configured at the **environment level** and apply to all code apps in the environment. By default, CSP is enforced.

### 15 CSP Directives with defaults

| Directive        | Default Value                          |
|------------------|----------------------------------------|
| frame-ancestors  | `'self' https://*.powerapps.com`       |
| script-src       | `'self' <platform>`                    |
| img-src          | `'self' data: <platform>`              |
| style-src        | `'self' 'unsafe-inline'`               |
| font-src         | `'self'`                               |
| connect-src      | `'none'`                               |
| frame-src        | `'self'`                               |
| form-action      | `'none'`                               |
| base-uri         | `'self'`                               |
| child-src        | `'none'`                               |
| default-src      | `'self'`                               |
| manifest-src     | `'none'`                               |
| media-src        | `'self' data:`                         |
| object-src       | `'self' data:`                         |
| worker-src       | `'none'`                               |

**Merge behavior**: Custom values are appended to the default. If the default is `'none'`, custom values replace it entirely.

### UI Configuration Path

1. Sign in to the [Power Platform admin center](https://admin.powerplatform.microsoft.com/).
2. Navigation pane > **Manage** > **Environments**.
3. Select an environment > command bar **Settings**.
4. Expand **Product** > select **Privacy + Security**.
5. Under **Content security policy**, select the **App** tab.

Within the directive configuration:
- Toggle on = use defaults.
- Toggle off = add custom values (merged with defaults). Leaving the source list blank disables the directive.

### REST API Endpoint

```
PATCH https://api.powerplatform.com/environmentmanagement/environments/{environmentId}/settings?api-version=2022-03-01-preview
```

Available settings:
- `PowerApps_CSPEnabledCodeApps` -- controls enforcement.
- `PowerApps_CSPReportingEndpoint` -- URL for CSP violation reports, or `null` to disable.
- `PowerApps_CSPConfigCodeApps` -- stringified JSON for directive configuration.

Directive JSON format:

```jsonc
{
  "default-src": {
    "sources": [{ "source": "'self'" }]
  },
  "style-src": {
    "sources": [{ "source": "'self'" }, { "source": "https://contoso.com" }]
  }
  // Additional directives
}
```

### PowerShell Functions

**Get-CodeAppContentSecurityPolicy**: Retrieves current CSP settings (enforcement status, reporting endpoint, directives).

```powershell
# Retrieve current CSP configuration
Get-CodeAppContentSecurityPolicy -Token $token -Env "<your-env-id>"
```

**Set-CodeAppContentSecurityPolicy**: Updates CSP settings.

```powershell
# Enable CSP enforcement
Set-CodeAppContentSecurityPolicy -Token $token -Env "<your-env-id>" -Enabled $true

# Set reporting endpoint
Set-CodeAppContentSecurityPolicy -Token $token -Env "<your-env-id>" -ReportingEndpoint "https://contoso.com/report"

# Disable reporting
Set-CodeAppContentSecurityPolicy -Token $token -Env "<your-env-id>" -ReportingEndpoint $null

# Update directives (replaces entire collection -- retrieve first, then modify)
$env = "<your-env-id>"
$directives = (Get-CodeAppContentSecurityPolicy -Token $token -Env $env).Directives
# Modify $directives as needed...
Set-CodeAppContentSecurityPolicy -Token $token -Env $env -Directives $directives
```

**Warning**: Updating directives replaces the entire collection. Always retrieve first, modify in place, then set.

The Set function validates against 15 allowed directive names:
Frame-Ancestors, Script-Src, Img-Src, Style-Src, Font-Src, Connect-Src, Frame-Src, Form-Action, Base-Uri, Child-Src, Default-Src, Manifest-Src, Media-Src, Object-Src, Worker-Src.

### Authentication with azureauth

```powershell
$tenantId = "<your-tenant-id>"
# Client ID of the Power Platform CLI
$clientId = "9cee029c-6210-4654-90bb-17e6e9d36617"
$token = azureauth aad --resource "https://api.powerplatform.com/" --tenant $tenantId --client $clientId --output token | ConvertTo-SecureString -AsPlainText -Force
```

Requires [Microsoft Authentication CLI (azureauth)](https://github.com/AzureAD/microsoft-authentication-cli).

### Common directives to modify

- **connect-src**: Must be updated when integrating with external services (e.g., Azure App Insights telemetry endpoints). Default is `'none'`, so any outbound fetch/XHR requires an explicit source.
- **script-src**: Must be updated if loading external scripts beyond the platform default.

---

## 4. SDK v1.0 Migration

SDK v1.0 introduces breaking changes from SDK v0.3.21 as code apps approach general availability.

### Key change: `initialize()` is removed

Apps must no longer import or call `initialize`. Data calls, context retrieval, and platform interaction work directly without waiting on SDK initialization.

### Migration steps

1. **Remove the import**: `import { initialize } from '@microsoft/power-apps'`
2. **Remove initialization logic** (the `await initialize()` / `setIsInitialized` pattern):

```typescript
// REMOVE -- no longer needed in v1.0
useEffect(() => {
  const init = async () => {
    try { await initialize(); setIsInitialized(true); }
    catch (err) { setError('Failed to initialize'); setLoading(false); }
  };
  init();
}, []);
useEffect(() => { if (!isInitialized) return; /* data logic */ }, []);
```

3. **Remove initialization state flags**: Drop any `isInitialized` checks. Use the SDK directly.

### New `setConfig` API

Available from `@microsoft/power-apps/app`. Allows opting in to optional behaviors and observability features.

```typescript
import { setConfig } from '@microsoft/power-apps/app'
import type { IConfig } from '@microsoft/power-apps/app'

setConfig({
  logger: {
    logMetric: (value: Metric) => {
      // Send metrics to your monitoring tool
    }
  }
});
```

The `logger.logMetric` function receives session and network metrics from the platform. Call `setConfig` once.

---

## 5. Azure App Insights Integration

### Install

```bash
npm install @microsoft/applicationinsights-web
```

### Initialization pattern

```typescript
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const initializeAppInsights = () => {
  const appInsights = new ApplicationInsights({
    config: {
      connectionString: 'InstrumentationKey=<YOUR_KEY>;IngestionEndpoint=<YOUR_ENDPOINT>'
    }
  });
  appInsights.loadAppInsights();
  appInsights.trackPageView(); // Optional: tracks page view
  return appInsights;
};
```

**Note**: Environment variables are not yet supported for code apps. Store per-environment instrumentation keys in Dataverse (e.g., a settings table) or use `getContext()` to detect the environment and select the appropriate connection string.

### setConfig logger integration

```typescript
import { setConfig } from '@microsoft/power-apps/app'

setConfig({
  logger: {
    logMetric: (value: Metric) => {
      appInsights.trackEvent({ name: value.type }, value.data);
    }
  }
});
```

Call `setConfig` once. The platform calls `logMetric` with metrics like `sessionLoadSummary` and `networkLoadSummary`. The `ILogger` interface (`logMetric?: (value: Metric) => void`) can be imported from `@microsoft/power-apps/telemetry`.

### Built-in metric types

**SessionLoadSummary**:

```typescript
type SessionLoadSummaryMetricData = {
  successfulAppLaunch: boolean;
  appLoadResult: 'optimal' | 'other';
  appLoadNonOptimalReason: 'interactionRequired' | 'throttled' | 'screenNavigatedAway' | 'other';
  timeToAppInteractive: number;
}
```

**NetworkRequest**:

```typescript
type NetworkRequestMetricData = {
  url: string;
  method: string;
  duration: number;
  statusCode: number;
  responseSize: number;
}
```

### CSP violation debugging for App Insights

If CSP is enabled, telemetry to App Insights may be blocked. To fix:

1. Open your app with App Insights configured.
2. Open DevTools (F12 / Ctrl+Shift+I).
3. Go to **Console** tab > **Errors only**.
4. Look for: `Connecting to 'https:...' violates the following Content Security Policy directive`.
5. Note the blocked URLs.
6. Add those URLs to `connect-src` in your CSP configuration (see CSP section above).
7. Wait several minutes for CSP changes to propagate, then refresh and verify.

### Kusto queries for app performance

**App open performance** (75th percentile of timeToAppInteractive by day):

```kusto
customEvents
| where name == "sessionLoadSummary"
| extend cd = parse_json(customDimensions)
| extend cm = parse_json(customMeasurements)
| extend timeToAppInteractive = todouble(cm["timeToAppInteractive"])
| extend successfulAppLaunch = tobool(cd.successfulAppLaunch)
| where successfulAppLaunch == true
| summarize percentile(timeToAppInteractive, 75)
by bin(timestamp, 1d)
| render timechart
```

**Network request performance by URL** (daily count + 75th percentile response time):

```kusto
customEvents
| where name == "networkRequest"
| extend cd = parse_json(customDimensions)
| extend url = tostring(cd.url)
| extend cm = parse_json(customMeasurements)
| extend duration = todouble(cm.duration)
| summarize
count(), percentile(duration, 75) by url, bin(timestamp, 1d)
| render timechart
```

### Complementary tools

Azure Application Insights complements Power Platform Monitor by providing granular logs and custom events. However, it only captures telemetry **after the app successfully loads**. Startup failures (blocked files, failed initialization) only show in Monitor, not in App Insights.

---

## 6. CLI Telemetry

### What is collected

When telemetry is enabled, the PAC CLI `code` commands send:
- **Activity events** -- commands and scenarios (model/service files generation, environment selection).
- **Error events** -- failures and exceptions with error names and messages.
- **Scenario timing** -- start/stop of key flows with elapsed time.
- **Environment context** -- non-PII metadata (region, geo, cluster).
- **Tenant identifier** (when authenticated).

Telemetry failures never block CLI operations.

### Config file path

Settings are stored in `.powerapps-cli/userSettings.json`:
- **Windows**: `%USERPROFILE%\.powerapps-cli\userSettings.json`
- **Linux/Mac**: `$HOME/.powerapps-cli/userSettings.json`

### Properties

| Property          | Description                                                     |
|-------------------|-----------------------------------------------------------------|
| `enabled`         | Whether remote telemetry is enabled.                            |
| `consoleOnly`     | Whether to only log telemetry to the console (never send remotely). |
| `outputToConsole` | Whether to additionally mirror telemetry events to the console. |

### 4 Configuration states

**1. Telemetry enabled, remote only (default -- no file needed):**

```json
{ "enabled": true, "consoleOnly": false, "outputToConsole": false }
```

**2. Telemetry fully disabled:**

```json
{ "enabled": false, "consoleOnly": false, "outputToConsole": false }
```

**3. Telemetry enabled, remote + console:**

```json
{ "enabled": true, "consoleOnly": false, "outputToConsole": true }
```

**4. Console-only telemetry (no remote send):**

```json
{ "enabled": false, "consoleOnly": true, "outputToConsole": false }
```

In state 4, `enabled` is effectively ignored for remote sending; console logging is implied.

**Note**: If telemetry is globally disabled via `pac telemetry` commands, the `code` command will not send telemetry even if enabled in `userSettings.json`.

### Setup scripts

```powershell
# Windows (PowerShell)
$settingsPath = Join-Path $env:USERPROFILE ".powerapps-cli\userSettings.json"
$settingsDir = Split-Path $settingsPath
if (-not (Test-Path $settingsDir)) { New-Item -ItemType Directory -Path $settingsDir -Force }
@{ enabled = $true; consoleOnly = $false; outputToConsole = $false } | ConvertTo-Json | Set-Content $settingsPath
```

```bash
# Linux/Mac (bash)
mkdir -p "$HOME/.powerapps-cli" && cat > "$HOME/.powerapps-cli/userSettings.json" <<'EOF'
{ "enabled": true, "consoleOnly": false, "outputToConsole": false }
EOF
```

### Log redirection

When telemetry outputs to console (`consoleOnly: true` or `outputToConsole: true`), redirect to a file:

```cmd
rem Windows Command Prompt
pac code add-data-source .... > telemetry.log 2>&1
```

```powershell
# PowerShell (Windows, macOS, Linux)
pac code add-data-source .... | Out-File -FilePath telemetry.log -Encoding utf8
```

