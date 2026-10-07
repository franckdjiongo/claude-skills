# Generation details

Detail moved out of SKILL.md. Read the section you need while generating tests.

## Input Format

### OpenAPI Specification
Accept either:

```yaml
# YAML format
openapi: 3.0.3
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Success
```

Or:

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "User API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "List users"
      }
    }
  }
}
```

### User Requests
Handle requests like:
- "Generate Postman tests for this API spec"
- "Create Jest tests from this OpenAPI file"
- "I need comprehensive test coverage for my API"
- "Generate both Postman and Jest tests"



## Output Format

### Postman Collection
```json
{
  "info": {
    "name": "{{API_NAME}} Test Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    // Organized test requests
  ]
}
```

### Jest Test Suite
```javascript
describe('API Name', () => {
  describe('GET /endpoint', () => {
    describe('Success Cases', () => {
      test('should return 200 when...', async () => {
        // AAA pattern
      });
    });
  });
});
```



## Test Naming Conventions

### Pattern
```
should [expected behavior] when [condition]
```

### Examples
✅ Good:
- `should return 200 when user ID is valid`
- `should return 404 when user does not exist`
- `should reject request when email format is invalid`
- `should create user when all required fields are provided`

❌ Bad:
- `test1`
- `user test`
- `get users`



## Authentication Handling

### Detect Security Scheme
From OpenAPI:
```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
```

### Generate Corresponding Tests

**Postman**: Add auth configuration
```json
{
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{bearerToken}}"
      }
    ]
  }
}
```

**Jest**: Include auth in API client
```javascript
const headers = {
  'Authorization': `Bearer ${this.token}`
};
```



## Postman-Specific Features

### Variables
Always define:
```json
{
  "variable": [
    {"key": "baseUrl", "value": "{{BASE_URL}}"},
    {"key": "bearerToken", "value": ""},
    {"key": "userId", "value": ""}
  ]
}
```

### Pre-Request Scripts
Use for:
- Generating test data
- Setting timestamps
- Creating dynamic values

```javascript
pm.environment.set('timestamp', new Date().toISOString());
```

### Test Scripts
Include for each request:
- Status code assertion
- Response time check
- Schema validation
- Data validation

```javascript
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});
```

### Collection-Level Scripts
Add global:
- Pre-request: Logging, timestamp
- Test: Response time check



## Jest-Specific Features

### Mocking Setup
```javascript
jest.mock('axios');

axios.mockResolvedValue({
  status: 200,
  data: testData
});
```

### Test Structure
```javascript
describe('Resource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Operation', () => {
    test('should...', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### API Client Wrapper
Always provide:
```javascript
class APIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, path, data, config) {
    // Implementation
  }
}
```



## Common Scenarios

### Scenario 1: Basic CRUD API
Generate tests for:
- List (GET with pagination)
- Create (POST with validation)
- Read (GET by ID)
- Update (PUT/PATCH)
- Delete (DELETE)

### Scenario 2: Search/Filter API
Include tests for:
- Search with query parameters
- Multiple filters combined
- Empty results
- Invalid search terms

### Scenario 3: File Upload API
Test:
- Valid file upload
- Invalid file type
- File too large
- Missing file

### Scenario 4: Authenticated API
Ensure:
- Valid token access
- Invalid token rejection
- Missing token rejection
- Expired token handling



## Example Interaction

**User**: Generate Postman tests for this OpenAPI spec
```yaml
openapi: 3.0.3
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      responses:
        '200':
          description: List users
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, email]
              properties:
                name:
                  type: string
                email:
                  type: string
                  format: email
      responses:
        '201':
          description: User created
        '400':
          description: Invalid input
```

**Your Response**:
```
Analyzing your API specification...

Identified Endpoints:
- GET /users (List users)
- POST /users (Create user)

Test Scenarios:
1. GET /users - Success (200)
2. POST /users - Success (201)
3. POST /users - Missing name (400)
4. POST /users - Missing email (400)
5. POST /users - Invalid email format (400)

Generating Postman Collection v2.1...

[Complete JSON collection with all tests]

Usage:
1. Import this JSON into Postman
2. Set environment variable "baseUrl" to your API URL
3. Run the collection

Coverage:
✅ Success paths
✅ Validation errors
✅ Response time checks
✅ Schema validation
```



