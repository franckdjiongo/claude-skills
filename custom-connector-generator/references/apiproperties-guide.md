# apiProperties.json Reference Guide

Complete reference for Power Automate custom connector apiProperties.json file structure, authentication configurations, and metadata.

## Table of Contents
1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Authentication Types](#authentication-types)
4. [Multi-Authentication](#multi-authentication)
5. [Policy Templates](#policy-templates)
6. [Complete Examples](#complete-examples)

## Overview

The apiProperties.json file contains:
- **Authentication configuration** - How users connect to your API
- **Connector metadata** - Icon color, description, publisher info
- **Policy templates** - Request/response transformations
- **Capabilities** - Test connection, file browsing, etc.

**Critical**: This file works together with apiDefinition.swagger.json. Authentication defined here must match security definitions in the Swagger file.

## File Structure

### Minimal Required Structure

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {}
  }
}
```

### Complete Structure

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/master/schemas/paconn-apiProperties.schema.json#",
  "properties": {
    "iconBrandColor": "#007ee5",
    "capabilities": [],
    "publisher": "Contoso",
    "stackOwner": "Contoso",
    "connectionParameters": {
      // Authentication configuration
    },
    "connectionParameterSets": {
      // Multi-auth configuration
    },
    "policyTemplateInstances": [
      // Policy templates
    ]
  }
}
```

### Properties Explanation

**iconBrandColor** (required)
- Hex color code for connector icon background
- Example: `"#007ee5"` (blue), `"#ff6b35"` (orange)

**capabilities** (optional)
- Array of connector capabilities
- Example: `["actions", "triggers"]`

**publisher** (optional)
- Organization name
- Shows in connector info
- Example: `"Contoso Corporation"`

**stackOwner** (optional)
- Used for certified connectors
- Generally same as publisher

**connectionParameters** (required)
- Authentication configuration
- See [Authentication Types](#authentication-types)

**connectionParameterSets** (optional)
- Multiple authentication options
- See [Multi-Authentication](#multi-authentication)

**policyTemplateInstances** (optional)
- Request/response transformations
- See [Policy Templates](#policy-templates)

## Authentication Types

### 1. No Authentication

For public APIs that don't require authentication.

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {}
  }
}
```

**Use when**:
- API is completely public
- No API key or token required
- Rare for production APIs

---

### 2. API Key Authentication

Most common for REST APIs. User provides an API key.

#### Header-based API Key

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "api_key": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "API Key",
          "description": "Enter your API key from the developer portal",
          "tooltip": "You can find your API key at https://portal.example.com/keys",
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

**Corresponding Swagger Definition**:
```json
{
  "securityDefinitions": {
    "api_key": {
      "type": "apiKey",
      "name": "X-API-Key",
      "in": "header"
    }
  },
  "security": [
    {"api_key": []}
  ]
}
```

#### Query Parameter API Key

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "api_key": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "API Key",
          "description": "Your API authentication key",
          "constraints": {
            "required": "true",
            "clearText": false
          }
        }
      }
    }
  }
}
```

**Corresponding Swagger Definition**:
```json
{
  "securityDefinitions": {
    "api_key": {
      "type": "apiKey",
      "name": "apiKey",
      "in": "query"
    }
  },
  "security": [
    {"api_key": []}
  ]
}
```

---

### 3. Basic Authentication

Username and password authentication.

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "username": {
        "type": "string",
        "uiDefinition": {
          "displayName": "Username",
          "description": "Your account username",
          "tooltip": "Enter your username",
          "constraints": {
            "tabIndex": 1,
            "required": "true"
          }
        }
      },
      "password": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "Password",
          "description": "Your account password",
          "tooltip": "Enter your password",
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

**Corresponding Swagger Definition**:
```json
{
  "securityDefinitions": {
    "basic": {
      "type": "basic"
    }
  },
  "security": [
    {"basic": []}
  ]
}
```

---

### 4. OAuth 2.0 Authentication

Most secure and user-friendly for APIs with OAuth support.

#### Authorization Code Flow (Recommended)

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "token": {
        "type": "oauthSetting",
        "oAuthSettings": {
          "identityProvider": "oauth2",
          "clientId": "YOUR_CLIENT_ID",
          "scopes": [
            "read:users",
            "write:users",
            "read:orders"
          ],
          "redirectMode": "Global",
          "redirectUrl": "https://global.consent.azure-apim.net/redirect",
          "customParameters": {
            "authorizationUrl": {
              "value": "https://api.example.com/oauth/authorize"
            },
            "tokenUrl": {
              "value": "https://api.example.com/oauth/token"
            },
            "refreshUrl": {
              "value": "https://api.example.com/oauth/refresh"
            }
          }
        }
      }
    }
  }
}
```

**Corresponding Swagger Definition**:
```json
{
  "securityDefinitions": {
    "oauth2": {
      "type": "oauth2",
      "flow": "accessCode",
      "authorizationUrl": "https://api.example.com/oauth/authorize",
      "tokenUrl": "https://api.example.com/oauth/token",
      "scopes": {
        "read:users": "Read user data",
        "write:users": "Modify user data",
        "read:orders": "Read order data"
      }
    }
  },
  "security": [
    {
      "oauth2": [
        "read:users",
        "write:users",
        "read:orders"
      ]
    }
  ]
}
```

#### Azure AD (Entra ID) OAuth

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "token": {
        "type": "oauthSetting",
        "oAuthSettings": {
          "identityProvider": "aad",
          "clientId": "YOUR_AAD_CLIENT_ID",
          "scopes": [
            "https://graph.microsoft.com/.default"
          ],
          "redirectMode": "Global",
          "customParameters": {
            "loginUri": {
              "value": "https://login.windows.net"
            },
            "tenantId": {
              "value": "common"
            },
            "resourceUri": {
              "value": "https://graph.microsoft.com"
            }
          },
          "properties": {
            "IsFirstParty": "False"
          }
        }
      }
    }
  }
}
```

