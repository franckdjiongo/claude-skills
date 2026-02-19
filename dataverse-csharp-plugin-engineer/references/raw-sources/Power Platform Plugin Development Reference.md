# **Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps**

## **1\. Executive Summary**

This technical reference establishes the definitive standards for developing, securing, optimizing, and maintaining C\# plugins within the Microsoft Dataverse environment. It is designed for autonomous agents and expert developers requiring a rigorous understanding of the server-side extension framework used in Power Platform model-driven applications.

The Dataverse plugin infrastructure operates within a constrained, multi-tenant sandbox environment. This necessitates strict adherence to specific architectural patterns to ensure stability, security, and performance. The analysis of the platform's execution model indicates that **statelessness** is the single most critical architectural constraint; violation of this principle leads to thread-safety issues and data corruption in high-concurrency scenarios.1

Security hardening is paramount. The distinction between the UserId (the authenticated context) and the InitiatingUserId (the original caller) is the primary defense against privilege escalation attacks. Furthermore, the handling of IOrganizationServiceFactory to create service proxies requires explicit intent—creating a service with null (SYSTEM context) is a powerful capability that must be restricted to specific backend operations to prevent security bypasses.3

Performance optimization relies heavily on minimizing the I/O footprint. The most effective strategies involve the use of **Pre-Entity and Post-Entity Images** to eliminate redundant Retrieve calls and the rigorous application of **Filtering Attributes** to prevent unnecessary execution cycles. Failure to implement these optimizations is a leading cause of SQL timeouts and "Sandbox Worker process crashed" errors.4

Modern development practices have shifted from legacy ILMerge techniques to the **Dependent Assembly** capability, allowing for cleaner management of shared libraries via NuGet. Similarly, testing strategies have evolved to prioritize "Shift Left" methodologies using the FakeXrmEasy framework for high-velocity unit testing, complemented by integration testing using the Microsoft.PowerPlatform.Dataverse.Client SDK.6

This document provides the canonical patterns, decision trees, and code templates necessary to construct production-grade plugins that are resilient, secure, and optimized for enterprise scale.

## ---

**2\. Canonical Plugin Structure**

The structural integrity of a plugin determines its lifecycle stability within the Dataverse sandbox. A well-structured plugin acts as a stateless unit of logic that intercepts the event execution pipeline, processes the context, and creates side effects via the Organization Service.

### **2.1 The Stateless Paradigm and Class Design**

The Dataverse platform utilizes a caching mechanism for plugin assemblies to optimize performance. When a plugin is triggered, the platform instantiates the plugin class and caches this instance in memory within the Sandbox Worker Process (w3wp.exe or dedicated worker). Subsequent requests, even from different users or transactions, may reuse this same class instance on different threads.1

This execution model mandates that **no request-specific state be stored in class-level fields or properties**. Storing state at the class level introduces race conditions where data from User A's transaction can be overwritten or read by User B's transaction. All state must be scoped locally to the Execute method.

#### **Constructor Restrictions**

The IPlugin interface allows for a constructor, but the platform restricts its signature. The constructor is the only place where configuration data (strings passed from the Plugin Registration Tool) can be accepted. Dependency injection via constructor is not supported natively by the platform instantiation logic.

* **Permitted:** public MyPlugin(string unsecure, string secure)  
* **Prohibited:** public MyPlugin(IOrganizationService service) — The service is not available at construction time; it must be obtained from the IServiceProvider during execution.1

### **2.2 The Service Provider and Context**

The Execute method receives a single argument: IServiceProvider. This provider is the gateway to the host environment. Four critical services must be extracted immediately:

1. **IPluginExecutionContext**: Contains the state of the transaction (InputParameters, Pre/Post Images, SharedVariables). It describes *what* happened (Message: Update, Entity: Account).9  
2. **ITracingService**: The mechanism for observability. It writes to the Plugin Trace Log. This service handles the complexity of buffering logs and flushing them upon exception or completion.10  
3. **IOrganizationServiceFactory**: A factory used to create instances of the IOrganizationService. It facilitates "impersonation" by accepting a UserId.12  
4. **IOrganizationService**: The proxy for data operations. It handles the SOAP/WCF communication with the underlying SQL layers of Dataverse.13

### **2.3 Context Validation**

Defensive programming requires validating the context immediately. Plugins are often registered generically or copied between steps.

* **Entity Verification**: Ensure context.PrimaryEntityName matches expectation.  
* **Message Verification**: Ensure context.MessageName (e.g., "Create", "Update") is supported.  
* **Depth Check**: Verify context.Depth to prevent infinite loops caused by the plugin triggering itself recursively.14

### **2.4 Canonical Code Template**

The following template implements these requirements in C\# (compatible with.NET Framework 4.6.2 and C\# 10 features where applicable within the framework constraints).

C\#

using System;  
using System.ServiceModel;  
using Microsoft.Xrm.Sdk;

namespace Contoso.Dataverse.Plugins  
{  
    /// \<summary\>  
    /// Canonical implementation of a Dataverse plugin.  
    /// Implements IPlugin interface and adheres to stateless design patterns.  
    /// \</summary\>  
    public class AccountPreValidationLogic : IPlugin  
    {  
        // Immutable configuration strings are the ONLY permitted class-level fields.  
        private readonly string \_unsecureConfig;  
        private readonly string \_secureConfig;

        /// \<summary\>  
        /// Constructor used by the Plugin Registration Tool.  
        /// \</summary\>  
        /// \<param name="unsecure"\>Unsecure configuration (publicly visible).\</param\>  
        /// \<param name="secure"\>Secure configuration (restricted access).\</param\>  
        public AccountPreValidationLogic(string unsecure, string secure)  
        {  
            \_unsecureConfig \= unsecure;  
            \_secureConfig \= secure;  
        }

