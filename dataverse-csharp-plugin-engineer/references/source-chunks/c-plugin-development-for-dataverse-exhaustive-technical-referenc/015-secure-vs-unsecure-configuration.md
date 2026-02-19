# Secure vs. unsecure configuration

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 200-210
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 4. Plugin registration reference

---

### Secure vs. unsecure configuration

| Aspect | Unsecure | Secure |
|---|---|---|
| Visibility | Anyone with step access | System Administrators only |
| Solution export | ✅ Included | ❌ Not included |
| Constructor parameter | First `string` | Second `string` |
| Use case | Feature flags, URLs, thresholds | API keys, connection strings |

---
