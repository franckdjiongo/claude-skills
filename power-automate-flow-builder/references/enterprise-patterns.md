# Enterprise Patterns Reference

## Try-Catch-Finally Pattern

### Structure Overview

```
Flow Structure:
├─ Scope_-_Try (Main business logic)
│  ├─ Configuration loading
│  ├─ Data retrieval
│  ├─ Data transformation
│  └─ Data persistence
├─ Scope_-_Catch (Error handling - runs after Try on failure)
│  ├─ Set error message variable (static)
│  ├─ Log error to child flow or table
│  └─ Send error notification
└─ Scope_-_Finally (Cleanup - always runs)
   └─ Return response or update status
```

### Implementation

```json
"Scope_-_Try": {
  "type": "Scope",
  "actions": {
    "Compose_-_Load_Config_placeholder": { },
    "Compose_-_Get_Data_placeholder": { },
    "Select_-_Transform_Data": { },
    "Compose_-_Upsert_Data_placeholder": { }
  },
  "runAfter": {
    "Initialize_Variables": ["Succeeded"]
  }
},
"Scope_-_Catch": {
  "type": "Scope",
  "actions": {
    "Set_variable_-_varErrorMessage": {
      "type": "SetVariable",
      "inputs": {
        "name": "varErrorMessage",
        "value": "Error occurred in data sync process. Check flow run history for details."
      },
      "runAfter": {}
    },
    "Compose_-_Call_Error_Handler_placeholder": {
      "type": "Compose",
      "inputs": {
        "action": "Run a Child Flow",
        "connector": "Power Automate Management",
        "configuration": {
          "childFlowName": "Error Handler",
          "parameters": {
            "flowName": "@@workflow()?['tags']?['flowDisplayName']",
            "errorMessage": "@@variables('varErrorMessage')",
            "flowRunUrl": "@@concat('https://make.powerautomate.com/environments/', workflow()?['tags']?['environmentName'], '/flows/', workflow()?['name'], '/runs/', workflow()?['run']?['name'])"
          }
        }
      },
      "runAfter": {
        "Set_variable_-_varErrorMessage": ["Succeeded"]
      },
      "metadata": {
        "description": "Replace with Run a Child Flow - Error Handler"
      }
    },
    "Terminate_-_Failed": {
      "type": "Terminate",
      "inputs": {
        "runStatus": "Failed",
        "runError": {
          "code": "500",
          "message": "@@variables('varErrorMessage')"
        }
      },
      "runAfter": {
        "Compose_-_Call_Error_Handler_placeholder": ["Succeeded", "Failed"]
      }
    }
  },
  "runAfter": {
    "Scope_-_Try": ["Failed", "TimedOut"]
  }
},
"Scope_-_Finally": {
  "type": "Scope",
  "actions": {
    "Response_-_Return_Result": {
      "type": "Response",
      "kind": "Http",
      "inputs": {
        "statusCode": 200,
        "body": {
          "status": "@@if(equals(result('Scope_-_Try')[0]['status'], 'Succeeded'), 'Success', 'Failed')",
          "timestamp": "@@utcNow()"
        }
      }
    }
  },
  "runAfter": {
    "Scope_-_Try": ["Succeeded", "Skipped"],
    "Scope_-_Catch": ["Succeeded", "Skipped", "Failed"]
  }
}
```

### Static Error Messages

**CRITICAL:** Never extract dynamic error messages from nested scopes.

**Wrong:**
```json
"value": "@@{outputs('Scope_-_Try')?['error']?['message']}"
```

**Correct:**
```json
"value": "Error occurred in sync operation. Check flow run history for details."
```

## Configuration Loading Pattern

### Initialize from Parameters

```json
"Initialize_variable_-_varConfig": {
  "type": "InitializeVariable",
  "inputs": {
    "variables": [{
      "name": "varConfig",
      "type": "object",
      "value": "@@parameters('Technical Parameters (prefix_technicalParameters)')"
    }]
  },
  "runAfter": {}
}
```

### Compose Configuration

```json
"Compose_-_Load_Configuration": {
  "type": "Compose",
  "inputs": {
    "sharePointUrl": "[SharePoint site URL]",
    "dataverseEnvironment": "[Dataverse environment]",
    "supportEmail": "[Support email address]",
    "batchSize": 100,
    "retryCount": 3
  },
  "runAfter": {}
}
```

