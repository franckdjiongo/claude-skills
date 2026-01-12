# Real-World Command Examples

Production-tested slash commands from actual Claude Code usage across various projects and teams.

## Complete Feature Development Workflow

This command orchestrates the entire development lifecycle from planning to deployment.

**File:** `.claude/commands/dev/feature.md`

```markdown
---
allowed-tools: Bash(git:*), Bash(npm:*), Bash(gh:*)
argument-hint: [feature-name]
description: Complete feature development workflow from planning to PR
---

Develop feature: $ARGUMENTS

Think about the feature implementation approach.

## Phase 1: Planning & Setup
1. Create feature branch: `git checkout -b feature/$ARGUMENTS`
2. Create GitHub issue or verify issue exists
3. Break down feature into subtasks
4. Identify affected files and components
5. Plan test strategy

## Phase 2: Implementation
1. Implement core functionality
2. Add input validation
3. Implement error handling
4. Add logging where appropriate
5. Update or create necessary types/interfaces

## Phase 3: Testing
1. Write unit tests for new functions
2. Write integration tests for workflows
3. Add E2E tests for user flows
4. Run full test suite: `npm test`
5. Verify test coverage meets threshold

## Phase 4: Code Quality
1. Run linter: `npm run lint`
2. Run type checker: `npm run type-check`
3. Self-review code for:
   - Security issues
   - Performance concerns
   - Code clarity
   - Edge cases

## Phase 5: Documentation
1. Update inline code comments
2. Update README if needed
3. Update API docs if applicable
4. Add migration notes if needed
5. Update CHANGELOG

## Phase 6: Commit & PR
1. Stage changes: `git add .`
2. Create conventional commit
3. Push branch: `git push -u origin feature/$ARGUMENTS`
4. Create PR with template:
   - Description
   - Screenshots/GIFs
   - Testing done
   - Breaking changes
5. Request review from team
6. Link to related issues

Provide summary of work completed and next steps.
```

## Automated Code Review Agent

Multi-agent code review system that reviews different aspects in parallel.

**File:** `.claude/commands/review/multi-agent.md`

```markdown
---
allowed-tools: Bash(git diff:*)
argument-hint: [branch-name]
description: Multi-agent PR review with specialized focus areas
---

!git diff main..$ARGUMENTS

Conduct multi-agent code review. Each agent reviews from their specialized perspective:

## Security Agent
Review for:
- Authentication & authorization issues
- Input validation
- SQL injection risks
- XSS vulnerabilities
- CSRF protection
- Secrets in code
- Dependency vulnerabilities

## Performance Agent  
Review for:
- Algorithmic complexity
- Database query efficiency
- N+1 query problems
- Memory leaks
- Unnecessary re-renders (React)
- Bundle size impact
- Caching opportunities

## Quality Agent
Review for:
- Code readability
- DRY violations
- Proper error handling
- Naming conventions
- Code organization
- Test coverage
- Documentation

## Architecture Agent
Review for:
- Design patterns
- SOLID principles
- Separation of concerns
- Coupling and cohesion
- Scalability considerations
- Maintainability

Synthesize findings across all agents and provide:
1. Critical issues (must fix)
2. Important improvements (should fix)
3. Nice-to-haves (consider fixing)
4. Positive highlights

Format as actionable GitHub review comments.
```

## AI-Powered Git Commit

Analyzes changes and generates context-aware commit messages.

**File:** `~/.claude/commands/smart-commit.md`

```markdown
---
allowed-tools: Bash(git:*)
description: AI-powered commit with context-aware message
model: claude-3-5-haiku-20241022
---

!git status

!git diff --cached

!git diff

Analyze the changes above and create an optimal commit.

## Analysis Process
1. Understand what changed (files, functions, logic)
2. Determine the impact and scope
3. Identify the commit type:
   - feat: New feature
   - fix: Bug fix
   - docs: Documentation only
   - style: Formatting, no code change
   - refactor: Code change that neither fixes a bug nor adds a feature
   - perf: Performance improvement
   - test: Adding or updating tests
   - build: Build system or dependency changes
   - ci: CI configuration changes
   - chore: Other changes that don't modify src or test files

## Commit Message Format
```
type(scope): subject

