# Solution-aware registration rules

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 324-331
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > ALM and solution structure guide

---

### Solution-aware registration rules

When you register a plug-in assembly, it is stored in the `PluginAssembly` table; classes implementing `IPlugin` are registered. citeturn5view0turn33view0 Each assembly registration is added to the **Default Solution**, and you should add it to an unmanaged solution for distribution. citeturn5view0 Steps are not automatically added to the same unmanaged solution; you must add each step separately. citeturn5view0

Microsoft’s plug-in development guidance also includes: “Manage plug-ins in single solution” as a best practice. citeturn24view0

**Operational rule**: the agent should treat “solution membership” as part of plug-in correctness and verify that assemblies + steps belong to the expected solution before export/import [Inference], using the `SolutionId` fields on step records as needed. citeturn3view1turn2view0
