# Stage-by-stage data availability matrix

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 55-69
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 2. The plugin execution pipeline processes every Dataverse operation in four stages

---

### Stage-by-stage data availability matrix

| Capability | PreValidation (10) | PreOperation (20) | PostOperation (40) |
|---|---|---|---|
| Read InputParameters | ✅ | ✅ | ✅ |
| Modify InputParameters | ✅ | ✅ | ✅ (no effect on saved data) |
| Read OutputParameters | ❌ | ❌ | ✅ |
| Modify OutputParameters | ❌ | ❌ | ✅ |
| PreEntityImages | ✅ (if record exists) | ✅ | ✅ |
| PostEntityImages | ❌ | ❌ | ✅ |
| Cancel operation | ✅ (cheapest) | ✅ (causes rollback) | ✅ (full rollback) |
| IsInTransaction | Usually false* | true | true (sync) / false (async) |

*PreValidation runs outside the transaction for top-level operations. However, when triggered by logic inside another stage's transaction (e.g., a Create called from a PostOperation plugin), PreValidation **inherits** that transaction. Always check `context.IsInTransaction` at runtime.
