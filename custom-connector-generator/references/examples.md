# Custom Connector Conversion Examples

Complete before/after examples of converting OpenAPI specs to Power Automate custom connectors.

## Table of Contents
1. [Example 1: REST API with Bearer Token](#example-1-rest-api-with-bearer-token)
2. [Example 2: OAuth 2.0 API with Dynamic Dropdowns](#example-2-oauth-20-api-with-dynamic-dropdowns)
3. [Example 3: Multi-Region API with Environment Selection](#example-3-multi-region-api-with-environment-selection)
4. [Example 4: Webhook Trigger Connector](#example-4-webhook-trigger-connector)
5. [Example 5: File Upload API](#example-5-file-upload-api)

## Example 1: REST API with Bearer Token

### Scenario
Simple CRUD API for managing users, uses Bearer token authentication.

### Input: OpenAPI 3.0.0

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Users API",
    "version": "1.0.0",
    "description": "API for managing users"
  },
  "servers": [
    {
      "url": "https://api.example.com/v1"
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "List all users",
        "operationId": "listUsers",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 20
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "users": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/User"
                      }
                    },
                    "total": {
                      "type": "integer"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a new user",
        "operationId": "createUser",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateUserRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "User created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    },
    "/users/{userId}": {
      "get": {
        "summary": "Get user by ID",
        "operationId": "getUser",
        "parameters": [
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "CreateUserRequest": {
        "type": "object",
        "required": ["name", "email"],
        "properties": {
          "name": {
            "type": "string"
          },
          "email": {
            "type": "string",
            "format": "email"
          }
        }
      }
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}
```

### Output 1: apiDefinition.swagger.json

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Users API",
    "version": "1.0.0",
    "description": "API for managing users"
  },
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "security": [
    {
      "bearer": []
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "List all users",
        "x-ms-summary": "List Users",
        "operationId": "listUsers",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "description": "Page number for pagination",
            "x-ms-summary": "Page",
            "type": "integer",
            "default": 1,
            "x-ms-visibility": "advanced"
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of users per page",
            "x-ms-summary": "Limit",
            "type": "integer",
            "default": 20,
            "x-ms-visibility": "advanced"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "type": "object",
              "properties": {
                "users": {
                  "type": "array",
                  "description": "List of users",
                  "x-ms-summary": "Users",
                  "items": {
                    "$ref": "#/definitions/User"
                  }
                },
                "total": {
                  "type": "integer",
                  "description": "Total number of users",
                  "x-ms-summary": "Total"
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a new user",
        "x-ms-summary": "Create User",
        "operationId": "createUser",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/CreateUserRequest"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "User created successfully",
            "schema": {
              "$ref": "#/definitions/User"
            }
          },
          "400": {
            "description": "Bad request - invalid user data"
          }
        }
      }
    },
    "/users/{userId}": {
      "get": {
        "summary": "Get user by ID",
        "x-ms-summary": "Get User",
        "operationId": "getUser",
        "parameters": [
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "description": "Unique identifier of the user",
            "x-ms-summary": "User ID",
            "type": "string"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "$ref": "#/definitions/User"
            }
          },
          "404": {
            "description": "User not found"
          }
        }
      }
    }
  },
  "definitions": {
    "User": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier",
          "x-ms-summary": "User ID"
        },
        "name": {
          "type": "string",
          "description": "Full name of the user",
          "x-ms-summary": "Name"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address",
          "x-ms-summary": "Email"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time",
          "description": "Creation timestamp",
          "x-ms-summary": "Created At",
          "x-ms-visibility": "advanced"
        }
      }
    },
    "CreateUserRequest": {
      "type": "object",
      "required": ["name", "email"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Full name of the user",
          "x-ms-summary": "Name"
        },
        "email": {
          "type": "string",
          "format": "email",
          "description": "Email address",
          "x-ms-summary": "Email"
        }
      }
    }
  },
  "securityDefinitions": {
    "bearer": {
      "type": "apiKey",
      "name": "Authorization",
      "in": "header"
    }
  }
}
```

### Output 2: apiProperties.json

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/master/schemas/paconn-apiProperties.schema.json#",
  "properties": {
    "iconBrandColor": "#0078d4",
    "capabilities": [],
    "publisher": "Your Company",
    "connectionParameters": {
      "token": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "Bearer Token",
          "description": "Enter your API bearer token or JWT",
          "tooltip": "Get your token from the API settings page",
          "constraints": {
            "tabIndex": 2,
            "clearText": false,
            "required": "true"
          }
        }
      }
    }
  }
}
```

### Key Changes Made

1. ✅ Converted `openapi: "3.0.0"` → `swagger: "2.0"`
2. ✅ Split `servers` into `host`, `basePath`, `schemes`
3. ✅ Moved `components.schemas` → `definitions`
4. ✅ Moved `components.securitySchemes` → `securityDefinitions`
5. ✅ Updated all `$ref` paths
6. ✅ Converted `requestBody` → parameter with `in: "body"`
7. ✅ Moved response `content.schema` → direct `schema`
8. ✅ Converted parameter `schema` → direct properties
9. ✅ Converted HTTP bearer → API Key in Authorization header
10. ✅ Added x-ms-summary to all operations and key parameters
11. ✅ Added x-ms-visibility for advanced parameters
12. ✅ Added error responses (400, 404)
13. ✅ Enhanced descriptions for better UX

---

## Example 2: OAuth 2.0 API with Dynamic Dropdowns

### Scenario
CRM API with OAuth 2.0, has customers and orders with dependent dropdowns.

### Input: OpenAPI 3.0.0

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "CRM API",
    "version": "2.0.0"
  },
  "servers": [
    {
      "url": "https://api.crm.example.com"
    }
  ],
  "paths": {
    "/customers": {
      "get": {
        "summary": "List customers",
        "operationId": "listCustomers",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
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
    "/customers/{customerId}/orders": {
      "get": {
        "summary": "List orders for customer",
        "operationId": "listCustomerOrders",
        "parameters": [
          {
            "name": "customerId",
            "in": "path",
            "required": true,
            "schema": {"type": "string"}
          }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {"type": "string"},
                      "orderNumber": {"type": "string"},
                      "total": {"type": "number"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/orders/{orderId}": {
      "get": {
        "summary": "Get order details",
        "operationId": "getOrder",
        "parameters": [
          {
            "name": "customerId",
            "in": "query",
            "schema": {"type": "string"}
          },
          {
            "name": "orderId",
            "in": "path",
            "required": true,
            "schema": {"type": "string"}
          }
        ],
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Order"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Order": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "orderNumber": {"type": "string"},
          "customerId": {"type": "string"},
          "total": {"type": "number"},
          "status": {"type": "string"}
        }
      }
    },
    "securitySchemes": {
      "oauth2": {
        "type": "oauth2",
        "flows": {
          "authorizationCode": {
            "authorizationUrl": "https://auth.crm.example.com/oauth/authorize",
            "tokenUrl": "https://auth.crm.example.com/oauth/token",
            "scopes": {
              "read:customers": "Read customer data",
              "read:orders": "Read order data",
              "write:orders": "Create and update orders"
            }
          }
        }
      }
    }
  },
  "security": [
    {
      "oauth2": ["read:customers", "read:orders"]
    }
  ]
}
```

### Output: apiDefinition.swagger.json

```json
{
  "swagger": "2.0",
  "info": {
    "title": "CRM API",
    "version": "2.0.0",
    "description": "Customer Relationship Management API"
  },
  "host": "api.crm.example.com",
  "basePath": "/",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "security": [
    {
      "oauth2": ["read:customers", "read:orders"]
    }
  ],
  "paths": {
    "/customers": {
      "get": {
        "summary": "List all customers",
        "x-ms-summary": "List Customers",
        "operationId": "listCustomers",
        "x-ms-visibility": "internal",
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
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
    },
    "/customers/{customerId}/orders": {
      "get": {
        "summary": "List orders for a specific customer",
        "x-ms-summary": "List Customer Orders",
        "operationId": "listCustomerOrders",
        "x-ms-visibility": "internal",
        "parameters": [
          {
            "name": "customerId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "id": {"type": "string"},
                  "orderNumber": {"type": "string"},
                  "total": {"type": "number"}
                }
              }
            }
          }
        }
      }
    },
    "/orders/{orderId}": {
      "get": {
        "summary": "Get detailed information about an order",
        "x-ms-summary": "Get Order",
        "operationId": "getOrder",
        "parameters": [
          {
            "name": "customerId",
            "in": "query",
            "required": true,
            "description": "Select the customer who placed the order",
            "x-ms-summary": "Customer",
            "type": "string",
            "x-ms-dynamic-values": {
              "operationId": "listCustomers",
              "value-path": "id",
              "value-title": "name"
            }
          },
          {
            "name": "orderId",
            "in": "path",
            "required": true,
            "description": "Select the order to view",
            "x-ms-summary": "Order",
            "type": "string",
            "x-ms-dynamic-values": {
              "operationId": "listCustomerOrders",
              "value-path": "id",
              "value-title": "orderNumber",
              "parameters": {
                "customerId": {
                  "parameter": "customerId"
                }
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "$ref": "#/definitions/Order"
            }
          },
          "404": {
            "description": "Order not found"
          }
        }
      }
    }
  },
  "definitions": {
    "Order": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "x-ms-summary": "Order ID"
        },
        "orderNumber": {
          "type": "string",
          "x-ms-summary": "Order Number"
        },
        "customerId": {
          "type": "string",
          "x-ms-summary": "Customer ID"
        },
        "total": {
          "type": "number",
          "x-ms-summary": "Total Amount"
        },
        "status": {
          "type": "string",
          "x-ms-summary": "Status"
        }
      }
    }
  },
  "securityDefinitions": {
    "oauth2": {
      "type": "oauth2",
      "flow": "accessCode",
      "authorizationUrl": "https://auth.crm.example.com/oauth/authorize",
      "tokenUrl": "https://auth.crm.example.com/oauth/token",
      "scopes": {
        "read:customers": "Read customer data",
        "read:orders": "Read order data",
        "write:orders": "Create and update orders"
      }
    }
  }
}
```

### Output: apiProperties.json

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/master/schemas/paconn-apiProperties.schema.json#",
  "properties": {
    "iconBrandColor": "#ff6b35",
    "publisher": "CRM Solutions Inc",
    "connectionParameters": {
      "token": {
        "type": "oauthSetting",
        "oAuthSettings": {
          "identityProvider": "oauth2",
          "clientId": "YOUR_CLIENT_ID_HERE",
          "scopes": [
            "read:customers",
            "read:orders",
            "write:orders"
          ],
          "redirectMode": "Global",
          "redirectUrl": "https://global.consent.azure-apim.net/redirect",
          "customParameters": {
            "authorizationUrl": {
              "value": "https://auth.crm.example.com/oauth/authorize"
            },
            "tokenUrl": {
              "value": "https://auth.crm.example.com/oauth/token"
            },
            "refreshUrl": {
              "value": "https://auth.crm.example.com/oauth/refresh"
            }
          }
        }
      }
    }
  }
}
```

### Key Features Demonstrated

1. ✅ OAuth 2.0 authorization code flow
2. ✅ Dynamic dropdowns with dependencies
3. ✅ Hidden internal operations (`x-ms-visibility: "internal"`)
4. ✅ Customer dropdown populated from listCustomers
5. ✅ Order dropdown filtered by selected customer
6. ✅ Proper scope configuration

---

## Example 3: Multi-Region API with Environment Selection

### Input: OpenAPI 3.0.0

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Global API",
    "version": "1.0.0"
  },
  "servers": [
    {"url": "https://api-us.example.com"},
    {"url": "https://api-eu.example.com"},
    {"url": "https://api-asia.example.com"}
  ],
  "paths": {
    "/data": {
      "get": {
        "summary": "Get data",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "apiKey": {
        "type": "apiKey",
        "name": "X-API-Key",
        "in": "header"
      }
    }
  },
  "security": [{"apiKey": []}]
}
```

### Output: apiProperties.json

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/master/schemas/paconn-apiProperties.schema.json#",
  "properties": {
    "iconBrandColor": "#2e7d32",
    "connectionParameters": {
      "region": {
        "type": "string",
        "uiDefinition": {
          "displayName": "Region",
          "description": "Select your region",
          "constraints": {
            "tabIndex": 1,
            "required": "true",
            "allowedValues": [
              {
                "text": "United States",
                "value": "https://api-us.example.com"
              },
              {
                "text": "Europe",
                "value": "https://api-eu.example.com"
              },
              {
                "text": "Asia Pacific",
                "value": "https://api-asia.example.com"
              }
            ]
          }
        }
      },
      "api_key": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "API Key",
          "description": "Enter your API key",
          "constraints": {
            "tabIndex": 2,
            "clearText": false,
            "required": "true"
          }
        }
      }
    },
    "policyTemplateInstances": [
      {
        "templateId": "routerequesttoendpoint",
        "title": "Route to selected region",
        "parameters": {
          "x-ms-apimTemplateParameter.urlTemplate": "@connectionParameters('region')",
          "x-ms-apimTemplate-operationName": ["*"]
        }
      }
    ]
  }
}
```

### Key Features

1. ✅ Multi-region support via routing policy
2. ✅ User selects region at connection time
3. ✅ All requests routed to selected region
4. ✅ Single connector definition works for all regions

---

## Conversion Checklist

When converting any OpenAPI 3.x to Power Automate custom connector:

**Structure Conversion**
- [ ] `openapi: "3.x"` → `swagger: "2.0"`
- [ ] `servers` → `host`, `basePath`, `schemes`
- [ ] `components.schemas` → `definitions`
- [ ] `components.securitySchemes` → `securityDefinitions`
- [ ] Update all `$ref` paths

**Request/Response Conversion**
- [ ] `requestBody` → parameter with `in: "body"`
- [ ] Response `content.schema` → direct `schema`
- [ ] Parameter `schema` → direct type/format
- [ ] Extract media types to `consumes`/`produces`

**Security Conversion**
- [ ] HTTP bearer → `apiKey` in `Authorization` header
- [ ] OAuth flows → Swagger flow types
- [ ] Match apiProperties.json authentication

**Power Platform Enhancements**
- [ ] Add `x-ms-summary` to operations
- [ ] Add `x-ms-summary` to parameters
- [ ] Add `x-ms-summary` to response properties
- [ ] Set `x-ms-visibility` appropriately
- [ ] Implement `x-ms-dynamic-values` for dropdowns
- [ ] Add error responses (400, 404, 500)
- [ ] Add pagination if applicable

**Files Created**
- [ ] apiDefinition.swagger.json
- [ ] apiProperties.json
- [ ] README.md with setup instructions
- [ ] deployment.md with PAC CLI commands

---

## Best Practices Summary

1. **Always add x-ms-summary** - Makes connector intuitive
2. **Use x-ms-visibility wisely** - Don't overwhelm users
3. **Implement dynamic dropdowns** - Better than free text
4. **Add error responses** - Help users troubleshoot
5. **Use policies for multi-region** - One connector, multiple endpoints
6. **Test thoroughly** - Validate in dev environment first
7. **Document well** - README is crucial for adoption

## References

- Example conversions: microsoft/PowerPlatformConnectors GitHub
- Best practices: Microsoft Learn Custom Connectors documentation
- Validation: PAC CLI `paconn validate` command

---

**Note**: These examples show common patterns. Real-world APIs may require additional customization based on specific requirements.
