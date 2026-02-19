# Managed vs unmanaged decision logic

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 332-339
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > ALM and solution structure guide

---

### Managed vs unmanaged decision logic

Power Platform ALM documentation defines unmanaged solutions for development and managed solutions for distribution/testing/production. citeturn18search1 For Custom APIs specifically, Microsoft recommends shipping in a managed solution and setting the **Is Customizable** managed property to `false` to prevent consumers from altering or deleting the API definition, which could break dependent code. citeturn9view0turn10view0

**Decision tree (text)**  
If environment is dev (source of truth) → use unmanaged. citeturn18search1  
If environment is test/prod (downstream) → import managed, lock custom APIs (`IsCustomizable=false`) and avoid manual edits to plug-in registrations [Inference]. citeturn18search1turn9view0
