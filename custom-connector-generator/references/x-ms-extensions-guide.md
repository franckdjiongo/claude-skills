# Microsoft x-ms Extensions Guide for Power Platform

Complete reference for all Microsoft-specific OpenAPI extensions used in Power Automate and Power Apps custom connectors.

## Table of Contents
1. [Overview](#overview)
2. [Display and UI Extensions](#display-and-ui-extensions)
3. [Dynamic Data Extensions](#dynamic-data-extensions)
4. [Trigger Extensions](#trigger-extensions)
5. [Pagination Extensions](#pagination-extensions)
6. [Metadata Extensions](#metadata-extensions)
7. [Complete Examples](#complete-examples)

## Overview

Microsoft x-ms-* extensions enhance the Power Platform user experience beyond standard OpenAPI. They control:
- How operations and parameters appear in the UI
- Dynamic dropdowns and related data
- Trigger behavior for automated flows
- Pagination handling
- Operation lifecycle management

**Key Principle**: These extensions are **optional but highly recommended** for production connectors. They transform a functional connector into an intuitive one.

## Display and UI Extensions

### x-ms-summary

**Purpose**: User-friendly display name in Power Automate/Power Apps UI

**Usage**: Operations, parameters, properties

**Example - Operation**:
```json
{
  "paths": {
    "/users/{userId}": {
      "get": {
        "summary": "Retrieves detailed information about a specific user",
        "x-ms-summary": "Get User",  // ← Shows in UI instead of long summary
        "operationId": "GetUser"
      }
    }
  }
}
```

**Example - Parameter**:
```json
{
  "parameters": [
    {
      "name": "userId",
      "in": "path",
      "description": "The unique identifier for the user in the system",
      "x-ms-summary": "User ID",  // ← Concise display name
      "type": "string",
      "required": true
    }
  ]
}
```

**Example - Response Property**:
```json
{
  "definitions": {
    "User": {
      "type": "object",
      "properties": {
        "emailAddress": {
          "type": "string",
          "description": "The primary email address of the user",
          "x-ms-summary": "Email"  // ← Friendly label in UI
        }
      }
    }
  }
}
```

**Best Practices**:
- Keep under 50 characters
- Use Title Case
- Omit articles (a, an, the)
- Be specific but concise
- Good: "Customer Name", "Order Total", "Invoice ID"
- Bad: "Get the name of customer", "total", "id"

---

### x-ms-visibility

**Purpose**: Control parameter visibility in Power Automate/Power Apps UI

**Usage**: Parameters, properties

**Values**:
- `"important"` - Always visible (default if omitted)
- `"advanced"` - Hidden in advanced section
- `"internal"` - Hidden from user (system use only)

**Example**:
```json
{
  "parameters": [
    {
      "name": "customerId",
      "in": "query",
      "type": "string",
      "required": true,
      "x-ms-visibility": "important"  // Always visible
    },
    {
      "name": "includeMeta data",
      "in": "query",
      "type": "boolean",
      "x-ms-visibility": "advanced"  // In "Show advanced options"
    },
    {
      "name": "apiVersion",
      "in": "header",
      "type": "string",
      "default": "v1",
      "x-ms-visibility": "internal"  // Never shown to user
    }
  ]
}
```

**When to Use**:
- `important`: Required fields, commonly used optional fields
- `advanced`: Rarely changed settings, technical options, debugging flags
- `internal`: Version headers, system tokens, computed values

---

### x-ms-url-encoding

**Purpose**: Control URL encoding of parameter values

**Usage**: Query and path parameters

**Values**:
- `"single"` - Encode once (default)
- `"double"` - Encode twice
- `"none"` - No encoding

**Example**:
```json
{
  "parameters": [
    {
      "name": "filter",
      "in": "query",
      "type": "string",
      "x-ms-url-encoding": "single",  // name eq 'John' → name%20eq%20'John'
      "description": "OData filter"
    },
    {
      "name": "preEncodedPath",
      "in": "path",
      "type": "string",
      "x-ms-url-encoding": "none"  // Value already encoded, don't encode again
    }
  ]
}
```

## Dynamic Data Extensions

### x-ms-dynamic-values

**Purpose**: Populate dropdown with dynamic data from another operation

**Usage**: Parameters

**Basic Example**:
```json
{
  "parameters": [
    {
      "name": "userId",
      "in": "query",
      "type": "string",
      "x-ms-dynamic-values": {
        "operationId": "ListUsers",      // Operation to call for data
        "value-path": "id",               // Field to use as value
        "value-title": "name",            // Field to display as text
        "value-collection": "users"       // Optional: array path in response
      }
    }
  ]
}
```

**Response Structure Expected**:
```json
{
  "users": [
    {"id": "123", "name": "John Doe"},
    {"id": "456", "name": "Jane Smith"}
  ]
}
```

**Displays in UI**:
```
Dropdown:
  John Doe  (value: 123)
  Jane Smith (value: 456)
```

**Advanced Example with Parameters**:
```json
{
  "parameters": [
    {
      "name": "siteId",
      "in": "query",
      "type": "string",
      "x-ms-dynamic-values": {
        "operationId": "ListSites",
        "value-path": "id",
        "value-title": "name"
      }
    },
    {
      "name": "listId",
      "in": "query",
      "type": "string",
      "x-ms-dynamic-values": {
        "operationId": "GetListsForSite",
        "value-path": "id",
        "value-title": "title",
        "parameters": {
          "siteId": {
            "parameter": "siteId"  // Use value from siteId parameter above
          }
        }
      }
    }
  ]
}
```

This creates a dependent dropdown: select site first, then lists for that site appear.

**Properties**:
- `operationId` (required): Operation to fetch data
- `value-path` (required): JSON path to value field
- `value-title` (required): JSON path to display field
- `value-collection` (optional): JSON path to array in response
- `parameters` (optional): Pass values to the operation
- `value-folder-property` (optional): For hierarchical data
- `value-media-property` (optional): For media metadata

---

### x-ms-dynamic-schema

**Purpose**: Fetch response schema dynamically based on user selection

**Usage**: Response schemas, body parameters

**Example**:
```json
{
  "paths": {
    "/entities/{entityType}": {
      "post": {
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "type": "string",
            "required": true
          },
          {
            "name": "body",
            "in": "body",
            "schema": {
              "type": "object",
              "x-ms-dynamic-schema": {
                "operationId": "GetEntitySchema",
                "parameters": {
                  "entityType": {
                    "parameter": "entityType"
                  }
                },
                "value-path": "schema"
              }
            }
          }
        ]
      }
    }
  }
}
```

**Schema Operation Response**:
```json
{
  "schema": {
    "type": "object",
    "properties": {
      "firstName": {"type": "string"},
      "lastName": {"type": "string"},
      "email": {"type": "string"}
    }
  }
}
```

This allows Power Automate to show actual fields based on user's entity selection.

---

### x-ms-dynamic-properties

**Purpose**: Add dynamic properties to an object based on earlier selection

**Usage**: Object properties

**Example**:
```json
{
  "definitions": {
    "CreateEntity": {
      "type": "object",
      "required": ["entityType"],
      "properties": {
        "entityType": {
          "type": "string",
          "x-ms-summary": "Entity Type"
        }
      },
      "x-ms-dynamic-properties": {
        "operationId": "GetEntityProperties",
        "parameters": {
          "entityType": {
            "parameterReference": "body/entityType"
          }
        }
      }
    }
  }
}
```

## Trigger Extensions

### x-ms-trigger

**Purpose**: Define trigger type for automated flows

**Usage**: Operations (webhooks)

**Values**:
- `"single"` - Trigger fires for each item individually
- `"batch"` - Trigger fires once with batch of items

**Example - Webhook Trigger**:
```json
{
  "paths": {
    "/webhooks/subscribe": {
      "x-ms-notification-content": {
        "description": "Webhook payload",
        "schema": {
          "$ref": "#/definitions/WebhookPayload"
        }
      },
      "post": {
        "summary": "When a new order is created",
        "x-ms-trigger": "single",  // Fire once per order
        "operationId": "OnNewOrder",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "properties": {
                "callbackUrl": {
                  "type": "string",
                  "x-ms-notification-url": true,  // Power Automate will provide this
                  "x-ms-visibility": "internal"
                }
              }
            }
          }
        ],
        "responses": {
          "201": {"description": "Webhook created"}
        }
      }
    }
  }
}
```

---

### x-ms-trigger-hint

**Purpose**: Help text for triggers

**Usage**: Trigger operations

**Example**:
```json
{
  "paths": {
    "/triggers/when-file-created": {
      "get": {
        "x-ms-trigger": "batch",
        "x-ms-trigger-hint": "This trigger checks for new files every 5 minutes."
      }
    }
  }
}
```

## Pagination Extensions

### x-ms-pageable

**Purpose**: Enable automatic pagination for list operations

**Usage**: GET operations that return arrays

**Example - Next Link Pagination**:
```json
{
  "paths": {
    "/users": {
      "get": {
        "x-ms-pageable": {
          "nextLinkName": "nextLink"  // Field containing next page URL
        },
        "responses": {
          "200": {
            "schema": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "array",
                  "items": {"$ref": "#/definitions/User"}
                },
                "nextLink": {
                  "type": "string",
                  "description": "URL to next page"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Response Example**:
```json
{
  "value": [{...}, {...}, {...}],
  "nextLink": "https://api.example.com/users?page=2"
}
```

**Example - Offset Pagination**:
```json
{
  "paths": {
    "/items": {
      "get": {
        "x-ms-pageable": {
          "operationName": "GetItemsNextPage"  // Name of operation for next page
        },
        "parameters": [
          {"name": "offset", "in": "query", "type": "integer"},
          {"name": "limit", "in": "query", "type": "integer"}
        ]
      }
    }
  }
}
```

---

### x-ms-page-size

**Purpose**: Default page size for paginated operations

**Usage**: GET operations with pagination

**Example**:
```json
{
  "paths": {
    "/users": {
      "get": {
        "x-ms-pageable": {"nextLinkName": "nextLink"},
        "x-ms-page-size": 50  // Fetch 50 items per page by default
      }
    }
  }
}
```

## Metadata Extensions

### x-ms-api-annotation

**Purpose**: Operation lifecycle management

**Usage**: Info object, operations

**Example - Mark Operation as Deprecated**:
```json
{
  "paths": {
    "/old-endpoint": {
      "get": {
        "x-ms-api-annotation": {
          "status": "Preview",  // Preview, Production, Deprecated
          "family": "GetData",
          "revision": 1
        }
      }
    },
    "/new-endpoint": {
      "get": {
        "x-ms-api-annotation": {
          "status": "Production",
          "family": "GetData",
          "revision": 2,
          "replacement": {
            "api": "MyConnector",
            "operationId": "GetDataV2"
          }
        }
      }
    }
  }
}
```

---

### x-ms-capabilities

**Purpose**: Define connector capabilities (filters, sorting, etc.)

**Usage**: Info object, path items

**Example**:
```json
{
  "info": {
    "x-ms-capabilities": {
      "testConnection": {
        "operationId": "TestConnection"  // Operation to test connection
      }
    }
  }
}
```

**File Browsing Example**:
```json
{
  "paths": {
    "/files": {
      "get": {
        "x-ms-capabilities": {
          "fileBrowsing": {
            "listOperation": {
              "operationId": "ListFiles"
            },
            "browseOperation": {
              "operationId": "BrowseFiles"
            },
            "value-title": "name",
            "value-collection": "files",
            "value-folder-property": "isFolder",
            "value-media-property": "mediaType"
          }
        }
      }
    }
  }
}
```

---

### x-ms-editor

**Purpose**: Specify custom editor for parameters

**Usage**: String parameters

**Values**:
- `"code"` - Code editor with syntax highlighting
- `"html"` - HTML editor
- `"combobox"` - Combo box allowing custom values

**Example**:
```json
{
  "parameters": [
    {
      "name": "htmlContent",
      "in": "body",
      "schema": {
        "type": "string",
        "x-ms-editor": "html",  // Rich HTML editor
        "x-ms-editor-options": {
          "language": "html"
        }
      }
    },
    {
      "name": "script",
      "in": "body",
      "schema": {
        "type": "string",
        "x-ms-editor": "code",  // Code editor with syntax highlighting
        "x-ms-editor-options": {
          "language": "javascript"
        }
      }
    }
  ]
}
```

---

### x-ms-no-generic-test

**Purpose**: Disable automatic test generation

**Usage**: Operations

**Example**:
```json
{
  "paths": {
    "/complex-operation": {
      "post": {
        "x-ms-no-generic-test": true  // Don't auto-generate tests for this
      }
    }
  }
}
```

## Complete Examples

### Example 1: User Management Connector with Dynamic Dropdowns

```json
{
  "swagger": "2.0",
  "info": {
    "title": "User Management API",
    "version": "1.0.0"
  },
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "paths": {
    "/departments": {
      "get": {
        "summary": "List all departments",
        "operationId": "ListDepartments",
        "x-ms-visibility": "internal",  // Hidden - only for dynamic dropdowns
        "responses": {
          "200": {
            "schema": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {"type": "string"},
                  "name": {"type": "string"}
                }
              }
            }
          }
        }
      }
    },
    "/users": {
      "get": {
        "summary": "List users in a department",
        "operationId": "ListUsers",
        "x-ms-visibility": "internal",
        "parameters": [
          {
            "name": "departmentId",
            "in": "query",
            "type": "string",
            "required": true
          }
        ],
        "responses": {
          "200": {
            "schema": {
              "type": "object",
              "properties": {
                "users": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {"type": "string"},
                      "name": {"type": "string"},
                      "email": {"type": "string"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/users/{userId}": {
      "get": {
        "summary": "Get detailed information about a user",
        "x-ms-summary": "Get User Details",
        "operationId": "GetUser",
        "x-ms-visibility": "important",
        "parameters": [
          {
            "name": "departmentId",
            "in": "query",
            "description": "The department the user belongs to",
            "x-ms-summary": "Department",
            "type": "string",
            "required": true,
            "x-ms-dynamic-values": {
              "operationId": "ListDepartments",
              "value-path": "id",
              "value-title": "name"
            }
          },
          {
            "name": "userId",
            "in": "path",
            "description": "The unique identifier of the user",
            "x-ms-summary": "User",
            "type": "string",
            "required": true,
            "x-ms-dynamic-values": {
              "operationId": "ListUsers",
              "value-path": "id",
              "value-title": "name",
              "value-collection": "users",
              "parameters": {
                "departmentId": {
                  "parameter": "departmentId"  // Depends on department selection
                }
              }
            }
          },
          {
            "name": "includeInactive",
            "in": "query",
            "description": "Include inactive users in results",
            "x-ms-summary": "Include Inactive",
            "type": "boolean",
            "default": false,
            "x-ms-visibility": "advanced"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "$ref": "#/definitions/UserDetails"
            }
          }
        }
      }
    }
  },
  "definitions": {
    "UserDetails": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier for the user",
          "x-ms-summary": "User ID"
        },
        "fullName": {
          "type": "string",
          "description": "Complete name of the user",
          "x-ms-summary": "Full Name"
        },
        "emailAddress": {
          "type": "string",
          "description": "Primary email address",
          "x-ms-summary": "Email"
        },
        "departmentName": {
          "type": "string",
          "x-ms-summary": "Department"
        },
        "lastLogin": {
          "type": "string",
          "format": "date-time",
          "x-ms-summary": "Last Login",
          "x-ms-visibility": "advanced"
        }
      }
    }
  }
}
```

### Example 2: Webhook Trigger with Pagination

```json
{
  "paths": {
    "/webhooks/on-item-created": {
      "x-ms-notification-content": {
        "description": "When an item is created",
        "x-ms-summary": "New Item",
        "schema": {
          "$ref": "#/definitions/Item"
        }
      },
      "post": {
        "summary": "When an item is created (webhook)",
        "x-ms-summary": "When an item is created",
        "operationId": "OnItemCreated",
        "x-ms-trigger": "single",
        "x-ms-trigger-hint": "Triggers immediately when a new item is created",
        "x-ms-visibility": "important",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["callbackUrl"],
              "properties": {
                "callbackUrl": {
                  "type": "string",
                  "description": "Webhook callback URL",
                  "x-ms-notification-url": true,
                  "x-ms-visibility": "internal"
                },
                "events": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "enum": ["created", "updated", "deleted"]
                  },
                  "description": "Types of events to subscribe to",
                  "x-ms-summary": "Event Types",
                  "default": ["created"]
                }
              }
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Webhook subscription created"
          }
        }
      },
      "delete": {
        "summary": "Unsubscribe webhook",
        "operationId": "DeleteWebhook",
        "x-ms-visibility": "internal",
        "parameters": [
          {
            "name": "subscriptionId",
            "in": "path",
            "type": "string",
            "required": true
          }
        ],
        "responses": {
          "200": {"description": "Deleted"}
        }
      }
    },
    "/items": {
      "get": {
        "summary": "List all items",
        "x-ms-summary": "List Items",
        "operationId": "ListItems",
        "x-ms-pageable": {
          "nextLinkName": "@odata.nextLink"
        },
        "x-ms-page-size": 100,
        "responses": {
          "200": {
            "schema": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "array",
                  "items": {"$ref": "#/definitions/Item"}
                },
                "@odata.nextLink": {
                  "type": "string",
                  "description": "URL to next page"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Extension Usage Summary

| Extension | Usage | Priority |
|-----------|-------|----------|
| x-ms-summary | Operations, parameters, properties | **High** |
| x-ms-visibility | Parameters, properties | **High** |
| x-ms-dynamic-values | Parameters | **Medium** |
| x-ms-trigger | Webhook operations | **High** (for triggers) |
| x-ms-pageable | List operations | **Medium** |
| x-ms-dynamic-schema | Body parameters, responses | **Low** (advanced) |
| x-ms-url-encoding | Parameters | **Low** (as needed) |
| x-ms-capabilities | Connector info | **Low** (optional) |

## Best Practices

1. **Always provide x-ms-summary** for operations and parameters
2. **Use x-ms-visibility wisely** - Don't hide required fields
3. **Enable x-ms-dynamic-values** for any parameter with a finite set of options
4. **Mark internal operations** with `x-ms-visibility: "internal"`
5. **Add pagination** to all list operations that could return many results
6. **Document triggers properly** with x-ms-trigger and notification content
7. **Test dynamic values** - Ensure the referenced operations work correctly

## References

- Microsoft OpenAPI Extensions: https://learn.microsoft.com/en-us/connectors/custom-connectors/openapi-extensions
- Power Platform Connectors GitHub: https://github.com/microsoft/PowerPlatformConnectors

---

**Note**: These extensions are specific to Power Platform. They won't cause errors in other OpenAPI tools but will be ignored.
