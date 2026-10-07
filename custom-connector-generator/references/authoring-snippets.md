# Authoring snippets and worked walkthroughs

Code blocks and patterns moved out of SKILL.md. SKILL.md keeps the rules and the workflow order.

## Step 2: Convert OpenAPI 3.x to Swagger 2.0

If the spec is OpenAPI 3.x, perform these transformations:

**Major Changes Required:**
```json
// OpenAPI 3.x
{
  "openapi": "3.0.0",
  "servers": [
    {"url": "https://api.example.com/v1"}
  ],
  ...
}

// Swagger 2.0 (Required)
{
  "swagger": "2.0",
  "host": "api.example.com",
  "basePath": "/v1",
  "schemes": ["https"],
  ...
}
```

**Refer to**: `references/swagger-2.0-guide.md` for complete conversion rules.

**Key Conversions:**
- `openapi: "3.x"` → `swagger: "2.0"`
- `servers` → `host`, `basePath`, `schemes`
- `components.schemas` → `definitions`
- `components.securitySchemes` → `securityDefinitions`
- `requestBody` → `parameters` with `in: "body"`
- `content` (with media types) → `consumes`/`produces`

## Step 3: Add Microsoft-Specific Extensions

Power Platform uses custom x-ms-* extensions for enhanced functionality:

**Essential Extensions:**

1. **x-ms-summary** - Display name in Power Automate UI
```json
"operationId": "GetUser",
"summary": "Get user information",
"x-ms-summary": "Get User"  // ← Shows in UI instead of "Get user information"
```

2. **x-ms-visibility** - Control parameter visibility
```json
"parameters": [{
  "name": "id",
  "in": "path",
  "required": true,
  "type": "string",
  "x-ms-visibility": "important"  // Options: "important", "advanced", "internal"
}]
```

3. **x-ms-dynamic-values** - Dropdown with dynamic data
```json
"parameters": [{
  "name": "userId",
  "in": "query",
  "x-ms-dynamic-values": {
    "operationId": "GetUsers",
    "value-path": "id",
    "value-title": "name"
  }
}]
```

**Refer to**: `references/x-ms-extensions-guide.md` for all extensions and usage patterns.

## Step 4: Generate apiProperties.json

The apiProperties.json file contains authentication configuration and metadata.

**Basic Structure:**
```json
{
  "properties": {
    "iconBrandColor": "#007ee5",
    "capabilities": [],
    "connectionParameters": {
      // Authentication configuration
    },
    "policyTemplateInstances": []
  }
}
```

**Authentication Types:**

1. **OAuth 2.0 (Recommended for APIs with OAuth)**
```json
"connectionParameters": {
  "token": {
    "type": "oauthSetting",
    "oAuthSettings": {
      "identityProvider": "oauth2",
      "clientId": "YOUR_CLIENT_ID",
      "scopes": ["read", "write"],
      "redirectMode": "Global",
      "customParameters": {
        "authorizationUrl": {"value": "https://api.example.com/oauth/authorize"},
        "tokenUrl": {"value": "https://api.example.com/oauth/token"},
        "refreshUrl": {"value": "https://api.example.com/oauth/refresh"}
      }
    }
  }
}
```

2. **API Key (Simple and common)**
```json
"connectionParameters": {
  "api_key": {
    "type": "securestring",
    "uiDefinition": {
      "displayName": "API Key",
      "description": "Enter your API key",
      "tooltip": "Get your API key from the developer portal",
      "constraints": {
        "tabIndex": 2,
        "clearText": false,
        "required": "true"
      }
    }
  }
}
```

3. **Basic Authentication**
```json
"connectionParameters": {
  "username": {
    "type": "string",
    "uiDefinition": {
      "displayName": "Username",
      "description": "Your account username",
      "constraints": {"required": "true"}
    }
  },
  "password": {
    "type": "securestring",
    "uiDefinition": {
      "displayName": "Password",
      "description": "Your account password",
      "constraints": {"required": "true", "clearText": false}
    }
  }
}
```

