# Current packages and versions for Q1 2026

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 9-23
- Parent headings: Practical C# plugin code reference for Power Platform model-driven apps for early 2026 > Project setup reference

---

### Current packages and versions for Q1 2026

NuGet versions below are **latest stable available on NuGet.org** at time of research (Q1 2026 target).

| Area | Package | Latest stable version (Q1 2026) | Notes |
|---|---:|---:|---|
| Plug-in build (Dataverse runtime API) | `Microsoft.CrmSdk.CoreAssemblies` | **9.0.2.60** citeturn5view0 | Tracked for compile-time references; assemblies exist in sandbox at runtime. citeturn9view0 |
| Workflow activities | `Microsoft.CrmSdk.Workflow` | **9.0.2.60** citeturn0search3 | Needed only if you build CodeActivity workflow extensions. |
| Client connectivity (replacement for deprecated Xrm.Tooling connector) | `Microsoft.PowerPlatform.Dataverse.Client` | **1.2.10** citeturn6view0turn16search0 | For external apps/services; **not** required inside plug-ins (use `IOrganizationService`). citeturn8view0 |
| Client extensions | `Microsoft.PowerPlatform.Dataverse.Client.Dynamics` | **1.2.10** citeturn17view0 | Dynamics-specific extensions; often pulled transitively by FakeXrmEasy. |
| Unit testing – core | `FakeXrmEasy.Core.v9` | **3.8.0** citeturn4search14turn6view0 | Query translation + CRUD operators (v3 middleware-based architecture). citeturn26search1 |
| Unit testing – pipeline simulation | `FakeXrmEasy.Plugins.v9` | **3.8.1** citeturn7view0 | Pipeline simulation helpers for plug-ins + step registration. citeturn19view0turn19view1 |
| Unit testing – message executors | `FakeXrmEasy.Messages.v9` | **3.8.0** citeturn4search22turn27view0 | Adds many message executors beyond CRUD; loaded via `.AddFakeMessageExecutors(...)`. citeturn27view0 |
| Optional merge (legacy) | `ILRepack.Lib.MSBuild.Task` | **2.0.44.1** citeturn0search12 | Only if you cannot use plug-in packages; Microsoft does **not** support ILMerge. citeturn9view0 |
