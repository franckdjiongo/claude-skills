# 9.2 Modern: Dependent Assemblies

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 559-569
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **9.2 Modern: Dependent Assemblies**

Dataverse now supports **Dependent Assemblies**. You can upload a NuGet package (containing the plugin DLL and its dependencies) directly to the PluginPackage table.

**Implementation Steps:**

1. **Project File:** Use SDK-style .csproj. Add \<CopyLocalLockFileAssemblies\>true\</CopyLocalLockFileAssemblies\> to ensure dependencies are in the build output.  
2. **Pack:** Use the Power Platform CLI: pac plugin pack. This creates a .nupkg.  
3. **Register:** Use the Plugin Registration Tool to register the **Package** rather than the Assembly.  
4. **Runtime:** The platform automatically loads the dependent DLLs from the package into the sandbox AppDomain.6
