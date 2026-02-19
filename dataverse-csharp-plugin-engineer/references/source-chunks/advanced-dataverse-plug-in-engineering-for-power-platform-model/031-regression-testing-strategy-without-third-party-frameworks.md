# Regression testing strategy without third-party frameworks

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 543-549
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Legacy code refactoring guide

---

### Regression testing strategy without third-party frameworks

Microsoft acknowledges community testing tools but does not provide a first-party unit-test harness; for agent-driven autonomy in production-like correctness, prefer **integration tests** in a dedicated environment [Inference], driven by Dataverse SDK for .NET patterns and environment isolation practices:

* Use a pipeline to import a test solution, execute deterministic API operations, then assert results via SDK queries (Organization service). This is consistent with Microsoft-only tooling constraints and avoids unsupported libraries [Inference]. citeturn23view0turn22search5turn33view0  
* Validate async behaviour by inspecting `AsyncOperation` status, since async actions are stored as system jobs. citeturn26search0turn26search1