        /// \<summary\>  
        /// Entry point for the plugin execution.  
        /// MUST be stateless. No local variables should be defined outside this method scope.  
        /// \</summary\>  
        /// \<param name="serviceProvider"\>The container for platform services.\</param\>  
        public void Execute(IServiceProvider serviceProvider)  
        {  
            if (serviceProvider \== null)  
            {  
                throw new InvalidPluginExecutionException("IServiceProvider cannot be null.");  
            }

            // 1\. Obtain Tracing Service immediately for robust logging.  
            ITracingService tracingService \= (ITracingService)serviceProvider.GetService(typeof(ITracingService));

            try  
            {  
                // 2\. Obtain Execution Context.  
                IPluginExecutionContext context \= (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

                // 3\. Context Validation (Guard Clauses).  
                if (context \== null) throw new InvalidPluginExecutionException("Plugin Execution Context is null.");  
                  
                // Validate Entity (Defensive Check).  
                if (context.PrimaryEntityName\!= "account")  
                {  
                    tracingService.Trace($"Plugin registered on incorrect entity: {context.PrimaryEntityName}. Expected: account.");  
                    return;  
                }

                // Validate Depth to prevent infinite recursion.  
                if (context.Depth \> 1)  
                {  
                    tracingService.Trace($"Recursion detected (Depth: {context.Depth}). Exiting.");  
                    return;  
                }

                // 4\. Obtain Organization Service Factory.  
                IOrganizationServiceFactory serviceFactory \= (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));

                // 5\. Create Organization Service acting as the calling user.  
                // Using context.UserId ensures security roles are enforced.  
                IOrganizationService service \= serviceFactory.CreateOrganizationService(context.UserId);

                tracingService.Trace($"Entered Execute. Message: {context.MessageName}, Entity: {context.PrimaryEntityId}, User: {context.UserId}");

                // 6\. Execute Core Logic.  
                ExecuteBusinessLogic(context, service, tracingService);  
            }  
            catch (InvalidPluginExecutionException)  
            {  
                // Rethrow explicitly to show user-friendly error dialogs.  
                throw;  
            }  
            catch (FaultException\<OrganizationServiceFault\> ex)  
            {  
                // Wrap service faults (e.g. SQL errors, privilege errors) in InvalidPluginExecutionException.  
                throw new InvalidPluginExecutionException($"Dataverse Service Error: {ex.Message}", ex);  
            }  
            catch (Exception ex)  
            {  
                // Catch generic runtime errors (NullReference, IndexOutOfRange).  
                tracingService?.Trace($"Unhandled Exception: {ex}");  
                throw new InvalidPluginExecutionException($"An unexpected error occurred in the Account Plugin: {ex.Message}", ex);  
            }  
        }

        /// \<summary\>  
        /// Encapsulated business logic.   
        /// All dependencies (Context, Service, Trace) are passed as parameters.  
        /// \</summary\>  
        private void ExecuteBusinessLogic(IPluginExecutionContext context, IOrganizationService service, ITracingService trace)  
        {  
            // InputParameter Validation: Ensure "Target" exists and is an Entity.  
            if (context.InputParameters.Contains("Target") && context.InputParameters is Entity targetEntity)  
            {  
                // Logic: Validate Account Name.  
                if (targetEntity.Contains("name"))  
                {  
                    string name \= targetEntity.GetAttributeValue\<string\>("name");  
                    trace.Trace($"Validating Account Name: {name}");

                    if (name.Contains("Blocklist", StringComparison.OrdinalIgnoreCase))  
                    {  
                        throw new InvalidPluginExecutionException("The Account name contains restricted terms.");  
                    }  
                }  
            }  
            else  
            {  
                trace.Trace("Context did not contain a Target Entity. Logic skipped.");  
            }  
        }  
    }  
}

## ---

**3\. Error Handling Reference**

The handling of exceptions in Dataverse plugins dictates the user experience and the integrity of the database transaction. The platform behaves differently depending on the pipeline stage (Sync vs. Async) and the type of exception thrown.

### **3.1 Exception Type Matrix**

The Dataverse platform recognizes InvalidPluginExecutionException as a specific signal to interrupt the pipeline with a managed error message. All other exceptions are treated as unexpected system failures.

| Exception Type | Description | Synchronous Behavior | Asynchronous Behavior |
| :---- | :---- | :---- | :---- |
| **InvalidPluginExecutionException** | Intended for business logic validation (e.g., "Duplicate Name"). | **Rolls back** the transaction. Displays the exception message to the user in a model dialog. | Logs error to System Job. **Retries** execution if configured with OperationStatus.Retry.16 |
| **FaultException\<OrganizationServiceFault\>** | Raised by the IOrganizationService when a data operation fails (e.g., "Constraint Violation"). | **Rolls back** the transaction. Displays a generic SQL/Service error unless wrapped. | Logs error to System Job. Stops execution (Failed status). |
| **Exception (System)** | Runtime errors (e.g., NullReferenceException). | **Rolls back** the transaction. User sees "An unexpected error occurred." Trace log captures stack trace. | Logs error to System Job. Stops execution (Failed status). |

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

## ---

**4\. Security Hardening Checklist**

Plugins execute with high privileges within the Dataverse backend. A compromise in plugin logic can lead to privilege escalation or data leakage.

### **4.1 Running Context: SYSTEM vs. Calling User**

The IOrganizationServiceFactory allows the creation of a service proxy for any user, provided the plugin has the correct identity.

* **context.UserId (Calling User):**  
  * *Usage:* serviceFactory.CreateOrganizationService(context.UserId)  
  * *Best Practice:* Default for all operations. This ensures that the platform enforces the security roles, team memberships, and field-level security profiles of the user who initiated the action. If the user doesn't have permission to update a record, the plugin will fail (correctly) with a security error.10  
* **null (SYSTEM User):**  
  * *Usage:* serviceFactory.CreateOrganizationService(null)  
  * *Risk:* This creates a proxy with **System Administrator** privileges. It bypasses all security checks.  
  * *Valid Use Case:* Performing backend calculations on data the user cannot see (e.g., aggregating "Salary" for a "Department Budget" field) or writing to a proprietary log table.  
  * *Anti-Pattern:* Using SYSTEM context solely to avoid debugging "Access Denied" errors. This is a privilege escalation vulnerability.3  
