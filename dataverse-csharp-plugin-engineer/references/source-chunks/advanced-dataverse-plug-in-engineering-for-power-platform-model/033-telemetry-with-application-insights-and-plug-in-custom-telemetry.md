# Telemetry with Application Insights and plug-in custom telemetry

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 552-562
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Production monitoring guide

---

### Telemetry with Application Insights and plug-in custom telemetry

Microsoft supports exporting Dataverse and model-driven app telemetry to Application Insights with no code changes; you “subscribe to receive telemetry about operations” to diagnose issues. citeturn25search0turn25search9 The integration overview highlights dashboards, proactive monitoring via Smart Detection, and alerts. citeturn25search1

For plug-in code-level signals, Microsoft documents emitting custom telemetry from plug-ins using `Microsoft.Xrm.Sdk.PluginTelemetry.ILogger` to write directly to your Application Insights resource (preview). citeturn25search15turn25search2

**Operational setup (agent procedure)**  
1. Create an Application Insights resource and configure data export/integration in Power Platform admin center (per Microsoft setup guide). citeturn25search9turn25search0  
2. Validate that Dataverse telemetry flows (events include identifiers mapping, such as request IDs and operation IDs used for troubleshooting). citeturn25search6  
3. Add custom plug-in telemetry (`ILogger`) for high-value events (business failures, external dependency timeouts, contract violations). citeturn25search15turn25search2
