# 7.1 Unit Testing with FakeXrmEasy

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 414-468
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

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