* **context.InitiatingUserId:**  
  * *Usage:* Used for auditing or logic checks, not typically for service creation.  
  * *Scenario:* User A (Initiator) triggers a Workflow owned by User B. The Workflow triggers a Plugin.  
    * context.UserId \= User B (Workflow Owner)  
    * context.InitiatingUserId \= User A (Original Trigger)  
  * *Security check:* Validate InitiatingUserId if you need to know who *really* pushed the button.20

### **4.2 Injection Risks**

Dynamic query construction is a primary vector for injection attacks, particularly when using FetchXML.

* **QueryExpression (Safe):** The SDK's object model (QueryExpression, ConditionExpression) is inherently safe from injection because values are treated as parameters, not executable code. It is the preferred method for dynamic queries.22  
* **FetchXML (Vulnerable):** FetchXML is constructed as a string. If user input is concatenated directly into the XML string, malicious users can inject additional XML nodes.  
  * *Attack Vector:*  
    C\#  
    // VULNERABLE  
    string fetch \= "\<condition attribute='name' operator='eq' value='" \+ userInput \+ "' /\>";

    Input: ' /\>\<filter type='or'\>\<condition attribute='secret' operator='not-null'...  
  * *Mitigation:* Always encode user input using System.Security.SecurityElement.Escape(userInput) before concatenation. This converts special characters (e.g., \< to \<).23

### **4.3 Handling Sensitive Data**

* **Secure Configuration:** Never hardcode secrets (API Keys, Connection Strings) in the C\# code. Use the **Secure Configuration** field in the Plugin Registration Tool. The platform stores this value in a separate, encrypted table (SdkMessageProcessingStepSecureConfig) accessible only to System Administrators.1  
* **Logging Hygiene:** Avoid logging sensitive payloads (InputParameters containing passwords or PII) to the ITracingService. The PluginTraceLog is visible to anyone with the System Administrator or System Customizer role.11

## ---

**5\. Data Access Patterns**

Data access latency is the primary bottleneck in plugin execution. The choice of query mechanism affects both performance and maintainability.

### **5.1 Comparison: QueryExpression vs. FetchXML vs. LINQ**

| Feature | QueryExpression | FetchXML | LINQ |
| :---- | :---- | :---- | :---- |
| **Primary Use Case** | Dynamic, strongly-typed queries in plugins. | Complex reporting, aggregates, hierarchical queries. | Rapid prototyping, simple static queries. |
| **Performance** | **High**. Native SDK object model. No parsing overhead. | **Medium**. Requires XML parsing and conversion. | **Low**. Abstraction layer adds overhead; converts to QueryExpression internally. |
| **Aggregates** | No (Limited). | **Yes**. Full support for Group By, Sum, Count, Avg. | No (Limitations in provider). |
| **Joins** | Yes (LinkEntity). | Yes (link-entity). | Yes (join), but can produce inefficient query plans. |
| **Safety** | **Injection Safe**. | **Injection Risk** (String manipulation). | **Safe** (Compiler verified). |
| **Recommendation** | **Default for Plugins.** | Use for **Aggregates** or complex hierarchical views. | Avoid in high-performance paths. |

22

### **5.2 Anti-Patterns Table**

| Anti-Pattern | Analysis | Correct Approach |
| :---- | :---- | :---- |
| **new ColumnSet(true)** | Retrieves **all** columns. Wastes memory, bandwidth, and SQL I/O. Increases payload size, potentially hitting sandbox limits. | Explicitly list columns: new ColumnSet("firstname", "lastname").2 |
| **N+1 Query Problem** | Iterating through a result set and performing a separate Retrieve for each record. Causes exponential database load (1000 records \= 1001 queries). | Use LinkEntity (Joins) to retrieve related data in a single query.29 |
| **Leading Wildcards** | Queries like "%Criteria". Prevents SQL index usage, forcing full table scans on the database. | Use StartsWith ("Criteria%") or Dataverse Search.28 |
| **Retrieving Target** | Performing a service.Retrieve on the entity ID currently being processed. | Use the **Target** InputParameter or **Pre-Entity Images** to get data without a DB call.2 |

### **5.3 Code Example: QueryExpression with Joins (Solving N+1)**

The following example demonstrates retrieving Contact records joined with their parent Account information in a single query, using aliased attributes to access the joined data.

C\#

// Scenario: Get all active Contacts and their Parent Account's Telephone.  
QueryExpression query \= new QueryExpression("contact");  
query.ColumnSet \= new ColumnSet("fullname");   
query.Criteria.AddCondition("statecode", ConditionOperator.Equal, 0); // Active

// Join to Account  
LinkEntity accountLink \= query.AddLink("account", "parentcustomerid", "accountid", JoinOperator.LeftOuter);  
accountLink.Columns \= new ColumnSet("name", "telephone1");  
accountLink.EntityAlias \= "parent\_acct"; // Alias is crucial for retrieval

EntityCollection results \= service.RetrieveMultiple(query);

foreach (Entity contact in results.Entities)  
{  
    // Accessing base entity attribute  
    string contactName \= contact.GetAttributeValue\<string\>("fullname");

    // Accessing Joined (Aliased) Attribute  
    // Key format: "alias.attributename"  
    if (contact.Contains("parent\_acct.telephone1"))  
    {  
        var phone \= (string)((AliasedValue)contact\["parent\_acct.telephone1"\]).Value;  
    }  
}

.31

## ---

**6\. Performance Optimization Guide**

Plugins run in a transaction with a 2-minute hard timeout. However, for synchronous plugins affecting the UI, execution times exceeding 2 seconds are perceptible and detrimental to user experience.

### **6.1 Optimization Hierarchy (Ordered by Impact)**

1. **Filtering Attributes (Critical Impact)**  
   * *Mechanism:* Dataverse checks the "Filtering Attributes" list during an Update event. If the list is empty, the plugin fires on *every* update (including system-driven updates like LastOnHoldTime). If populated, it fires *only* when those specific fields change.  
   * *Result:* Reduces unnecessary execution volume by orders of magnitude.5  
2. **Entity Images (High Impact)**  
   * *Mechanism:* Images are snapshots of the record passed directly to the plugin context from the database transaction log.  
   * *Optimization:* Instead of calling service.Retrieve(id) to get a value not in the Target (the delta), register a **Pre-Image**. This provides the data with zero network overhead.  
   * *Result:* Eliminates at least one DB roundtrip per execution.18  
