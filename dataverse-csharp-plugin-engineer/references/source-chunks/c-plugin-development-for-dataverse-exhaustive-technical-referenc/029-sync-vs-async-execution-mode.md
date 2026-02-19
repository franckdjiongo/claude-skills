# Sync vs. async execution mode

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 351-367
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 8. Architectural decision trees

---

### Sync vs. async execution mode

```
Does the plugin enforce data integrity or validation rules?
├── YES → SYNCHRONOUS
│         ├── Is it pure validation (reject bad input)?
│         │   └── YES → PreValidation (Stage 10) — cheapest cancellation
│         └── Does it modify entity values before save?
│             └── YES → PreOperation (Stage 20)
└── NO
    ├── Is the operation critical (must succeed for business logic)?
    │   ├── YES → SYNCHRONOUS PostOperation (Stage 40)
    │   └── NO  → ASYNCHRONOUS PostOperation (Stage 40)
    └── Does it call external services or perform heavy processing?
        └── YES → ASYNCHRONOUS PostOperation (Stage 40)
```
