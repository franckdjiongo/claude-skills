# Entity image registration rules

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 187-199
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 4. Plugin registration reference

---

### Entity image registration rules

| Message | Pre-Image | Post-Image |
|---|---|---|
| Create | ❌ (record doesn't exist yet) | ✅ PostOperation only |
| Update (PreValidation/PreOperation) | ✅ | ❌ |
| Update (PostOperation) | ✅ | ✅ |
| Delete (all stages) | ✅ | ❌ (record won't exist after) |
| SetState | ✅ | ✅ PostOperation only |
| Assign | ✅ | ✅ PostOperation only |

Each image is registered with an **Entity Alias** (arbitrary string key) and a **column selection**. The default selects all columns—**never use the default**; select only needed columns. Images are accessed via `context.PreEntityImages["alias"]` and `context.PostEntityImages["alias"]`.