- Detail 1
- Detail 2
- Detail 3

Refs: #issue-number
```

## Execution
1. If there are unstaged changes, ask if they should be included
2. Stage appropriate files
3. Create commit with generated message
4. Show commit hash and summary
5. Ask if push is desired

Do NOT push automatically unless explicitly requested.
```

## Database Migration Generator

Creates type-safe database migrations with rollback support.

**File:** `.claude/commands/db/migrate.md`

```markdown
---
allowed-tools: Bash(psql:*), Bash(npm:*)
argument-hint: [migration-name]
description: Generate database migration with rollback
---

Create database migration: $ARGUMENTS

Think about the migration strategy.

## Migration Planning
1. Understand the schema change needed
2. Check for data dependencies
3. Plan for zero-downtime deployment
4. Consider rollback strategy

## Migration File Generation
Create migration file: `migrations/YYYYMMDD_HHMMSS_$ARGUMENTS.sql`

```sql
-- Migration: $ARGUMENTS
-- Created: [timestamp]

-- UP Migration
BEGIN;

-- 1. Create new tables/columns
-- 2. Migrate existing data
-- 3. Update constraints
-- 4. Create indexes
-- 5. Update permissions

COMMIT;

-- DOWN Migration (Rollback)
BEGIN;

-- Reverse all changes in opposite order

COMMIT;
```

## Safety Checks
1. Verify migration syntax
2. Test on local database
3. Check migration order
4. Verify rollback works
5. Document any manual steps needed

## TypeScript Type Generation
Update TypeScript types to match new schema:
```typescript
// types/database.ts
export interface NewTable {
  // Generated types
}
```

## Documentation
Update schema documentation with:
- New tables/columns
- Relationships
- Indexes
- Constraints
- Migration notes
```

## Automated Bug Triager

Analyzes bug reports and suggests priority, labels, and assignments.

**File:** `.claude/commands/triage.md`

```markdown
---
allowed-tools: Bash(gh:*)
argument-hint: [issue-number]
description: Triage bug report with priority and assignment
---

!gh issue view $ARGUMENTS --json title,body,labels,comments

Think about bug triage.

## Analysis Criteria

### Severity Assessment
Analyze the bug for:
- System availability impact
- Data integrity risk
- Number of users affected
- Workaround availability
- Frequency of occurrence

### Complexity Estimation
Consider:
- Code area affected
- Dependencies involved
- Required expertise
- Potential for regression
- Testing requirements

### Priority Assignment
- **P0 (Critical)**: System down, data loss, security breach
- **P1 (High)**: Major functionality broken, many users affected
- **P2 (Medium)**: Feature impaired, workaround available
- **P3 (Low)**: Minor issue, cosmetic, few users

## Recommended Actions

1. **Priority Label**: Add P0/P1/P2/P3 label
2. **Category Labels**: Add type:bug, area:frontend/backend/etc
3. **Assignment**: Suggest team member based on:
   - Code ownership
   - Expertise area
   - Current workload
   - Oncall rotation

4. **Milestone**: Suggest sprint/release

5. **Related Issues**: Link similar or related issues

6. **Technical Investigation**: Suggest:
   - Files to check
   - Logs to review
   - Tests to run
   - Debugging approach

7. **Communication**: Draft response comment for reporter

Execute gh commands to apply labels and updates.
```

## API Endpoint Generator

Generates complete API endpoint with validation, tests, and docs.

**File:** `.claude/commands/api/endpoint.md`

```markdown
---
argument-hint: [method] [path] [description]
description: Generate complete API endpoint with tests and docs
---

Generate API endpoint: $1 $2 - $3

Think about the endpoint design.

## Endpoint Structure

### Route Handler
```typescript
// routes/$2.ts
import { Router } from 'express';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { schema } from './schemas';

const router = Router();

