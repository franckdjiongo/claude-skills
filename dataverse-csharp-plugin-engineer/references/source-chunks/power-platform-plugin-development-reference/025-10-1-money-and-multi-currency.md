# 10.1 Money and Multi-Currency

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 576-583
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **10.1 Money and Multi-Currency**

Dataverse stores currency values in two forms: the Transaction Currency (user's input) and the Base Currency (organization default).

* **Money Type:** The Money class wraps a decimal. It does not inherently know the currency symbol.  
* **Calculation Rule:** Do not perform math between Money fields unless you are certain they share the same TransactionCurrencyId.  
* **Best Practice:** When performing backend calculations (e.g., credit limit checks), perform operations on the **Base** fields (e.g., creditlimit\_base) to ensure a normalized comparison.45