**redirectMode Options**:
- `"Global"` - Single OAuth app for all connections (recommended)
- `"GlobalPerConnector"` - OAuth app per connector instance
- `"Static"` - User provides their own OAuth app credentials

---

### 5. Bearer Token / JWT

For APIs using bearer tokens (like JWT).

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "token": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "Bearer Token",
          "description": "Enter your JWT or bearer token",
          "tooltip": "Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "constraints": {
            "required": "true",
            "clearText": false
          }
        }
      }
    }
  }
}
```

**Corresponding Swagger Definition**:
```json
{
  "securityDefinitions": {
    "bearer": {
      "type": "apiKey",
      "name": "Authorization",
      "in": "header"
    }
  },
  "security": [
    {"bearer": []}
  ]
}
```

**Note**: The connector will prepend "Bearer " to the token automatically when sending requests.

---

### 6. Certificate-based Authentication

For APIs requiring client certificates.

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "certificate": {
        "type": "certificate",
        "uiDefinition": {
          "displayName": "Client Certificate",
          "description": "Upload your client certificate (.pfx)",
          "constraints": {
            "required": "true"
          }
        }
      }
    }
  }
}
```

## Multi-Authentication

Allow users to choose between multiple authentication methods.

### Structure

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameterSets": {
      "uiDefinition": {
        "displayName": "Authentication Type",
        "description": "Select how you want to authenticate"
      },
      "values": [
        {
          "name": "oauth-auth",
          "uiDefinition": {
            "displayName": "OAuth 2.0 (Recommended)",
            "description": "Use OAuth for secure authentication"
          },
          "parameters": {
            // OAuth configuration
          }
        },
        {
          "name": "api-key-auth",
          "uiDefinition": {
            "displayName": "API Key",
            "description": "Use an API key for authentication"
          },
          "parameters": {
            // API Key configuration
          }
        }
      ]
    }
  }
}
```

### Complete Example: OAuth + API Key + Basic Auth

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameterSets": {
      "uiDefinition": {
        "displayName": "Authentication Type",
        "description": "Choose your preferred authentication method"
      },
      "values": [
        {
          "name": "oauth2-auth",
          "uiDefinition": {
            "displayName": "OAuth 2.0 (Recommended)",
            "description": "Most secure - authorize with your account"
          },
          "parameters": {
            "token": {
              "type": "oauthSetting",
              "oAuthSettings": {
                "identityProvider": "oauth2",
                "clientId": "YOUR_CLIENT_ID",
                "scopes": ["read", "write"],
                "redirectMode": "Global",
                "customParameters": {
                  "authorizationUrl": {
                    "value": "https://api.example.com/oauth/authorize"
                  },
                  "tokenUrl": {
                    "value": "https://api.example.com/oauth/token"
                  },
                  "refreshUrl": {
                    "value": "https://api.example.com/oauth/refresh"
                  }
                }
              }
            }
          }
        },
        {
          "name": "api-key-auth",
          "uiDefinition": {
            "displayName": "API Key",
            "description": "Use your API key from the developer portal"
          },
          "parameters": {
            "api_key": {
              "type": "securestring",
              "uiDefinition": {
                "displayName": "API Key",
                "description": "Enter your API key",
                "constraints": {
                  "required": "true",
                  "clearText": false
                }
              }
            },
            "environment": {
              "type": "string",
              "uiDefinition": {
                "displayName": "Environment",
                "description": "Select API environment",
                "constraints": {
                  "required": "true",
                  "allowedValues": [
                    {
                      "text": "Production",
                      "value": "prod"
                    },
                    {
                      "text": "Sandbox",
                      "value": "sandbox"
                    }
                  ]
                }
              }
            }
          }
        },
        {
          "name": "basic-auth",
          "uiDefinition": {
            "displayName": "Username and Password",
            "description": "Use your account credentials"
          },
          "parameters": {
            "username": {
              "type": "string",
              "uiDefinition": {
                "displayName": "Username",
                "constraints": {
                  "required": "true"
                }
              }
            },
            "password": {
              "type": "securestring",
              "uiDefinition": {
                "displayName": "Password",
                "constraints": {
                  "required": "true",
                  "clearText": false
                }
              }
            }
          }
        }
      ]
    }
  }
}
```

