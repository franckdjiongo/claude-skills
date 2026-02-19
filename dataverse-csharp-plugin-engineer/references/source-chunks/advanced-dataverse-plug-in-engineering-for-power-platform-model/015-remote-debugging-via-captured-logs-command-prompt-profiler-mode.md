# Remote debugging via captured logs / command prompt profiler mode

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 302-310
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Debugging workflow

---

### Remote debugging via captured logs / command prompt profiler mode

Microsoft describes running `PluginProfiler.Debugger.exe` from a Command Prompt with parameters to get a profile log (useful for customer environments), then replaying locally. citeturn17view0

**Procedure**  
1. On the machine with PRT tools, set working directory to `PluginRegistration.exe` folder. citeturn17view0  
2. Run `PluginProfiler.Debugger.exe /?` to view parameters and capture a profile. citeturn17view0  
3. Transfer the profile log to your dev machine and replay in PRT. citeturn17view0
