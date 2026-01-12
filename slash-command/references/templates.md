# Command Templates Library

Complete collection of production-ready Claude Code slash command templates following Anthropic best practices.

## Git Workflows

### Conventional Commit
```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*)
argument-hint: [message]
description: Create a conventional commit
model: claude-3-5-haiku-20241022
---

Create a conventional commit with message: $ARGUMENTS

Steps:
1. Run `git status` to see all changes
2. Run `git diff` to review the changes
3. Analyze the changes and determine the appropriate conventional commit type:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code refactoring
   - `test:` for test additions/changes
   - `chore:` for maintenance tasks
4. Stage all changes with `git add -A`
5. Create a conventional commit with a descriptive message
6. Push to the current branch

Remember: This project follows Conventional Commits specification. Do NOT add co-authors to the commit message.
```

### Git Status Summary
```markdown
---
allowed-tools: Bash(git status:*), Bash(git diff:*)
description: Summarize current git changes
---

!git status

!git diff --stat

Analyze the above git status and diff statistics. Provide:
1. Summary of changed files by category
2. Suggested next steps
3. Files that might need attention
4. Potential conflicts or issues
```

### Fix GitHub Issue
```markdown
---
allowed-tools: Bash(gh:*)
argument-hint: [issue-number]
description: Fix a GitHub issue
---

Please analyze and fix GitHub issue: $ARGUMENTS

Follow these steps:
1. Use `gh issue view $ARGUMENTS` to get issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
5. Write and run tests to verify the fix
6. Ensure code passes linting and type checking
7. Create a descriptive commit message
8. Push and create a PR

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.
```

## Code Review

### Comprehensive PR Review
```markdown
---
allowed-tools: Bash(git diff:*)
argument-hint: [branch-name]
description: Comprehensive code review
---

!git diff main..$ARGUMENTS

Review the above diff for:

**Security:**
- Authentication and authorization
- Input validation
- SQL injection vulnerabilities
- XSS vulnerabilities
- CSRF protection
- Secrets management

**Performance:**
- N+1 queries
- Inefficient loops
- Memory leaks
- Unnecessary computations
- Database query optimization

**Code Quality:**
- DRY violations
- Proper error handling
- Naming conventions
- Code comments
- Type safety

**Testing:**
- Test coverage
- Edge cases
- Integration points
- Mock appropriateness

**Architecture:**
- Design patterns
- Separation of concerns
- SOLID principles
- Maintainability

Provide specific, actionable feedback with code examples.
```

### Quick Code Review
```markdown
---
argument-hint: [file-path]
description: Quick code review of specific file
---

Review the code quality of @$ARGUMENTS

Focus on:
1. Security best practices
2. Error handling
3. Code clarity and maintainability
4. Performance considerations
5. Testing needs

Provide concise, actionable feedback.
```

## Testing

### Unit Test Generation
```markdown
---
argument-hint: [file-path]
description: Generate comprehensive unit tests
---

Generate unit tests for @$ARGUMENTS

Requirements:
- Use project's testing framework (Jest/Vitest/pytest/etc.)
- Cover happy path scenarios
- Include edge cases and error scenarios
- Add setup/teardown as needed
- Mock external dependencies properly
- Aim for >80% code coverage
- Follow AAA pattern (Arrange, Act, Assert)
- Add descriptive test names

Write tests that are:
- Independent (no test interdependencies)
- Repeatable (same results every time)
- Fast (quick execution)
- Clear (easy to understand what's being tested)
```

### E2E Test Generation
```markdown
---
allowed-tools: Bash(npm:*), Bash(npx:*)
argument-hint: [feature-name]
description: Generate E2E tests for a feature
---

Generate end-to-end tests for feature: $ARGUMENTS

Requirements:
- Use Playwright/Cypress/etc. based on project setup
- Test user journey from start to finish
- Include authentication flows if needed
- Test error states and edge cases
- Add assertions for UI elements
- Include wait strategies
- Add screenshots on failure
- Use page object model pattern

Cover:
1. Happy path user flow
2. Error handling
3. Edge cases
4. Accessibility checks
5. Mobile responsiveness (if applicable)
```

