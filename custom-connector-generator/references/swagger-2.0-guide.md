# Swagger 2.0 Guide for Power Platform Custom Connectors

Complete reference for Swagger 2.0 specification and OpenAPI 3.x to Swagger 2.0 conversion.

## Table of Contents
1. [Swagger 2.0 Structure](#swagger-20-structure)
2. [OpenAPI 3.x to Swagger 2.0 Conversion](#openapi-3x-to-swagger-20-conversion)
3. [Complete Field Reference](#complete-field-reference)
4. [Common Conversion Patterns](#common-conversion-patterns)

## Swagger 2.0 Structure

### Required Root Fields

```json
{
  "swagger": "2.0",
  "info": {
    "title": "My API",
    "version": "1.0.0",
    "description": "API description"
  },
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "paths": {},
  "definitions": {},
  "securityDefinitions": {},
  "security": []
}
```

### Info Object

```json
"info": {
  "title": "API Title",              // Required
  "version": "1.0.0",                // Required
  "description": "Description text",  // Recommended
  "termsOfService": "https://...",   // Optional
  "contact": {                        // Optional
    "name": "Support Team",
    "url": "https://support.example.com",
    "email": "support@example.com"
  },
  "license": {                        // Optional
    "name": "MIT",
    "url": "https://opensource.org/licenses/MIT"
  }
}
```

### Host, Base Path, and Schemes

```json
// Combines to: https://api.example.com/v1
"host": "api.example.com",    // No protocol, no path
"basePath": "/v1",            // Starting slash, no trailing slash
"schemes": ["https", "http"], // Array of protocols
```

### Consumes and Produces

```json
"consumes": [                 // Request content types (global default)
  "application/json",
  "application/xml"
],
"produces": [                 // Response content types (global default)
  "application/json",
  "application/xml"
]
```

Can also be specified per-operation to override global defaults.

## OpenAPI 3.x to Swagger 2.0 Conversion

### 1. Version and Servers

**OpenAPI 3.x:**
```json
{
  "openapi": "3.0.0",
  "servers": [
    {
      "url": "https://api.example.com/v1",
      "description": "Production server"
    },
    {
      "url": "https://api-staging.example.com/v1",
      "description": "Staging server"
    }
  ]
}
```

**Swagger 2.0:**
```json
{
  "swagger": "2.0",
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"]
}
```

**Conversion Rules:**
- Use first server URL only (Power Platform doesn't support multiple servers)
- Split URL into: `schemes`, `host`, and `basePath`
- Parse: `{scheme}://{host}{basePath}`

### 2. Components to Root-Level Objects

**OpenAPI 3.x:**
```json
{
  "components": {
    "schemas": {
      "User": {...}
    },
    "securitySchemes": {
      "bearerAuth": {...}
    },
    "parameters": {
      "UserId": {...}
    },
    "responses": {
      "NotFound": {...}
    }
  }
}
```

**Swagger 2.0:**
```json
{
  "definitions": {
    "User": {...}
  },
  "securityDefinitions": {
    "bearerAuth": {...}
  },
  "parameters": {
    "UserId": {...}
  },
  "responses": {
    "NotFound": {...}
  }
}
```

**Conversion Rules:**
- `components.schemas` → `definitions`
- `components.securitySchemes` → `securityDefinitions`
- `components.parameters` → `parameters`
- `components.responses` → `responses`
- Update all `$ref` paths: `#/components/schemas/User` → `#/definitions/User`

### 3. Request Body to Parameters

**OpenAPI 3.x:**
```json
{
  "paths": {
    "/users": {
      "post": {
        "requestBody": {
          "required": true,
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
}
```

**Swagger 2.0:**
```json
{
  "paths": {
    "/users": {
      "post": {
        "consumes": ["application/json"],
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {
              "$ref": "#/definitions/User"
            }
          }
        ]
      }
    }
  }
}
```

**Conversion Rules:**
- `requestBody` → parameter with `in: "body"`
- `requestBody.required` → `required` in parameter
- `content` media types → `consumes` array
- First content type schema → parameter schema
- Name parameter "body" by convention

### 4. Response Content to Schema

**OpenAPI 3.x:**
```json
{
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
```

**Swagger 2.0:**
```json
{
  "responses": {
    "200": {
      "description": "Success",
      "schema": {
        "$ref": "#/definitions/User"
      }
    }
  }
}
```

**Conversion Rules:**
- Remove `content` wrapper
- Use first content type's schema directly
- Media types go in operation-level `produces`

### 5. Security Schemes

#### API Key

**OpenAPI 3.x:**
```json
{
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  }
}
```

**Swagger 2.0:**
```json
{
  "securityDefinitions": {
    "ApiKeyAuth": {
      "type": "apiKey",
      "in": "header",
      "name": "X-API-Key"
    }
  }
}
```

No conversion needed - structure is identical.

#### HTTP Bearer (JWT)

**OpenAPI 3.x:**
```json
{
  "components": {
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

**Swagger 2.0:**
```json
{
  "securityDefinitions": {
    "bearerAuth": {
      "type": "apiKey",
      "in": "header",
      "name": "Authorization"
    }
  }
}
```

**Conversion Rules:**
- HTTP bearer → API Key in header named "Authorization"
- `bearerFormat` is dropped (Swagger 2.0 doesn't support it)
- Value must be prefixed with "Bearer " in implementation

#### OAuth 2.0

**OpenAPI 3.x:**
```json
{
  "components": {
    "securitySchemes": {
      "oauth2": {
        "type": "oauth2",
        "flows": {
          "authorizationCode": {
            "authorizationUrl": "https://api.example.com/oauth/authorize",
            "tokenUrl": "https://api.example.com/oauth/token",
            "scopes": {
              "read": "Read access",
              "write": "Write access"
            }
          }
        }
      }
    }
  }
}
```

**Swagger 2.0:**
```json
{
  "securityDefinitions": {
    "oauth2": {
      "type": "oauth2",
      "flow": "accessCode",
      "authorizationUrl": "https://api.example.com/oauth/authorize",
      "tokenUrl": "https://api.example.com/oauth/token",
      "scopes": {
        "read": "Read access",
        "write": "Write access"
      }
    }
  }
}
```

**Conversion Rules:**
- `flows.authorizationCode` → `flow: "accessCode"`
- `flows.implicit` → `flow: "implicit"`
- `flows.password` → `flow: "password"`
- `flows.clientCredentials` → `flow: "application"`
- Extract URLs and scopes from flow object
- Power Platform primarily supports `accessCode` (authorization code flow)

### 6. Parameters

Most parameters are identical, but location changes:

**OpenAPI 3.x:**
```json
{
  "parameters": [
    {
      "name": "userId",
      "in": "path",
      "required": true,
      "schema": {
        "type": "string"
      },
      "description": "User ID"
    }
  ]
}
```

**Swagger 2.0:**
```json
{
  "parameters": [
    {
      "name": "userId",
      "in": "path",
      "required": true,
      "type": "string",
      "description": "User ID"
    }
  ]
}
```

**Conversion Rules:**
- Move `schema` contents to parameter level
- `schema.type` → `type`
- `schema.format` → `format`
- `schema.enum` → `enum`
- Keep all other fields (name, in, required, description)

## Complete Field Reference

### Path Item Object

```json
"/users/{userId}": {
  "get": {...},        // Operation object
  "put": {...},
  "post": {...},
  "delete": {...},
  "options": {...},
  "head": {...},
  "patch": {...},
  "parameters": [...]  // Parameters for all operations
}
```

### Operation Object

```json
{
  "tags": ["Users"],                    // For grouping in UI
  "summary": "Get user",                // Short description
  "description": "Longer description",  // Detailed description
  "operationId": "getUser",             // Unique ID (important!)
  "consumes": ["application/json"],     // Overrides global
  "produces": ["application/json"],     // Overrides global
  "parameters": [...],                  // Operation parameters
  "responses": {...},                   // Response definitions
  "schemes": ["https"],                 // Overrides global
  "deprecated": false,                  // Mark as deprecated
  "security": [...]                     // Overrides global security
}
```

### Parameter Object

```json
{
  "name": "userId",             // Parameter name
  "in": "path",                 // path|query|header|body|formData
  "description": "User ID",     // Description
  "required": true,             // Required flag
  "type": "string",             // For non-body: string|number|integer|boolean|array|file
  "format": "uuid",             // Optional format
  "schema": {...},              // For body parameters only
  "default": "value",           // Default value
  "enum": ["a", "b"],           // Allowed values
  "minimum": 0,                 // For numbers
  "maximum": 100,
  "minLength": 1,               // For strings
  "maxLength": 50,
  "pattern": "^[a-z]+$",        // Regex pattern
  "items": {...},               // For arrays
  "collectionFormat": "csv"     // csv|ssv|tsv|pipes|multi (for arrays)
}
```

**Parameter Locations:**
- `path` - Part of URL path (always required)
- `query` - Query string parameter
- `header` - HTTP header
- `body` - Request body (only one per operation)
- `formData` - Form data (multipart/form-data or application/x-www-form-urlencoded)

### Response Object

```json
{
  "description": "Success",  // Required
  "schema": {                // Response schema
    "$ref": "#/definitions/User"
  },
  "headers": {               // Response headers
    "X-Rate-Limit": {
      "type": "integer",
      "description": "Requests per hour"
    }
  },
  "examples": {              // Response examples
    "application/json": {
      "id": "123",
      "name": "John"
    }
  }
}
```

### Schema Object (Definitions)

```json
"User": {
  "type": "object",
  "required": ["id", "email"],
  "properties": {
    "id": {
      "type": "string",
      "description": "User ID"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true
    }
  }
}
```

**Data Types:**
- `string` - with formats: date, date-time, password, byte, binary, email, uuid, uri, hostname, ipv4, ipv6
- `number` - with formats: float, double
- `integer` - with formats: int32, int64
- `boolean`
- `array` - requires `items`
- `object` - with `properties`
- `file` - for file uploads (in formData parameters)

## Common Conversion Patterns

### Pattern 1: Simple CRUD API

**Before (OpenAPI 3.x):**
```json
{
  "openapi": "3.0.0",
  "info": {"title": "Users API", "version": "1.0.0"},
  "servers": [{"url": "https://api.example.com/v1"}],
  "paths": {
    "/users": {
      "get": {
        "summary": "List users",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {"$ref": "#/components/schemas/User"}
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create user",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {"$ref": "#/components/schemas/User"}
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/User"}
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
          "id": {"type": "string"},
          "name": {"type": "string"}
        }
      }
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer"
      }
    }
  }
}
```

**After (Swagger 2.0):**
```json
{
  "swagger": "2.0",
  "info": {"title": "Users API", "version": "1.0.0"},
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"],
  "paths": {
    "/users": {
      "get": {
        "summary": "List users",
        "operationId": "listUsers",
        "responses": {
          "200": {
            "description": "Success",
            "schema": {
              "type": "array",
              "items": {"$ref": "#/definitions/User"}
            }
          }
        }
      },
      "post": {
        "summary": "Create user",
        "operationId": "createUser",
        "parameters": [
          {
            "in": "body",
            "name": "body",
            "required": true,
            "schema": {"$ref": "#/definitions/User"}
          }
        ],
        "responses": {
          "201": {
            "description": "Created",
            "schema": {"$ref": "#/definitions/User"}
          }
        }
      }
    }
  },
  "definitions": {
    "User": {
      "type": "object",
      "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"}
      }
    }
  },
  "securityDefinitions": {
    "bearerAuth": {
      "type": "apiKey",
      "name": "Authorization",
      "in": "header"
    }
  },
  "security": [
    {"bearerAuth": []}
  ]
}
```

### Pattern 2: API with Query Parameters and Pagination

**Before (OpenAPI 3.x):**
```json
{
  "paths": {
    "/users": {
      "get": {
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": {"type": "integer", "default": 1}
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {"type": "integer", "default": 10}
          }
        ]
      }
    }
  }
}
```

**After (Swagger 2.0):**
```json
{
  "paths": {
    "/users": {
      "get": {
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "type": "integer",
            "default": 1
          },
          {
            "name": "limit",
            "in": "query",
            "type": "integer",
            "default": 10
          }
        ]
      }
    }
  }
}
```

### Pattern 3: File Upload

**Before (OpenAPI 3.x):**
```json
{
  "paths": {
    "/upload": {
      "post": {
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  },
                  "description": {
                    "type": "string"
                  }
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

**After (Swagger 2.0):**
```json
{
  "paths": {
    "/upload": {
      "post": {
        "consumes": ["multipart/form-data"],
        "parameters": [
          {
            "in": "formData",
            "name": "file",
            "type": "file",
            "required": true
          },
          {
            "in": "formData",
            "name": "description",
            "type": "string"
          }
        ]
      }
    }
  }
}
```

## Validation Rules

### Required Fields
- Root: `swagger`, `info`, `paths`
- Info: `title`, `version`
- Operation: `responses`
- Response: `description`
- Parameter: `name`, `in`
- Path parameter: must have `required: true`

### Common Errors to Avoid
1. ❌ Using `openapi` field → ✅ Use `swagger: "2.0"`
2. ❌ `servers` array → ✅ Use `host`, `basePath`, `schemes`
3. ❌ `components` → ✅ Use root-level objects
4. ❌ `requestBody` → ✅ Use `parameters` with `in: "body"`
5. ❌ `content` in responses → ✅ Use `schema` directly
6. ❌ `schema` in non-body parameters → ✅ Use `type` directly
7. ❌ Bearer token as `http` type → ✅ Use `apiKey` type
8. ❌ Multiple `in: "body"` parameters → ✅ Only one allowed
9. ❌ `formData` and `body` together → ✅ Mutually exclusive
10. ❌ Missing `operationId` → ✅ Always provide unique IDs

## Conversion Checklist

When converting from OpenAPI 3.x to Swagger 2.0:

- [ ] Change `openapi: "3.x.x"` to `swagger: "2.0"`
- [ ] Convert `servers` to `host`, `basePath`, `schemes`
- [ ] Move `components.schemas` to `definitions`
- [ ] Move `components.securitySchemes` to `securityDefinitions`
- [ ] Update all `$ref` paths (#/components/... → #/definitions/...)
- [ ] Convert `requestBody` to `parameters` with `in: "body"`
- [ ] Convert response `content` to direct `schema`
- [ ] Convert parameter `schema` to direct `type`
- [ ] Convert HTTP bearer to API Key in Authorization header
- [ ] Convert OAuth flows to Swagger 2.0 flow types
- [ ] Extract media types to `consumes`/`produces`
- [ ] Add `operationId` to all operations
- [ ] Validate against Swagger 2.0 schema

## References

- Swagger 2.0 Specification: https://swagger.io/specification/v2/
- OpenAPI 3.0 Specification: https://spec.openapis.org/oas/v3.0.0
- Power Platform Connectors GitHub: https://github.com/microsoft/PowerPlatformConnectors

---

**Note**: This guide covers the most common scenarios. For complex edge cases, always refer to the official Swagger 2.0 specification and test with the Power Platform Connectors validation tools.
