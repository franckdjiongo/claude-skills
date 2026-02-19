# 10.2 Timezone Handling

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 584-593
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **10.2 Timezone Handling**

Dataverse stores all DateTime fields in UTC (Universal Time Coordinated).

* **Input:** Users enter data in their local time (e.g., EST). The UI converts this to UTC before sending it to the server.  
* **Plugin:** The plugin receives the **UTC** value.  
* **Anti-Pattern:** Using DateTime.Now. This returns the server's local time (often UTC, but not guaranteed).  
* **Canonical Pattern:** Always use DateTime.UtcNow.  
* **Formatting:** If the plugin writes a date to a text field (e.g., an email body), it must convert the UTC time to the user's local time using the LocalTimeFromUtcTimeRequest to ensure the user sees the correct time.47
