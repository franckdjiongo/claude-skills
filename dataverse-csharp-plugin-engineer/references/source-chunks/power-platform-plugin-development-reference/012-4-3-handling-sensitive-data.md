# 4.3 Handling Sensitive Data

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 278-282
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **4.3 Handling Sensitive Data**

* **Secure Configuration:** Never hardcode secrets (API Keys, Connection Strings) in the C\# code. Use the **Secure Configuration** field in the Plugin Registration Tool. The platform stores this value in a separate, encrypted table (SdkMessageProcessingStepSecureConfig) accessible only to System Administrators.1  
* **Logging Hygiene:** Avoid logging sensitive payloads (InputParameters containing passwords or PII) to the ITracingService. The PluginTraceLog is visible to anyone with the System Administrator or System Customizer role.11
