# 9.1 Legacy: ILMerge

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 552-558
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **9.1 Legacy: ILMerge**

Historically, developers used ILMerge to weave dependency DLLs (like Newtonsoft.Json) into the main plugin assembly.

* **Issues:** It is officially unsupported. It breaks assembly signing. It complicates debugging.  
* **Status:** **Deprecated**. Do not use for new development.6
