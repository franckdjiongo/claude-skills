# 3.2 Stage-by-Stage Propagation Rules

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 198-214
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **3.2 Stage-by-Stage Propagation Rules**

Understanding the "point of no return" in the execution pipeline is critical for deciding when to validate data and throw exceptions.

1. **Pre-Validation (Synchronous, Outside Transaction):**  
   * **Behavior:** Exceptions thrown here prevent the database transaction from starting.  
   * **Implication:** This is the most efficient stage for validation (e.g., checking privileges or field formats). Canceling here incurs zero database rollback cost.16  
2. **Pre-Operation (Synchronous, Inside Transaction):**  
   * **Behavior:** The main operation is enqueued in the transaction but not yet committed.  
   * **Implication:** Exceptions here roll back the main operation. Ideal for logic that modifies the Target entity before save.  
3. **Post-Operation (Synchronous, Inside Transaction):**  
   * **Behavior:** The main operation and all Pre-events have completed.  
   * **Implication:** An exception here rolls back **everything**, including the main record save and any cascading effects. This is expensive and should be used only when logic depends on the generated ID (e.g., creating child records).17  
4. **Asynchronous (Post-Operation, Separate Transaction):**  
   * **Behavior:** The main operation has already succeeded and committed. The plugin runs in a separate transaction.  
   * **Implication:** Exceptions do **not** roll back the main operation. They result in a "Failed" System Job. Logic must be designed to handle eventual consistency or use compensation logic if the async step fails.16
