# How Custom APIs differ from classic plug-in messages

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 161-175
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Custom API reference

---

### How Custom APIs differ from classic plug-in messages

A Custom API creates a **new Dataverse message** invokable via Web API or SDK for .NET, comparable to built-in messages (Create/Update/etc.). citeturn9view0turn34view0 The key differences versus classic “table event” messages:

* **Registration model**: You define the Custom API and its request/response metadata as Dataverse rows (`CustomAPI`, request parameters, response properties). citeturn9view0turn10view0  
* **Binding**: Custom API BindingType can be:
  * Global (unbound)
  * Entity (bound to a single record, implicit `Target` EntityReference created automatically)
  * EntityCollection (bound to a collection) citeturn9view0  
* **Function vs action**: Custom API can be an OData Function (`GET`, must return at least one response property) or Action (`POST`). The Dataverse connector for Power Automate “only enables performing actions”, so if Power Automate must call it, prefer an Action. citeturn9view0  
* **Privileges**: You can require an existing privilege by setting `ExecutePrivilegeName`, but Microsoft notes developers can’t create new privileges (outside Microsoft); use an existing one. citeturn9view0  
* **Extensibility policy**: `AllowedCustomProcessingStepType` controls whether other plug-ins can register on your custom API message (None, Async Only, Sync and Async). Microsoft recommends “Async Only” when using the business events pattern. citeturn9view0turn14view0  
* **Main operation handler**: You can attach a plug-in type as the main operation (`PluginTypeId`). The handler reads request parameters from `InputParameters` and writes response properties to `OutputParameters`. citeturn9view0turn8view0  
* **Debugging caveat**: Profiler debugging of the “main operation” plug-in for Custom API isn’t currently supported in the PRT; Microsoft documents a workaround: register the plug-in on PostOperation for the custom API message so the profiler can target a step. citeturn9view0turn17view0
