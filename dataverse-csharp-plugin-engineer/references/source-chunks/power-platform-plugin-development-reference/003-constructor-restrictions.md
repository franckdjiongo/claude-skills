# Constructor Restrictions

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 29-35
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > --- > 2.1 The Stateless Paradigm and Class Design

---

#### **Constructor Restrictions**

The IPlugin interface allows for a constructor, but the platform restricts its signature. The constructor is the only place where configuration data (strings passed from the Plugin Registration Tool) can be accepted. Dependency injection via constructor is not supported natively by the platform instantiation logic.

* **Permitted:** public MyPlugin(string unsecure, string secure)  
* **Prohibited:** public MyPlugin(IOrganizationService service) — The service is not available at construction time; it must be obtained from the IServiceProvider during execution.1
