# API Testing Patterns Reference

## Overview
This guide covers modern API testing patterns and best practices as of October 2025. These patterns apply to both automated testing (Jest, Mocha) and manual testing (Postman).

---

## Core Testing Principles

### 1. AAA Pattern (Arrange-Act-Assert)
The fundamental structure for all tests:

```javascript
test('should return user data for valid ID', async () => {
  // ARRANGE: Set up test data and conditions
  const userId = '12345';
  const expectedUser = { id: userId, name: 'John Doe' };
  
  // ACT: Execute the function being tested
  const response = await getUserById(userId);
  
  // ASSERT: Verify the outcome
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expectedUser);
});
```

**Benefits:**
- Clear separation of concerns
- Easy to understand what's being tested
- Simple to debug when tests fail

---

## Test Categories

### Success Path Tests
Test the "happy path" where everything works as expected.

```javascript
describe('GET /api/users/:id - Success Cases', () => {
  test('should return 200 and user data for valid ID', async () => {
    const response = await api.get('/users/123');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('name');
    expect(response.data).toHaveProperty('email');
  });
  
  test('should return user with all expected fields', async () => {
    const response = await api.get('/users/123');
    
    expect(response.data).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      createdAt: expect.any(String)
    });
  });
});
```

### Error Handling Tests
Test how the API behaves when things go wrong.

```javascript
describe('GET /api/users/:id - Error Cases', () => {
  test('should return 404 for non-existent user', async () => {
    const response = await api.get('/users/999999');
    
    expect(response.status).toBe(404);
    expect(response.data).toHaveProperty('error');
    expect(response.data.error).toBe('User not found');
  });
  
  test('should return 400 for invalid ID format', async () => {
    const response = await api.get('/users/abc-invalid');
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error');
  });
  
  test('should return 401 for missing authentication', async () => {
    const response = await api.get('/users/123', {
      headers: {} // No auth header
    });
    
    expect(response.status).toBe(401);
  });
});
```

### Input Validation Tests
Test boundary conditions and edge cases.

```javascript
describe('POST /api/users - Validation Tests', () => {
  test('should reject empty name field', async () => {
    const response = await api.post('/users', {
      name: '',
      email: 'test@example.com'
    });
    
    expect(response.status).toBe(400);
    expect(response.data.errors).toContain('Name is required');
  });
  
  test('should reject invalid email format', async () => {
    const response = await api.post('/users', {
      name: 'John',
      email: 'not-an-email'
    });
    
    expect(response.status).toBe(400);
    expect(response.data.errors).toContain('Invalid email format');
  });
  
  test('should reject name longer than 100 characters', async () => {
    const longName = 'a'.repeat(101);
    const response = await api.post('/users', {
      name: longName,
      email: 'test@example.com'
    });
    
    expect(response.status).toBe(400);
  });
});
```

### Authentication Tests
Test different authentication scenarios.

```javascript
describe('Authentication Tests', () => {
  test('should accept valid Bearer token', async () => {
    const response = await api.get('/users/me', {
      headers: {
        'Authorization': 'Bearer valid-token-12345'
      }
    });
    
    expect(response.status).toBe(200);
  });
  
  test('should reject expired token', async () => {
    const response = await api.get('/users/me', {
      headers: {
        'Authorization': 'Bearer expired-token'
      }
    });
    
    expect(response.status).toBe(401);
    expect(response.data.error).toMatch(/expired|invalid/i);
  });
  
  test('should reject malformed token', async () => {
    const response = await api.get('/users/me', {
      headers: {
        'Authorization': 'InvalidFormat'
      }
    });
    
    expect(response.status).toBe(401);
  });
});
```

---

## HTTP Methods Testing Patterns

### GET Requests
```javascript
describe('GET Request Patterns', () => {
  test('List endpoint with pagination', async () => {
    const response = await api.get('/users?page=1&limit=10');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('items');
    expect(response.data).toHaveProperty('total');
    expect(response.data).toHaveProperty('page');
    expect(response.data.items).toBeInstanceOf(Array);
    expect(response.data.items.length).toBeLessThanOrEqual(10);
  });
  
  test('Filter and sort parameters', async () => {
    const response = await api.get('/users?status=active&sort=name');
    
    expect(response.status).toBe(200);
    expect(response.data.items.every(u => u.status === 'active')).toBe(true);
  });
});
```

### POST Requests
```javascript
describe('POST Request Patterns', () => {
  test('Create new resource', async () => {
    const newUser = {
      name: 'Jane Doe',
      email: 'jane@example.com'
    };
    
    const response = await api.post('/users', newUser);
    
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.name).toBe(newUser.name);
    expect(response.data.email).toBe(newUser.email);
  });
  
  test('Reject duplicate email', async () => {
    const user = {
      name: 'John',
      email: 'existing@example.com'
    };
    
    // Create first user
    await api.post('/users', user);
    
    // Try to create duplicate
    const response = await api.post('/users', user);
    
    expect(response.status).toBe(409); // Conflict
    expect(response.data.error).toMatch(/already exists/i);
  });
});
```

