# 11.1 Azure Application Insights Integration

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 600-607
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **11.1 Azure Application Insights Integration**

Dataverse supports native integration with Application Insights. This exports telemetry (Plugin execution time, Exceptions, Dependency calls) to Azure.

* **Setup:** Link the Dataverse environment to an Application Insights resource in the Power Platform Admin Center.  
* **ILogger:** The ILogger interface is available in the service provider (dependent on the specific SDK version and setup, though ITracingService allows writing to the telemetry stream via Trace).  
* **Kusto Queries (KQL):** You can query the dependencies and exceptions tables in Azure Monitor to visualize plugin performance and failure rates across the entire organization.49
