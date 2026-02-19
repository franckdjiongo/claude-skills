# IPlugin — the sole entry point

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/C# plugin development for Dataverse - exhaustive technical reference.md`
- Source lines: 78-89
- Parent headings: C# plugin development for Dataverse: exhaustive technical reference > 3. Core interfaces reference

---

### IPlugin — the sole entry point

**Namespace:** `Microsoft.Xrm.Sdk` | **Assembly:** `Microsoft.Xrm.Sdk.dll`

```csharp
public interface IPlugin {
    void Execute(IServiceProvider serviceProvider);
}
```

The platform supports three constructor overloads: parameterless, one-string (unsecure config), and two-string (unsecure + secure config). The constructor runs **once** per cached instance. The assembly must target **.NET Framework 4.6.2** (with 4.8 runtime support planned for June 2026).
