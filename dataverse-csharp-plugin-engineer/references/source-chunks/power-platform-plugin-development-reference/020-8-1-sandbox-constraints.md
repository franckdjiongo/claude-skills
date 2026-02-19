# 8.1 Sandbox Constraints

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 491-497
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **8.1 Sandbox Constraints**

* **Protocol:** Only **HTTP** and **HTTPS**. No raw TCP/UDP socket access.  
* **Endpoints:** Access to localhost (loopback) and direct IP addresses is blocked. DNS resolution is mandatory.  
* **Firewall:** The destination server must whitelist the **PowerPlatformPlex** service tag (Azure IP ranges) if it restricts inbound traffic.38  
* **Timeout:** The platform enforces a rigid 2-minute timeout for the entire message. However, the external HTTP call should have a much shorter timeout (e.g., 15s) to avoid hanging the user interface.2
