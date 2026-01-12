# Naming Conventions Reference

## Flow Names

**Pattern:** `[SYSTEM]-[Operation]-[Detail]`

### Examples

| Flow Name | Description |
|-----------|-------------|
| `BC-to-Dataverse-Customer-Sync` | Business Central to Dataverse customer synchronization |
| `SharePoint-Document-Approval-Workflow` | SharePoint document approval process |
| `Dataverse-Daily-Report-Generator` | Dataverse scheduled report generation |
| `Teams-Notification-Service` | Microsoft Teams notification child flow |
| `Error-Handler-Central` | Centralized error handling child flow |

### Guidelines

- Use hyphens between words
- Start with primary system or trigger source
- Include main operation/purpose
- Add detail suffix for clarity
- Keep under 80 characters

---

## Action Names

**Pattern:** `[System/Type]_-_[Operation]_-_[Detail]`

### Standard Prefixes by System

| System | Prefix | Example |
|--------|--------|---------|
| Dataverse | `Dataverse_-_` | `Dataverse_-_List_Accounts` |
| Business Central | `BC_-_` | `BC_-_Get_Customer` |
| SharePoint | `SharePoint_-_` | `SharePoint_-_Get_Items` |
| HTTP | `HTTP_-_` | `HTTP_-_Call_External_API` |
| Office 365 | `O365_-_` | `O365_-_Send_Email` |
| Teams | `Teams_-_` | `Teams_-_Post_Message` |
| Compose | `Compose_-_` | `Compose_-_Build_Response` |
| Select | `Select_-_` | `Select_-_Transform_Data` |
| Filter | `Filter_-_` | `Filter_-_Active_Records` |
| Condition | `Condition_-_` | `Condition_-_Check_Status` |
| Scope | `Scope_-_` | `Scope_-_Try` |
| Foreach | `Apply_to_each_-_` | `Apply_to_each_-_Process_Records` |

### Special Prefixes

| Type | Prefix | Example |
|------|--------|---------|
| Variable Initialize | `Initialize_variable_-_` | `Initialize_variable_-_varCounter` |
| Variable Set | `Set_variable_-_` | `Set_variable_-_varStatus` |
| Variable Increment | `Increment_variable_-_` | `Increment_variable_-_varCounter` |
| Variable Append | `Append_to_array_-_` | `Append_to_array_-_varResults` |
| Placeholder | `Compose_-_[System]_[Op]_placeholder` | `Compose_-_Dataverse_List_placeholder` |

### Scope Names

| Purpose | Name |
|---------|------|
| Main try block | `Scope_-_Try` |
| Error handling | `Scope_-_Catch` |
| Cleanup | `Scope_-_Finally` |
| Configuration | `Scope_-_Load_Configuration` |
| Validation | `Scope_-_Validate_Input` |
| Data Processing | `Scope_-_Process_Records` |
| Notifications | `Scope_-_Send_Notifications` |

---

## Variable Names

**Pattern:** `var[Type][PurposeInPascalCase]`

### By Data Type

| Type | Prefix | Examples |
|------|--------|----------|
| String | `var` | `varErrorMessage`, `varCustomerName`, `varStatus` |
| Integer | `var` | `varRecordCount`, `varBatchSize`, `varRetryCount` |
| Boolean | `varIs` or `varHas` | `varIsValid`, `varHasErrors`, `varIsApproved` |
| Object | `varObj` or `vObj_` | `varObjConfig`, `vObj_structuredData` |
| Array | `varArr` or `vArr_` | `varArrCustomers`, `vArr_recipients` |

### Common Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `varConfig` | Object | Configuration parameters |
| `varErrorMessage` | String | Error description |
| `varRecordCount` | Integer | Processed record counter |
| `varLastSync` | String | Last synchronization timestamp |
| `varIsSuccess` | Boolean | Operation success flag |
| `varArrResults` | Array | Collection of results |
| `vObj_structuredData` | Object | Structured response data |
| `vXPathErrorMessage` | String | XPath expression for error extraction |

### Guidelines

- Use PascalCase after prefix
- Be descriptive but concise
- Indicate data type in prefix
- Group related variables with common prefix

---

## Placeholder Names

**Pattern:** `Compose_-_[System]_[Operation]_placeholder`

### Examples by Connector

| Connector | Placeholder Name |
|-----------|------------------|
| Dataverse List | `Compose_-_Dataverse_List_Accounts_placeholder` |
| Dataverse Upsert | `Compose_-_Dataverse_Upsert_Customer_placeholder` |
| Dataverse Get | `Compose_-_Dataverse_Get_Contact_placeholder` |
| BC List | `Compose_-_BC_List_Customers_placeholder` |
| BC Create | `Compose_-_BC_Create_Invoice_placeholder` |
| SharePoint Get | `Compose_-_SharePoint_Get_Items_placeholder` |
| SharePoint Create | `Compose_-_SharePoint_Create_Folder_placeholder` |
| HTTP GET | `Compose_-_HTTP_Get_External_Data_placeholder` |
| HTTP POST | `Compose_-_HTTP_Post_Webhook_placeholder` |
| Email Send | `Compose_-_O365_Send_Email_placeholder` |
| Teams Post | `Compose_-_Teams_Post_Message_placeholder` |
| Child Flow | `Compose_-_Run_Error_Handler_placeholder` |

### Guidelines

- Always end with `_placeholder`
- Include connector/system name
- Include operation type
- Add entity/table name for clarity
- Keep under 80 characters

---

## File Names

### Flow Definition Files

**Pattern:** `[flow-identifier]-flow.json`

Examples:
- `INT04A-Vendors-BC-to-CMS-flow.json`
- `customer-sync-daily-flow.json`
- `error-handler-central-flow.json`

### Implementation Guide Files

**Pattern:** `[flow-identifier]-implementation.md`

Examples:
- `INT04A-Vendors-BC-to-CMS-implementation.md`
- `customer-sync-daily-implementation.md`
- `error-handler-central-implementation.md`

### Guidelines

- Use lowercase with hyphens
- Match flow identifier between files
- Include integration ID if applicable
- Keep descriptive but concise

---

## Quick Reference Card

### Flow Names
```
[SYSTEM]-[Operation]-[Detail]
Example: BC-to-Dataverse-Customer-Sync
```

### Action Names
```
[System]_-_[Operation]_-_[Detail]
Example: Dataverse_-_List_Accounts
```

### Variable Names
```
var[Type][Purpose]
Examples: varErrorMessage, varObjConfig, varIsValid
```

### Placeholder Names
```
Compose_-_[System]_[Operation]_placeholder
Example: Compose_-_Dataverse_List_Accounts_placeholder
```

### Scope Names
```
Scope_-_[Purpose]
Examples: Scope_-_Try, Scope_-_Catch, Scope_-_Finally
```

### File Names
```
[identifier]-flow.json
[identifier]-implementation.md
```
