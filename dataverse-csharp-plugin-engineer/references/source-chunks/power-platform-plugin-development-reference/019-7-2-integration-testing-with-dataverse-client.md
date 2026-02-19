# 7.2 Integration Testing with Dataverse.Client

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 469-484
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

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
