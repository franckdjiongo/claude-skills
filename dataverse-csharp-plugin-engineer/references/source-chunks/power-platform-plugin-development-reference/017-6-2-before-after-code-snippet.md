# 6.2 Before/After Code Snippet

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 367-407
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

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
