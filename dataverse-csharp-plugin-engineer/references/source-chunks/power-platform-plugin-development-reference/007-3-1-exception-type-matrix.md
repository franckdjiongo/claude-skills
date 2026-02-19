# 3.1 Exception Type Matrix

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 188-197
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **3.1 Exception Type Matrix**

The Dataverse platform recognizes InvalidPluginExecutionException as a specific signal to interrupt the pipeline with a managed error message. All other exceptions are treated as unexpected system failures.

| Exception Type | Description | Synchronous Behavior | Asynchronous Behavior |
| :---- | :---- | :---- | :---- |
| **InvalidPluginExecutionException** | Intended for business logic validation (e.g., "Duplicate Name"). | **Rolls back** the transaction. Displays the exception message to the user in a model dialog. | Logs error to System Job. **Retries** execution if configured with OperationStatus.Retry.16 |
| **FaultException\<OrganizationServiceFault\>** | Raised by the IOrganizationService when a data operation fails (e.g., "Constraint Violation"). | **Rolls back** the transaction. Displays a generic SQL/Service error unless wrapped. | Logs error to System Job. Stops execution (Failed status). |
| **Exception (System)** | Runtime errors (e.g., NullReferenceException). | **Rolls back** the transaction. User sees "An unexpected error occurred." Trace log captures stack trace. | Logs error to System Job. Stops execution (Failed status). |