router.$1('$2', 
  authenticate,
  validate(schema),
  async (req, res, next) => {
    try {
      // Implementation
      const result = await service.method(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### Validation Schema
```typescript
// schemas/$2.schema.ts
import { z } from 'zod';

export const schema = z.object({
  // Define request schema
});

export type RequestType = z.infer<typeof schema>;
```

### Service Layer
```typescript
// services/$2.service.ts
export class Service {
  async method(data: RequestType) {
    // Business logic
    // Database operations
    // External API calls
    return result;
  }
}
```

### Unit Tests
```typescript
// __tests__/$2.test.ts
describe('$1 $2', () => {
  it('should handle valid request', async () => {
    // Test implementation
  });

  it('should validate input', async () => {
    // Validation tests
  });

  it('should handle errors', async () => {
    // Error handling tests
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/$2.test.ts
describe('$1 $2 Integration', () => {
  it('should work end-to-end', async () => {
    // Full integration test
  });
});
```

### API Documentation
```yaml
# docs/api/$2.yaml
$2:
  $1:
    summary: $3
    description: Detailed description
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Request'
    responses:
      '200':
        description: Success
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Response'
      '400':
        description: Bad Request
      '401':
        description: Unauthorized
      '500':
        description: Server Error
```

## Implementation Checklist
- [ ] Route handler implemented
- [ ] Validation schema defined
- [ ] Service layer implemented
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Error handling complete
- [ ] Logging added
- [ ] API docs updated
- [ ] Postman collection updated
- [ ] Rate limiting configured
```

## Component Scaffolder (React + TypeScript)

Generates React component with tests, stories, and types.

**File:** `.claude/commands/react/component.md`

```markdown
---
argument-hint: [component-name]
description: Scaffold React component with tests and stories
---

Generate React component: $ARGUMENTS

## Component File
```typescript
// components/$ARGUMENTS/$ARGUMENTS.tsx
import React from 'react';
import styles from './$ARGUMENTS.module.css';

export interface ${ARGUMENTS}Props {
  // Define props
}

export const $ARGUMENTS: React.FC<${ARGUMENTS}Props> = (props) => {
  return (
    <div className={styles.container}>
      {/* Component JSX */}
    </div>
  );
};
```

## Types
```typescript
// components/$ARGUMENTS/$ARGUMENTS.types.ts
export interface ${ARGUMENTS}Props {
  // Prop types
}

export interface ${ARGUMENTS}State {
  // State types (if needed)
}
```

## Styles
```css
/* components/$ARGUMENTS/$ARGUMENTS.module.css */
.container {
  /* Base styles */
}
```

## Tests
```typescript
// components/$ARGUMENTS/$ARGUMENTS.test.tsx
import { render, screen } from '@testing-library/react';
import { $ARGUMENTS } from './$ARGUMENTS';

describe('$ARGUMENTS', () => {
  it('renders correctly', () => {
    render(<$ARGUMENTS />);
    // Assertions
  });

  it('handles user interaction', () => {
    // Interaction tests
  });
});
```

## Storybook Stories
```typescript
// components/$ARGUMENTS/$ARGUMENTS.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { $ARGUMENTS } from './$ARGUMENTS';

const meta: Meta<typeof $ARGUMENTS> = {
  title: 'Components/$ARGUMENTS',
  component: $ARGUMENTS,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof $ARGUMENTS>;

export const Default: Story = {
  args: {
    // Default props
  },
};
```

## Index Export
```typescript
// components/$ARGUMENTS/index.ts
export { $ARGUMENTS } from './$ARGUMENTS';
export type { ${ARGUMENTS}Props } from './$ARGUMENTS.types';
```

Files created in: `components/$ARGUMENTS/`
```

## Docker Compose Generator

Creates Docker setup with multi-stage builds and health checks.

**File:** `.claude/commands/docker/setup.md`

```markdown
---
allowed-tools: Bash(docker:*)
description: Generate Docker Compose setup with best practices
---

Think about Docker architecture.

Generate Docker Compose configuration.

## docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

## .dockerignore
```
node_modules
npm-debug.log
dist
.git
.env
.env.local
coverage
.vscode
```

## docker-compose.dev.yml
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: development
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

Commands to get started:
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale app=3
```
```

## Sources

Examples compiled from:
- Production Claude Code usage at various companies
- Anthropic's internal development workflows
- Community contributions from awesome-claude-code
- Real-world debugging and iteration
