---
name: custom-connector-generator
description: Expert generator for Power Automate custom connectors from OpenAPI specifications. Converts OpenAPI 3.x to Swagger 2.0 format with Microsoft-specific extensions (x-ms-summary, x-ms-visibility, x-ms-dynamic-values), generates apiProperties.json with proper authentication configuration, creates PAC CLI deployment scripts, and applies Power Platform best practices. Use when the user wants to create, convert, or optimize Power Automate custom connectors, import OpenAPI specs, configure authentication for connectors, or deploy connectors using PAC CLI.
---

# Power Automate Custom Connector Generator

Transforms OpenAPI specifications into production-ready Power Automate custom connectors with proper authentication, Microsoft-specific extensions, and deployment scripts.

## Core Capabilities

1. **OpenAPI Conversion**: Converts OpenAPI 3.x → Swagger 2.0 (required format)
2. **Microsoft Extensions**: Applies x-ms-* extensions for enhanced UX
3. **Authentication Config**: Generates apiProperties.json with OAuth2/API Key/Basic auth
4. **Policy Templates**: Adds routing, caching, and transformation policies
5. **PAC CLI Scripts**: Creates deployment and update commands

## When to Use This Skill

- User provides an OpenAPI 3.x specification → Convert to custom connector
- User wants to create a custom connector from scratch
- User needs to add authentication to a connector
- User wants to deploy a connector using PAC CLI
- User needs to optimize an existing connector with x-ms extensions
- User wants to understand custom connector structure

## Critical Power Platform Constraints

### OpenAPI Version Requirement
**CRITICAL**: Power Platform custom connectors **ONLY** support OpenAPI 2.0 (Swagger).
- ❌ OpenAPI 3.0/3.1 is **NOT** supported
- ✅ Must convert to Swagger 2.0 format
- The file MUST be named `apiDefinition.swagger.json`

### File Structure
Custom connectors require 3-4 files:
1. **apiDefinition.swagger.json** (required) - The OpenAPI 2.0 definition
2. **apiProperties.json** (required) - Authentication and metadata
3. **icon.png** (optional) - Connector icon (32x32 or 64x64)
4. **script.csx** (optional) - Custom C# code for transformations

## Step-by-Step Workflow

### Step 1: Analyze the Input

When the user provides an OpenAPI specification:

1. **Determine the OpenAPI version**
   - Check the `openapi` field (3.x) or `swagger` field (2.0)
   - If OpenAPI 3.x → Conversion required
   - If Swagger 2.0 → Enhancement with x-ms extensions

2. **Identify authentication type**
   - OAuth 2.0? → Check authorization/token URLs
   - API Key? → Check security definitions
   - Basic Auth? → Username/password
   - Multiple auth options? → Use connectionParameterSets

3. **Analyze operations**
   - Count GET/POST/PUT/DELETE operations
   - Identify parameters (path, query, body, header)
   - Check for pagination patterns
   - Look for webhooks/triggers

### Step 2: Convert OpenAPI 3.x to Swagger 2.0

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

### Step 3: Add Microsoft-Specific Extensions

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

### Step 4: Generate apiProperties.json

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

### Step 5: Apply Best Practices

**Operation Organization:**
- Group related operations using `tags`
- Use descriptive `operationId` values (GetUser, CreateOrder, etc.)
- Ensure all operations have `summary` and `x-ms-summary`

**Parameter Optimization:**
- Mark required parameters clearly
- Set appropriate `x-ms-visibility` levels
- Use `x-ms-dynamic-values` for list/dropdown parameters
- Provide clear descriptions and tooltips

**Response Schemas:**
- Define complete response schemas (not just status codes)
- Include examples for each response type
- Use $ref for reusable schemas

**Error Handling:**
- Document error responses (4xx, 5xx)
- Include error schema with code/message fields
- Provide meaningful error descriptions

### Step 6: Generate Deployment Scripts

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

## Output Format

When generating a custom connector, provide:

1. **apiDefinition.swagger.json** - Complete Swagger 2.0 definition
   - Converted from OpenAPI 3.x if needed
   - All x-ms extensions applied
   - Complete request/response schemas
   - Proper authentication configuration in securityDefinitions

2. **apiProperties.json** - Authentication and metadata
   - Appropriate authentication type configured
   - Icon brand color and metadata
   - Policy templates if needed

3. **deployment.md** - Deployment instructions
   - PAC CLI commands ready to use
   - Environment setup instructions
   - Testing checklist

4. **README.md** - Connector documentation
   - Overview of the connector
   - Authentication setup instructions
   - Available operations and examples
   - Known limitations

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

## Reference Files

- **`references/swagger-2.0-guide.md`** - Complete Swagger 2.0 specification and conversion guide
- **`references/x-ms-extensions-guide.md`** - All Microsoft-specific extensions with examples
- **`references/apiproperties-guide.md`** - apiProperties.json structure and authentication patterns
- **`references/examples.md`** - Complete conversion examples with before/after

## Templates

- **`templates/basic-connector-template.json`** - Minimal working connector template

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

## Validation Checklist

Before delivering a custom connector, verify:

- [ ] `swagger: "2.0"` (not openapi)
- [ ] All operations have `summary` and `x-ms-summary`
- [ ] Required parameters marked correctly
- [ ] Appropriate `x-ms-visibility` levels set
- [ ] Authentication properly configured in both files
- [ ] Response schemas defined (not just 200: {})
- [ ] Error responses documented
- [ ] PAC CLI commands include correct placeholders
- [ ] README includes setup instructions

## Important Limitations

1. **OpenAPI 3.x NOT Supported** - Must convert to Swagger 2.0
2. **Single Security Definition** - First security scheme in list is used
3. **No OpenAPI Callbacks** - Webhooks must use x-ms-notification-content
4. **File Size Limit** - apiDefinition.swagger.json must be < 1 MB
5. **Dynamic Schema** - Use x-ms-dynamic-schema for truly dynamic responses

## Notes

- Always use official Microsoft documentation as source of truth
- Test connectors in a development environment first
- Premium license required for custom connectors
- Custom code (script.csx) available for advanced scenarios
- GitHub repo: microsoft/PowerPlatformConnectors has 900+ examples

---

**Remember**: Custom connectors bridge external APIs to Power Platform. The goal is to make the API intuitive and easy to use within Power Automate and Power Apps through proper use of Microsoft extensions and clear documentation.
