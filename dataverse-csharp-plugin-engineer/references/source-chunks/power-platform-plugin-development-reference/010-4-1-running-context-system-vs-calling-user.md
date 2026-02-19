# 4.1 Running Context: SYSTEM vs. Calling User

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 245-263
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

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
