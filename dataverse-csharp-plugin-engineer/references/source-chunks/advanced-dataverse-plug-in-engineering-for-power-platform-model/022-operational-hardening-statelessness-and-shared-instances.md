# Operational hardening: statelessness and shared instances

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 359-362
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > ALM and solution structure guide

---

### Operational hardening: statelessness and shared instances

Microsoft explicitly states plug-in classes should be stateless because the platform caches and reuses plug-in instances and multiple threads can execute the same instance concurrently. citeturn33view0turn27search13 This affects how an agent refactors legacy code: any instance fields storing service/context across executions are correctness bugs, not stylistic issues. citeturn27search13turn24view0