3. **Context Depth Check (Medium Impact)**  
   * *Mechanism:* Logic that updates a record often triggers the same plugin recursively.  
   * *Optimization:* Check context.Depth \> 1 at the beginning of the Execute method to abort recursive calls if not intended.  
   * *Result:* Prevents infinite loops and StackOverflow exceptions.4  
4. **No-Code Offloading (Modern Pattern)**  
   * *Mechanism:* Evaluating if logic (e.g., sending an email) can be handled by Power Automate (Async) or Low-Code Plugins.  
   * *Optimization:* Offloading non-transactional logic reduces the weight of the synchronous transaction.

### **6.2 Before/After Code Snippet**

**Before (Inefficient):**

C\#

// Trigger: Update of Contact  
// Problem: Retrieve call inside plugin; No filtering check in code (relies on registration).  
public void Execute(IServiceProvider serviceProvider)  
{  
    IPluginExecutionContext context \=...;  
    IOrganizationService service \=...;  
    Entity target \= (Entity)context.InputParameters;  
      
    // Expensive: Network Call to DB  
    Entity fullContact \= service.Retrieve("contact", target.Id, new ColumnSet("emailaddress1"));  
      
    if (fullContact.Contains("emailaddress1")) {... }  
}

**After (Optimized):**

C\#

// Trigger: Update of Contact  
// Assumption: 'PreImage' registered containing 'emailaddress1'  
public void Execute(IServiceProvider serviceProvider)  
{  
    IPluginExecutionContext context \=...;  
      
    // Zero Cost: Data already in memory  
    Entity preImage \= context.PreEntityImages.Contains("PreImage")   
                     ? context.PreEntityImages\["PreImage"\]   
                      : null;

    if (preImage\!= null && preImage.Contains("emailaddress1"))   
    {  
        string email \= preImage.GetAttributeValue\<string\>("emailaddress1");  
    }  
}

## ---

**7\. Testing Strategy**

Autonomous development requires a robust automated testing strategy. We utilize **FakeXrmEasy** for unit testing (fast, isolated) and **Microsoft.PowerPlatform.Dataverse.Client** for integration testing (real environment).

### **7.1 Unit Testing with FakeXrmEasy**

FakeXrmEasy is the industry-standard mocking framework for Dataverse. It implements an in-memory database that mimics the IOrganizationService, allowing tests to run without a connection to Dataverse.

**Mocking Concepts:**

* **Proxy Types:** Tests should generally use Entity (late-bound) or generate Early Bound types. FakeXrmEasy supports both.  
* **Pipeline Simulation:** The framework can simulate the entire pipeline (messages, stages, images) or just the Execute method.

**Unit Test Structure Template:**

C\#

using FakeXrmEasy;  
using Microsoft.Xrm.Sdk;  
using Microsoft.VisualStudio.TestTools.UnitTesting;  
using System;

public class ContactPluginTests  
{  
     
    public void Verify\_Business\_Logic\_On\_Create()  
    {  
        // 1\. Setup the Faked Context (In-Memory Database)  
        var fakedContext \= new XrmFakedContext();  
          
        // 2\. Define Initial State (if updating) or Input (if creating)  
        var target \= new Entity("contact")  
        {  
            Id \= Guid.NewGuid(),  
            \["firstname"\] \= "John",  
            \["lastname"\] \= "Doe"  
        };

        // 3\. Setup Plugin Execution Context  
        var plugCtx \= fakedContext.GetDefaultPluginContext();  
        plugCtx.MessageName \= "Create";  
        plugCtx.Stage \= 20; // Pre-Operation  
        plugCtx.InputParameters \= target;

        // 4\. Simulate Pre-Images (if needed for Update tests)  
        // plugCtx.PreEntityImages\["PreImage"\] \= new Entity("contact") {... };

        // 5\. Execute the Plugin  
        // The middleware injects the mocked service and context automatically.  
        fakedContext.ExecutePluginWith\<ContactPreOperationLogic\>(plugCtx);

        // 6\. Assertions  
        // Verify the Target was modified (for Pre-Operation)  
        Assert.AreEqual("JOHN", target\["firstname"\]); // Assuming logic uppercases names  
    }  
}

.7

### **7.2 Integration Testing with Dataverse.Client**

Integration tests verify that the plugin is correctly registered and functions within the actual Dataverse environment. These tests connect to a sandbox environment.

**Configuration:**

Use ServiceClient with a connection string or Client Secret. Ensure the test user has appropriate security roles.

**Integration Test Approach:**

1. **Connect:** Initialize ServiceClient.37  
2. **Arrange:** Create test prerequisites (e.g., an Account) using the service.  
3. **Act:** Trigger the plugin (e.g., service.Create(contact)).  
4. **Assert:** Retrieve the record and verify side effects (e.g., "Was the Task created?").  
5. **Cleanup:** Delete created records to keep the environment clean.

## ---

**8\. External Services Guide**

Integrating with external APIs (REST endpoints, Azure Functions) from plugins is common but heavily restricted by the Sandbox.

### **8.1 Sandbox Constraints**

* **Protocol:** Only **HTTP** and **HTTPS**. No raw TCP/UDP socket access.  
* **Endpoints:** Access to localhost (loopback) and direct IP addresses is blocked. DNS resolution is mandatory.  
* **Firewall:** The destination server must whitelist the **PowerPlatformPlex** service tag (Azure IP ranges) if it restricts inbound traffic.38  
* **Timeout:** The platform enforces a rigid 2-minute timeout for the entire message. However, the external HTTP call should have a much shorter timeout (e.g., 15s) to avoid hanging the user interface.2

### **8.2 HttpClient Pattern (Synchronous)**

Since plugins often run synchronously, and HttpClient is designed for async/await, developers must carefully bridge the gap to avoid deadlocks. The using statement ensures the client is disposed, and ConnectionClose prevents socket exhaustion.

C\#

using System.Net.Http;

