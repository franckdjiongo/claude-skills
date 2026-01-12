# OpenAPI Specification Guide for Test Generation

## Overview
This guide covers OpenAPI 3.0 and 3.1 specifications for generating comprehensive API test scripts. OpenAPI (formerly Swagger) is the de facto standard for API documentation and allows for automated test generation.

---

## OpenAPI Basics

### What is OpenAPI?
OpenAPI Specification (OAS) is a standard for describing RESTful APIs. It allows both humans and computers to understand API capabilities without accessing source code.

### Supported Versions (2025)
- **OpenAPI 3.0.3**: Most widely adopted, stable
- **OpenAPI 3.1.0**: Latest version, JSON Schema compatible

---

## Basic OpenAPI Structure

### Minimal Valid OpenAPI Document
```yaml
openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
```

### JSON Format Example
```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "My API",
    "version": "1.0.0",
    "description": "API for managing users"
  },
  "servers": [
    {
      "url": "https://api.example.com/v1",
      "description": "Production server"
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "List all users",
        "operationId": "listUsers",
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/UserList"
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
      "UserList": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/User"
        }
      },
      "User": {
        "type": "object",
        "required": ["id", "name", "email"],
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100
          },
          "email": {
            "type": "string",
            "format": "email"
          }
        }
      }
    }
  }
}
```

---

## Core Components

### 1. Info Object
Contains metadata about the API.

```yaml
info:
  title: User Management API
  version: 2.1.0
  description: |
    This API allows you to manage users in the system.
    
    ## Authentication
    All endpoints require Bearer token authentication.
  termsOfService: https://example.com/terms
  contact:
    name: API Support
    url: https://example.com/support
    email: [email protected]
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0.html
```

### 2. Servers
Define API base URLs.

```yaml
servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server
  - url: http://localhost:3000/v1
    description: Development server
  - url: https://{environment}.example.com/v1
    description: Custom environment
    variables:
      environment:
        default: api
        enum:
          - api
          - staging
          - dev
```

### 3. Paths
Define API endpoints and operations.

```yaml
paths:
  /users:
    get:
      summary: List all users
      description: Returns a paginated list of users
      operationId: listUsers
      tags:
        - Users
      parameters:
        - name: page
          in: query
          description: Page number
          required: false
          schema:
            type: integer
            default: 1
            minimum: 1
        - name: limit
          in: query
          description: Number of items per page
          required: false
          schema:
            type: integer
            default: 20
            minimum: 1
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  total:
                    type: integer
                  page:
                    type: integer
                  limit:
                    type: integer
        '400':
          description: Invalid parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          description: Unauthorized
        '500':
          description: Server error
          
    post:
      summary: Create a new user
      description: Creates a new user in the system
      operationId: createUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreate'
            examples:
              standard:
                summary: Standard user creation
                value:
                  name: John Doe
                  email: [email protected]
                  role: user
              admin:
                summary: Admin user creation
                value:
                  name: Admin User
                  email: [email protected]
                  role: admin
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Invalid input
        '409':
          description: User already exists
          
  /users/{userId}:
    parameters:
      - name: userId
        in: path
        required: true
        description: The user ID
        schema:
          type: string
          format: uuid
          
    get:
      summary: Get user by ID
      operationId: getUserById
      tags:
        - Users
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
          
    put:
      summary: Update user
      operationId: updateUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdate'
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
          
    delete:
      summary: Delete user
      operationId: deleteUser
      tags:
        - Users
      responses:
        '204':
          description: User deleted
        '404':
          description: User not found
```

---

## Parameters

### Path Parameters
```yaml
parameters:
  - name: userId
    in: path
    required: true
    description: Unique identifier of the user
    schema:
      type: string
      format: uuid
    example: "123e4567-e89b-12d3-a456-426614174000"
```

### Query Parameters
```yaml
parameters:
  - name: status
    in: query
    description: Filter by status
    required: false
    schema:
      type: string
      enum: [active, inactive, pending]
      default: active
  - name: search
    in: query
    description: Search term
    required: false
    schema:
      type: string
      minLength: 3
      maxLength: 50
```

