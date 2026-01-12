# Research Protocol - Repository Pattern Discovery

## Purpose

Before generating any flow, search the repository's existing flows to learn from proven patterns. This ensures consistency across projects and leverages battle-tested implementations.

## Repository Structure

```
power-automate-templates/
├── 01-Approvals/                    # NDA workflows, approval orchestration
├── 02-Data-Processing/              # Orchestration, data transformation
├── 03-Notifications/                # Email, Teams, push notifications
├── 04-Error-Handling-and-Auditing/  # Centralized error management
├── 05-Scheduled-and-Recurring/      # Time-based automation
├── 06-File-Management/              # SharePoint operations
├── 07-Integrations/                 # DocuSign, Teams, third-party
├── 08-AI-Builder/                   # AI/form processing
├── 09-Utilities-and-Child-Flows/    # Reusable components
└── 10-Security-and-Governance/      # Backup, restore, governance
```

## Mandatory Search Sequence

**Execute these searches IN ORDER before writing any flow:**

### Step 1: Search by Trigger Type

```bash
# Scheduled/recurring flows
grep -ri "recurrence" --include="*.json" power-automate-templates/

# Manual trigger flows
grep -ri '"kind":"Button"' --include="*.json" power-automate-templates/
grep -ri "manual" --include="*.json" power-automate-templates/

# Automated trigger (Dataverse, SharePoint, etc.)
grep -ri "automated" --include="*.json" power-automate-templates/
grep -ri "When_a_row" --include="*.json" power-automate-templates/
```

### Step 2: Search by Connector/System

```bash
# Dataverse operations
grep -ri "dataverse" --include="*.json" power-automate-templates/
grep -ri "cds" --include="*.json" power-automate-templates/

# Business Central
grep -ri "business.?central" --include="*.json" power-automate-templates/
grep -ri "dynamicsbc" --include="*.json" power-automate-templates/

# SharePoint
grep -ri "sharepoint" --include="*.json" power-automate-templates/

# HTTP/API calls
grep -ri '"type":"Http"' --include="*.json" power-automate-templates/

# Office 365
grep -ri "office365" --include="*.json" power-automate-templates/
```

### Step 3: Search by Pattern/Use Case

```bash
# Synchronization flows
grep -ri "sync" --include="*.md" power-automate-templates/

# Error handling patterns
grep -ri "Scope_-_Try" --include="*.json" power-automate-templates/
grep -ri "Scope_-_Catch" --include="*.json" power-automate-templates/

# Approval workflows
grep -ri "approval" --include="*.md" power-automate-templates/

# Child flow patterns
grep -ri "child" --include="*.md" power-automate-templates/

# Dictionary/lookup patterns
grep -ri "dictionary" --include="*.json" power-automate-templates/
grep -ri "setProperty" --include="*.json" power-automate-templates/
```

### Step 4: Read Relevant Flows

After identifying 2-3 most relevant flows from search results:

```bash
# Read the flow JSON
cat power-automate-templates/[category]/[flow-name]-flow.json | jq '.FlowDefinitionString | fromjson'

# Read the implementation guide
cat power-automate-templates/[category]/[flow-name]-implementation.md
```

## What to Extract from Templates

### ✓ DO Extract (Pattern Learning)

| Category | What to Learn | Example |
|----------|---------------|---------|
| **Architecture** | Scope organization | Try-Catch-Finally nesting |
| **Expressions** | XPath patterns | `xpath(xml(...), '//error/message/text()')` |
| **Control Flow** | Loop structures | Foreach with concurrency settings |
| **Variables** | Variable strategies | Config objects, counters, accumulators |
| **Error Handling** | Error message patterns | Static messages, result aggregation |
| **Performance** | Optimization techniques | Filter at source, Select transforms |

### ❌ DO NOT Copy (Environment-Specific)

