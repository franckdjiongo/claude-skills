# Anti-pattern checklist (Microsoft-sourced items first)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 520-533
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Legacy code refactoring guide

---

### Anti-pattern checklist (Microsoft-sourced items first)

The following are explicit Microsoft best-practice violations that an agent should detect and prioritise:

* Stateful `IPlugin` implementations: storing service/context in instance fields; risky because Dataverse caches plug-in instances and may run them concurrently. citeturn33view0turn27search13turn24view0  
* Duplicate plug-in step registration causing multiple executions on the same event. citeturn24view0turn5view0  
* Missing filtering attributes on Update steps, causing plug-in to execute on every Update and harm performance. citeturn5view0turn24view0  
* Registering heavy synchronous logic on Retrieve/RetrieveMultiple, causing slowness. citeturn24view0  
* Multi-threading/parallel execution inside plug-ins: not supported. citeturn24view0  
* Use of batch request types (`ExecuteMultipleRequest`, `ExecuteTransactionRequest`) inside plug-ins/workflow activities: explicitly discouraged. citeturn24view0  
* Writing code that depends on `Depth` or other loop-prevention internals; Microsoft states Depth is for platform loop prevention and business logic must not depend on a specific Depth value. citeturn6search0  
* Replacing `InputParameters["Target"]` with early-bound entity instances (causes serialization issues). citeturn33view0  
* Use of Web API from plug-ins: not supported; use Organization service (SDK for .NET). citeturn33view0