### PUT/PATCH Requests
```javascript
describe('PUT/PATCH Request Patterns', () => {
  test('Full update with PUT', async () => {
    const updatedUser = {
      name: 'Jane Updated',
      email: 'jane.new@example.com'
    };
    
    const response = await api.put('/users/123', updatedUser);
    
    expect(response.status).toBe(200);
    expect(response.data.name).toBe(updatedUser.name);
    expect(response.data.email).toBe(updatedUser.email);
  });
  
  test('Partial update with PATCH', async () => {
    const response = await api.patch('/users/123', {
      name: 'New Name Only'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.name).toBe('New Name Only');
    // Email should remain unchanged
    expect(response.data).toHaveProperty('email');
  });
});
```

### DELETE Requests
```javascript
describe('DELETE Request Patterns', () => {
  test('Delete existing resource', async () => {
    const response = await api.delete('/users/123');
    
    expect(response.status).toBe(204); // No Content
  });
  
  test('Return 404 for already deleted resource', async () => {
    await api.delete('/users/123');
    const response = await api.delete('/users/123');
    
    expect(response.status).toBe(404);
  });
  
  test('Soft delete returns updated resource', async () => {
    const response = await api.delete('/users/123');
    
    expect(response.status).toBe(200);
    expect(response.data.deletedAt).toBeTruthy();
    expect(response.data.status).toBe('deleted');
  });
});
```

---

## Advanced Testing Patterns

### Schema Validation
Ensure response structure matches expected schema.

```javascript
describe('Schema Validation', () => {
  test('User response matches schema', async () => {
    const response = await api.get('/users/123');
    
    // Validate structure
    expect(response.data).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      age: expect.any(Number),
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
      roles: expect.arrayContaining([expect.any(String)])
    });
    
    // Validate data types
    expect(typeof response.data.id).toBe('string');
    expect(typeof response.data.age).toBe('number');
    expect(Array.isArray(response.data.roles)).toBe(true);
  });
});
```

### Rate Limiting Tests
```javascript
describe('Rate Limiting', () => {
  test('should enforce rate limit', async () => {
    const requests = Array(101).fill().map(() => 
      api.get('/users')
    );
    
    const responses = await Promise.allSettled(requests);
    
    // At least one request should be rate limited
    const rateLimited = responses.some(r => 
      r.value?.status === 429
    );
    
    expect(rateLimited).toBe(true);
  });
  
  test('should include rate limit headers', async () => {
    const response = await api.get('/users');
    
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  });
});
```

### Pagination Tests
```javascript
describe('Pagination', () => {
  test('should return correct page of results', async () => {
    const response = await api.get('/users?page=2&limit=5');
    
    expect(response.data.items.length).toBeLessThanOrEqual(5);
    expect(response.data.page).toBe(2);
    expect(response.data.limit).toBe(5);
    expect(response.data).toHaveProperty('total');
    expect(response.data).toHaveProperty('totalPages');
  });
  
  test('should handle last page correctly', async () => {
    const firstPage = await api.get('/users?limit=10');
    const lastPage = Math.ceil(firstPage.data.total / 10);
    
    const response = await api.get(`/users?page=${lastPage}&limit=10`);
    
    expect(response.status).toBe(200);
    expect(response.data.items.length).toBeGreaterThan(0);
    expect(response.data.items.length).toBeLessThanOrEqual(10);
  });
});
```

### Search and Filtering
```javascript
describe('Search and Filtering', () => {
  test('should filter by single field', async () => {
    const response = await api.get('/users?status=active');
    
    expect(response.status).toBe(200);
    expect(response.data.items.every(u => u.status === 'active')).toBe(true);
  });
  
  test('should filter by multiple fields', async () => {
    const response = await api.get('/users?status=active&role=admin');
    
    expect(response.status).toBe(200);
    expect(response.data.items.every(u => 
      u.status === 'active' && u.role === 'admin'
    )).toBe(true);
  });
  
  test('should perform text search', async () => {
    const response = await api.get('/users?search=john');
    
    expect(response.status).toBe(200);
    expect(response.data.items.every(u => 
      u.name.toLowerCase().includes('john') ||
      u.email.toLowerCase().includes('john')
    )).toBe(true);
  });
});
```

### Concurrent Request Tests
```javascript
describe('Concurrent Requests', () => {
  test('should handle concurrent creates without conflict', async () => {
    const users = [
      { name: 'User1', email: 'user1@example.com' },
      { name: 'User2', email: 'user2@example.com' },
      { name: 'User3', email: 'user3@example.com' }
    ];
    
    const responses = await Promise.all(
      users.map(user => api.post('/users', user))
    );
    
    expect(responses.every(r => r.status === 201)).toBe(true);
    expect(new Set(responses.map(r => r.data.id)).size).toBe(3);
  });
});
```

---

## Mocking Best Practices