**Important Notes**:
- Only ONE auth method can be active per connection
- Each parameter set is mutually exclusive
- User chooses auth type when creating connection
- Cannot mix authentication types

## Policy Templates

Policy templates transform requests and responses at runtime.

### Available Templates

1. **routerequesttoendpoint** - Route requests to different endpoints
2. **dynamichosturl** - Dynamic host URL based on user input
3. **setheader** - Add/modify headers
4. **converttoformdata** - Convert JSON to form data

### Route Request to Endpoint

Useful for different environments (prod, staging) or regions.

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "environment": {
        "type": "string",
        "uiDefinition": {
          "displayName": "Environment",
          "description": "Select API environment",
          "constraints": {
            "required": "true",
            "allowedValues": [
              {
                "text": "Production",
                "value": "prod"
              },
              {
                "text": "Sandbox",
                "value": "sandbox"
              }
            ]
          }
        }
      }
    },
    "policyTemplateInstances": [
      {
        "templateId": "routerequesttoendpoint",
        "title": "Route to environment",
        "parameters": {
          "x-ms-apimTemplateParameter.urlTemplate": "@connectionParameters('environment','prod')",
          "x-ms-apimTemplate-operationName": [
            "GetUser",
            "CreateUser",
            "UpdateUser"
          ]
        }
      }
    ]
  }
}
```

### Dynamic Host URL

Allow user to specify their instance/tenant.

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "connectionParameters": {
      "instanceUrl": {
        "type": "string",
        "uiDefinition": {
          "displayName": "Instance URL",
          "description": "Your company's instance URL",
          "tooltip": "Example: company.example.com",
          "constraints": {
            "required": "true"
          }
        }
      }
    },
    "policyTemplateInstances": [
      {
        "templateId": "dynamichosturl",
        "title": "Use custom instance",
        "parameters": {
          "x-ms-apimTemplateParameter.urlTemplate": "https://@connectionParameters('instanceUrl')"
        }
      }
    ]
  }
}
```

### Set Header

Add custom headers to all requests.

```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "policyTemplateInstances": [
      {
        "templateId": "setheader",
        "title": "Add API version header",
        "parameters": {
          "x-ms-apimTemplateParameter.name": "API-Version",
          "x-ms-apimTemplateParameter.value": "2024-01",
          "x-ms-apimTemplateParameter.existsAction": "override",
          "x-ms-apimTemplate-policySection": "Request"
        }
      }
    ]
  }
}
```

## Complete Examples

