# Technical Architecture Reference

## Flow Definition Structure

### File Format

```json
{
  "FlowDisplayName": "[Descriptive name following [SYSTEM]-[Operation]-[Detail] pattern]",
  "FlowDescription": "[Comprehensive description under 256 chars]",
  "FlowDefinitionString": "[ESCAPED_JSON_WITH_DOUBLE_AT_SYMBOLS]"
}
```

### FlowDefinitionString Schema (Before Escaping)

```json
{
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "triggers": {
    "manual": {
      "type": "Request",
      "kind": "Http",
      "inputs": {
        "schema": {}
      }
    }
  },
  "actions": {
    "Initialize_variable_-_varExample": { },
    "Compose_-_Placeholder_1": { },
    "Scope_-_Try": { }
  },
  "outputs": {},
  "description": "Flow description here"
}
```

### Schema Structure Rules

**INCLUDE:**
- `$schema` - Azure Logic Apps schema URL
- `contentVersion` - Always "1.0.0.0"
- `triggers` - Flow trigger configuration
- `actions` - All flow actions
- `outputs` - Usually empty object `{}`
- `description` - Flow description text

**OMIT (Never include):**
- `parameters` section - No `$connections`, no `$authentication`
- `connectionReferences` - Not needed for Compose-only flows
- `operationMetadataId` - Microsoft auto-generates this

## Escaping Rules

### Critical Escaping Requirements

1. **Double all @ symbols**: `@` → `@@`
2. **Escape all internal quotes**: `"` → `\"`
3. **Result must be valid JSON string value**

### Examples

| Original | Escaped |
|----------|---------|
| `@{variables('varName')}` | `@@{variables('varName')}` |
| `@body('ActionName')` | `@@body('ActionName')` |
| `@item()?['field']` | `@@item()?['field']` |

In FlowDefinitionString, the escaped expression becomes:
```
"@@@@{variables('varName')}"
```

## Compose Placeholder Architecture

### Standard Placeholder Template

```json
"Compose_-_[System]_[Operation]_placeholder": {
  "type": "Compose",
  "inputs": {
    "action": "[Exact Power Automate action name]",
    "connector": "[Connector name]",
    "configuration": {
      "environment": "[Your [System] environment]",
      "[setting_1]": "[value or expression]",
      "[setting_2]": "[value or expression]"
    },
    "queries": {
      "[query_parameter]": "[OData filter, select, orderby, etc.]",
      "[expression_field]": "@@{variables('varName')}"
    }
  },
  "runAfter": {
    "[Previous_Action]": ["Succeeded"]
  },
  "metadata": {
    "description": "Replace with [Connector] [Action] - [brief context]"
  }
}
```

### Placeholder Examples by Connector

#### Dataverse List Rows

```json
"Compose_-_Dataverse_List_Accounts_placeholder": {
  "type": "Compose",
  "inputs": {
    "action": "List rows",
    "connector": "Dataverse",
    "configuration": {
      "environment": "[Your Dataverse environment]",
      "tableName": "accounts"
    },
    "queries": {
      "filterQuery": "statuscode eq 1 and modifiedon gt @@{variables('varLastSync')}",
      "selectQuery": "accountid,name,emailaddress1,address1_city",
      "orderBy": "modifiedon desc",
      "topCount": 100
    }
  },
  "metadata": {
    "description": "Replace with Dataverse List rows - active accounts modified after last sync"
  }
}
```

#### Dataverse Upsert

```json
"Compose_-_Dataverse_Upsert_Contact_placeholder": {
  "type": "Compose",
  "inputs": {
    "action": "Add a new row or update a row (Upsert)",
    "connector": "Dataverse",
    "configuration": {
      "environment": "[Your Dataverse environment]",
      "tableName": "contacts",
      "alternateKeyField": "emailaddress1",
      "alternateKeyValueExpression": "item()?['email']"
    },
    "fieldMappings": {
      "firstname": "item()?['firstName']",
      "lastname": "item()?['lastName']",
      "emailaddress1": "item()?['email']",
      "telephone1": "item()?['phone']"
    }
  },
  "metadata": {
    "description": "Replace with Dataverse Upsert - contacts using email as key"
  }
}
```

#### Business Central List Records

```json
"Compose_-_BC_List_Customers_placeholder": {
  "type": "Compose",
  "inputs": {
    "action": "List records (V3)",
    "connector": "Dynamics 365 Business Central",
    "configuration": {
      "environment": "[Your BC environment]",
      "apiCategory": "OData",
      "tableName": "companies({company-id})/customers",
      "note": "Replace {company-id} with actual BC company ID"
    },
    "queries": {
      "filterQuery": "lastModifiedDateTime gt @@{variables('varLastSync')}",
      "selectQuery": "number,displayName,email,phoneNumber,address",
      "orderBy": "lastModifiedDateTime asc",
      "topCount": 1000
    }
  },
  "metadata": {
    "description": "Replace with BC List records - customers modified after last sync"
  }
}
```

#### SharePoint Get Items

```json
"Compose_-_SharePoint_Get_Items_placeholder": {
  "type": "Compose",
  "inputs": {
    "action": "Get items",
    "connector": "SharePoint",
    "configuration": {
      "siteAddress": "[SharePoint site URL]",
      "listName": "[List or library name]"
    },
    "queries": {
      "filterQuery": "Status eq 'Active' and Modified gt '@@{addDays(utcNow(), -7)}'",
      "selectQuery": "ID,Title,Status,Modified,Author/Title",
      "expandQuery": "Author",
      "orderBy": "Modified desc",
      "topCount": 100
    }
  },
  "metadata": {
    "description": "Replace with SharePoint Get items - active items from last 7 days"
  }
}
```

