# SLA impact analysis for synchronous failures

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 584-587
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Production monitoring guide

---

### SLA impact analysis for synchronous failures

Microsoft states synchronous plug-ins cause the operation to wait until the plug-in completes and directly impact end-user perceived performance; synchronous plug-ins must execute quickly. citeturn26search9turn33view0 Slow plug-ins or too many synchronous plug-ins can make the UI nonresponsive or cause timeouts with pipeline rollback. citeturn33view0turn34view0 From a service continuity perspective, synchronous plug-in failures are “front-door failures” (user-visible, transaction-aborting), whereas async failures are typically recoverable out-of-band but may accumulate backlog and delay downstream automations [Inference]. citeturn26search0turn26search9
