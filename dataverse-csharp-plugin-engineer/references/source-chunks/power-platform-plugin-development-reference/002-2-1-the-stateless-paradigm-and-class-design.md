# 2.1 The Stateless Paradigm and Class Design

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 23-28
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **2.1 The Stateless Paradigm and Class Design**

The Dataverse platform utilizes a caching mechanism for plugin assemblies to optimize performance. When a plugin is triggered, the platform instantiates the plugin class and caches this instance in memory within the Sandbox Worker Process (w3wp.exe or dedicated worker). Subsequent requests, even from different users or transactions, may reuse this same class instance on different threads.1

This execution model mandates that **no request-specific state be stored in class-level fields or properties**. Storing state at the class level introduces race conditions where data from User A's transaction can be overwritten or read by User B's transaction. All state must be scoped locally to the Execute method.
