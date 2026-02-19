# 5.3 Code Example: QueryExpression with Joins (Solving N+1)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 311-343
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

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
