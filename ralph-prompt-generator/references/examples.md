# Examples

## Example: Small Task

**User says**: "Fix all TypeScript errors in the src/ folder"

**Generated prompt**:
```
/ralph-loop "Fix all TypeScript errors in src/.

## Verification
Run: npx tsc --noEmit

## Process
1. Run tsc to identify errors
2. Fix errors one file at a time
3. Re-run tsc after each fix
4. Continue until zero errors

Output <promise>DONE</promise> when tsc --noEmit exits with code 0." --max-iterations 20 --completion-promise "DONE"
```

## Example: Large Feature

**User says**: "Build a REST API for user management with CRUD, auth, and tests"

**Generated prd.json**:
```json
{
  "featureName": "User Management API",
  "branchName": "feature/user-api",
  "description": "REST API for user CRUD with authentication",
  "userStories": [
    {
      "id": "US-001",
      "title": "User model and database schema",
      "description": "Create User model with id, email, password hash, timestamps",
      "priority": 1,
      "dependsOn": [],
      "acceptanceCriteria": [
        "User model exists with required fields",
        "Migration runs successfully",
        "Model can be imported without errors"
      ],
      "verificationCommand": "npm run db:migrate && npm run typecheck",
      "passes": false
    },
    {
      "id": "US-002",
      "title": "Create user endpoint",
      "description": "POST /users creates a new user with validation",
      "priority": 2,
      "dependsOn": ["US-001"],
      "acceptanceCriteria": [
        "POST /users creates user",
        "Validates required fields",
        "Returns 201 with user object",
        "Returns 400 on validation error"
      ],
      "verificationCommand": "npm test -- --grep 'POST /users'",
      "passes": false
    }
  ]
}
```

**Generated prompt**: [Use assets/large-feature-prompt.txt]
