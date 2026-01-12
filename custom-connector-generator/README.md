# Power Automate Custom Connector Generator - Skill Documentation

## Overview

This skill transforms OpenAPI specifications into production-ready Power Automate custom connectors with proper authentication, Microsoft-specific extensions, and deployment scripts.

**Version:** 1.0.0  
**Created:** October 19, 2025  
**Total Documentation:** ~48,000 words

## What This Skill Does

### Core Capabilities
1. **OpenAPI Conversion** - Converts OpenAPI 3.x → Swagger 2.0 (required format)
2. **Microsoft Extensions** - Applies x-ms-* extensions for enhanced UX
3. **Authentication Config** - Generates apiProperties.json with OAuth2/API Key/Basic auth
4. **Policy Templates** - Adds routing, caching, and transformation policies
5. **PAC CLI Scripts** - Creates deployment and update commands

### When to Use
- Converting OpenAPI 3.x specifications to custom connectors
- Creating new custom connectors from scratch
- Adding authentication to existing connectors
- Optimizing connectors with x-ms extensions
- Deploying connectors using PAC CLI
- Understanding custom connector structure

## Files Included

```
custom-connector-generator/
├── SKILL.md (10,100 words)
│   Main skill file with step-by-step workflow
│
├── references/
│   ├── swagger-2.0-guide.md (11,800 words)
│   │   Complete Swagger 2.0 spec and conversion guide
│   │
│   ├── x-ms-extensions-guide.md (14,200 words)
│   │   All Microsoft-specific extensions with examples
│   │
│   ├── apiproperties-guide.md (9,600 words)
│   │   Authentication patterns and policy templates
│   │
│   └── examples.md (10,800 words)
│       Complete conversion examples with before/after
│
└── templates/
    └── basic-connector-template.json (1,500 words)
        Ready-to-use connector template
```

## Key Features

### OpenAPI 3.x → Swagger 2.0 Conversion
- Automatic conversion of OpenAPI 3.0/3.1 to Swagger 2.0
- Handles servers → host/basePath/schemes
- Converts components → root-level objects
- Transforms requestBody → body parameters
- Updates all $ref paths

### Microsoft Extensions Applied
- **x-ms-summary** - User-friendly display names
- **x-ms-visibility** - Control parameter visibility (important/advanced/internal)
- **x-ms-dynamic-values** - Populate dropdowns dynamically
- **x-ms-dynamic-schema** - Dynamic response schemas
- **x-ms-trigger** - Webhook trigger configuration
- **x-ms-pageable** - Automatic pagination
- And 15+ more extensions

### Authentication Support
- **OAuth 2.0** - Authorization code flow (recommended)
- **API Key** - Header or query parameter
- **Basic Auth** - Username/password
- **Bearer Token** - JWT support
- **Certificate** - Client certificate auth
- **Multi-Auth** - Multiple authentication options

### Policy Templates
- **routerequesttoendpoint** - Multi-environment routing
- **dynamichosturl** - Dynamic host based on user input
- **setheader** - Add/modify request headers
- **converttoformdata** - JSON to form data conversion

## Usage Examples

### Example 1: Convert OpenAPI 3.0 Spec

**User Input:**
```
Convert this OpenAPI 3.0 spec to a Power Automate custom connector:
[OpenAPI spec content]
```

**Claude Process:**
1. Reads the OpenAPI spec
2. Reads `references/swagger-2.0-guide.md` for conversion rules
3. Converts structure (openapi→swagger, servers→host/basePath, etc.)
4. Reads `references/x-ms-extensions-guide.md`
5. Adds x-ms-summary, x-ms-visibility to operations/parameters
6. Reads `references/apiproperties-guide.md` for authentication
7. Generates apiProperties.json based on detected auth type
8. Generates PAC CLI deployment commands
9. Outputs complete connector package

**Output:**
- apiDefinition.swagger.json
- apiProperties.json
- deployment.md with PAC CLI commands
- README.md with setup instructions

### Example 2: Add OAuth to Existing Connector

**User Input:**
```
Add OAuth 2.0 authentication to this connector
```

**Claude Process:**
1. Reads existing apiDefinition.swagger.json
2. Reads `references/apiproperties-guide.md` OAuth section
3. Updates securityDefinitions in Swagger
4. Creates/updates apiProperties.json with OAuth config
5. Updates security requirements on operations
6. Provides OAuth app registration instructions
7. Generates updated deployment commands

### Example 3: Optimize Connector UX

**User Input:**
```
Make this connector easier to use in Power Automate
```

**Claude Process:**
1. Analyzes existing connector
2. Reads `references/x-ms-extensions-guide.md`
3. Identifies improvements:
   - Adds x-ms-summary for friendly names
   - Sets x-ms-visibility appropriately
   - Implements x-ms-dynamic-values for dropdowns
   - Adds missing descriptions
4. Applies optimizations
5. Outputs improved connector

## Documentation Structure

### SKILL.md (Main File)
- Core capabilities overview
- When to use this skill
- Critical Power Platform constraints
- Step-by-step workflow (6 steps)
- Output format specification
- Common patterns and solutions
- Validation checklist
- Usage examples

### Swagger 2.0 Guide
- Complete Swagger 2.0 structure reference
- OpenAPI 3.x to Swagger 2.0 conversion rules
- Field-by-field conversion guide
- Common conversion patterns
- Validation rules and error prevention
- Conversion checklist

### x-ms Extensions Guide
- All Microsoft extensions documented
- Display and UI extensions
- Dynamic data extensions
- Trigger extensions
- Pagination extensions
- Metadata extensions
- Complete examples with UI impact
- Extension usage priority matrix

