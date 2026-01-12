# Implementation Guide Template

Use this template when creating the implementation guide deliverable for each flow.

---

## Template Structure

# [Flow Name] - Implementation Guide

## 1. Overview

[2-3 paragraphs covering:]
- Purpose and business value
- High-level architecture overview
- Key features and capabilities

## 2. Prerequisites

**Checklist format:**

- [ ] Power Automate Premium license (if using premium connectors)
- [ ] Access to [System 1] with [specific permissions]
- [ ] Access to [System 2] with [specific permissions]
- [ ] Environment URLs or IDs ready
- [ ] [Any other requirements]

## 3. Implementation Steps

### Step 1: Create Flow from Definition

1. Open Power Automate (make.powerautomate.com)
2. Create a new Instant/Automated flow (depends on trigger type)
3. Add "Initialize variable" action with string type
4. Paste the FlowDefinitionString as the value
5. Use Power Automate Management connector "Create Flow" action
6. Or: Import via solution if solution-aware

### Step 2: Configure Placeholder Actions

**For each placeholder, document:**

#### Placeholder: `Compose_-_[System]_[Operation]_placeholder`

**Location:** [Scope_-_Try > Action sequence position]

**Replace With:** [Exact connector action name]

**Connector:** [Connector name from Power Automate]

**Configuration:**

| Parameter | Value | Notes |
|-----------|-------|-------|
| Environment | [Your environment URL] | Get from admin center |
| Table Name | [exact table logical name] | Case-sensitive |
| Filter Query | [OData filter expression] | Optional |
| Select Query | [Comma-separated columns] | Optional |

**Field Mappings** (for create/update actions):

| Target Field | Source Expression | Type |
|--------------|-------------------|------|
| [field1] | `item()?['sourceField1']` | Dynamic |
| [field2] | `item()?['sourceField2']` | Dynamic |
| [field3] | `"static value"` | Static |

**Notes:** [Any additional configuration notes]

---

[Repeat for each placeholder in the flow]

### Step 3: Configure Environment-Specific Values

| Placeholder Text | Location | Replace With | Example Value |
|------------------|----------|--------------|---------------|
| `[Your Dataverse environment]` | All Dataverse actions | Environment URL | `https://org.crm.dynamics.com` |
| `[Your BC environment]` | BC actions | Environment name | `PRODUCTION` |
| `[SharePoint site URL]` | SharePoint actions | Site URL | `https://tenant.sharepoint.com/sites/MySite` |
| `[Support email]` | Error handling | Email address | `support@company.com` |

### Step 4: Test the Flow

**Manual Testing:**

1. [ ] Trigger the flow manually with test data
2. [ ] Verify trigger receives correct input
3. [ ] Check each placeholder action executes successfully
4. [ ] Verify data transformation is correct
5. [ ] Confirm output/response is as expected

**Error Handling Testing:**

1. [ ] Deliberately cause an error in Try scope
2. [ ] Verify Catch scope executes
3. [ ] Confirm error notification is sent
4. [ ] Check flow terminates with correct status

**Performance Testing:**

1. [ ] Test with expected data volume
2. [ ] Monitor execution time
3. [ ] Check API consumption
4. [ ] Verify no throttling occurs

### Step 5: Production Deployment

1. Enable the flow
2. Monitor first production runs
3. Set up alerts for failures
4. Document support contacts
5. Update any runbooks or operational documentation

## 4. Flow Architecture Details

### Trigger Configuration

| Property | Value |
|----------|-------|
| Type | [Manual/Scheduled/Automated] |
| Recurrence | [If scheduled: frequency, interval] |
| Filter | [If automated: trigger conditions] |

### Variables

| Variable Name | Type | Purpose |
|---------------|------|---------|
| varConfig | Object | Stores configuration parameters |
| varErrorMessage | String | Captures error information |
| varRecordCount | Integer | Tracks processed records |

### Main Processing Logic

[Describe the flow logic in prose:]

1. **Configuration Loading**: [What happens]
2. **Data Retrieval**: [What data is fetched and from where]
3. **Data Transformation**: [What transformations occur]
4. **Data Persistence**: [Where data is saved]
5. **Response/Completion**: [What happens at the end]

### Error Handling

- **Try Scope**: Contains main business logic
- **Catch Scope**: Runs on failure/timeout
  - Sets error message variable
  - Calls error handler child flow (if configured)
  - Terminates with Failed status
- **Finally Scope** (if present): Cleanup operations

## 5. Troubleshooting Guide

| Issue | Symptom | Solution | Reference |
|-------|---------|----------|-----------|
| Authentication failure | 401 error on connector action | Verify connection credentials and permissions | Connection settings |
| No records returned | Empty array from List operation | Check filter query syntax and date formats | OData reference |
| Timeout error | Flow exceeds 30-day limit | Implement pagination or reduce batch size | Performance section |
| Throttling | 429 error from API | Reduce concurrency or add delays | Retry policy |
| Null reference | "Cannot read property of null" | Add null checks with `coalesce()` | Expression reference |

### Common Error Messages

**"The template language expression... cannot be evaluated"**
- Cause: Property doesn't exist or null reference
- Solution: Use `?[]` syntax for safe property access

**"Unable to process template language expressions"**
- Cause: Syntax error in expression
- Solution: Check for mismatched quotes or parentheses

**"InvalidTemplate"**
- Cause: Invalid flow definition structure
- Solution: Verify JSON escaping and schema compliance

## 6. Maintenance and Support

### Regular Maintenance Tasks

- [ ] Weekly: Review flow run history for failures
- [ ] Monthly: Check API consumption metrics
- [ ] Quarterly: Review and update connection credentials
- [ ] As needed: Update filter queries for new requirements

### Monitoring Recommendations

- Set up email alerts for flow failures
- Create Power BI dashboard for flow metrics
- Monitor Dataverse/SharePoint API limits
- Track average execution time trends

### Support Contacts

| Role | Contact | Notes |
|------|---------|-------|
| Flow Owner | [Name/Email] | Primary contact |
| Technical Support | [Team/Distribution] | For technical issues |
| Business Owner | [Name/Email] | For requirement questions |

---

## Appendix: Expression Reference

### Commonly Used Expressions

```javascript
// Safe property access
item()?['PropertyName']

// Null coalescing
coalesce(body('Action')?['field'], 'default')

// Date formatting
formatDateTime(utcNow(), 'yyyy-MM-dd')

// String concatenation
concat('Hello ', variables('name'))

// Array length check
greater(length(body('Get_items')), 0)
```

### Placeholder Replacement Checklist

- [ ] All `Compose_-_*_placeholder` actions replaced with real connectors
- [ ] All `[bracketed values]` replaced with environment-specific values
- [ ] All connections configured and tested
- [ ] Flow saved and enabled
