# Pipeline mental model, chains, and deterministic ordering

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 9-20
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Advanced plug-in patterns

---

### Pipeline mental model, chains, and deterministic ordering

Dataverse processes each message through pipeline stages (PreValidation, PreOperation, MainOperation [internal], PostOperation). citeturn34view0 You can register multiple plug-in steps on the same message and stage; Dataverse will execute them according to **Execution Order** (aka step rank), from **lowest to highest**. citeturn5view0turn3view1 If multiple plug-ins share the same Execution Order for the same stage/message/table, Microsoft explicitly warns the actual order “isn’t guaranteed and can be random”, so any dependency must be made explicit via ordering or via SharedVariables/contracts. citeturn5view0

Operational implications for a “plugin chain”:

* Prefer **one responsibility per step** (validation, enrichment, side effects) and pin them with a rank range convention (for example, 10–19 = validation, 20–39 = enrichment, 40–59 = orchestration, 90+ = integration) [Inference]. The key is that the **agent must enforce rank discipline** because order is a deployment-time property (`SdkMessageProcessingStep.rank`). citeturn3view1turn5view0  
* Place **data mutation** (changing the `Target` values) in **PreOperation** because it occurs within the transaction and is the recommended place to change values for an entity in the message. citeturn34view0turn8view0  
* Place **cancellation/validation** in **PreValidation** when possible. Microsoft explicitly warns that cancelling in PreOperation causes rollback and “significant performance impact”, and recommends throwing `InvalidPluginExecutionException` in PreValidation to cancel. citeturn34view0turn8view0  
* Treat **PostOperation** synchronous steps as “still in transaction”; avoid updating the same entity in the handler because this triggers a new Update event. citeturn34view0  
* Remember that plug-ins and workflows registered for **Update can be called twice in certain cases** (specialized update operations); robust chains must be idempotent. citeturn34view0