// In Plugin Execute method  
using (var client \= new HttpClient())  
{  
    // 1\. Set a strict timeout (Fail Fast)  
    client.Timeout \= TimeSpan.FromSeconds(15);  
      
    // 2\. Disable KeepAlive.  
    // The Sandbox does not support persistent connections efficiently.  
    // Failing to do this can lead to port exhaustion.  
    client.DefaultRequestHeaders.ConnectionClose \= true; 

    // 3\. Sync Bridge  
    // Use.GetAwaiter().GetResult() to block the thread safely.  
    // Avoid.Result which can aggregate exceptions differently.  
    try   
    {  
        HttpResponseMessage response \= client.GetAsync("https://api.contoso.com/webhook").GetAwaiter().GetResult();  
          
        if (\!response.IsSuccessStatusCode)  
        {  
            tracingService.Trace($"External call failed: {response.StatusCode}");  
            throw new InvalidPluginExecutionException("External validation failed.");  
        }  
    }  
    catch (HttpRequestException ex)  
    {  
        tracingService.Trace($"Network Error: {ex.Message}");  
        throw new InvalidPluginExecutionException("Unable to contact external service.");  
    }  
}

.38

### **8.3 Fallback to Messaging**

For robust architecture, avoid synchronous HTTP calls in the transaction path.

* **Webhooks:** Register a Webhook in Dataverse. The platform posts the context to your endpoint asynchronously.  
* **Azure Service Bus:** Use the native Service Endpoint registration to push the context to a Queue or Topic. This decouples the transaction from the external processing.41

## ---

**9\. Shared Code Patterns**

Enterprise solutions often share logic (helpers, models) across multiple plugins. The strategy for managing these dependencies has evolved.

### **9.1 Legacy: ILMerge**

Historically, developers used ILMerge to weave dependency DLLs (like Newtonsoft.Json) into the main plugin assembly.

* **Issues:** It is officially unsupported. It breaks assembly signing. It complicates debugging.  
* **Status:** **Deprecated**. Do not use for new development.6

### **9.2 Modern: Dependent Assemblies**

Dataverse now supports **Dependent Assemblies**. You can upload a NuGet package (containing the plugin DLL and its dependencies) directly to the PluginPackage table.

**Implementation Steps:**

1. **Project File:** Use SDK-style .csproj. Add \<CopyLocalLockFileAssemblies\>true\</CopyLocalLockFileAssemblies\> to ensure dependencies are in the build output.  
2. **Pack:** Use the Power Platform CLI: pac plugin pack. This creates a .nupkg.  
3. **Register:** Use the Plugin Registration Tool to register the **Package** rather than the Assembly.  
4. **Runtime:** The platform automatically loads the dependent DLLs from the package into the sandbox AppDomain.6

## ---

**10\. Localization and Multi-Currency Considerations**

Plugins in global deployments must handle currency and timezone variances correctly.

### **10.1 Money and Multi-Currency**

