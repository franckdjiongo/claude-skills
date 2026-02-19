# Executive summary

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 3-6
- Parent headings: Practical C# plugin code reference for Power Platform model-driven apps for early 2026

---

## Executive summary

As of 18 Feb 2026, Dataverse plug-in assemblies must target **.NET Framework 4.6.2** (Microsoft intends to add .NET Framework 4.8 runtime support by **June 2026**). citeturn9view0turn8view0 The modern toolchain is **Power Platform CLI (`pac`)** for project scaffolding and deployment (`pac plugin init`, `pac plugin push`) and `pac tool prt` to launch the Plug-in Registration Tool. citeturn12view0turn10search2turn8view0 For dependencies, Dataverse server-side runtime already contains `Microsoft.CrmSdk.CoreAssemblies` in the sandbox; for *your* external dependencies (including explicit `System.Text.Json`), Microsoft recommends using **plug-in packages (dependent assemblies capability)** instead of ILMerge. citeturn9view0 Unit testing in 2025/2026 is best done with **FakeXrmEasy v3.x** using pipeline simulation on **.NET 8 test projects**. citeturn7view0turn19view0turn19view1
