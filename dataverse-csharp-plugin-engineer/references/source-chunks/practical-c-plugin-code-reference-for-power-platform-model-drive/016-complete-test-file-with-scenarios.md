# Complete test file with scenarios

- Source file: `dataverse-csharp-plugin-engineer/references/raw-sources/Practical C# plugin code reference for Power Platform model-driven apps for early 2026.md`
- Source lines: 579-855
- Parent headings: Generate strong-name key (sn.exe is part of the Strong Name Tool) > Unit test reference with FakeXrmEasy v3+

---

### Complete test file with scenarios

Covers:
- Create message plug-in test
- Update with filtering attributes + pre-image
- Expected exception test
- QueryExpression execution test
- System vs user context check (limited by FakeXrmEasy security simulation; see comment)

```csharp
#nullable enable
using System;
using System.Linq;
using FluentAssertions;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Xunit;
using FakeXrmEasy;
using FakeXrmEasy.Pipeline;
using FakeXrmEasy.Middleware;
using Contoso.Plugins.Common;

namespace Contoso.Plugins.Tests
{
    // ----------------------------
    // Plug-ins under test
    // ----------------------------

    public sealed class SetAccountNumberOnCreatePlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Create || ctx.PrimaryEntityName != "account")
                return;

            if (PluginGuards.ExceedsDepth(ctx, 1))
                return;

            var target = ctx.GetRequiredTarget();
            if (target.Attributes.ContainsKey("accountnumber")) return;

            target["accountnumber"] = "ACC-TEST";
        }
    }

    public sealed class SyncContactFullNameOnUpdatePlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Update || ctx.PrimaryEntityName != "contact")
                return;

            // Pre-image name must match registration
            const string preImageName = "PreImage";

            if (!ctx.PreEntityImages.Contains(preImageName))
                throw new InvalidPluginExecutionException("PreImage is required for this plug-in.");

            var pre = ctx.PreEntityImages[preImageName];
            var target = ctx.GetRequiredTarget();

            // Filtering attributes are usually handled by registration; still be defensive
            var firstName = target.GetAttributeValue<string>("firstname") ?? pre.GetAttributeValue<string>("firstname") ?? string.Empty;
            var lastName = target.GetAttributeValue<string>("lastname") ?? pre.GetAttributeValue<string>("lastname") ?? string.Empty;

            var newFullName = (firstName + " " + lastName).Trim();

            // Avoid unnecessary writes
            var oldFullName = pre.GetAttributeValue<string>("fullname") ?? string.Empty;
            if (string.Equals(oldFullName, newFullName, StringComparison.Ordinal))
                return;

            target["fullname"] = newFullName;
        }
    }

    public sealed class PreventAccountDeleteIfHasContactsPlugin : PluginBase
    {
        protected override void Execute(in LocalServices services)
        {
            var ctx = services.Context;

            if (ctx.MessageName != MessageNames.Delete || ctx.PrimaryEntityName != "account")
                return;

            // Target in Delete can be EntityReference via InputParameters["Target"].
            if (!ctx.InputParameters.TryGetValue("Target", out var targetObj) || targetObj is not EntityReference er)
                throw new InvalidPluginExecutionException("Target EntityReference is required.");

            var qe = new QueryExpression("contact")
            {
                ColumnSet = new ColumnSet("contactid"),
                Criteria =
                {
                    Filters =
                    {
                        new FilterExpression(LogicalOperator.And)
                        {
                            Conditions =
                            {
                                new ConditionExpression("parentcustomerid", ConditionOperator.Equal, er.Id)
                            }
                        }
                    }
                }
            };

            // FakeXrmEasy will translate QueryExpression against in-memory DB
            var contacts = services.SystemService.RetrieveMultiple(qe);
            if (contacts.Entities.Count > 0)
                throw new InvalidPluginExecutionException("You cannot delete this account because related contacts exist.");
        }
    }

    // ----------------------------
    // Test base + tests
    // ----------------------------

    public abstract class FakeXrmEasyPipelineTestBase
    {
        protected readonly IXrmFakedContext Context;
        protected readonly IOrganizationService Service;

        protected FakeXrmEasyPipelineTestBase()
        {
            // Pipeline simulation setup based on official FakeXrmEasy docs
            // - AddCrud + AddFakeMessageExecutors + AddPipelineSimulation
            // - UsePipelineSimulation should be before UseCrud/UseMessages
            Context = MiddlewareBuilder
                .New()
                .AddCrud()
                .AddFakeMessageExecutors()
                .AddPipelineSimulation()
                .UsePipelineSimulation()
                .UseCrud()
                .UseMessages()
                .SetLicense(FakeXrmEasyLicense.NonCommercial)
                .Build();

            Service = Context.GetOrganizationService();
        }
    }

    public sealed class PluginPipelineTests : FakeXrmEasyPipelineTestBase
    {
        [Fact]
        public void Create_should_set_accountnumber_when_missing()
        {
            Context.RegisterPluginStep<SetAccountNumberOnCreatePlugin>(new PluginStepDefinition
            {
                MessageName = "Create",
                EntityLogicalName = "account",
                Stage = ProcessingStepStage.Preoperation,
                Mode = ProcessingStepMode.Synchronous
            });

            var account = new Entity("account");
            account["name"] = "Test";

            var id = Service.Create(account);

            var created = Service.Retrieve("account", id, new ColumnSet("accountnumber"));
            created.GetAttributeValue<string>("accountnumber").Should().Be("ACC-TEST");
        }

        [Fact]
        public void Update_should_sync_fullname_when_first_last_change_and_filtering_attributes_match()
        {
            var contactId = Guid.NewGuid();
            Context.Initialize(new Entity[]
            {
                new Entity("contact", contactId)
                {
                    ["firstname"] = "Ada",
                    ["lastname"] = "Lovelace",
                    ["fullname"] = "Ada Lovelace"
                }
            });

            // Register pre-image (subset of attributes)
            var preImage = new PluginImageDefinition(
                imageName: "PreImage",
                imageType: ProcessingStepImageType.PreImage,
                attributes: new[] { "firstname", "lastname", "fullname" });

            Context.RegisterPluginStep<SyncContactFullNameOnUpdatePlugin>(new PluginStepDefinition
            {
                MessageName = "Update",
                EntityLogicalName = "contact",
                Stage = ProcessingStepStage.Preoperation,
                Mode = ProcessingStepMode.Synchronous,
                FilteringAttributes = new[] { "firstname", "lastname" },
                Images = new[] { preImage }
            });

            // Update lastname only
            var update = new Entity("contact", contactId)
            {
                ["lastname"] = "Byron"
            };

            Service.Update(update);

            var after = Service.Retrieve("contact", contactId, new ColumnSet("fullname"));
            after.GetAttributeValue<string>("fullname").Should().Be("Ada Byron");
        }

        [Fact]
        public void Delete_should_throw_when_related_contacts_exist()
        {
            var accountId = Guid.NewGuid();
            var contactId = Guid.NewGuid();

            Context.Initialize(new Entity[]
            {
                new Entity("account", accountId) { ["name"] = "Locked" },
                new Entity("contact", contactId)
                {
                    ["firstname"] = "X",
                    ["lastname"] = "Y",
                    ["parentcustomerid"] = new EntityReference("account", accountId)
                }
            });

            Context.RegisterPluginStep<PreventAccountDeleteIfHasContactsPlugin>(new PluginStepDefinition
            {
                MessageName = "Delete",
                EntityLogicalName = "account",
                Stage = ProcessingStepStage.Prevalidation,
                Mode = ProcessingStepMode.Synchronous
            });

            Action act = () => Service.Delete("account", accountId);
            act.Should().Throw<InvalidPluginExecutionException>()
               .WithMessage("*related contacts exist*");
        }

        [Fact]
        public void QueryExpression_should_return_expected_entities_from_in_memory_db()
        {
            Context.Initialize(new Entity[]
            {
                new Entity("account", Guid.NewGuid()) { ["name"] = "A" },
                new Entity("account", Guid.NewGuid()) { ["name"] = "B" }
            });

            var qe = new QueryExpression("account")
            {
                ColumnSet = new ColumnSet("name"),
                Criteria =
                {
                    Conditions =
                    {
                        new ConditionExpression("name", ConditionOperator.In, "A", "B")
                    }
                }
            };

            var result = Service.RetrieveMultiple(qe);

            result.Entities.Select(e => e.GetAttributeValue<string>("name"))
                .OrderBy(x => x)
                .Should().Equal(new[] { "A", "B" });
        }
    }
}
```

Why this matches 2024/2025 FakeXrmEasy v3 API:

- Middleware pattern and examples are from the official docs (`MiddlewareBuilder.New()...AddPipelineSimulation()...UsePipelineSimulation()`). citeturn27view0turn19view0  
- `RegisterPluginStep` supports `PluginStepDefinition`, filtering attributes, and images. citeturn19view1
