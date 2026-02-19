# Filtering attributes usage decision

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 386-398
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 8. Architectural decision trees

---

### Filtering attributes usage decision

```
Is the plugin registered on the Update message?
├── YES → ALWAYS set filtering attributes
│         ├── List ONLY the columns your logic depends on
│         ├── NEVER include the primary key (always present, negates filter)
│         └── Note: triggers on attribute PRESENCE, not value change
└── NO → Filtering attributes do not apply (only Update-related messages)
```

---
