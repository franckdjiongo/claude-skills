# Directory structure

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 30-62
- Parent headings: Practical C# plugin code reference for Power Platform model-driven apps for early 2026 > Project setup reference

---

### Directory structure

```text
repo-root/
  Directory.Packages.props
  Directory.Build.props
  src/
    Contoso.Plugins/
      Contoso.Plugins.csproj
      Contoso.Plugins.snk                # optional; required only for non-package registration
      Common/
        PluginBase.cs
        DataverseConstants.cs
      Plugins/
        Account/
          AutoNumberOnCreate.cs
        Contact/
          SyncFieldsOnUpdate.cs
        Shared/
          SharedVariablesProducer.cs
          SharedVariablesConsumer.cs
  tests/
    Contoso.Plugins.Tests/
      Contoso.Plugins.Tests.csproj
      PluginPipelineTests.cs
  build/
    github/
      deploy.yml
  solutions/
    Contoso.Managed/
      (solution project folders produced by pac solution unpack/pack)
```