| Field | Why Not | What Happens If Copied |
|-------|---------|------------------------|
| `operationMetadataId` | Microsoft auto-generates | Deployment conflicts |
| `connectionName` | Environment-specific | Connection failures |
| `operationId` | Connector metadata | Wrong operation binding |
| `apiId` | API reference | API resolution errors |
| `host` object | Connection metadata | Authentication failures |
| Company GUIDs | Tenant-specific | Data isolation violations |
| `@odata.etag` | Record-specific | Concurrency conflicts |

## Search Examples by Scenario

### Scenario: Building a Dataverse-to-Business Central Sync

```bash
# Step 1: Find sync flows
grep -ri "sync" --include="*.md" power-automate-templates/
# Result: 02-Data-Processing/customer-sync-flow.json

# Step 2: Find Dataverse list patterns
grep -ri "List_rows" --include="*.json" power-automate-templates/
# Result: Multiple flows with Dataverse list patterns

# Step 3: Find BC integration patterns
grep -ri "business.?central" --include="*.json" power-automate-templates/
# Result: 07-Integrations/bc-invoice-sync-flow.json

# Step 4: Read the most relevant flows
cat power-automate-templates/02-Data-Processing/customer-sync-flow.json
cat power-automate-templates/07-Integrations/bc-invoice-sync-implementation.md
```

### Scenario: Building an Error Aggregation Child Flow

```bash
# Step 1: Find child flows
ls power-automate-templates/09-Utilities-and-Child-Flows/

# Step 2: Find error handling patterns
grep -ri "error" --include="*.json" power-automate-templates/09-Utilities-and-Child-Flows/

# Step 3: Find aggregation patterns
grep -ri "union" --include="*.json" power-automate-templates/
grep -ri "concat" --include="*.json" power-automate-templates/

# Step 4: Read error handling examples
cat power-automate-templates/04-Error-Handling-and-Auditing/*error*
```

### Scenario: Building a Scheduled Report Flow

```bash
# Step 1: Find scheduled flows
grep -ri "recurrence" --include="*.json" power-automate-templates/
ls power-automate-templates/05-Scheduled-and-Recurring/

# Step 2: Find notification patterns
grep -ri "Send_an_email" --include="*.json" power-automate-templates/

# Step 3: Find report generation
grep -ri "report" --include="*.md" power-automate-templates/

# Step 4: Read relevant implementations
cat power-automate-templates/05-Scheduled-and-Recurring/*report*implementation.md
```

## Pattern Extraction Checklist

After reading relevant flows, document these patterns before generating:

```markdown
## Research Findings

### Source Flows Analyzed
1. [flow-name-1] - Reason for selection
2. [flow-name-2] - Reason for selection

### Patterns to Apply
- [ ] Error handling: [pattern description]
- [ ] Variable strategy: [what variables, how used]
- [ ] Loop structure: [foreach/apply-to-each approach]
- [ ] Expression patterns: [specific expressions to reuse]

### Architectural Decisions from Templates
- Scope organization: [how Try-Catch-Finally structured]
- Concurrency: [settings observed]
- Configuration: [how config loaded]

### Adaptations Required
- [What needs to change for new use case]
```

## Integration with Flow Generation Workflow

The research protocol integrates into Phase 1 (Requirements Analysis):

```
Phase 1: Requirements Analysis
├── 1.1 Parse user requirements
├── 1.2 **EXECUTE RESEARCH PROTOCOL**
│   ├── Search by trigger type
│   ├── Search by connector
│   ├── Search by pattern
│   └── Read 2-3 most relevant flows
├── 1.3 Document research findings
└── 1.4 Identify patterns to apply
```

## When to Skip Research

Research may be abbreviated (not skipped entirely) when:

1. **Identical pattern exists** - User explicitly references an existing flow
2. **Simple utility flow** - Single-action flows with no complex patterns
3. **User provides template** - User supplies a reference flow in the request

Even in these cases, verify the referenced patterns are current and follow latest conventions.
