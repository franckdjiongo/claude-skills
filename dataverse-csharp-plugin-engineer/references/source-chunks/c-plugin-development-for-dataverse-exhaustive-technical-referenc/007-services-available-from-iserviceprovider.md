# Services available from IServiceProvider

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 90-101
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 3. Core interfaces reference

---

### Services available from IServiceProvider

| `typeof(...)` | Returns | Purpose |
|---|---|---|
| `IPluginExecutionContext` | Pipeline context | Message name, stage, entity data, images |
| `IOrganizationServiceFactory` | Service factory | Creates `IOrganizationService` instances |
| `ITracingService` | Trace logger | Writes to `PluginTraceLog` (10 KB limit, 24-hour retention) |
| `IServiceEndpointNotificationService` | Azure bus poster | Posts context to Azure Service Bus endpoints |
| `Microsoft.Xrm.Sdk.PluginTelemetry.ILogger` | App Insights logger | Writes telemetry to Application Insights (no size limit, 90-day default retention) |

**Critical `ILogger` gotcha:** Import `Microsoft.Xrm.Sdk.PluginTelemetry`, **not** `Microsoft.Extensions.Logging`. The wrong namespace returns null.