### Header Parameters
```yaml
parameters:
  - name: X-API-Key
    in: header
    required: true
    description: API key for authentication
    schema:
      type: string
  - name: X-Request-ID
    in: header
    required: false
    description: Unique request identifier for tracking
    schema:
      type: string
      format: uuid
```

### Cookie Parameters
```yaml
parameters:
  - name: session
    in: cookie
    required: false
    description: Session cookie
    schema:
      type: string
```

---

## Request Bodies

### Simple Request Body
```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - name
          - email
        properties:
          name:
            type: string
            minLength: 1
            maxLength: 100
          email:
            type: string
            format: email
          age:
            type: integer
            minimum: 18
            maximum: 120
```

### Multiple Content Types
```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/User'
    application/xml:
      schema:
        $ref: '#/components/schemas/User'
    application/x-www-form-urlencoded:
      schema:
        type: object
        properties:
          name:
            type: string
          email:
            type: string
```

### File Upload
```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          file:
            type: string
            format: binary
          description:
            type: string
        required:
          - file
```

---

## Responses

### Success Responses
```yaml
responses:
  '200':
    description: Successful response
    headers:
      X-RateLimit-Limit:
        description: Request limit per hour
        schema:
          type: integer
      X-RateLimit-Remaining:
        description: Remaining requests for the hour
        schema:
          type: integer
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/User'
        examples:
          user1:
            summary: Example user 1
            value:
              id: "123"
              name: "John Doe"
              email: "[email protected]"
          user2:
            summary: Example user 2
            value:
              id: "456"
              name: "Jane Smith"
              email: "[email protected]"
```

### Error Responses
```yaml
responses:
  '400':
    description: Bad request - Invalid input
    content:
      application/json:
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Invalid email format"
            code:
              type: string
              example: "INVALID_INPUT"
            details:
              type: array
              items:
                type: string
  '401':
    description: Unauthorized - Authentication required
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
  '403':
    description: Forbidden - Insufficient permissions
  '404':
    description: Not found - Resource doesn't exist
  '409':
    description: Conflict - Resource already exists
  '429':
    description: Too many requests - Rate limit exceeded
  '500':
    description: Internal server error
```

---

## Schemas and Data Types

### Basic Types
```yaml
components:
  schemas:
    StringExample:
      type: string
      minLength: 1
      maxLength: 100
      pattern: '^[a-zA-Z0-9]+$'
      example: "example123"
      
    IntegerExample:
      type: integer
      minimum: 0
      maximum: 100
      multipleOf: 5
      example: 25
      
    NumberExample:
      type: number
      minimum: 0.0
      maximum: 100.0
      exclusiveMinimum: true
      example: 50.5
      
    BooleanExample:
      type: boolean
      example: true
      
    ArrayExample:
      type: array
      minItems: 1
      maxItems: 10
      uniqueItems: true
      items:
        type: string
      example: ["item1", "item2", "item3"]
```

### Object Schema
```yaml
User:
  type: object
  required:
    - id
    - name
    - email
  properties:
    id:
      type: string
      format: uuid
      readOnly: true
      example: "123e4567-e89b-12d3-a456-426614174000"
    name:
      type: string
      minLength: 1
      maxLength: 100
      example: "John Doe"
    email:
      type: string
      format: email
      example: "[email protected]"
    age:
      type: integer
      minimum: 0
      maximum: 150
      nullable: true
      example: 30
    status:
      type: string
      enum: [active, inactive, pending]
      default: active
    roles:
      type: array
      items:
        type: string
      example: ["user", "moderator"]
    metadata:
      type: object
      additionalProperties:
        type: string
      example:
        department: "Engineering"
        location: "Montreal"
    createdAt:
      type: string
      format: date-time
      readOnly: true
      example: "2025-10-19T12:00:00Z"
```

