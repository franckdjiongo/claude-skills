# 8.3 Fallback to Messaging

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 539-545
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **8.3 Fallback to Messaging**

For robust architecture, avoid synchronous HTTP calls in the transaction path.

* **Webhooks:** Register a Webhook in Dataverse. The platform posts the context to your endpoint asynchronously.  
* **Azure Service Bus:** Use the native Service Endpoint registration to push the context to a Queue or Topic. This decouples the transaction from the external processing.41