## Dictionary Lookup Pattern

Use for efficient record matching between systems (O(n) instead of O(n²)).

### Step 1: Create Lookup Dictionary

```json
"Select_-_Create_Lookup_Dictionary": {
  "type": "Select",
  "inputs": {
    "from": "@@body('Compose_-_Get_Source_Records_placeholder')",
    "select": {
      "@@{item()?['externalId']}": "@@{item()?['systemId']}"
    }
  },
  "runAfter": {
    "Compose_-_Get_Source_Records_placeholder": ["Succeeded"]
  }
}
```

### Step 2: Convert to Object

```json
"Compose_-_Dictionary_Object": {
  "type": "Compose",
  "inputs": "@@json(concat('{', join(body('Select_-_Create_Lookup_Dictionary'), ','), '}'))",
  "runAfter": {
    "Select_-_Create_Lookup_Dictionary": ["Succeeded"]
  }
}
```

### Step 3: Use in Loop

```json
"Apply_to_each_-_Match_Records": {
  "type": "Foreach",
  "foreach": "@@body('Compose_-_Get_Target_Records_placeholder')",
  "actions": {
    "Condition_-_Check_If_Exists": {
      "type": "If",
      "expression": {
        "and": [{
          "not": {
            "equals": [
              "@@outputs('Compose_-_Dictionary_Object')?[item()?['externalId']]",
              null
            ]
          }
        }]
      },
      "actions": {
        "Compose_-_Update_With_Match": {
          "type": "Compose",
          "inputs": {
            "targetId": "@@item()?['id']",
            "matchedSourceId": "@@outputs('Compose_-_Dictionary_Object')?[item()?['externalId']]",
            "action": "update"
          }
        }
      },
      "else": {
        "actions": {
          "Compose_-_Create_New": {
            "type": "Compose",
            "inputs": {
              "targetId": "@@item()?['id']",
              "action": "create"
            }
          }
        }
      }
    }
  },
  "runAfter": {
    "Compose_-_Dictionary_Object": ["Succeeded"],
    "Compose_-_Get_Target_Records_placeholder": ["Succeeded"]
  }
}
```

### When to Use

- ✓ Matching records between two systems by key field
- ✓ Looking up values repeatedly in a loop
- ✓ Large datasets where nested loops would be too slow
- ✓ Avoiding O(n²) complexity

## Retry Policies

### Exponential Backoff (Recommended)

```json
"runtimeConfiguration": {
  "retry": {
    "type": "exponential",
    "count": 4,
    "interval": "PT10S",
    "minimumInterval": "PT5S",
    "maximumInterval": "PT1H"
  }
}
```

### Fixed Interval

```json
"runtimeConfiguration": {
  "retry": {
    "type": "fixed",
    "count": 3,
    "interval": "PT30S"
  }
}
```

### No Retry

```json
"runtimeConfiguration": {
  "retry": {
    "type": "none"
  }
}
```

### Recommended Settings by Operation

| Operation | Type | Count | Interval | Max Interval |
|-----------|------|-------|----------|--------------|
| SharePoint | exponential | 4 | PT10S | PT1H |
| Email sending | exponential | 5 | PT20S | PT1M |
| External API | exponential | 3 | PT10S | PT1H |
| Dataverse | exponential | 4 | PT5S | PT30M |

## Concurrency Configuration

### Foreach Concurrency

```json
"Apply_to_each_-_Process_Records": {
  "type": "Foreach",
  "foreach": "@@body('Compose_-_List_Records_placeholder')",
  "actions": { },
  "runtimeConfiguration": {
    "concurrency": {
      "repetitions": 20
    }
  }
}
```

### Recommended Settings

| Scenario | Repetitions | Notes |
|----------|-------------|-------|
| Sequential (default) | 1 | Operations depend on each other |
| Low concurrency | 5-10 | Shared dependencies |
| Standard | 20 | Most independent operations |
| High throughput | 30-50 | High-volume data processing |
| Maximum | 50 | Power Automate hard limit |

### Considerations

- Higher concurrency = more API calls per second
- Consider destination system rate limits
- Monitor for throttling errors
- Start with 20 and adjust based on monitoring

## Performance Optimization

### Filter at Source

Use OData queries to reduce data before processing:

