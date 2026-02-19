# Registration configuration (pac + spkl)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 556-574
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > Custom API implementation

---

### Registration configuration (pac + spkl)

Create scaffolding with `pac plugin init` and deploy with `pac plugin push`. citeturn12view0turn10search0 Use `pac tool prt` to launch the Plug-in Registration Tool when needed. citeturn10search2turn8view0

If you maintain plug-in registrations via `spkl`, its reference `spkl.json` structure includes a `plugins` section pointing at assembly paths. citeturn32view0turn11search18 A minimal, plug-in-only `spkl.json` for deployment (example):

```json
{
  "plugins": [
    {
      "profile": "default,release",
      "assemblypath": "src\\Contoso.Plugins\\bin\\Release"
    }
  ]
}
```

(Reference format and keys are consistent with the template `spkl.json` published in the official repository. citeturn32view0)