### Composition (allOf, oneOf, anyOf)
```yaml
# Inheritance with allOf
BaseUser:
  type: object
  required:
    - name
    - email
  properties:
    name:
      type: string
    email:
      type: string
      format: email

AdminUser:
  allOf:
    - $ref: '#/components/schemas/BaseUser'
    - type: object
      required:
        - permissions
      properties:
        permissions:
          type: array
          items:
            type: string

# Polymorphism with oneOf
Pet:
  oneOf:
    - $ref: '#/components/schemas/Cat'
    - $ref: '#/components/schemas/Dog'
  discriminator:
    propertyName: petType
    mapping:
      cat: '#/components/schemas/Cat'
      dog: '#/components/schemas/Dog'

Cat:
  type: object
  properties:
    petType:
      type: string
      const: cat
    meow:
      type: boolean

Dog:
  type: object
  properties:
    petType:
      type: string
      const: dog
    bark:
      type: boolean

# Union with anyOf
Number:
  anyOf:
    - type: integer
    - type: number
```

### Reusable Components
```yaml
components:
  schemas:
    Error:
      type: object
      required:
        - error
        - code
      properties:
        error:
          type: string
          description: Human-readable error message
        code:
          type: string
          description: Machine-readable error code
        details:
          type: array
          items:
            type: string
          description: Additional error details
          
    Pagination:
      type: object
      properties:
        total:
          type: integer
          description: Total number of items
        page:
          type: integer
          description: Current page number
        limit:
          type: integer
          description: Items per page
        totalPages:
          type: integer
          description: Total number of pages
```

---

## Security Schemes

### API Key Authentication
```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authentication

security:
  - ApiKeyAuth: []
```

### Bearer Token (JWT)
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token authentication

security:
  - BearerAuth: []
```

### OAuth 2.0
```yaml
components:
  securitySchemes:
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://example.com/oauth/authorize
          tokenUrl: https://example.com/oauth/token
          scopes:
            read:users: Read user information
            write:users: Modify user information
            admin: Administrative access

security:
  - OAuth2:
      - read:users
```

### Basic Authentication
```yaml
components:
  securitySchemes:
    BasicAuth:
      type: http
      scheme: basic
      description: Basic HTTP authentication

security:
  - BasicAuth: []
```

### Multiple Security Schemes
```yaml
# Either API Key OR Bearer Token
security:
  - ApiKeyAuth: []
  - BearerAuth: []

# Both API Key AND OAuth2
security:
  - ApiKeyAuth: []
    OAuth2:
      - read:users
```

---

## Advanced Features

### Callbacks
```yaml
paths:
  /subscribe:
    post:
      summary: Subscribe to webhooks
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                callbackUrl:
                  type: string
                  format: uri
      responses:
        '200':
          description: Subscription created
      callbacks:
        onEvent:
          '{$request.body#/callbackUrl}':
            post:
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        event:
                          type: string
                        data:
                          type: object
              responses:
                '200':
                  description: Webhook received
```

### Links
```yaml
paths:
  /users:
    post:
      operationId: createUser
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
          links:
            GetUserByUserId:
              operationId: getUserById
              parameters:
                userId: '$response.body#/id'
            DeleteUserByUserId:
              operationId: deleteUser
              parameters:
                userId: '$response.body#/id'
```

### Webhooks (OpenAPI 3.1)
```yaml
webhooks:
  userCreated:
    post:
      summary: User created webhook
      description: Triggered when a new user is created
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        '200':
          description: Webhook received successfully
```

---

## Examples for Test Generation

### Complete API Example
```yaml
openapi: 3.0.3
info:
  title: User Management API
  version: 1.0.0
  description: Complete API for managing users
  
servers:
  - url: https://api.example.com/v1
  
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  total:
                    type: integer
                    
    post:
      summary: Create user
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - email
              properties:
                name:
                  type: string
                email:
                  type: string
                  format: email
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Invalid input
        '409':
          description: User already exists
          
  /users/{userId}:
    parameters:
      - name: userId
        in: path
        required: true
        schema:
          type: string
          format: uuid
          
    get:
      summary: Get user
      operationId: getUserById
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: Not found
          
    put:
      summary: Update user
      operationId: updateUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserUpdate'
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: Not found
          
    delete:
      summary: Delete user
      operationId: deleteUser
      responses:
        '204':
          description: Deleted
        '404':
          description: Not found
          
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      
  schemas:
    User:
      type: object
      required:
        - id
        - name
        - email
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
        createdAt:
          type: string
          format: date-time
          
    UserUpdate:
      type: object
      properties:
        name:
          type: string
        email:
          type: string
          format: email
          
