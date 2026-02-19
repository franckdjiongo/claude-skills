# Transaction boundary rules

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 70-75
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 2. The plugin execution pipeline processes every Dataverse operation in four stages

---

### Transaction boundary rules

Synchronous PostOperation plugins extend the database transaction's lifetime. Any exception thrown at Stages 20 or 40 (sync) causes a **complete rollback** of the entire operation including all prior stage work. Asynchronous plugins at Stage 40 run after the transaction commits; their failures create failed System Jobs but do not affect the original operation.

---
