# Assembly versioning and plugin packages

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 334-348
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 7. Entity model patterns and the type conversion cheatsheet

---

### Assembly versioning and plugin packages

Assemblies for Dataverse online must use **Database** storage and **Sandbox** isolation. Strong naming (SNK signing) is required for standalone assemblies but **not required** when using plugin packages.

**Version resolution rules:**

| Version Change | Behavior |
|---|---|
| Build or Revision change (1.0.0.0 → 1.0.1.0) | **In-place upgrade**—old version replaced, steps auto-re-pointed |
| Major or Minor change (1.0.0.0 → 1.1.0.0) | **New assembly**—old version persists, steps must be manually migrated |

**Plugin packages** (`.nupkg`) are the modern, supported approach for dependency management. They store assemblies in the `PluginPackage` table (file storage), support unsigned assemblies, and replace the unsupported ILMerge pattern. Microsoft explicitly states: **"We don't support ILMerge."** Package name and version cannot be changed once created. Maximum: 16 MB per package, 50 assemblies.

---
