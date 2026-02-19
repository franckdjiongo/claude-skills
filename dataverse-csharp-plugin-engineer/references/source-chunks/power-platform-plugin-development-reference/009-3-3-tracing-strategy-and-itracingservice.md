# 3.3 Tracing Strategy and ITracingService

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 215-238
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **3.3 Tracing Strategy and ITracingService**

The ITracingService is the primary debugging tool for plugins running in the sandbox where traditional debuggers cannot attach.

* **Usage Pattern:** Trace the "Story" of the execution. Log the entry, the primary entity ID, the depth, and the values of key variables affecting decision logic.  
* **Structured Logging:** While the trace log is unstructured text, adopting a structured format (JSON-like) within the message aids in parsing logs using tools like the **Plugin Trace Viewer**.  
  * *Example:* \[Context\] Entity: account, ID: {guid}, Depth: 1  
* **Correlation:** The IPluginExecutionContext.CorrelationId property persists across the entire request chain. If Plugin A triggers Plugin B, both will share the same Correlation ID. Always log this ID to stitch together traces from complex chains.18  
* **Configuration:** Traces are written to the PluginTraceLog table. By default, Dataverse only saves logs if an exception occurs. To see logs for successful runs, the environment setting "Plug-in and custom workflow activity tracing" must be set to **All**. For production, **Exception** is the recommended setting to conserve storage.11

C\#

// Example of defensive tracing  
tracingService.Trace("Checking Validation Rules for Account: {0}", context.PrimaryEntityId);  
if (conditionMet)  
{  
    tracingService.Trace("Rule A met. Proceeding.");  
}  
else  
{  
    tracingService.Trace("Rule A failed. Validation Error will be thrown.");  
    throw new InvalidPluginExecutionException("Rule A failed.");  
}
