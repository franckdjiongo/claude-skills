# 2. The plugin execution pipeline processes every Dataverse operation in four stages

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 9-54
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference

---

## 2. The plugin execution pipeline processes every Dataverse operation in four stages

Every `OrganizationRequest` entering Dataverse traverses a deterministic event pipeline. The platform invokes registered synchronous plugins sequentially at each stage, ordered by their `Rank` (execution order) value. Asynchronous plugins are queued after pipeline completion.

```
Client Request (OrganizationRequest)
    │
    ▼
┌──────────────────────────────────────┐
│  Stage 10: PreValidation             │  ← Usually OUTSIDE DB transaction
│  • InputParameters: readable/writable│
│  • PreEntityImages: available        │
│  • Cancel here = cheapest rollback   │
└──────────────┬───────────────────────┘
               │
    ═══════════╪═══════════════════════ DB TRANSACTION BEGINS
               │
┌──────────────▼───────────────────────┐
│  Stage 20: PreOperation              │  ← INSIDE DB transaction
│  • InputParameters: readable/writable│
│  • PreEntityImages: available        │
│  • Best place to modify entity values│
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Stage 30: MainOperation             │  ← INTERNAL (Custom API only)
│  • Platform writes to database       │
│  • OutputParameters set here         │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│  Stage 40: PostOperation (SYNC)      │  ← INSIDE DB transaction
│  • OutputParameters: now readable    │
│  • PreImages + PostImages available  │
│  • Exception = full rollback         │
└──────────────┬───────────────────────┘
               │
    ═══════════╪═══════════════════════ DB TRANSACTION COMMITS
               │
┌──────────────▼───────────────────────┐
│  Stage 40: PostOperation (ASYNC)     │  ← OUTSIDE DB transaction
│  • Queued to Asynchronous Service    │
│  • Cannot roll back original op      │
└──────────────────────────────────────┘
```