### Test Runner
```markdown
---
allowed-tools: Bash(npm:*), Bash(npx:*)
argument-hint: [test-pattern]
description: Smart test runner
---

Run tests for: $ARGUMENTS

Steps:
1. Determine test type from file extension or pattern
2. Run appropriate test command:
   - *.test.ts → `npm test`
   - *.spec.ts → `npm run test:spec`
   - *.e2e.ts → `npm run test:e2e`
3. If no pattern match, search for related test files
4. Display test results with coverage
5. Highlight failures and provide debugging guidance
```

## Documentation

### API Documentation Generator
```markdown
---
allowed-tools: Bash(find:*), Bash(grep:*)
description: Generate API documentation
---

!find . -name "*.ts" -path "*/api/*" -o -path "*/routes/*"

Analyze the API files above and generate comprehensive API documentation including:

For each endpoint:
- HTTP method and path
- Description and purpose
- Request parameters (query, path, body)
- Request schema with types
- Response schema with types
- Status codes and their meanings
- Authentication requirements
- Rate limiting info
- Example requests (curl)
- Example responses (JSON)
- Error responses
- Notes and caveats

Format in OpenAPI/Swagger style.
```

### README Generator
```markdown
---
allowed-tools: Bash(find:*), Bash(cat:*)
description: Generate comprehensive README
---

Think about the project structure and purpose.

!find . -type f -name "package.json" -o -name "setup.py" -o -name "Cargo.toml"

Generate a comprehensive README.md including:

**Project Header:**
- Project name and description
- Badges (build status, coverage, version, license)
- Demo/screenshot if applicable

**Getting Started:**
- Prerequisites
- Installation steps
- Configuration
- Quick start example

**Documentation:**
- Features list
- Usage examples
- API reference (if applicable)
- Architecture overview

**Development:**
- Setup development environment
- Running tests
- Building for production
- Contributing guidelines

**Additional Sections:**
- FAQ
- Troubleshooting
- Changelog
- License
- Credits/Acknowledgments
```

### Code Comments
```markdown
---
argument-hint: [file-path]
description: Add comprehensive code comments
---

Add comprehensive comments to @$ARGUMENTS

Requirements:
- JSDoc/TSDoc format for functions
- Inline comments for complex logic
- Header comments for files/modules
- Parameter descriptions
- Return value descriptions
- Example usage
- Edge cases and gotchas
- TODO/FIXME where needed

Balance:
- Explain WHY, not WHAT (code shows what)
- Focus on non-obvious logic
- Keep comments up-to-date
- Avoid redundant comments
```

## Refactoring

### General Refactoring
```markdown
---
argument-hint: [file-path]
description: Refactor code for readability and maintainability
---

Think about refactoring @$ARGUMENTS

Focus on:

**Extract Functions:**
- Identify repeated code patterns
- Extract complex logic into named functions
- Create utility functions for common operations

**Reduce Complexity:**
- Simplify nested conditionals
- Extract nested loops
- Reduce cyclomatic complexity
- Apply early returns

**Improve Names:**
- Use descriptive variable names
- Follow naming conventions
- Be consistent across codebase

**Enhance Type Safety:**
- Add proper types
- Remove 'any' types
- Use discriminated unions
- Add runtime validation where needed

**Error Handling:**
- Proper try-catch blocks
- Error propagation
- User-friendly error messages
- Logging and monitoring

**Add Comments:**
- Explain non-obvious logic
- Document assumptions
- Add TODOs for future work

Maintain existing functionality and tests.
```

### Extract Component (React)
```markdown
---
argument-hint: [component-path]
description: Extract React component for reusability
---

Analyze @$ARGUMENTS and extract reusable components.

Process:
1. Identify repeated UI patterns
2. Extract to new component file
3. Define clear props interface
4. Add TypeScript types
5. Implement component logic
6. Add prop validation
7. Write component tests
8. Update documentation

Ensure:
- Single responsibility
- Proper prop types
- Accessibility attributes
- Performance optimization (memo/callback)
- Error boundaries if needed
```

