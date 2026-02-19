# Breaking changes log for 2022–2025

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 590-602
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Breaking changes log for 2022–2025 and advanced troubleshooting decision tree

---

### Breaking changes log for 2022–2025

| Date | Change | Impact on plug-in development | Migration action |
|---|---|---|---|
| 27 July 2022 | Dependent Assemblies for plug-ins announced (preview) to avoid ILMerge and package dependencies into a NuGet package. citeturn32search1 | Enables supported multi-assembly dependency delivery; reduces need for ILMerge (which Microsoft does not support). citeturn32search0 | Move from ILMerge to plug-in packages (NuGet) containing plug-in + dependencies; store resources (e.g., JSON, localized strings) if needed. citeturn32search0turn32search1 |
| 2023–2025 (docs updated) | Virtual table custom data providers run in MainOperation stage 30 and are registered differently (no specific step); configured via `EntityDataProvider`. citeturn36view0 | Agents must not attempt to “register steps” for provider plug-ins; debugging and lifecycle differs from ordinary plug-ins. citeturn36view0 | Use the provider tables + PRT provider registration model; implement CRUD plug-ins per provider pattern. citeturn36view0 |
| 2023–2025 (documented) | Execution order is explicitly lowest-to-highest; same value ordering is not guaranteed and can be random. citeturn5view0 | Undocumented or incidental ordering dependencies break unpredictably after imports/updates. citeturn5view0 | Enforce rank discipline; use SharedVariables contracts rather than relying on same-rank ordering. citeturn5view0turn8view0 |
| 2023–2025 (documented) | Post-operation stage value 50 is marked deprecated (SDK stage guidance). citeturn2view0turn32search16 | Legacy registrations may use a deprecated stage enumeration; future platform evolution risk. citeturn32search16 | Use supported stages (10/20/40); re-register steps accordingly. citeturn32search16turn34view0 |
| 2023–2025 (documented) | Solution/assembly versioning behaviour: build/revision change = in-place; major/minor change = treated as different assembly; existing steps continue to reference old assembly. citeturn5view0 | Plug-in updates can silently not apply if version bump strategy is wrong; orphaned behaviour in prod. citeturn5view0 | Use build/revision increments for compatible updates; if major/minor must change, update step registrations to point to new plugin type before exporting/importing. citeturn5view0 |
| 2025 (ALM docs) | Solution concepts emphasise managed vs unmanaged lifecycle and dependencies. citeturn18search1 | Production drift and layering issues if unmanaged edits are made downstream. citeturn18search1 | Treat dev as source of truth; deploy managed downstream; avoid direct edits in prod. citeturn18search1turn23view0 |

Note: Some operational changes (for example, restrictions on unregistering/disabling Microsoft out-of-box system plug-ins) are described in current Microsoft documentation but are not reliably dated to 2022–2025 in the accessible source metadata; apply as current-state constraints when automating remediation. citeturn5view0
