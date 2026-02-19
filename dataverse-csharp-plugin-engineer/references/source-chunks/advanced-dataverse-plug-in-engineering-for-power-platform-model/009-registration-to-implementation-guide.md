# Registration-to-implementation guide

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 176-194
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Custom API reference

---

### Registration-to-implementation guide

**Design and registration options (primary paths)**

1. **Power Apps (maker portal)**: create Custom API, then add request parameters and response properties. Microsoft warns many fields can’t be changed after creation; breaking changes may require delete/recreate. citeturn35search18turn9view0  
2. **Plug-in Registration Tool (designer)**: PRT includes a Custom API designer. citeturn0search17turn9view0  
3. **Code-first** (SDK/Web API): create Custom API rows programmatically; Microsoft provides an end-to-end sample that creates Custom API + parameter + response property in one operation and associates it to a solution using `SolutionUniqueName`. citeturn10view0  

**Parameter matrix (agent-ready quick reference)**

| Topic | Setting | Options | What it changes | Operational guidance |
|---|---|---|---|---|
| Binding | `BindingType` | Global / Entity / EntityCollection citeturn9view0 | URL shape, implicit parameters (`Target` auto-created for Entity) citeturn9view0 | Use Entity when operation is “about one row”; Global for cross-table operations. |
| Invocation type | `IsFunction` | Function (`GET`) / Action (`POST`) citeturn9view0 | HTTP verb, metadata visibility; Functions require response property citeturn9view0 | Prefer Action if Power Automate must call it. citeturn9view0 |
| Extensibility | `AllowedCustomProcessingStepType` | None / Async Only / Sync and Async citeturn9view0 | Whether others can add steps; whether they can cancel/modify behavior | For “business event” design, follow Microsoft’s Async Only guidance. citeturn9view0turn14view0 |
| Security | `ExecutePrivilegeName` | Existing privilege name citeturn9view0 | Who may invoke | Use existing privileges; you can’t create new ones (outside Microsoft). citeturn9view0 |
| Public surface | `IsPrivate` | true/false citeturn9view0 | Appears in `$metadata`; code generation eligibility | Keep private until stable; publish as public when committed. citeturn9view0 |
| Managed customization | `IsCustomizable` | true/false citeturn9view0turn10view0 | Whether consumers can modify definition | Microsoft recommends shipping managed and setting IsCustomizable false to prevent breaking edits. citeturn9view0turn10view0 |
