# Late-bound vs. early-bound decision tree

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 297-310
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 7. Entity model patterns and the type conversion cheatsheet

---

### Late-bound vs. early-bound decision tree

```
Does the plugin operate on a KNOWN, FIXED set of entities?
├── YES → Do you need compile-time safety and IntelliSense?
│         ├── YES → Use EARLY-BOUND (pac modelbuilder build)
│         └── NO  → Late-bound is acceptable
└── NO (generic plugin, works across entities) → Use LATE-BOUND (Entity class)
```

**Early-bound** classes are generated via `pac modelbuilder build` (recommended) or the legacy `CrmSvcUtil.exe`. Key `pac modelbuilder` flags: `--entitynamesfilter` (always specify—omitting generates all tables), `--emitfieldsclasses` (generates attribute name constants), `--suppressINotifyPattern` (recommended unless building WPF). Generated classes inherit from `Entity` and can always be used interchangeably with late-bound code via `entity.ToEntity<Account>()`.

**Performance note:** Early-bound has slight overhead from `OnPropertyChanging`/`OnPropertyChanged` notifications; suppress with `--suppressINotifyPattern` for plugin use.
