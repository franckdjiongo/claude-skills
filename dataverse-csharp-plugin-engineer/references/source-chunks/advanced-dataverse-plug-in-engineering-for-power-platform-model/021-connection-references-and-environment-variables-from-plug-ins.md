# Connection references and environment variables from plug-ins

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 349-358
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > ALM and solution structure guide

---

### Connection references and environment variables from plug-ins

Connection references are a solution component that allows apps/flows to bind to a connector connection reference rather than a direct connection. citeturn18search19turn18search3 Plug-in code typically doesn’t “use” a connection reference directly (it is a flow/app runtime concept), but plug-ins can support ALM by reading environment variables that store endpoints/keys used for outbound calls [Inference]. Environment variables are first-class solution components; Microsoft documents their use for ALM scenarios. citeturn19search0turn19search1turn19search6

Dataverse exposes environment variable definitions and values in `EnvironmentVariableDefinition` and `EnvironmentVariableValue` tables. citeturn19search6turn19search1 There is also a Web API function `RetrieveEnvironmentVariableValue` described as responsible for retrieving the corresponding value. citeturn20search0turn19search18

**Safe access pattern (in plug-ins): query tables** [Inference]
1. Query `EnvironmentVariableDefinition` by schema name/unique name. citeturn19search6  
2. Retrieve related `EnvironmentVariableValue` row(s) and use current value if present; fall back to default value stored on definition if absent. citeturn19search1turn19search6
