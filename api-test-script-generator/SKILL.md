---
name: api-test-script-generator
description: Generate Postman Collection v2.1 and Jest/Mocha test suites from OpenAPI/Swagger 3.0/3.1 specs, covering success, error, validation, auth and edge cases. Use when the user supplies an OpenAPI/Swagger spec and wants API tests or Postman collections.
---

# API Test Script Generator

You generate production-ready API test suites (Postman and Jest/Mocha) from OpenAPI/Swagger specifications.

## Workflow

1. **Analyze the spec** (YAML or JSON). Check `openapi`, `info`, `paths`. List endpoints, methods, request/response schemas, auth schemes, parameters, error codes.
2. **Pick the output** from the user's preference: Postman Collection v2.1, Jest suite, or both.
3. **Generate** complete, runnable files with no placeholders, then apply the rules below.
4. **Reply** with: summary (endpoints, test count, auth method), the files, usage instructions (import/run, env vars), coverage report (covered scenarios, assumptions, suggested extras).

## Tests per endpoint

1. Success path: 200/201/204, response schema, headers, response time (under 500 ms typical).
2. Error handling: each defined error response (400, 401, 403, 404, 409, 422, 429, 500), error structure and message.
3. Validation: missing required fields, invalid formats, boundary values, type mismatches (all 400).
4. Authentication, when security is defined: valid, invalid, missing, expired token.
5. Edge cases: empty lists, first/last page, duplicate creation (409).

Test names follow `should [expected behavior] when [condition]`. Use the AAA pattern. Group tests by endpoint/resource with `describe` blocks.

## Critical rules

Always:
1. Check response time with a reasonable threshold.
2. Validate the response schema against the spec.
3. Validate error messages, not only status codes.
4. Test authentication when security is defined.
5. Use descriptive test names.

Never:
1. Skip error scenarios.
2. Use vague test names (`test1`, `get users`).
3. Hit real APIs from Jest. Always mock (`jest.mock('axios')`).
4. Ignore validation constraints.
5. Assume success only.

Also: keep tests independent (no shared state), clean up with `beforeEach`/`afterEach`, use meaningful Postman variables (`baseUrl`, `bearerToken`), add pre-request scripts and response examples in Postman, provide an `APIClient` wrapper in Jest.

## Coverage checklist

Per endpoint: success path, schema validation, required and optional fields, field formats (email, uuid), boundary values, auth required and invalid, missing and invalid parameters (400), not found (404), conflict (409) if applicable, server error (500), rate limiting (429) if applicable, response time.

## References

Read on demand:
- `references/generation-details.md`: input format examples, output skeletons, naming examples, auth handling (Postman and Jest), Postman and Jest feature snippets, common scenarios (CRUD, search, upload, authenticated), a worked example.
- `references/openapi-guide.md`: OpenAPI 3.0/3.1 syntax, schemas, parameters, auth schemes, responses.
- `references/test-patterns.md`: API testing patterns, HTTP method strategies, mocking, Jest techniques.
- `assets/postman-template.json` and `assets/test-suite-template.js`: complete starting templates, customize per API.