### Example 1: SaaS API with OAuth and API Key Options

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/master/schemas/paconn-apiProperties.schema.json#",
  "properties": {
    "iconBrandColor": "#0078d4",
    "capabilities": ["actions", "triggers"],
    "publisher": "Contoso Corporation",
    "stackOwner": "Contoso",
    "connectionParameterSets": {
      "uiDefinition": {
        "displayName": "Authentication Type",
        "description": "Choose how you want to connect to Contoso API"
      },
      "values": [
        {
          "name": "oauth2-auth",
          "uiDefinition": {
            "displayName": "OAuth 2.0 (Recommended)",
            "description": "Connect with your Contoso account"
          },
          "parameters": {
            "token": {
              "type": "oauthSetting",
              "oAuthSettings": {
                "identityProvider": "oauth2",
                "clientId": "12345678-1234-1234-1234-123456789012",
                "scopes": [
                  "users:read",
                  "users:write",
                  "data:read",
                  "data:write"
                ],
                "redirectMode": "Global",
                "redirectUrl": "https://global.consent.azure-apim.net/redirect",
                "customParameters": {
                  "authorizationUrl": {
                    "value": "https://auth.contoso.com/oauth/authorize"
                  },
                  "tokenUrl": {
                    "value": "https://auth.contoso.com/oauth/token"
                  },
                  "refreshUrl": {
                    "value": "https://auth.contoso.com/oauth/refresh"
                  }
                }
              }
            }
          }
        },
        {
          "name": "api-key-auth",
          "uiDefinition": {
            "displayName": "API Key",
            "description": "Use an API key from your developer settings"
          },
          "parameters": {
            "api_key": {
              "type": "securestring",
              "uiDefinition": {
                "displayName": "API Key",
                "description": "Enter your Contoso API key",
                "tooltip": "Get your API key from https://portal.contoso.com/keys",
                "constraints": {
                  "tabIndex": 2,
                  "clearText": false,
                  "required": "true"
                }
              }
            }
          }
        }
      ]
    },
    "policyTemplateInstances": [
      {
        "templateId": "setheader",
        "title": "Add User-Agent",
        "parameters": {
          "x-ms-apimTemplateParameter.name": "User-Agent",
          "x-ms-apimTemplateParameter.value": "PowerAutomate-Connector/1.0",
          "x-ms-apimTemplateParameter.existsAction": "override",
          "x-ms-apimTemplate-policySection": "Request"
        }
      }
    ]
  }
}
```

### Example 2: Multi-tenant SaaS with Instance URL

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/master/schemas/paconn-apiProperties.schema.json#",
  "properties": {
    "iconBrandColor": "#ff6b35",
    "publisher": "Acme Inc",
    "connectionParameters": {
      "instanceUrl": {
        "type": "string",
        "uiDefinition": {
          "displayName": "Instance URL",
          "description": "Your company's Acme instance",
          "tooltip": "Example: mycompany.acme.com (without https://)",
          "constraints": {
            "tabIndex": 1,
            "required": "true"
          }
        }
      },
      "api_key": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "API Key",
          "description": "Your Acme API key",
          "tooltip": "Generate from Settings > API Keys",
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
        "templateId": "dynamichosturl",
        "title": "Use custom instance",
        "parameters": {
          "x-ms-apimTemplateParameter.urlTemplate": "https://@connectionParameters('instanceUrl')"
        }
      }
    ]
  }
}
```

### Example 3: Enterprise API with Basic Auth and Environment Selection

```json
{
  "$schema": "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/master/schemas/paconn-apiProperties.schema.json#",
  "properties": {
    "iconBrandColor": "#2e7d32",
    "publisher": "Enterprise Solutions Ltd",
    "connectionParameters": {
      "username": {
        "type": "string",
        "uiDefinition": {
          "displayName": "Username",
          "description": "Your enterprise username",
          "constraints": {
            "tabIndex": 1,
            "required": "true"
          }
        }
      },
      "password": {
        "type": "securestring",
        "uiDefinition": {
          "displayName": "Password",
          "description": "Your enterprise password",
          "constraints": {
            "tabIndex": 2,
            "clearText": false,
            "required": "true"
          }
        }
      },
      "environment": {
        "type": "string",
        "uiDefinition": {
          "displayName": "Environment",
          "description": "Select the environment to connect to",
          "constraints": {
            "tabIndex": 3,
            "required": "true",
            "allowedValues": [
              {
                "text": "Production",
                "value": "https://api.enterprise.com"
              },
              {
                "text": "UAT",
                "value": "https://api-uat.enterprise.com"
              },
              {
                "text": "Development",
                "value": "https://api-dev.enterprise.com"
              }
            ]
          }
        }
      }
    },
    "policyTemplateInstances": [
      {
        "templateId": "routerequesttoendpoint",
        "title": "Route to selected environment",
        "parameters": {
          "x-ms-apimTemplateParameter.urlTemplate": "@connectionParameters('environment')",
          "x-ms-apimTemplate-operationName": [
            "*"
          ]
        }
      }
    ]
  }
}
```