security:
  - BearerAuth: []
```

---

## Test Generation Mapping

### From OpenAPI to Tests

| OpenAPI Element | Test Type | Example |
|-----------------|-----------|---------|
| `paths` | Endpoint tests | Test each HTTP method |
| `parameters.required: true` | Validation tests | Test missing required params |
| `schema.minimum/maximum` | Boundary tests | Test min/max values |
| `schema.enum` | Value tests | Test each enum value |
| `responses['200']` | Success tests | Test happy path |
| `responses['400']` | Error tests | Test invalid input |
| `responses['401']` | Auth tests | Test missing/invalid auth |
| `responses['404']` | Not found tests | Test non-existent resources |
| `security` | Auth tests | Test auth requirements |
| `examples` | Data-driven tests | Use examples as test data |

### Generating Test Cases from Schema

**Given this schema:**
```yaml
properties:
  email:
    type: string
    format: email
    minLength: 5
    maxLength: 100
```

**Generate these tests:**
1. Valid email format
2. Missing @ symbol (invalid)
3. Too short (< 5 chars)
4. Too long (> 100 chars)
5. Empty string
6. Null value

---

## Common Patterns

### Pagination Response
```yaml
PaginatedResponse:
  type: object
  properties:
    items:
      type: array
      items:
        $ref: '#/components/schemas/Item'
    pagination:
      type: object
      properties:
        total:
          type: integer
        page:
          type: integer
        limit:
          type: integer
        totalPages:
          type: integer
```

### Error Response
```yaml
ErrorResponse:
  type: object
  required:
    - error
  properties:
    error:
      type: string
    code:
      type: string
    details:
      type: array
      items:
        type: string
    timestamp:
      type: string
      format: date-time
```

### Success Response with Meta
```yaml
SuccessResponse:
  type: object
  properties:
    success:
      type: boolean
    data:
      type: object
    meta:
      type: object
      properties:
        requestId:
          type: string
        timestamp:
          type: string
          format: date-time
```

---

## Validation and Tools

### OpenAPI Validators
- **Swagger Editor**: https://editor.swagger.io/
- **Swagger CLI**: `swagger-cli validate openapi.yaml`
- **OpenAPI Generator**: Generate clients and tests
- **Spectral**: Linting and validation tool

### Best Practices
1. **Use $ref**: Reuse schemas to avoid duplication
2. **Add examples**: Provide realistic example data
3. **Document errors**: Describe all error responses
4. **Version your API**: Use semantic versioning
5. **Add descriptions**: Explain complex fields
6. **Use operationId**: Unique IDs for each operation
7. **Define security**: Specify auth requirements
8. **Validate schemas**: Use validators before deploying

---

## Sources and References

### Official Documentation
- **OpenAPI Specification 3.0.3**: https://spec.openapis.org/oas/v3.0.3
- **OpenAPI Specification 3.1.0**: https://spec.openapis.org/oas/v3.1.0
- **Swagger Documentation**: https://swagger.io/docs/
- **JSON Schema**: https://json-schema.org/

### Tools and Resources
- **Swagger Editor**: Online OpenAPI editor and validator
- **Swagger UI**: Interactive API documentation
- **OpenAPI Generator**: Code generation from OpenAPI specs
- **Postman**: Can import OpenAPI specifications
- **Apidog**: OpenAPI 3.0 tutorial and tools (2025)

### Best Practices Articles
- **Swagger.io Best Practices** (2025)
- **API Documentation Guide** - OpenAPI Initiative
- **RESTful API Design Guide**

---

*Last Updated: October 2025*
*Based on OpenAPI 3.0.3 and 3.1.0 specifications*