Dataverse stores currency values in two forms: the Transaction Currency (user's input) and the Base Currency (organization default).

* **Money Type:** The Money class wraps a decimal. It does not inherently know the currency symbol.  
* **Calculation Rule:** Do not perform math between Money fields unless you are certain they share the same TransactionCurrencyId.  
* **Best Practice:** When performing backend calculations (e.g., credit limit checks), perform operations on the **Base** fields (e.g., creditlimit\_base) to ensure a normalized comparison.45

### **10.2 Timezone Handling**

Dataverse stores all DateTime fields in UTC (Universal Time Coordinated).

* **Input:** Users enter data in their local time (e.g., EST). The UI converts this to UTC before sending it to the server.  
* **Plugin:** The plugin receives the **UTC** value.  
* **Anti-Pattern:** Using DateTime.Now. This returns the server's local time (often UTC, but not guaranteed).  
* **Canonical Pattern:** Always use DateTime.UtcNow.  
* **Formatting:** If the plugin writes a date to a text field (e.g., an email body), it must convert the UTC time to the user's local time using the LocalTimeFromUtcTimeRequest to ensure the user sees the correct time.47

## ---

**11\. Observability Patterns**

Beyond the standard ITracingService, robust observability utilizes Azure Application Insights.

### **11.1 Azure Application Insights Integration**

Dataverse supports native integration with Application Insights. This exports telemetry (Plugin execution time, Exceptions, Dependency calls) to Azure.

* **Setup:** Link the Dataverse environment to an Application Insights resource in the Power Platform Admin Center.  
* **ILogger:** The ILogger interface is available in the service provider (dependent on the specific SDK version and setup, though ITracingService allows writing to the telemetry stream via Trace).  
* **Kusto Queries (KQL):** You can query the dependencies and exceptions tables in Azure Monitor to visualize plugin performance and failure rates across the entire organization.49

## ---

**12\. Common Implementation Bugs**

This table summarizes the most frequent defects found in plugin implementations.

| \# | Bug | Root Cause | Symptom | Fix |
| :---- | :---- | :---- | :---- | :---- |
| **1** | **Infinite Loop** | Plugin updates the same entity it is registered on, triggering itself recursively. | "Maximum depth exceeded" error. | Check context.Depth \> 1 or use SharedVariables to flag processing.14 |
| **2** | **Recursive Update (Post-Op)** | Updating Target in Post-Operation. | Logic runs, but requires extra service.Update call, triggering loops. | Move logic to **Pre-Operation** and update Target directly (no service.Update needed).51 |
| **3** | **Sandbox Worker Crash** | StackOverflow or heavy memory usage (e.g., ColumnSet(true) on large retrieval). | "The plug-in execution failed because the Sandbox Worker process crashed." | Optimize queries; ensure statelessness; avoid large lists in memory.52 |
| **4** | **Time Conversion Error** | Using DateTime.Now or mismatching DateTime.Kind. | "Conversion could not be completed... Kind property not set correctly." | Always use DateTime.UtcNow and ensure Kind is Utc.52 |
| **5** | **Privilege Error** | User lacks permission to update a related record. | "Principal with id... does not have ReadAccess rights." | Use CreateOrganizationService(null) (SYSTEM) for backend-only updates.3 |
| **6** | **Missing Dictionary Key** | Assuming Target contains fields that weren't changed. | KeyNotFoundException accessing InputParameters\["field"\]. | Use Entity.Contains("field") or check PreImage.52 |
| **7** | **Invalid Cast** | Casting Target to Entity on a Delete message (it is EntityReference). | InvalidCastException. | Check context.MessageName and cast appropriately.1 |
| **8** | **Timeout Exception** | Sync operation \> 2 minutes. | "Plug-in execution time exceeded". | Move to Async or optimize queries.4 |
| **9** | **N+1 Query** | Iterating collection with service.Retrieve inside loop. | Slow execution. | Use LinkEntity in QueryExpression.29 |
| **10** | **Thread Safety** | Using class-level fields. | Data corruption; cross-user data leak. | Remove class-level fields; use local variables.2 |
| **11** | **Duplicate Execution** | Registering same step twice in PRT. | Logic runs twice (e.g. duplicate emails). | Audit registrations in Plugin Registration Tool.2 |
| **12** | **Socket Exhaustion** | Not closing external HTTP connections. | External calls fail intermittently. | Set KeepAlive \= false / ConnectionClose \= true.38 |
| **13** | **Generic User Error** | Throwing Exception instead of InvalidPluginExecutionException. | User sees "Unexpected Error". | Throw InvalidPluginExecutionException.53 |
| **14** | **FetchXML Injection** | Concatenating user strings. | Security vulnerability. | Encode input or use QueryExpression.23 |
| **15** | **Blocking I/O** | File operations in Sync. | UI freezes. | Move to Azure Functions or Async.2 |

## ---

**13\. Cited Sources**

1. 1  
   : Microsoft Learn. *Write a plug-in*.  
2. 2  
   : Microsoft Learn. *Best practices and guidance regarding plug-in and workflow development*.  
3. 2  
   : Microsoft Learn. *Best practices: Develop IPlugin implementations as stateless*.  
4. 52  
   : Microsoft Learn. *Troubleshoot plug-ins*.  
5. 17  
   : Microsoft Learn. *Handle exceptions in plug-ins*.  
6. 14  
   : Dataverse Community. *Plugin development: Don't use context.Depth to prevent recursions*.  
7. 9  
   : Microsoft Learn. *Understand the execution context*.  
8. 10  
   : Microsoft Learn. *Tutorial: Write and register a plug-in*.  
9. 11  
   : Microsoft Learn. *Logging and tracing*.  
10. 3  
    : MyTrial365. *Handling User Privilege Errors in Dataverse Plug-ins*.  
11. 12  
    : Microsoft Learn. *IOrganizationServiceFactory.CreateOrganizationService Method*.  
12. 23  
    : StackOverflow. *How to prevent XML injection*.  
13. 6  
    : Microsoft Learn. *Build and package plug-in code*.  
14. 7  
    : Dogma Group. *Unit Testing D365 Using FakeXrmEasy*.  
15. 35  
    : FakeXrmEasy Docs. *Plugin Unit Testing*.  
16. 49  
    : Microsoft Learn. *Application Insights integration*.  
17. 26  
    : Medium. *Query Expression vs FetchXML*.  
18. 40  
    : Microsoft Learn. *Service protection API limits*.  
19. 38  
    : Microsoft Learn. *Access external web services*.  
20. 45  
    : Microsoft Learn. *Types of columns (Currency)*.  
21. 47  
    : Microsoft Learn. *Behavior and format of the Date and Time column*.  
22. 4  
    : Microsoft Learn. *Analyze plug-in performance*.  
23. 29  
    : PlanetScale. *What is N+1 query problem*.  
24. 1  
    : Microsoft Learn. *Pass configuration data to your plug-in*.  
25. 5  
    : Microsoft Learn. *Include filtering attributes with plug-in registration*.  
26. 52  
    : Microsoft Learn. *The given key wasn't present in the dictionary*.  
27. 39  
    : Microsoft Learn. *Online requirements (IP Addresses)*.

#### **Works cited**

1. Write a plug-in (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/write-plug-in](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/write-plug-in)  
2. Developers: Best practices and guidance regarding plug-in and ..., accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/)  
3. Blog 5: Handling User Privilege Errors in Dataverse Plug-ins \- My Trial, accessed February 18, 2026, [https://mytrial365.com/2025/05/08/blog-5-handling-user-privilege-errors-in-dataverse-plug-ins/](https://mytrial365.com/2025/05/08/blog-5-handling-user-privilege-errors-in-dataverse-plug-ins/)  
4. Analyze plug-in performance (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/analyze-performance](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/analyze-performance)  
5. Include filtering attributes with plug-in registration \- Power Apps | Microsoft Learn, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/include-filtering-attributes-plugin-registration](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/include-filtering-attributes-plugin-registration)  
6. Build and package plug-in code \- Power Apps | Microsoft Learn, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/build-and-package](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/build-and-package)  
7. Unit Testing D365 Using Fake XRM Easy | SeeLogic \- Dogma Group, accessed February 18, 2026, [https://dogmagroup.co.uk/unit-testing-d365-using-fake-xrm-easy/](https://dogmagroup.co.uk/unit-testing-d365-using-fake-xrm-easy/)  
8. How to "Pass configuration data to your plug-in" and what's the purpose of the same ? Any real time scenario with example? \- Stack Overflow, accessed February 18, 2026, [https://stackoverflow.com/questions/56393626/how-to-pass-configuration-data-to-your-plug-in-and-whats-the-purpose-of-the-s](https://stackoverflow.com/questions/56393626/how-to-pass-configuration-data-to-your-plug-in-and-whats-the-purpose-of-the-s)  
9. Understand the execution context (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/understand-the-data-context](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/understand-the-data-context)  
10. Tutorial: Write and register a plug-in (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/tutorial-write-plug-in](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/tutorial-write-plug-in)  
11. Logging and tracing (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/logging-tracing](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/logging-tracing)  
12. IOrganizationServiceFactory.CreateOrganizationService(Nullable  
13. Use the SDK for .NET \- Power Apps | Microsoft Learn, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/overview](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/overview)  
14. Plugin development: don't use Context.Depth to prevent recursions\! \- It Ain't Boring, accessed February 18, 2026, [https://www.itaintboring.com/dynamics-crm/plugin-development-dont-use-context-depth-to-prevent-recursions/](https://www.itaintboring.com/dynamics-crm/plugin-development-dont-use-context-depth-to-prevent-recursions/)  
15. General Tips on Dynamics CRM Plugin Development \- Temmy Wahyu Raharjo, accessed February 18, 2026, [https://temmyraharjo.wordpress.com/2021/04/02/general-tips-on-dynamics-crm-plugin-development/](https://temmyraharjo.wordpress.com/2021/04/02/general-tips-on-dynamics-crm-plugin-development/)  
16. Handle exceptions in a plug-in (Microsoft Dataverse) \- Power Apps ..., accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/handle-exceptions](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/handle-exceptions)  
17. Virtual Connectors in Dataverse Not Rollback When Got Error On PostOperation-Sync, accessed February 18, 2026, [https://temmyraharjo.wordpress.com/2022/05/14/virtual-connectors-in-dataverse-not-rollback-when-got-error-on-postoperation-sync/](https://temmyraharjo.wordpress.com/2022/05/14/virtual-connectors-in-dataverse-not-rollback-when-got-error-on-postoperation-sync/)  
18. Dataverse Plugin Development: Simplify Your Plugin Code Using This Way\!, accessed February 18, 2026, [https://temmyraharjo.wordpress.com/2021/10/17/dataverse-plugin-development-simplify-your-plugin-code-using-this-way/](https://temmyraharjo.wordpress.com/2021/10/17/dataverse-plugin-development-simplify-your-plugin-code-using-this-way/)  
19. Question related to executing Plugin with elevated privilege \- Dynamics 365 Community, accessed February 18, 2026, [https://community.dynamics.com/forums/thread/details/?threadid=c1585226-9695-4626-966b-c2d67ffae9c8](https://community.dynamics.com/forums/thread/details/?threadid=c1585226-9695-4626-966b-c2d67ffae9c8)  
20. Evolution of the Dataverse plugin context summary | by Chamara Iresh Wijerathna | Medium, accessed February 18, 2026, [https://medium.com/@chamara.iresh/evolution-of-the-dataverse-plugin-context-summary-bd4d7e23fbb8](https://medium.com/@chamara.iresh/evolution-of-the-dataverse-plugin-context-summary-bd4d7e23fbb8)  
21. Solved: Plugin's InitiatingUserId dilemma \- Dynamics 365 Community, accessed February 18, 2026, [https://community.dynamics.com/forums/thread/details/?threadid=325e4d6d-c711-4fef-9c97-2f7f5144a7ba](https://community.dynamics.com/forums/thread/details/?threadid=325e4d6d-c711-4fef-9c97-2f7f5144a7ba)  
22. Choosing the Right Data Retrieval Method in Dynamics 365: Query Expression, LINQ, FetchXML, or OData? | by Neeraj Agrawal | Medium, accessed February 18, 2026, [https://medium.com/@CRMInnovator/choosing-the-right-data-retrieval-method-in-dynamics-365-query-expression-linq-fetchxml-or-8efd2d11e350](https://medium.com/@CRMInnovator/choosing-the-right-data-retrieval-method-in-dynamics-365-query-expression-linq-fetchxml-or-8efd2d11e350)  
23. c\# \- How to prevent XML injection \- Stack Overflow, accessed February 18, 2026, [https://stackoverflow.com/questions/63605452/how-to-prevent-xml-injection](https://stackoverflow.com/questions/63605452/how-to-prevent-xml-injection)  
24. Fetch XML \- prevent sql injection \- Dynamics 365 Community, accessed February 18, 2026, [https://community.dynamics.com/forums/thread/details/?threadid=0abefcc0-dbce-461d-ac94-0d4c6708d246](https://community.dynamics.com/forums/thread/details/?threadid=0abefcc0-dbce-461d-ac94-0d4c6708d246)  
25. Dynamics CRM: How To Get The Secure and Unsecure Configurations List, accessed February 18, 2026, [https://temmyraharjo.wordpress.com/2021/12/11/dynamics-crm-how-to-get-the-secure-and-unsecure-configurations-list/](https://temmyraharjo.wordpress.com/2021/12/11/dynamics-crm-how-to-get-the-secure-and-unsecure-configurations-list/)  
26. Query Expression vs FetchXML in Microsoft Dynamics 365: A Practical In-Depth Comparison | by Moamen Ashraf | Medium, accessed February 18, 2026, [https://medium.com/@moamen.ashraf1892001/query-expression-vs-fetchxml-in-microsoft-dynamics-365-a-practical-in-depth-comparison-b1935cd7a5f2](https://medium.com/@moamen.ashraf1892001/query-expression-vs-fetchxml-in-microsoft-dynamics-365-a-practical-in-depth-comparison-b1935cd7a5f2)  
27. QueryExpression vs. FetchXml CRM2011 \- linq \- Stack Overflow, accessed February 18, 2026, [https://stackoverflow.com/questions/9182200/queryexpression-vs-fetchxml-crm2011](https://stackoverflow.com/questions/9182200/queryexpression-vs-fetchxml-crm2011)  
28. Query anti-patterns (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/query-antipatterns](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/query-antipatterns)  
29. What is the N+1 Query Problem and How to Solve it? \- PlanetScale, accessed February 18, 2026, [https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it](https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it)  
30. Optimizing Database Queries: Avoiding the N+1 Query Problem | by Michael Kasingye, accessed February 18, 2026, [https://michaelkasingye.medium.com/optimizing-database-queries-avoiding-the-n-1-query-problem-438476198983?source=rss------database-5](https://michaelkasingye.medium.com/optimizing-database-queries-avoiding-the-n-1-query-problem-438476198983?source=rss------database-5)  
31. Optimize performance using QueryExpression \- Power Apps \- Microsoft Learn, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/queryexpression/optimize-performance](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/queryexpression/optimize-performance)  
32. Query data using QueryExpression \- Power Apps \- Microsoft Learn, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/queryexpression/overview](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/queryexpression/overview)  
33. Dataverse Filtering Attributes benchmark \- Temmy Wahyu Raharjo \- WordPress.com, accessed February 18, 2026, [https://temmyraharjo.wordpress.com/2024/06/02/dataverse-filtering-attributes-benchmark/](https://temmyraharjo.wordpress.com/2024/06/02/dataverse-filtering-attributes-benchmark/)  
34. Utilising Pre/Post Entity Images in a Dynamics CRM Plugin, accessed February 18, 2026, [https://community.dynamics.com/blogs/post/?postid=963a0a9f-70d2-43a2-91b0-7b8f34b1a272](https://community.dynamics.com/blogs/post/?postid=963a0a9f-70d2-43a2-91b0-7b8f34b1a272)  
35. Plugins Overview :: FakeXrmEasy Docs, accessed February 18, 2026, [https://dynamicsvalue.github.io/fake-xrm-easy-docs/quickstart/plugins/overview/](https://dynamicsvalue.github.io/fake-xrm-easy-docs/quickstart/plugins/overview/)  
36. Plugin Integration Tests using FakeXrmEasy \- Dreaming in CRM & Power Platform, accessed February 18, 2026, [https://dreamingincrm.com/2016/11/21/plugin-integration-tests-using-fakexrmeasy/](https://dreamingincrm.com/2016/11/21/plugin-integration-tests-using-fakexrmeasy/)  
37. Quickstart: Execute an SDK for .NET request (C\#) (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/quick-start-org-service-console-app](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/org-service/quick-start-org-service-console-app)  
38. Access external web services (Microsoft Dataverse) \- Power Apps ..., accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/access-web-services](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/access-web-services)  
39. Power Platform URLs and IP address ranges \- Microsoft, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-platform/admin/online-requirements](https://learn.microsoft.com/en-us/power-platform/admin/online-requirements)  
40. Service protection API limits (Microsoft Dataverse) \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/api-limits](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/api-limits)  
41. TechTalk Integration patterns for Dataverse \- Dynamics 365 | Microsoft Learn, accessed February 18, 2026, [https://learn.microsoft.com/en-us/dynamics365/guidance/techtalks/integrate-finance-operations-dataverse](https://learn.microsoft.com/en-us/dynamics365/guidance/techtalks/integrate-finance-operations-dataverse)  
42. Integration Patterns for Dataverse | TechTalk \- YouTube, accessed February 18, 2026, [https://www.youtube.com/watch?v=CFG1EpPuFRs](https://www.youtube.com/watch?v=CFG1EpPuFRs)  
43. How to Merge Multiple Plugin Assemblies into One Using ILMerge in Dynamics 365 CE, accessed February 18, 2026, [https://pradipwebmaster.wordpress.com/2025/07/26/how-to-merge-multiple-plugin-assemblies-into-one-using-ilmerge-in-dynamics-365-ce/](https://pradipwebmaster.wordpress.com/2025/07/26/how-to-merge-multiple-plugin-assemblies-into-one-using-ilmerge-in-dynamics-365-ce/)  
44. Dependent Assemblies with Power Platform Tools \- Aric Levin's Digital Transformation Blog, accessed February 18, 2026, [https://www.ariclevin.com/development/post/dependent-assemblies-with-power-platform-tools/](https://www.ariclevin.com/development/post/dependent-assemblies-with-power-platform-tools/)  
45. Column data types in Microsoft Dataverse \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/maker/data-platform/types-of-fields](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/types-of-fields)  
46. Tip \#1396: Multi-currency aggregates in Dataverse \- Dynamics 365 Community, accessed February 18, 2026, [https://community.dynamics.com/blogs/post/?postid=d09fbf59-9f0e-44dc-b902-23c9ae85e0d1](https://community.dynamics.com/blogs/post/?postid=d09fbf59-9f0e-44dc-b902-23c9ae85e0d1)  
47. Behavior and format of the Date and Time column in Microsoft Dataverse \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/maker/data-platform/behavior-format-date-time-field](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/behavior-format-date-time-field)  
48. Dataverse – Convert UTC Time to User Timezone in Plugin \- Temmy Wahyu Raharjo, accessed February 18, 2026, [https://temmyraharjo.wordpress.com/2024/05/04/dataverse-convert-utc-time-to-user-timezone-in-plugin/](https://temmyraharjo.wordpress.com/2024/05/04/dataverse-convert-utc-time-to-user-timezone-in-plugin/)  
49. Overview of integration with Application Insights \- Power Platform | Microsoft Learn, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-platform/admin/overview-integration-application-insights](https://learn.microsoft.com/en-us/power-platform/admin/overview-integration-application-insights)  
50. Improve monitoring of Dataverse plugins using Application insights \- Microsoft Power Platform Blog, accessed February 18, 2026, [https://www.microsoft.com/en-us/power-platform/blog/power-apps/improve-monitoring-of-dataverse-plugins-using-application-insights/](https://www.microsoft.com/en-us/power-platform/blog/power-apps/improve-monitoring-of-dataverse-plugins-using-application-insights/)  
51. Use pre or post stage in Dataverse plugin create and update pipelines? \- Stack Overflow, accessed February 18, 2026, [https://stackoverflow.com/questions/75766474/use-pre-or-post-stage-in-dataverse-plugin-create-and-update-pipelines](https://stackoverflow.com/questions/75766474/use-pre-or-post-stage-in-dataverse-plugin-create-and-update-pipelines)  
52. Troubleshoot Dataverse plug-ins \- Microsoft, accessed February 18, 2026, [https://learn.microsoft.com/en-us/troubleshoot/power-platform/dataverse/plug-in-execution/dataverse-plug-ins-errors](https://learn.microsoft.com/en-us/troubleshoot/power-platform/dataverse/plug-in-execution/dataverse-plug-ins-errors)  
53. Use InvalidPluginExecutionException in plug-ins and workflow activities \- Power Apps, accessed February 18, 2026, [https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/use-invalidpluginexecutionexception-plugin-workflow-activities](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/best-practices/business-logic/use-invalidpluginexecutionexception-plugin-workflow-activities)