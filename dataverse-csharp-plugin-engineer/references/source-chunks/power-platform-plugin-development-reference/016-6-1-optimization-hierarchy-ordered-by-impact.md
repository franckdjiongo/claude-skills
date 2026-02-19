# 6.1 Optimization Hierarchy (Ordered by Impact)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 350-366
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **6.1 Optimization Hierarchy (Ordered by Impact)**

1. **Filtering Attributes (Critical Impact)**  
   * *Mechanism:* Dataverse checks the "Filtering Attributes" list during an Update event. If the list is empty, the plugin fires on *every* update (including system-driven updates like LastOnHoldTime). If populated, it fires *only* when those specific fields change.  
   * *Result:* Reduces unnecessary execution volume by orders of magnitude.5  
2. **Entity Images (High Impact)**  
   * *Mechanism:* Images are snapshots of the record passed directly to the plugin context from the database transaction log.  
   * *Optimization:* Instead of calling service.Retrieve(id) to get a value not in the Target (the delta), register a **Pre-Image**. This provides the data with zero network overhead.  
   * *Result:* Eliminates at least one DB roundtrip per execution.18  
3. **Context Depth Check (Medium Impact)**  
   * *Mechanism:* Logic that updates a record often triggers the same plugin recursively.  
   * *Optimization:* Check context.Depth \> 1 at the beginning of the Execute method to abort recursive calls if not intended.  
   * *Result:* Prevents infinite loops and StackOverflow exceptions.4  
4. **No-Code Offloading (Modern Pattern)**  
   * *Mechanism:* Evaluating if logic (e.g., sending an email) can be handled by Power Automate (Async) or Low-Code Plugins.  
   * *Optimization:* Offloading non-transactional logic reduces the weight of the synchronous transaction.