#### HTTP Request

```json
"Compose_-_HTTP_API_Call_placeholder": {
  "type": "Compose",
  "inputs": {
    "action": "HTTP",
    "connector": "HTTP",
    "configuration": {
      "method": "GET",
      "uri": "[API endpoint URL]",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer [token]"
      }
    },
    "queries": {
      "queryParameters": {
        "param1": "value1"
      }
    }
  },
  "runtimeConfiguration": {
    "retry": {
      "type": "exponential",
      "count": 3,
      "interval": "PT10S",
      "minimumInterval": "PT5S",
      "maximumInterval": "PT1H"
    }
  },
  "metadata": {
    "description": "Replace with HTTP action with retry policy"
  }
}
```

## Built-in Actions Reference

### Variable Operations (Use Directly)

```json
"Initialize_variable_-_varCounter": {
  "type": "InitializeVariable",
  "inputs": {
    "variables": [{
      "name": "varCounter",
      "type": "integer",
      "value": 0
    }]
  },
  "runAfter": {}
}

"Set_variable_-_varCounter": {
  "type": "SetVariable",
  "inputs": {
    "name": "varCounter",
    "value": "@@add(variables('varCounter'), 1)"
  },
  "runAfter": {
    "Initialize_variable_-_varCounter": ["Succeeded"]
  }
}
```

### Compose (Non-Placeholder)

```json
"Compose_-_Build_Result": {
  "type": "Compose",
  "inputs": {
    "status": "completed",
    "count": "@@variables('varCounter')",
    "timestamp": "@@utcNow()"
  },
  "runAfter": {
    "Previous_Action": ["Succeeded"]
  }
}
```

### Select (Array Transformation)

```json
"Select_-_Transform_Data": {
  "type": "Select",
  "inputs": {
    "from": "@@body('Compose_-_Source_Data_placeholder')",
    "select": {
      "id": "@@item()?['sourceId']",
      "name": "@@item()?['sourceName']",
      "email": "@@toLower(item()?['sourceEmail'])",
      "processed": true
    }
  },
  "runAfter": {
    "Compose_-_Source_Data_placeholder": ["Succeeded"]
  }
}
```

### Filter Array

```json
"Filter_array_-_Active_Records": {
  "type": "Query",
  "inputs": {
    "from": "@@body('Compose_-_All_Records_placeholder')",
    "where": "@@equals(item()?['status'], 'Active')"
  },
  "runAfter": {
    "Compose_-_All_Records_placeholder": ["Succeeded"]
  }
}
```

### Condition

```json
"Condition_-_Check_Has_Records": {
  "type": "If",
  "expression": {
    "and": [{
      "greater": [
        "@@length(body('Compose_-_List_Records_placeholder'))",
        0
      ]
    }]
  },
  "actions": {
    "Process_Records": { }
  },
  "else": {
    "actions": {
      "Log_No_Records": { }
    }
  },
  "runAfter": {
    "Compose_-_List_Records_placeholder": ["Succeeded"]
  }
}
```

### Scope

```json
"Scope_-_Try": {
  "type": "Scope",
  "actions": {
    "Action_1": { },
    "Action_2": { }
  },
  "runAfter": {
    "Initialize_Variables": ["Succeeded"]
  }
}
```

### Foreach with Concurrency

```json
"Apply_to_each_-_Process_Records": {
  "type": "Foreach",
  "foreach": "@@body('Compose_-_List_Records_placeholder')",
  "actions": {
    "Compose_-_Upsert_placeholder": { }
  },
  "runAfter": {
    "Compose_-_List_Records_placeholder": ["Succeeded"]
  },
  "runtimeConfiguration": {
    "concurrency": {
      "repetitions": 20
    }
  }
}
```

## Validation Constraints

### Action Reference Scope Rules

**WRONG (causes validation error):**
```json
"Scope_-_Catch_Error": {
  "actions": {
    "Set_variable_-_Error": {
      "inputs": {
        "value": "@@{outputs('Scope_-_Try')?['error']?['message']}"
      }
    }
  }
}
```

**CORRECT:**
```json
"Scope_-_Catch_Error": {
  "actions": {
    "Set_variable_-_Error": {
      "inputs": {
        "value": "Error occurred in sync operation. Check flow run history for details."
      }
    }
  }
}
```

### Foreach Loop Rules

**WRONG:**
```json
"Apply_to_each": {
  "foreach": "@@outputs('Get_Data')",
  "actions": {
    "Process": {
      "inputs": "@@items('Apply_to_each')?['field']"
    }
  }
}
```

**CORRECT:**
```json
"Apply_to_each": {
  "foreach": "@@body('Compose_-_Get_Data_placeholder')",
  "actions": {
    "Process": {
      "inputs": "@@item()?['field']"
    }
  }
}
```

### Description Length

- Maximum: 256 characters
- Keep concise and clear
- Move detailed config to implementation guide

## Platform Limits

- Maximum actions per flow: 500
- Maximum nesting levels: 8
- Maximum foreach iterations: 100,000
- Maximum concurrency: 50
- Timeout per action: 30 days (default varies by action)
