# Pre vs. post operation stage selection

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 368-385
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 8. Architectural decision trees

---

### Pre vs. post operation stage selection

```
What does the plugin need to do?
├── REJECT invalid operations → PreValidation (10)
│   Cheapest cancellation, outside transaction
├── MODIFY entity values before save → PreOperation (20)
│   Changes to InputParameters["Target"] are persisted
├── READ the ID of a newly created record → PostOperation (40)
│   OutputParameters["id"] available only here
├── CREATE related records after main operation → PostOperation (40, sync)
│   Within transaction, rolls back together if error
├── SEND notifications or call external APIs → PostOperation (40, async)
│   Outside transaction, no user wait, retry support
└── MODIFY query results before return → PreOperation (20) for RetrieveMultiple
    Modify the Query in InputParameters, or PostOperation to filter OutputParameters
```
