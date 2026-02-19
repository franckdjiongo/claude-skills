# 4.2 Injection Risks

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 264-277
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

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
