# Async failure triage and recovery

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 574-583
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Production monitoring guide

---

### Async failure triage and recovery

Dataverse async extensions are queued; execution order is not strictly CreatedOn-ordered because different operation types require different resources. citeturn26search0 Practical triage steps:

1. Locate the system job (`AsyncOperation`) and read error details. citeturn26search1turn26search6  
2. If traces were enabled, use trace info in job details and download log file. citeturn26search6turn16search0  
3. Decide recovery:
   * If idempotent, retry may be safe [Inference].
   * If external call failed, fix endpoint/certificate chain issues; Microsoft warns incomplete TLS certificate chains can break sandbox HTTPS negotiation. citeturn31search1
