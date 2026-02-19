# Standard prerequisites: enable tracing safely

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 268-277
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Debugging workflow

---

### Standard prerequisites: enable tracing safely

Dataverse tracing is provided through `ITracingService` and written to the `PluginTraceLog` table when trace logging is enabled. citeturn16search0turn16search4turn33view0 Microsoft warns trace logging consumes storage and should be turned on for troubleshooting, then turned off. citeturn16search5turn16search0

**Procedure (trace logging + trace viewer workflow)**  
1. Enable trace logging (per “View trace logs” from Microsoft’s logging/tracing guidance). citeturn16search5turn16search0  
2. Ensure your troubleshooting user has access to `PluginTraceLog` rows (tile appears only with privileges). citeturn16search0  
3. In plug-in code, emit trace lines with stable prefixes and include `CorrelationId` to correlate across steps and services. `CorrelationId` exists for tracking plug-in/workflow execution. citeturn7search0turn16search0  
4. For async failures, use the System Job record details; Microsoft states trace info is shown in the System Job form details for async plug-ins that throw exceptions. citeturn26search6
