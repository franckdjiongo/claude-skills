# Hard resource constraints

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 260-273
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 6. Sandbox rules for Dataverse online plugins

---

### Hard resource constraints

| Constraint | Value |
|---|---|
| Total synchronous pipeline timeout | **2 minutes** (all sync plugins + core operation combined) |
| Recommended per-plugin execution time | **≤ 2 seconds** |
| Assembly size limit | **16 MB** |
| Message payload size limit | **116.85 MB** (error code -2147220970 if exceeded) |
| Trace log per execution | **10 KB** (older lines truncated) |
| Trace log retention | **24 hours** |
| Pipeline depth limit | **8** (configurable on-premises via `WorkflowSettings.MaxDepth`) |
| .NET Framework target | **4.6.2** (4.8 runtime planned June 2026) |
| TLS requirement | **TLS 1.2** minimum |
