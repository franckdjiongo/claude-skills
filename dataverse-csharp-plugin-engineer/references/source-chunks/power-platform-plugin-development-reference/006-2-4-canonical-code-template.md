# 2.4 Canonical Code Template

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Power Platform Plugin Development Reference.md`
- Source lines: 53-181
- Parent headings: Technical Reference: C\# Plugin Development for Power Platform Model-Driven Apps > ---

---

### **2.4 Canonical Code Template**

The following template implements these requirements in C\# (compatible with.NET Framework 4.6.2 and C\# 10 features where applicable within the framework constraints).

C\#

using System;  
using System.ServiceModel;  
using Microsoft.Xrm.Sdk;

namespace Contoso.Dataverse.Plugins  
{  
    /// \<summary\>  
    /// Canonical implementation of a Dataverse plugin.  
    /// Implements IPlugin interface and adheres to stateless design patterns.  
    /// \</summary\>  
    public class AccountPreValidationLogic : IPlugin  
    {  
        // Immutable configuration strings are the ONLY permitted class-level fields.  
        private readonly string \_unsecureConfig;  
        private readonly string \_secureConfig;

        /// \<summary\>  
        /// Constructor used by the Plugin Registration Tool.  
        /// \</summary\>  
        /// \<param name="unsecure"\>Unsecure configuration (publicly visible).\</param\>  
        /// \<param name="secure"\>Secure configuration (restricted access).\</param\>  
        public AccountPreValidationLogic(string unsecure, string secure)  
        {  
            \_unsecureConfig \= unsecure;  
            \_secureConfig \= secure;  
        }

        /// \<summary\>  
        /// Entry point for the plugin execution.  
        /// MUST be stateless. No local variables should be defined outside this method scope.  
        /// \</summary\>  
        /// \<param name="serviceProvider"\>The container for platform services.\</param\>  
        public void Execute(IServiceProvider serviceProvider)  
        {  
            if (serviceProvider \== null)  
            {  
                throw new InvalidPluginExecutionException("IServiceProvider cannot be null.");  
            }

            // 1\. Obtain Tracing Service immediately for robust logging.  
            ITracingService tracingService \= (ITracingService)serviceProvider.GetService(typeof(ITracingService));

            try  
            {  
                // 2\. Obtain Execution Context.  
                IPluginExecutionContext context \= (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

                // 3\. Context Validation (Guard Clauses).  
                if (context \== null) throw new InvalidPluginExecutionException("Plugin Execution Context is null.");  
                  
                // Validate Entity (Defensive Check).  
                if (context.PrimaryEntityName\!= "account")  
                {  
                    tracingService.Trace($"Plugin registered on incorrect entity: {context.PrimaryEntityName}. Expected: account.");  
                    return;  
                }

                // Validate Depth to prevent infinite recursion.  
                if (context.Depth \> 1)  
                {  
                    tracingService.Trace($"Recursion detected (Depth: {context.Depth}). Exiting.");  
                    return;  
                }

                // 4\. Obtain Organization Service Factory.  
                IOrganizationServiceFactory serviceFactory \= (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));

                // 5\. Create Organization Service acting as the calling user.  
                // Using context.UserId ensures security roles are enforced.  
                IOrganizationService service \= serviceFactory.CreateOrganizationService(context.UserId);

                tracingService.Trace($"Entered Execute. Message: {context.MessageName}, Entity: {context.PrimaryEntityId}, User: {context.UserId}");

                // 6\. Execute Core Logic.  
                ExecuteBusinessLogic(context, service, tracingService);  
            }  
            catch (InvalidPluginExecutionException)  
            {  
                // Rethrow explicitly to show user-friendly error dialogs.  
                throw;  
            }  
            catch (FaultException\<OrganizationServiceFault\> ex)  
            {  
                // Wrap service faults (e.g. SQL errors, privilege errors) in InvalidPluginExecutionException.  
                throw new InvalidPluginExecutionException($"Dataverse Service Error: {ex.Message}", ex);  
            }  
            catch (Exception ex)  
            {  
                // Catch generic runtime errors (NullReference, IndexOutOfRange).  
                tracingService?.Trace($"Unhandled Exception: {ex}");  
                throw new InvalidPluginExecutionException($"An unexpected error occurred in the Account Plugin: {ex.Message}", ex);  
            }  
        }

        /// \<summary\>  
        /// Encapsulated business logic.   
        /// All dependencies (Context, Service, Trace) are passed as parameters.  
        /// \</summary\>  
        private void ExecuteBusinessLogic(IPluginExecutionContext context, IOrganizationService service, ITracingService trace)  
        {  
            // InputParameter Validation: Ensure "Target" exists and is an Entity.  
            if (context.InputParameters.Contains("Target") && context.InputParameters is Entity targetEntity)  
            {  
                // Logic: Validate Account Name.  
                if (targetEntity.Contains("name"))  
                {  
                    string name \= targetEntity.GetAttributeValue\<string\>("name");  
                    trace.Trace($"Validating Account Name: {name}");

                    if (name.Contains("Blocklist", StringComparison.OrdinalIgnoreCase))  
                    {  
                        throw new InvalidPluginExecutionException("The Account name contains restricted terms.");  
                    }  
                }  
            }  
            else  
            {  
                trace.Trace("Context did not contain a Target Entity. Logic skipped.");  
            }  
        }  
    }  
}
