# Power Platform-Specific Patterns

## Canvas App Documentation

Canvas apps provide complete UI design control, requiring comprehensive screen documentation.

### Required Elements
- Screen inventory with navigation flow diagram
- Screen-by-screen layout descriptions
- Data source mappings (connectors, entities)
- Power Fx formula documentation for complex logic
- Control naming conventions
- Responsive design (phone vs. tablet)

### User Guide Adaptation
- Document each screen's purpose and primary actions
- Use annotated screenshots showing form fields, buttons, navigation
- Include step-by-step procedures for each core workflow

### Technical Guide Adaptation
- Power Fx formulas with explanations
- Connection references
- Delegation limits and workarounds
- Offline capability configuration
- Custom component specifications

## Model-Driven App Documentation

Model-driven apps are data-model-driven, making Dataverse documentation critical.

### Required Elements
- Complete data model with ERD
- Table-by-table documentation (purpose, key columns, relationships)
- Business rule documentation (conditions, actions)
- Form customizations by entity
- View configurations (columns, filters, sort orders)
- Site map structure
- Security role matrix (table permissions by role)

### User Guide Adaptation
- Document by business process rather than by screen
- Focus on data entry procedures and business workflows
- Model-driven apps share consistent navigation patterns

### Technical Guide Adaptation
- Emphasize data model, relationships, cascade behaviors
- Document calculated fields, rollup fields, business rules
- Include security model at row and column level

## Power Automate Flow Documentation

### Flow Metadata Block
```markdown
Flow Name: [Descriptive name following naming convention]
Purpose: [Business process automated]
Type: Automated | Instant | Scheduled | Business Process
Owner: [Primary contact]
Environment: [Development | Test | Production]
```

### Trigger Documentation
- Trigger type and conditions
- Data payload/schema from trigger
- Recurrence settings (scheduled flows)

### Action Documentation
- Purpose of each scope/action
- Input/output parameters
- Dependencies between actions
- Expression/formula explanations

### Error Handling (Required)
- Scope organization (Try/Catch/Finally pattern)
- Configure Run After settings (Success/Failure/Skipped/Timed Out)
- Retry policy configuration (interval, max count, exponential backoff)
- Error logging destination (SharePoint, Dataverse, etc.)
- Notification recipients for failures

### Flow Documentation Template
```markdown
## [Flow Name]

### Purpose
[Business process description]

### Trigger
- Type: [Automated/Scheduled/Instant]
- Condition: [Trigger conditions]
- Payload: [Data received]

### Flow logic
1. [Scope: Try]
   - Action 1: [Purpose]
   - Action 2: [Purpose]
2. [Scope: Catch]
   - Error logging: [Destination]
   - Notification: [Recipients]

### Dependencies
- Connection references required
- Environment variables used
- Related flows

### Error handling
- Retry policy: [Configuration]
- Failure notifications: [Channel and recipients]
```

## Dataverse Documentation

### Table Documentation Template

| Attribute | Value |
|-----------|-------|
| Table Name | [Logical name] |
| Display Name | [User-facing name] |
| Table Type | Standard / Activity / Virtual |
| Ownership | User/Team or Organization |
| Primary Column | [Column name] |
| Description | [Business entity represented] |

### Column Documentation Requirements
- Logical name
- Display name
- Data type
- Required vs. optional
- Default value
- Business rules applied
- Calculated/rollup formula (if applicable)

### Relationship Documentation

| Parent Table | Child Table | Type | Cascade Behavior |
|--------------|-------------|------|------------------|
| Account | Contact | 1:N | Delete: Restrict |

### ALM Solution Documentation
- Solution name, publisher, version
- Components included (tables, apps, flows, plugins)
- Dependencies on other solutions
- Connection references with environment variable mappings
- Environment variable values by environment (Dev/Test/Prod)
- Deployment pipeline stages and approval gates
