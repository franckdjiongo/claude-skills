# Debugging asynchronous plug-ins

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Advanced Dataverse plug-in engineering for Power Platform model-driven apps.md`
- Source lines: 311-321
- Parent headings: Advanced Dataverse plug-in engineering for Power Platform model-driven apps > Debugging workflow

---

### Debugging asynchronous plug-ins

Asynchronous steps are queued and executed after the main operation completes. citeturn26search9 Dataverse serializes the context for async extensions and stores it in the System Job (`AsyncOperation`) table; the Async Service processes these jobs. citeturn26search0

**Agent procedure for async failures**  
1. Identify System Job:
   * Use `IExecutionContext.OperationId` (it corresponds to `AsyncOperationId`) when available to correlate. citeturn26search2  
   * Otherwise, query `AsyncOperation` (system jobs) for recent failures for the plug-in step. citeturn26search1turn26search0  
2. Extract details: for failed async plug-ins, tracing information appears in the System Job form details, and a log file can be downloaded. citeturn26search6  
3. Replay locally: if profiler-capture is feasible, capture the async step’s profile and replay. (Async steps still execute through the pipeline as synchronous operations when processed by the async service, but outside the original transaction.) citeturn26search0turn34view0