```json
"queries": {
  "filterQuery": "statuscode eq 1 and modifiedon gt @@{variables('varLastSync')}",
  "selectQuery": "accountid,name,emailaddress1",
  "topCount": 100
}
```

### Transform with Select (Not Foreach)

**Wrong (slow):**
```
Foreach → Compose → Append to array
```

**Correct (fast):**
```json
"Select_-_Transform_Data": {
  "type": "Select",
  "inputs": {
    "from": "@@body('Source_Data')",
    "select": {
      "id": "@@item()?['sourceId']",
      "name": "@@item()?['sourceName']"
    }
  }
}
```

### Use Filter Array (Not Condition in Loop)

**Wrong (slow):**
```
Foreach → Condition → If true, append
```

**Correct (fast):**
```json
"Filter_array_-_Active_Only": {
  "type": "Query",
  "inputs": {
    "from": "@@body('All_Records')",
    "where": "@@equals(item()?['status'], 'Active')"
  }
}
```

## Child Flow Invocation

### Call Child Flow

```json
"Compose_-_Run_Child_Flow_placeholder": {
  "type": "Compose",
  "inputs": {
    "action": "Run a Child Flow",
    "connector": "Power Automate Management",
    "configuration": {
      "childFlowName": "[Child Flow Name]",
      "childFlowId": "[Child Flow ID - from environment]"
    },
    "parameters": {
      "text": "@@string(body('Get_Record')?['ID'])",
      "text_1": "@@string(outputs('Compose_-_Configuration'))",
      "text_2": "@@string(variables('vObj_Data'))"
    }
  },
  "metadata": {
    "description": "Replace with Run a Child Flow - [Child Flow Name]"
  }
}
```

### Child Flow Response Pattern

For child flows that need to return data:

```json
"Response_-_Return_Success": {
  "type": "Response",
  "kind": "Http",
  "inputs": {
    "statusCode": 200,
    "body": {
      "success": true,
      "message": "Operation completed successfully",
      "data": "@@outputs('Process_Data')",
      "timestamp": "@@utcNow()"
    }
  },
  "runAfter": {
    "Process_Data": ["Succeeded"]
  }
}
```

## Early Termination Pattern

Validate prerequisites early and exit gracefully:

```json
"Condition_-_Check_Prerequisites": {
  "type": "If",
  "expression": {
    "and": [{
      "equals": [
        "@@empty(triggerBody()?['requiredField'])",
        true
      ]
    }]
  },
  "actions": {
    "Terminate_-_Cancelled": {
      "type": "Terminate",
      "inputs": {
        "runStatus": "Cancelled",
        "runError": {
          "code": "ValidationFailed",
          "message": "Required field not provided"
        }
      }
    }
  },
  "else": {
    "actions": { }
  },
  "runAfter": {}
}
```

## Structured Data Object Pattern

### Initialize Object Variable

```json
"Initialize_variable_-_vObj_Data": {
  "type": "InitializeVariable",
  "inputs": {
    "variables": [{
      "name": "vObj_Data",
      "type": "object",
      "value": "@@json('{}')"
    }]
  },
  "runAfter": {}
}
```

### Set Complete Structure

```json
"Set_variable_-_vObj_Data": {
  "type": "SetVariable",
  "inputs": {
    "name": "vObj_Data",
    "value": {
      "customer": {
        "name": "@@body('Get_Record')?['name']",
        "email": "@@body('Get_Record')?['email']"
      },
      "metadata": {
        "submittedDate": "@@utcNow()",
        "source": "PowerAutomate"
      }
    }
  },
  "runAfter": {
    "Get_Record": ["Succeeded"]
  }
}
```

## XPath Error Message Extraction

For extracting clean error messages (use in Compose, not for dynamic references):

```json
"Initialize_variable_-_vXPathErrorMessage": {
  "type": "InitializeVariable",
  "inputs": {
    "variables": [{
      "name": "vXPathErrorMessage",
      "type": "string",
      "value": "string(//message[not(contains(.,'The execution of template action')) and not(contains(.,'skipped:')) and not(contains(.,'An action failed. No dependent actions succeeded.'))])"
    }]
  },
  "runAfter": {}
}
```

**Note:** This XPath expression is for reference only. In Compose-only flows, use static error messages in the Catch scope.