## Performance

### Performance Analysis
```markdown
---
allowed-tools: Bash(npm:*), Bash(node:*)
description: Analyze performance bottlenecks
---

Think hard about performance optimization for this codebase.

!npm run build -- --analyze

Analyze performance aspects:

**Frontend (if applicable):**
1. Bundle size and code splitting
2. Render performance (React DevTools)
3. Network requests (waterfall analysis)
4. Memory usage
5. Lighthouse scores
6. Core Web Vitals

**Backend:**
1. Database query efficiency
2. API response times
3. Memory leaks
4. CPU usage
5. Caching strategies

**General:**
1. Algorithmic complexity
2. Data structure efficiency
3. Unnecessary computations
4. Resource loading

Provide specific optimizations with:
- Current metrics
- Target metrics
- Implementation steps
- Estimated impact
- Trade-offs
```

### Database Query Optimization
```markdown
---
allowed-tools: Bash(psql:*), Bash(mysql:*)
description: Optimize database queries
---

Think harder about database query optimization.

Analyze and optimize queries for:

**Query Performance:**
- EXPLAIN ANALYZE results
- Index usage
- Query plan
- Execution time

**Optimization Strategies:**
1. Add appropriate indexes
2. Rewrite inefficient queries
3. Use query hints if needed
4. Implement query caching
5. Consider materialized views
6. Optimize JOINs
7. Avoid N+1 queries
8. Use connection pooling

**Monitoring:**
- Slow query log
- Query statistics
- Index effectiveness
- Cache hit ratio

Provide:
- Current performance metrics
- Optimized queries
- Index recommendations
- Before/after comparison
```

## Security

### Security Audit
```markdown
---
allowed-tools: Bash(npm:audit:*), Bash(git:*)
description: Comprehensive security audit
---

!npm audit --json

!git log --oneline -20

Think harder about security implications.

Review all security aspects:

**Dependency Security:**
1. Vulnerable dependencies
2. Outdated packages
3. License compliance
4. Supply chain risks

**Authentication & Authorization:**
1. Authentication flows
2. Session management
3. Token handling
4. Role-based access control
5. OAuth implementation

**Input Validation:**
1. User input sanitization
2. Type validation
3. Schema validation
4. File upload validation

**Common Vulnerabilities:**
1. SQL injection
2. XSS (Cross-Site Scripting)
3. CSRF (Cross-Site Request Forgery)
4. Command injection
5. Path traversal
6. Open redirects

**Data Protection:**
1. Encryption at rest
2. Encryption in transit (TLS)
3. Secret management
4. Sensitive data exposure
5. PII handling

**API Security:**
1. Rate limiting
2. Authentication
3. Input validation
4. CORS configuration
5. API versioning

Prioritize findings by:
- Critical (immediate action)
- High (address soon)
- Medium (plan to fix)
- Low (monitor)

Provide specific remediation steps for each issue.
```

### OWASP Top 10 Check
```markdown
---
description: Check code against OWASP Top 10
---

Think hard about OWASP Top 10 vulnerabilities.

Check codebase for OWASP Top 10 (2021):

1. **Broken Access Control**
   - Unauthorized access
   - Privilege escalation
   - CORS misconfig

2. **Cryptographic Failures**
   - Weak encryption
   - Exposed secrets
   - Insecure protocols

3. **Injection**
   - SQL injection
   - NoSQL injection
   - Command injection
   - LDAP injection

4. **Insecure Design**
   - Missing security controls
   - Insecure architecture
   - Missing threat modeling

5. **Security Misconfiguration**
   - Default credentials
   - Error messages revealing info
   - Unnecessary features enabled

6. **Vulnerable Components**
   - Outdated dependencies
   - Unpatched vulnerabilities
   - Unsupported components

7. **Authentication Failures**
   - Weak passwords
   - Credential stuffing
   - Session fixation

8. **Software and Data Integrity**
   - Unsigned updates
   - Insecure CI/CD
   - Untrusted sources

9. **Security Logging Failures**
   - Insufficient logging
   - No monitoring
   - Unclear audit trails

10. **Server-Side Request Forgery (SSRF)**
    - Unvalidated URLs
    - Internal service access
    - Cloud metadata exposure

Provide:
- Vulnerability findings
- Risk assessment
- Remediation steps
- Code examples (vulnerable → secure)
```

