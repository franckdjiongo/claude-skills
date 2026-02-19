# 1. Executive summary

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 3-8
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference

---

## 1. Executive summary

Every Dataverse plugin is a .NET Framework 4.6.2 class implementing `Microsoft.Xrm.Sdk.IPlugin` with a single `void Execute(IServiceProvider)` method. The platform caches plugin instances across requests, so classes **must be stateless**—store nothing mutable in fields. Plugins hook into a four-stage pipeline (PreValidation → PreOperation → MainOperation → PostOperation) via step registrations that bind a plugin class to a specific message, entity, stage, and execution mode. The execution context (`IPluginExecutionContext`) exposes `InputParameters`, `OutputParameters`, `PreEntityImages`, `PostEntityImages`, and `SharedVariables`—each available only at specific stages. All Dataverse online plugins run in a **sandbox** (isolation mode 2): no file system, no registry, no parallel threads, HTTP/HTTPS web calls only. Assemblies must be ≤ **16 MB**, strong-named (unless using plugin packages), and stored in the database. The hard timeout for all synchronous plugins in a single pipeline is **2 minutes**; recommended per-plugin time is under 2 seconds. Use `InvalidPluginExecutionException` exclusively for user-facing errors. The maximum pipeline depth is **8** to prevent infinite loops.

---
