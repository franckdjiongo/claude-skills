# Upgrade vs update strategy (solutions and plug-in assemblies)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 340-348
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > ALM and solution structure guide

---

### Upgrade vs update strategy (solutions and plug-in assemblies)

For solutions, Microsoft provides explicit update/upgrade guidance (import options and version semantics). citeturn18search0turn23view0 For plug-in assemblies in managed solutions, Microsoft documents assembly version behavior:

* If only build or revision changes, importing updated solution performs an in-place upgrade: old assembly removed and steps updated to reference new version. citeturn5view0  
* If major or minor changes, Dataverse treats it as a different assembly; existing steps continue to reference the prior version until manually updated. citeturn5view0  

This is critical for autonomous agents: **a bump of major/minor without step migration is a production-breaking deployment** [Inference].
