# Core deployment primitives (official tools only)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 365-374
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > CI/CD pipeline reference

---

### Core deployment primitives (official tools only)

**Power Platform CLI (pac)** supplies:

* `pac plugin init` (create plug-in class library) and `pac plugin push` (import plug-in into Dataverse) citeturn21view0  
* `pac solution export/import/upgrade/version/create-settings` and `--stage-and-upgrade` and `--activate-plugins` flags. citeturn23view0  
* `pac solution create-settings` builds a deployment settings JSON for connection references + environment variables, and `pac solution import --settings-file` applies it. citeturn23view0turn19search3  

Power Platform GitHub Actions repository (official) provides reusable actions for solution export/build/deploy. citeturn22search1turn22search5 Azure DevOps Build Tools tasks are documented on Microsoft Learn. citeturn22search2turn19search3