## Best Practices

### Authentication Selection
1. **OAuth 2.0** - Best for user-centric APIs, modern SaaS
2. **API Key** - Simple, good for developer APIs, serverless scenarios
3. **Basic Auth** - Legacy systems, internal APIs
4. **Multi-auth** - Offer flexibility, but OAuth as default recommended

### User Experience
1. Use clear `displayName` and `description`
2. Provide helpful `tooltip` with examples
3. Use `allowedValues` for dropdowns when applicable
4. Set appropriate `tabIndex` for field order
5. Mark passwords as `clearText: false`

### Security
1. Always use `securestring` for sensitive data
2. Never include actual client secrets in files
3. Use placeholders for submission
4. Test with dummy credentials first

### Policy Templates
1. Use `dynamichosturl` for multi-tenant SaaS
2. Use `routerequesttoendpoint` for environments
3. Keep policies minimal - let API handle logic
4. Test policies thoroughly in dev environment

## Common Patterns

### Pattern 1: Public API → Private API

**Scenario**: Moving from public (no auth) to authenticated API

**Solution**: Add API key authentication
```json
{
  "connectionParameters": {
    "api_key": {
      "type": "securestring",
      "uiDefinition": {
        "displayName": "API Key",
        "description": "Enter your API key",
        "constraints": {"required": "true", "clearText": false}
      }
    }
  }
}
```

### Pattern 2: Single Region → Multi-Region

**Scenario**: API now available in multiple regions

**Solution**: Add region selection with routing
```json
{
  "connectionParameters": {
    "region": {
      "type": "string",
      "uiDefinition": {
        "displayName": "Region",
        "constraints": {
          "allowedValues": [
            {"text": "US", "value": "https://api-us.example.com"},
            {"text": "EU", "value": "https://api-eu.example.com"},
            {"text": "APAC", "value": "https://api-apac.example.com"}
          ]
        }
      }
    }
  },
  "policyTemplateInstances": [
    {
      "templateId": "routerequesttoendpoint",
      "parameters": {
        "x-ms-apimTemplateParameter.urlTemplate": "@connectionParameters('region')"
      }
    }
  ]
}
```

### Pattern 3: Basic Auth → OAuth Migration

**Scenario**: Upgrading from basic auth to OAuth

**Solution**: Offer both, mark basic as deprecated
```json
{
  "connectionParameterSets": {
    "values": [
      {
        "name": "oauth2-auth",
        "uiDefinition": {
          "displayName": "OAuth 2.0 (Recommended)",
          "description": "New secure authentication method"
        }
      },
      {
        "name": "basic-auth",
        "uiDefinition": {
          "displayName": "Username/Password (Deprecated)",
          "description": "Legacy authentication - will be removed soon"
        }
      }
    ]
  }
}
```

## Validation Checklist

Before deploying:
- [ ] iconBrandColor is valid hex
- [ ] All required fields marked correctly
- [ ] securestring used for sensitive data
- [ ] displayName is user-friendly
- [ ] description is helpful
- [ ] OAuth scopes match Swagger
- [ ] Policy templates tested
- [ ] No real credentials in file
- [ ] File is valid JSON
- [ ] Matches apiDefinition.swagger.json security

## References

- Connection Parameters: https://learn.microsoft.com/en-us/connectors/custom-connectors/connection-parameters
- Multi-Auth: https://learn.microsoft.com/en-us/connectors/custom-connectors/multi-auth
- Policy Templates: https://learn.microsoft.com/en-us/connectors/custom-connectors/connection-parameters#policy-templates

---

**Note**: The apiProperties.json must be kept in sync with apiDefinition.swagger.json security definitions. Mismatches will cause connection errors.
