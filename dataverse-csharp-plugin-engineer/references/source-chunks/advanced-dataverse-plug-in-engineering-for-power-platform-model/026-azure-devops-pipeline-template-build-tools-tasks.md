# Azure DevOps pipeline template (Build Tools tasks)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 465-478
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > CI/CD pipeline reference

---

### Azure DevOps pipeline template (Build Tools tasks)

Microsoft’s Build Tools tasks include an installer task and import/export tasks; deployment settings files can pre-populate connection references and environment variables. citeturn22search2turn19search3 The Build Tools import-solution task supports “Activate Plugins” and “Stage and Upgrade”. citeturn22search6turn23view0

```yaml
trigger:
- main

pool:
  vmImage: 'windows-latest'

steps:
- checkout: self
