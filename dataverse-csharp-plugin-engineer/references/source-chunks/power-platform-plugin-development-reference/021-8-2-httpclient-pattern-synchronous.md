# 8.2 HttpClient Pattern (Synchronous)

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 498-538
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **8.2 HttpClient Pattern (Synchronous)**

Since plugins often run synchronously, and HttpClient is designed for async/await, developers must carefully bridge the gap to avoid deadlocks. The using statement ensures the client is disposed, and ConnectionClose prevents socket exhaustion.

C\#

using System.Net.Http;

// In Plugin Execute method  
using (var client \= new HttpClient())  
{  
    // 1\. Set a strict timeout (Fail Fast)  
    client.Timeout \= TimeSpan.FromSeconds(15);  
      
    // 2\. Disable KeepAlive.  
    // The Sandbox does not support persistent connections efficiently.  
    // Failing to do this can lead to port exhaustion.  
    client.DefaultRequestHeaders.ConnectionClose \= true; 

    // 3\. Sync Bridge  
    // Use.GetAwaiter().GetResult() to block the thread safely.  
    // Avoid.Result which can aggregate exceptions differently.  
    try   
    {  
        HttpResponseMessage response \= client.GetAsync("https://api.contoso.com/webhook").GetAwaiter().GetResult();  
          
        if (\!response.IsSuccessStatusCode)  
        {  
            tracingService.Trace($"External call failed: {response.StatusCode}");  
            throw new InvalidPluginExecutionException("External validation failed.");  
        }  
    }  
    catch (HttpRequestException ex)  
    {  
        tracingService.Trace($"Network Error: {ex.Message}");  
        throw new InvalidPluginExecutionException("Unable to contact external service.");  
    }  
}

.38
