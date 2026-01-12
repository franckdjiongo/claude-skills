/**
 * API Test Suite Template
 * Generated from OpenAPI Specification
 * Framework: Jest
 * Last Updated: October 2025
 */

// Import required dependencies
const axios = require('axios');

// Mock axios to avoid real API calls
jest.mock('axios');

// Base URL from environment or default
const BASE_URL = process.env.API_BASE_URL || 'https://api.example.com/v1';

// Test data and fixtures
const testUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: '[email protected]',
  createdAt: '2025-10-19T12:00:00Z'
};

const testUserList = {
  items: [testUser],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1
};

// API Client wrapper
class APIClient {
  constructor(baseURL, token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, path, data = null, config = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseURL}${path}`;

    try {
      const response = await axios({
        method,
        url,
        data,
        headers,
        ...config
      });
      return response;
    } catch (error) {
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }

  async get(path, config = {}) {
    return this.request('GET', path, null, config);
  }

  async post(path, data, config = {}) {
    return this.request('POST', path, data, config);
  }

  async put(path, data, config = {}) {
    return this.request('PUT', path, data, config);
  }

  async patch(path, data, config = {}) {
    return this.request('PATCH', path, data, config);
  }

  async delete(path, config = {}) {
    return this.request('DELETE', path, null, config);
  }
}

// ============================================================================
// USER API TESTS
// ============================================================================

describe('User API', () => {
  let apiClient;

  beforeAll(() => {
    apiClient = new APIClient(BASE_URL, 'test-token-12345');
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset modules after each test if needed
  });

  // ==========================================================================
  // GET /users - List Users
  // ==========================================================================

  describe('GET /users - List Users', () => {
    describe('Success Cases', () => {
      test('should return 200 and list of users', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 200,
          data: testUserList
        });

        // ACT
        const response = await apiClient.get('/users');

        // ASSERT
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('items');
        expect(response.data.items).toBeInstanceOf(Array);
        expect(axios).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            url: `${BASE_URL}/users`
          })
        );
      });

      test('should return paginated results', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 200,
          data: testUserList
        });

        // ACT
        const response = await apiClient.get('/users?page=1&limit=20');

        // ASSERT
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('page');
        expect(response.data).toHaveProperty('limit');
        expect(response.data).toHaveProperty('total');
        expect(response.data).toHaveProperty('totalPages');
      });

      test('should include proper headers in request', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 200,
          data: testUserList
        });

        // ACT
        await apiClient.get('/users');

        // ASSERT
        expect(axios).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-token-12345',
              'Content-Type': 'application/json'
            })
          })
        );
      });

      test('should handle empty list', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 200,
          data: {
            items: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0
          }
        });

        // ACT
        const response = await apiClient.get('/users');

        // ASSERT
        expect(response.status).toBe(200);
        expect(response.data.items).toEqual([]);
        expect(response.data.total).toBe(0);
      });
    });

    describe('Error Cases', () => {
      test('should return 401 when not authenticated', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 401,
            data: {
              error: 'Unauthorized',
              code: 'AUTH_REQUIRED'
            }
          }
        });

        // ACT
        const response = await apiClient.get('/users');

        // ASSERT
        expect(response.status).toBe(401);
        expect(response.data).toHaveProperty('error');
      });

      test('should return 400 for invalid pagination parameters', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Invalid page parameter',
              code: 'INVALID_PARAM'
            }
          }
        });

        // ACT
        const response = await apiClient.get('/users?page=-1');

        // ASSERT
        expect(response.status).toBe(400);
        expect(response.data.error).toMatch(/invalid/i);
      });
    });
  });

  // ==========================================================================
  // POST /users - Create User
  // ==========================================================================

  describe('POST /users - Create User', () => {
    describe('Success Cases', () => {
      test('should create user and return 201', async () => {
        // ARRANGE
        const newUser = {
          name: 'Jane Doe',
          email: '[email protected]'
        };

        axios.mockResolvedValue({
          status: 201,
          data: {
            ...testUser,
            ...newUser
          }
        });

        // ACT
        const response = await apiClient.post('/users', newUser);

        // ASSERT
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data.name).toBe(newUser.name);
        expect(response.data.email).toBe(newUser.email);
      });

      test('should include createdAt timestamp', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 201,
          data: testUser
        });

        // ACT
        const response = await apiClient.post('/users', {
          name: 'Test User',
          email: '[email protected]'
        });

        // ASSERT
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('createdAt');
        expect(response.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    describe('Validation Tests', () => {
      test('should reject empty name', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Name is required',
              code: 'VALIDATION_ERROR',
              details: ['Name cannot be empty']
            }
          }
        });

        // ACT
        const response = await apiClient.post('/users', {
          name: '',
          email: '[email protected]'
        });

        // ASSERT
        expect(response.status).toBe(400);
        expect(response.data.error).toMatch(/name.*required/i);
      });

      test('should reject invalid email format', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Invalid email format',
              code: 'VALIDATION_ERROR'
            }
          }
        });

        // ACT
        const response = await apiClient.post('/users', {
          name: 'Test User',
          email: 'not-an-email'
        });

        // ASSERT
        expect(response.status).toBe(400);
        expect(response.data.error).toMatch(/email.*invalid/i);
      });

      test('should reject missing required fields', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Missing required fields',
              code: 'VALIDATION_ERROR',
              details: ['name is required', 'email is required']
            }
          }
        });

        // ACT
        const response = await apiClient.post('/users', {});

        // ASSERT
        expect(response.status).toBe(400);
        expect(response.data).toHaveProperty('details');
        expect(response.data.details).toBeInstanceOf(Array);
      });

      test('should reject duplicate email', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 409,
            data: {
              error: 'User with this email already exists',
              code: 'DUPLICATE_EMAIL'
            }
          }
        });

        // ACT
        const response = await apiClient.post('/users', {
          name: 'Test User',
          email: '[email protected]'
        });

        // ASSERT
        expect(response.status).toBe(409);
        expect(response.data.error).toMatch(/already exists/i);
      });
    });
  });

  // ==========================================================================
  // GET /users/:id - Get User by ID
  // ==========================================================================

  describe('GET /users/:id - Get User by ID', () => {
    describe('Success Cases', () => {
      test('should return user when ID is valid', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 200,
          data: testUser
        });

        // ACT
        const response = await apiClient.get(`/users/${testUser.id}`);

        // ASSERT
        expect(response.status).toBe(200);
        expect(response.data.id).toBe(testUser.id);
        expect(response.data).toHaveProperty('name');
        expect(response.data).toHaveProperty('email');
      });

      test('should validate response schema', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 200,
          data: testUser
        });

        // ACT
        const response = await apiClient.get(`/users/${testUser.id}`);

        // ASSERT
        expect(response.data).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
          createdAt: expect.any(String)
        });
      });
    });

    describe('Error Cases', () => {
      test('should return 404 when user does not exist', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 404,
            data: {
              error: 'User not found',
              code: 'NOT_FOUND'
            }
          }
        });

        // ACT
        const response = await apiClient.get('/users/non-existent-id');

        // ASSERT
        expect(response.status).toBe(404);
        expect(response.data.error).toMatch(/not found/i);
      });

      test('should return 400 for invalid ID format', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Invalid user ID format',
              code: 'INVALID_ID'
            }
          }
        });

        // ACT
        const response = await apiClient.get('/users/invalid-id-format');

        // ASSERT
        expect(response.status).toBe(400);
        expect(response.data.error).toMatch(/invalid.*id/i);
      });
    });
  });

  // ==========================================================================
  // PUT /users/:id - Update User
  // ==========================================================================

  describe('PUT /users/:id - Update User', () => {
    describe('Success Cases', () => {
      test('should update user and return updated data', async () => {
        // ARRANGE
        const updates = {
          name: 'Updated Name',
          email: '[email protected]'
        };

        axios.mockResolvedValue({
          status: 200,
          data: {
            ...testUser,
            ...updates
          }
        });

        // ACT
        const response = await apiClient.put(`/users/${testUser.id}`, updates);

        // ASSERT
        expect(response.status).toBe(200);
        expect(response.data.name).toBe(updates.name);
        expect(response.data.email).toBe(updates.email);
      });
    });

    describe('Error Cases', () => {
      test('should return 404 for non-existent user', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 404,
            data: {
              error: 'User not found',
              code: 'NOT_FOUND'
            }
          }
        });

        // ACT
        const response = await apiClient.put('/users/non-existent', {
          name: 'Test'
        });

        // ASSERT
        expect(response.status).toBe(404);
      });

      test('should reject invalid update data', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 400,
            data: {
              error: 'Invalid update data',
              code: 'VALIDATION_ERROR'
            }
          }
        });

        // ACT
        const response = await apiClient.put(`/users/${testUser.id}`, {
          email: 'invalid-email'
        });

        // ASSERT
        expect(response.status).toBe(400);
      });
    });
  });

  // ==========================================================================
  // DELETE /users/:id - Delete User
  // ==========================================================================

  describe('DELETE /users/:id - Delete User', () => {
    describe('Success Cases', () => {
      test('should delete user and return 204', async () => {
        // ARRANGE
        axios.mockResolvedValue({
          status: 204,
          data: null
        });

        // ACT
        const response = await apiClient.delete(`/users/${testUser.id}`);

        // ASSERT
        expect(response.status).toBe(204);
      });
    });

    describe('Error Cases', () => {
      test('should return 404 for non-existent user', async () => {
        // ARRANGE
        axios.mockRejectedValue({
          response: {
            status: 404,
            data: {
              error: 'User not found',
              code: 'NOT_FOUND'
            }
          }
        });

        // ACT
        const response = await apiClient.delete('/users/non-existent');

        // ASSERT
        expect(response.status).toBe(404);
      });
    });
  });
});

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('Authentication', () => {
  describe('Bearer Token Authentication', () => {
    test('should accept valid Bearer token', async () => {
      // ARRANGE
      const authenticatedClient = new APIClient(BASE_URL, 'valid-token-12345');
      
      axios.mockResolvedValue({
        status: 200,
        data: testUser
      });

      // ACT
      const response = await authenticatedClient.get('/users/me');

      // ASSERT
      expect(response.status).toBe(200);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token-12345'
          })
        })
      );
    });

    test('should reject request without token', async () => {
      // ARRANGE
      const unauthenticatedClient = new APIClient(BASE_URL);
      
      axios.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          }
        }
      });

      // ACT
      const response = await unauthenticatedClient.get('/users/me');

      // ASSERT
      expect(response.status).toBe(401);
    });

    test('should reject expired token', async () => {
      // ARRANGE
      const expiredClient = new APIClient(BASE_URL, 'expired-token');
      
      axios.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
          }
        }
      });

      // ACT
      const response = await expiredClient.get('/users/me');

      // ASSERT
      expect(response.status).toBe(401);
      expect(response.data.error).toMatch(/expired/i);
    });
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Rate Limiting', () => {
  test('should enforce rate limits', async () => {
    // ARRANGE
    axios.mockRejectedValue({
      response: {
        status: 429,
        data: {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '1634567890'
        }
      }
    });

    const apiClient = new APIClient(BASE_URL, 'test-token');

    // ACT
    const response = await apiClient.get('/users');

    // ASSERT
    expect(response.status).toBe(429);
    expect(response.data.error).toMatch(/too many requests/i);
  });

  test('should include rate limit headers', async () => {
    // ARRANGE
    axios.mockResolvedValue({
      status: 200,
      data: testUserList,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': '1634567890'
      }
    });

    const apiClient = new APIClient(BASE_URL, 'test-token');

    // ACT
    const response = await apiClient.get('/users');

    // ASSERT
    expect(response.headers).toHaveProperty('X-RateLimit-Limit');
    expect(response.headers).toHaveProperty('X-RateLimit-Remaining');
    expect(response.headers).toHaveProperty('X-RateLimit-Reset');
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates a random user for testing
 */
function generateRandomUser() {
  return {
    name: `Test User ${Math.random().toString(36).substring(7)}`,
    email: `test${Math.random().toString(36).substring(7)}@example.com`
  };
}

/**
 * Validates email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Creates a mock user list
 */
function createMockUserList(count = 10) {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      ...testUser,
      id: `user-${i}`,
      name: `User ${i}`
    })),
    total: count,
    page: 1,
    limit: 20,
    totalPages: Math.ceil(count / 20)
  };
}

// Export for use in other test files
module.exports = {
  APIClient,
  testUser,
  testUserList,
  generateRandomUser,
  isValidEmail,
  createMockUserList
};