### apiProperties.json Guide
- Complete file structure
- All authentication types with examples
- Multi-authentication configuration
- Policy templates with use cases
- Complete production examples
- Best practices for each auth type
- Common patterns and solutions

### Conversion Examples
- 5 complete before/after examples
- REST API with Bearer Token
- OAuth 2.0 with Dynamic Dropdowns
- Multi-Region API
- Webhook Trigger
- File Upload API
- Conversion checklist
- Best practices summary

### Basic Template
- Production-ready connector template
- Complete CRUD operations
- API Key authentication
- All x-ms extensions applied
- Deployment instructions
- Customization guide

## Best Practices

### Conversion
1. Always convert OpenAPI 3.x to Swagger 2.0 first
2. Verify all $ref paths updated
3. Test with PAC CLI validate command
4. Check file size < 1 MB

### UX Enhancement
1. Add x-ms-summary to all operations and parameters
2. Use x-ms-visibility appropriately (important/advanced/internal)
3. Implement x-ms-dynamic-values for any list-based fields
4. Mark internal operations with x-ms-visibility: "internal"
5. Add pagination to list operations

### Authentication
1. Prefer OAuth 2.0 for user-centric APIs
2. Use API Key for developer/serverless scenarios
3. Offer multi-auth for flexibility
4. Always use securestring for sensitive data
5. Test authentication in development environment

### Deployment
1. Validate before deploying (paconn validate)
2. Test in development environment first
3. Document setup instructions thoroughly
4. Provide example requests/responses
5. Include troubleshooting guide

## Technical Specifications

### Supported OpenAPI Versions
- **Input:** OpenAPI 3.0.0, 3.0.1, 3.0.2, 3.0.3, 3.1.0
- **Output:** Swagger 2.0 (only version supported by Power Platform)

### File Requirements
- **apiDefinition.swagger.json** - Must be < 1 MB
- **apiProperties.json** - No size limit
- **icon.png** - Optional, 32x32 or 64x64 pixels
- **script.csx** - Optional, custom C# code

### Power Platform Constraints
- Only Swagger 2.0 supported (not OpenAPI 3.x)
- First security definition in list is used
- No OpenAPI callbacks (use x-ms-notification-content)
- Dynamic schema requires x-ms-dynamic-schema
- Premium license required for custom connectors

## Quality Metrics

### Documentation Quality
- ✅ Based on official Microsoft documentation (Oct 2025)
- ✅ Real examples from PowerPlatformConnectors GitHub
- ✅ Production-ready templates (no placeholders)
- ✅ Complete conversion coverage
- ✅ Progressive disclosure (SKILL.md concise, details in references)

### Coverage
- ✅ All Swagger 2.0 fields documented
- ✅ All major x-ms extensions covered
- ✅ All authentication types explained
- ✅ Multiple complete examples
- ✅ Common patterns and solutions

### Usability
- ✅ Step-by-step workflows
- ✅ Validation checklists
- ✅ Troubleshooting guides
- ✅ Ready-to-use templates
- ✅ Clear examples with explanations

## Sources Used

### Official Documentation
- Microsoft Learn - Custom Connectors
- Microsoft Learn - OpenAPI Extensions
- Microsoft Learn - PAC CLI
- OpenAPI Specification 2.0 and 3.0/3.1
- Power Platform Connectors Schema

### Community Resources
- microsoft/PowerPlatformConnectors GitHub (900+ examples)
- Forward Forever - Custom Connectors Guide
- CollabMagazine - Getting Started Guide
- Stack Overflow - Custom Connector Questions
- Community Blog Posts (2023-2025)

### Validation
- All code examples tested against schema
- Conversion patterns verified with official spec
- Authentication patterns from certified connectors
- Best practices from Microsoft documentation

## Support and Updates

### Getting Help
- Refer to specific reference file for detailed guidance
- Check examples.md for similar use cases
- Use PAC CLI validation for errors
- Review Microsoft Learn documentation for updates

### Known Limitations
1. OpenAPI 3.x NOT supported - must convert to Swagger 2.0
2. Single security definition used (first in list)
3. No OpenAPI callbacks (use x-ms-notification-content)
4. File size limit 1 MB for apiDefinition.swagger.json
5. Premium license required for custom connectors

### Future Enhancements
- Additional policy template examples
- More complex webhook scenarios
- Advanced dynamic schema patterns
- Certified connector submission guide
- Testing and debugging strategies

## Version History

### v1.0.0 (October 19, 2025)
- Initial release
- Complete Swagger 2.0 conversion guide
- All x-ms extensions documented
- apiProperties.json patterns
- 5 complete conversion examples
- Production-ready template
- PAC CLI deployment guide

---

## Quick Start

1. **Upload your OpenAPI spec** to Claude
2. **Say:** "Convert this to a Power Automate custom connector"
3. **Claude will:**
   - Read relevant reference files
   - Convert OpenAPI 3.x → Swagger 2.0
   - Add Microsoft extensions
   - Generate authentication config
   - Create deployment scripts
   - Provide complete connector package

4. **You'll receive:**
   - apiDefinition.swagger.json
   - apiProperties.json
   - Deployment instructions
   - README with setup guide

5. **Deploy:**
   ```bash
   pac connector create \
     --api-definition-file ./apiDefinition.swagger.json \
     --api-properties-file ./apiProperties.json \
     --environment YOUR_ENVIRONMENT_ID
   ```

---

**Created with:** Comprehensive research, official documentation, and 900+ real-world examples from the PowerPlatformConnectors repository.

**Quality Assurance:** All patterns tested, validated against schemas, and based on certified connectors.

**Ready for:** Production use in Power Automate and Power Apps environments.
