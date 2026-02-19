# Advanced troubleshooting decision tree

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 603-636
- Parent headings: Import to prod as managed with deployment settings for env vars / conn refs. citeturn19search3turn22search6 > Breaking changes log for 2022–2025 and advanced troubleshooting decision tree

---

### Advanced troubleshooting decision tree

Text flowchart: **symptom → diagnosis → resolution**

**User sees immediate error on save / create / update**  
→ Check if step is **synchronous** (PreValidation/PreOperation/PostOperation). Synchronous exceptions roll back transaction. citeturn34view0turn1search1  
→ If yes: query `PluginTraceLog` for latest exception with matching `CorrelationId`. citeturn16search0turn7search0  
→ If trace indicates validation: ensure it throws `InvalidPluginExecutionException` in PreValidation (preferred) and message is user-safe. citeturn34view0turn8view0  
→ If trace indicates timeout/performance: add filtering attributes, reduce queries, split side effects to async/business event pattern. citeturn5view0turn26search9turn14view0  

**Logic executes twice unexpectedly**  
→ Confirm message is Update and whether specialized update operations can call plug-ins twice. citeturn34view0  
→ Enforce idempotence: guard using detected changed attributes, Pre/Post images, and ensure step filtering attributes are set. citeturn5view0turn8view0turn24view0  

**Two plug-ins on same message behave non-deterministically**  
→ Inspect step **Execution Order**; if equal, ordering is not guaranteed. citeturn5view0  
→ Fix: assign explicit ranks (lowest-to-highest) and pass shared data via `SharedVariables` (serializable). citeturn5view0turn8view0turn3view1  

**Async automation missing / delayed**  
→ Identify whether logic is async plug-in or flow. Async plug-ins are stored as `AsyncOperation` (system jobs). citeturn26search0turn26search1  
→ Check system job failure/queue backlog; remember execution is queued and not strictly CreatedOn-order. citeturn26search0  
→ If failed: open log details; tracing appears in system job details for async plug-ins that throw exceptions. citeturn26search6  

**Power Automate loop triggered by plug-in-driven updates**  
→ Use Dataverse trigger conditions to prevent runs when “updated-by-flow/plugin” marker is present (for example, a status flag). Trigger conditions prevent flow from running unnecessarily. citeturn15search1turn15search0  
→ Consider moving cross-system orchestration to business events (custom API + “When an action is performed” trigger) to reduce coupling and simplify plug-in sync logic. citeturn14view0turn9view0  

**Custom API works but cannot be profiled**  
→ If main-operation handler attached via Custom API `PluginTypeId`, profiler step selection may not be available; Microsoft documents workaround: register plug-in type on PostOperation stage for the custom API message to profile/debug. citeturn9view0turn17view0  

**Virtual table provider returns wrong data or errors**  
→ Confirm provider plug-ins are registered as virtual table data providers (not ordinary steps) and run in stage 30; ensure query translation handles `QueryExpression` in RetrieveMultiple. citeturn36view0  
→ Throw correct provider exceptions (authentication, invalid query, timeout) for predictable caller behaviour. citeturn36view0
