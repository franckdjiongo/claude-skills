# Versioning strategies compatible with solution layering

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 513-517
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6

---

### Versioning strategies compatible with solution layering

* Use `pac solution version --strategy GitTags` (or other) to align solution build version with Git history; PAC CLI notes GitTags strategy uses `PacCli.PAT` token. citeturn23view0  
* For plug-in assemblies in managed solutions, treat assembly version as a deployment behavior switch: build/revision is an in-place upgrade; major/minor creates parallel assemblies and leaves existing steps pointing at the old one until updated. citeturn5view0