## Deployment

### Pre-Deployment Checklist
```markdown
---
allowed-tools: Bash(npm:*), Bash(git:*)
description: Run pre-deployment checks
---

!git status

!npm test

!npm run lint

Think about deployment readiness.

Pre-deployment checklist:

**Code Quality:**
- [ ] All tests passing
- [ ] Linting clean
- [ ] Type checking passing
- [ ] Code reviewed
- [ ] No console.logs

**Security:**
- [ ] No hardcoded secrets
- [ ] Dependencies updated
- [ ] Security audit passed
- [ ] Environment variables documented

**Documentation:**
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] API docs current
- [ ] Migration notes (if any)

**Performance:**
- [ ] Bundle size acceptable
- [ ] No performance regressions
- [ ] Load testing done
- [ ] Caching configured

**Infrastructure:**
- [ ] Environment configs ready
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Monitoring configured

**Communication:**
- [ ] Team notified
- [ ] Stakeholders informed
- [ ] Release notes prepared
- [ ] Downtime scheduled (if needed)

Report any blockers or concerns.
```

### Deploy to Staging
```markdown
---
allowed-tools: Bash(git:*), Bash(npm:*)
argument-hint: [version]
description: Deploy to staging environment
---

Deploy version $ARGUMENTS to staging.

Steps:
1. Verify clean git status
2. Create release branch
3. Update version number
4. Run full test suite
5. Build production bundle
6. Deploy to staging
7. Run smoke tests
8. Verify deployment
9. Notify team

Post-deployment:
- Monitor logs
- Check metrics
- Test critical paths
- Document any issues
```

## Project Management

### Sprint Planning
```markdown
---
description: Plan sprint based on backlog
---

Think about sprint planning.

Review backlog and plan sprint:

**Sprint Goals:**
1. Define 2-3 sprint goals
2. Align with product roadmap
3. Balance new features and tech debt

**Story Selection:**
- Estimate story points
- Consider team capacity
- Account for meetings/overhead
- Include buffer for unknowns

**Dependencies:**
- Identify blockers
- External dependencies
- Team dependencies
- Technical prerequisites

**Success Criteria:**
- Measurable outcomes
- Acceptance criteria
- Definition of done

**Risks:**
- Technical risks
- Resource risks
- External risks
- Mitigation strategies

Output:
- Sprint backlog
- Capacity plan
- Risk register
- Daily standup schedule
```

### Issue Triage
```markdown
---
allowed-tools: Bash(gh:*)
description: Triage GitHub issues
---

!gh issue list --limit 50

Think about issue prioritization.

Triage criteria:

**Severity:**
- Critical: System down, data loss
- High: Major functionality broken
- Medium: Feature impaired
- Low: Minor issues, cosmetic

**Impact:**
- Number of users affected
- Business impact
- Workaround available?

**Effort:**
- Time to fix
- Complexity
- Dependencies

**Priority Matrix:**
- Quick wins (low effort, high impact)
- Major projects (high effort, high impact)
- Fill-ins (low effort, low impact)
- Thankless tasks (high effort, low impact)

For each issue:
1. Assign severity label
2. Add to appropriate milestone
3. Assign owner if possible
4. Add to project board
5. Link related issues
```

## Sources Referenced

All templates are based on:
- Anthropic Claude Code Official Documentation (https://docs.anthropic.com/en/docs/claude-code)
- Claude Code Best Practices (https://www.anthropic.com/engineering/claude-code-best-practices)
- Community examples from awesome-claude-code repository
- Real-world production usage patterns
