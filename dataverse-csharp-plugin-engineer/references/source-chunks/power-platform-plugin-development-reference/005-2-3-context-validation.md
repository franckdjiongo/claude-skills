# 2.3 Context Validation

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 45-52
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **2.3 Context Validation**

Defensive programming requires validating the context immediately. Plugins are often registered generically or copied between steps.

* **Entity Verification**: Ensure context.PrimaryEntityName matches expectation.  
* **Message Verification**: Ensure context.MessageName (e.g., "Create", "Update") is supported.  
* **Depth Check**: Verify context.Depth to prevent infinite loops caused by the plugin triggering itself recursively.14