### Mock External API Calls
```javascript
import axios from 'axios';

jest.mock('axios');

describe('External API Integration', () => {
  test('should handle successful external API call', async () => {
    const mockData = { id: 1, name: 'External User' };
    
    axios.get.mockResolvedValue({ data: mockData });
    
    const result = await fetchExternalUser('1');
    
    expect(result).toEqual(mockData);
    expect(axios.get).toHaveBeenCalledWith('https://api.example.com/users/1');
  });
  
  test('should handle external API failure', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    
    await expect(fetchExternalUser('1')).rejects.toThrow('Network error');
  });
});
```

### Mock Timers for Time-Based Tests
```javascript
describe('Time-Based Operations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  test('should expire token after timeout', () => {
    const token = createToken();
    
    expect(token.isValid()).toBe(true);
    
    jest.advanceTimersByTime(3600000); // 1 hour
    
    expect(token.isValid()).toBe(false);
  });
});
```

---

## Test Organization

### Group Related Tests
```javascript
describe('User API', () => {
  describe('GET /users/:id', () => {
    describe('Success Cases', () => {
      test('returns 200 with valid ID', async () => {
        // ...
      });
    });
    
    describe('Error Cases', () => {
      test('returns 404 with invalid ID', async () => {
        // ...
      });
    });
  });
  
  describe('POST /users', () => {
    // ...
  });
});
```

### Use Setup and Teardown
```javascript
describe('User CRUD Operations', () => {
  let testUser;
  
  beforeAll(async () => {
    // Setup once before all tests
    await connectToDatabase();
  });
  
  afterAll(async () => {
    // Cleanup once after all tests
    await disconnectFromDatabase();
  });
  
  beforeEach(async () => {
    // Setup before each test
    testUser = await createTestUser();
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await deleteTestUser(testUser.id);
  });
  
  test('can update user', async () => {
    // testUser is available here
  });
});
```

---

## Common Anti-Patterns to Avoid

### ❌ Don't: Test Implementation Details
```javascript
// BAD
test('calls getUserById with correct parameter', () => {
  // Testing internal function call instead of behavior
});
```

### ✅ Do: Test Behavior
```javascript
// GOOD
test('returns user data when ID is valid', () => {
  // Testing the actual outcome/behavior
});
```

### ❌ Don't: Multiple Unrelated Assertions
```javascript
// BAD
test('user endpoints', async () => {
  await testGetUser();
  await testCreateUser();
  await testUpdateUser(); // Too many things in one test
});
```

### ✅ Do: One Concern Per Test
```javascript
// GOOD
test('GET /users/:id returns user data', async () => {
  // Single, focused test
});

test('POST /users creates new user', async () => {
  // Another focused test
});
```

### ❌ Don't: Rely on External State
```javascript
// BAD
test('gets user 123', async () => {
  // Assumes user 123 exists in database
  const response = await api.get('/users/123');
  expect(response.status).toBe(200);
});
```

### ✅ Do: Create Your Own Test Data
```javascript
// GOOD
test('gets created user', async () => {
  const user = await createTestUser();
  const response = await api.get(`/users/${user.id}`);
  expect(response.status).toBe(200);
  await deleteTestUser(user.id);
});
```

---

## Test Naming Conventions

### Use Descriptive Names
```javascript
// ❌ Bad
test('test1', () => {});
test('user test', () => {});

// ✅ Good
test('should return 200 when user ID is valid', () => {});
test('should reject request when email format is invalid', () => {});
test('should create user with all required fields', () => {});
```

### Follow Consistent Pattern
```
should [expected behavior] when [condition]
```

Examples:
- `should return 404 when user does not exist`
- `should update user when valid data is provided`
- `should reject request when authentication token is missing`

---

## Performance Testing Patterns

### Response Time Tests
```javascript
describe('Performance', () => {
  test('should respond within 500ms', async () => {
    const start = Date.now();
    const response = await api.get('/users');
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });
});
```

### Load Tests (Using k6 or similar)
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  let response = http.get('https://api.example.com/users');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## Sources and References

### Official Documentation
- **Jest Documentation**: https://jestjs.io/ (2025)
- **Postman Collection Format**: https://learning.postman.com/collection-format/ (May 2025)
- **Node.js Testing Best Practices**: GitHub - goldbergyoni/nodejs-testing-best-practices (April 2025)

### Best Practices Articles
- **API Testing Made Easy with Jest** - OpenReplay Blog
- **Effective Unit Testing with Jest** - GeekyAnts (May 2025)
- **Best Practices for Mocking in Unit Tests Using Jest** - Medium (March 2025)
- **Jest Testing like a Pro - Tips and tricks** - DEV Community

### Key Principles (2025 Standards)
1. **AAA Pattern**: Arrange-Act-Assert for clarity
2. **Test Isolation**: Each test runs independently
3. **Descriptive Naming**: Clear test names that describe behavior
4. **Mock External Dependencies**: Never hit real APIs in unit tests
5. **One Assertion Per Test**: Keep tests focused
6. **Proper Cleanup**: Use beforeEach/afterEach hooks
7. **Test Behavior, Not Implementation**: Focus on outcomes

---

## Quick Reference: HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid auth |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Server temporarily down |

---

*Last Updated: October 2025*
*Based on Jest, Postman, and modern API testing standards*
