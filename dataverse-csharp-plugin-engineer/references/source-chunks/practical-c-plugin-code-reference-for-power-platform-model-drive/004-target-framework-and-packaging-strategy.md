# Target framework and packaging strategy

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 24-29
- Parent headings: Practical C# plugin code reference for Power Platform model-driven apps for early 2026 > Project setup reference

---

### Target framework and packaging strategy

Dataverse plug-ins and custom workflow activities **must target .NET Framework 4.6.2**. citeturn9view0turn8view0 Microsoft guidance strongly recommends using the **dependent assemblies capability** (plug-in packages) instead of ILMerge; plug-in packages are stored in the `PluginPackage` table and extracted to the sandbox at runtime. citeturn9view0

Important detail for 2025/2026: even though `Microsoft.CrmSdk.CoreAssemblies` depends on `System.Text.Json`, sandbox may not carry the same `System.Text.Json.dll` version; Microsoft explicitly recommends including `System.Text.Json` via plug-in packages if you use it. citeturn9view0
