# Rollback strategies in synchronous pipelines

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 148-158
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Advanced plug-in patterns

---

### Rollback strategies in synchronous pipelines

Synchronous plug-ins registered in PreOperation/PostOperation can be **inside the database transaction**; Microsoft’s guidance explicitly states that an exception thrown at any synchronous stage within the transaction will roll back the entire transaction. citeturn34view0turn1search1 Additionally, PreValidation may be outside transaction for the initial operation, but can be in-transaction when called as a subsequent operation inside another customization path. citeturn1search10turn34view0

Agent-grade rollback strategies:

* Use **PreValidation** to detect “business veto” and throw `InvalidPluginExecutionException` early. citeturn34view0turn8view0  
* In **PreOperation/PostOperation (sync)**, treat *any* side effect that can’t be rolled back (HTTP calls, external writes) as dangerous; if necessary, move into async or use a business-event pattern. citeturn26search9turn14view0  
* Keep synchronous logic short to reduce lock duration. Microsoft notes synchronous extensions (plug-ins and synchronous workflows) extend transaction length and lock duration. citeturn1search1turn26search9  
* If PostOperation sync must create related records and you want rollback semantics, do it there; but avoid updating the same entity in message to prevent new Update triggers. citeturn34view0turn1search10
