# Executive summary

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 3-6
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps

---

## Executive summary

A Claude Code agent maintaining Dataverse C# plug-ins must treat the plug-in “event framework” as a staged pipeline where multiple steps can run per message and where synchronous stages inside the database transaction can roll back the whole operation on exception. citeturn34view0 It must actively control step ordering (execution order/rank, lowest-to-highest) and treat same-rank ordering as non-deterministic, therefore never relying on accidental ordering. citeturn5view0turn3view1 It should use `SharedVariables` for intra-pipeline coordination, with strict serializability and `ParentContext.SharedVariables` nuances for certain PreValidation → Pre/Post access paths. citeturn8view0 Strong operational maturity requires a standard debugging toolkit: plug-in profiler capture/replay, attaching Visual Studio to `PluginRegistration.exe`, and systematic trace-log interpretation (sync + async). citeturn17view0turn16search0turn26search6 For ALM/CI, plug-ins must be solution-aware, deployed as managed to downstream environments, and versioned correctly (assembly version semantics + solution version strategy) to avoid orphaned steps and layering surprises. citeturn5view0turn23view0 Production reliability demands telemetry (Application Insights integration + optional in-plug-in custom telemetry) and failure alerting tied to `PluginTraceLog` and `AsyncOperation` (system jobs). citeturn25search0turn25search15turn26search0turn16search6
