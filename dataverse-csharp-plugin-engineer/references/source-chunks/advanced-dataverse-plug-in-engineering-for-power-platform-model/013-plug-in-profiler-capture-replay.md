# Plug-in profiler: capture + replay

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 278-292
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Debugging workflow

---

### Plug-in profiler: capture + replay

Because online plug-ins execute on a remote server, you cannot attach a debugger to the server process; Microsoft’s supported approach is plug-in profiler capture + local replay. citeturn17view0turn16search5

**Capture**  
1. Install profiler (PRT or Power Platform Tools). Installing creates a managed solution named “Plug-in Profiler”. citeturn17view0  
2. In PRT, select the step and choose **Start Profiling**. citeturn17view0  
3. Trigger the event in the model-driven app; the profile is persisted as a “Plug-in Profile” row in Dataverse. citeturn17view0  

**Replay + debug**  
1. In PRT, choose **Debug** and select the captured profile. citeturn17view0  
2. Load your local assembly (the DLL you are debugging). citeturn17view0  
3. Set breakpoints in Visual Studio. citeturn17view0  
4. Start execution (see attachment methods below). citeturn17view0
