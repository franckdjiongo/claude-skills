# Safe refactoring sequence (agent-operational)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 534-542
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Legacy code refactoring guide

---

### Safe refactoring sequence (agent-operational)

1. **Stabilise observability**: add structured `ITracingService` logging at start/end, include `CorrelationId`, and log key decisions (validation outcomes, branching). citeturn33view0turn16search0turn7search0  
2. **Reproduce with profiler**: capture failing or confusing scenarios and create a local replay harness; keep captured profiles as regression artefacts. citeturn17view0  
3. **Idempotence hardening**: remove implicit ordering dependencies; enforce execution order ranks and use `SharedVariables` contracts when multiple steps must coordinate. citeturn5view0turn8view0  
4. **Extract pure business logic**: isolate side-effect-free rule evaluation from Dataverse I/O. This aligns with statelessness requirements and makes replay/testing feasible [Inference]. citeturn27search13turn24view0  
5. **Performance gates**: add filtering attributes and reduce data retrieval to minimum required. citeturn5view0turn24view0  
6. **Deploy safely**: when publishing updated managed solutions, apply assembly-version semantics correctly (avoid unintended major/minor bumps without step migration). citeturn5view0