**Refer to**: `references/apiproperties-guide.md` for complete authentication patterns and examples.

## Step 6: Generate Deployment Scripts

Create PAC CLI commands for connector management:

**Create Connector (First Time):**
```bash
pac connector create \
  --api-definition-file ./apiDefinition.swagger.json \
  --api-properties-file ./apiProperties.json \
  --icon-file ./icon.png \
  --environment "YOUR_ENVIRONMENT_ID"
```

**Update Connector (After Changes):**
```bash
pac connector update \
  --api-definition-file ./apiDefinition.swagger.json \
  --api-properties-file ./apiProperties.json \
  --connector-id "YOUR_CONNECTOR_ID" \
  --environment "YOUR_ENVIRONMENT_ID"
```

**Validate Before Deployment:**
```bash
paconn validate --api-def ./apiDefinition.swagger.json
```

## Common Patterns and Solutions

### Pattern 1: Convert OpenAPI 3.x with Bearer Token

**Input**: OpenAPI 3.x with Bearer token authentication

**Steps**:
1. Convert structure (openapi→swagger, servers→host/basePath)
2. Move components.securitySchemes → securityDefinitions
3. Convert Bearer token to API Key in header
4. Add x-ms-summary to all operations
5. Generate apiProperties.json with API Key auth

**Refer to**: `references/examples.md` Example 1

### Pattern 2: OAuth 2.0 Connector with Dynamic Dropdowns

**Input**: OpenAPI spec with OAuth 2.0 and related resources

**Steps**:
1. Convert to Swagger 2.0
2. Add OAuth 2.0 in securityDefinitions
3. Identify list operations for dynamic values
4. Add x-ms-dynamic-values to dependent parameters
5. Configure OAuth in apiProperties.json with proper scopes

**Refer to**: `references/examples.md` Example 2

### Pattern 3: Multi-Authentication Connector

**Input**: API supporting both API Key and OAuth

**Steps**:
1. Convert to Swagger 2.0 with both security schemes
2. Use connectionParameterSets in apiProperties.json
3. Define UI for authentication selection
4. Configure each auth type properly

**Refer to**: `references/examples.md` Example 3

## Usage Examples

### Example 1: Convert OpenAPI 3.0 Spec

**User**: "Convert this OpenAPI 3.0 spec to a Power Automate custom connector"

**Claude Process**:
1. Read the OpenAPI spec
2. Read `references/swagger-2.0-guide.md` for conversion rules
3. Convert openapi→swagger, servers→host/basePath
4. Read `references/x-ms-extensions-guide.md` for extensions
5. Add x-ms-summary, x-ms-visibility to operations/parameters
6. Read `references/apiproperties-guide.md` for auth configuration
7. Generate apiProperties.json based on detected auth type
8. Generate deployment commands
9. Output all files with deployment instructions

### Example 2: Add OAuth to Existing Connector

**User**: "Add OAuth 2.0 authentication to this connector"

**Claude Process**:
1. Read existing apiDefinition.swagger.json
2. Read `references/apiproperties-guide.md` OAuth section
3. Add OAuth 2.0 security definition to swagger
4. Update apiProperties.json with OAuth configuration
5. Update security requirements on operations
6. Provide OAuth app registration instructions
7. Generate updated deployment commands

### Example 3: Optimize Connector UX

**User**: "Make this connector easier to use in Power Automate"

**Claude Process**:
1. Read existing connector files
2. Read `references/x-ms-extensions-guide.md`
3. Identify improvement opportunities:
   - Missing x-ms-summary → Add friendly names
   - All parameters visible → Set appropriate visibility
   - Manual entry for lists → Add x-ms-dynamic-values
   - Missing descriptions → Add clear explanations
4. Apply optimizations
5. Output improved connector

