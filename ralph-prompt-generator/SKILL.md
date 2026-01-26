---
name: ralph-prompt-generator
description: Generate auto-compact-resilient Ralph Wiggum loop prompts for Claude Code. Use when the user wants to (1) create a Ralph Wiggum loop prompt for any task, (2) work on large features that will exceed context limits, (3) generate a PRD + prompt combo for complex multi-story features, or (4) ensure their Ralph loop survives auto-compact at 78% context. Triggers on "ralph", "ralph wiggum", "ralph loop", "loop until done", "autonomous loop", "keep going until complete", or requests to generate prompts that persist through context compaction.
---

# Ralph Wiggum Prompt Generator

Generate production-ready Ralph Wiggum loop prompts that survive Claude Code's auto-compact behavior.

## Quick Reference

**Small tasks** (single concern, <30 min): Generate prompt only  
**Large features** (multiple stories, hours of work): Generate PRD + prompt

## Core Principle: Auto-Compact Resilience

Claude Code auto-compacts at ~78% context. The standard Ralph Wiggum approach loses state. The solution: external state files that persist across compaction.

### State Files

1. **`prd.json`** - Tracks user stories with `passes: true/false`
2. **`progress.txt`** - Learnings and blockers from each iteration  
3. **Git history** - Commits serve as persistent memory

The prompt instructs Claude to **always read these files first** on each iteration.

## Workflow

### Step 1: Analyze the Request

Ask yourself:
- Is this a single, well-defined task? → Small task
- Does it have multiple components or stories? → Large feature
- Will it take more than ~30 minutes? → Large feature
- Could Claude lose track if context compacts mid-work? → Large feature

### Step 2: Generate Output

**For small tasks**: Generate a self-contained Ralph loop prompt.

**For large features**:
1. Generate a `prd.json` with prioritized user stories
2. Generate a `progress.txt` template
3. Generate the Ralph loop prompt that references these files

## Small Task Prompt Template

```
/ralph-loop "[TASK_DESCRIPTION]

## Context
[BRIEF_CONTEXT_ABOUT_CODEBASE_OR_PROBLEM]

## Success Criteria
- [CRITERION_1]
- [CRITERION_2]
- [CRITERION_3]

## Verification
Run: [VERIFICATION_COMMAND]

Output <promise>DONE</promise> when ALL criteria pass." --max-iterations [N] --completion-promise "DONE"
```

**Guidelines:**
- `--max-iterations`: 10-20 for small tasks, 30-50 for medium
- Always include verification command (test, lint, build, etc.)
- Success criteria must be objectively verifiable

## Large Feature: PRD Structure

Create `prd.json` in project root:

```json
{
  "featureName": "[FEATURE_NAME]",
  "branchName": "feature/[branch-name]",
  "description": "[One-line description]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "[What this story accomplishes]",
      "priority": 1,
      "dependsOn": [],
      "acceptanceCriteria": [
        "[Criterion 1]",
        "[Criterion 2]"
      ],
      "verificationCommand": "[command to verify]",
      "passes": false
    }
  ]
}
```

**Story sizing rule**: Each story must be completable within one context window. If it's too big, split it.

## Large Feature: Progress File

Create `progress.txt` in project root:

```
# Progress Log for [FEATURE_NAME]

## Codebase Patterns
[Learnings about the codebase that future iterations should know]

## Completed Stories
- [US-XXX]: [Brief note on what was done]

## Current Blockers
[Any issues preventing progress]

## Session Notes
[Timestamp] - [What was accomplished this session]
```

## Large Feature Prompt Template

```
/ralph-loop "## CRITICAL: Read State Files First

BEFORE doing anything else:
1. Read prd.json to understand the feature and find next story
2. Read progress.txt for context and learnings
3. Check git log --oneline -10 for recent work

## Your Task
Implement the next eligible user story from prd.json where:
- passes: false
- All dependsOn stories have passes: true

## Workflow Per Story
1. Create/checkout feature branch from prd.json branchName
2. Implement the story following acceptance criteria
3. Run the story's verificationCommand
4. If tests pass:
   - Update prd.json: set story's passes: true
   - Update progress.txt with learnings
   - Commit with message: '[US-XXX] Story title'
5. If tests fail:
   - Log the failure in progress.txt
   - Fix and retry

## Completion Check
After completing a story, check prd.json:
- If ALL stories have passes: true → Output <promise>COMPLETE</promise>
- If stories remain → Continue to next story

## If Stuck (after 5 attempts on same story)
1. Document the blocker in progress.txt
2. Note what was tried
3. Move to next story if possible
4. Output <promise>BLOCKED</promise> if all remaining stories are blocked

Output <promise>COMPLETE</promise> when ALL stories pass." --max-iterations [N] --completion-promise "COMPLETE"
```

**Iteration guidelines:**
- 50-100 for multi-story features
- Plan ~5-10 iterations per story
- Always set `--max-iterations` as safety net

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

**Generated prompt**: [Use large feature template above]

## Anti-Patterns to Avoid

1. **No verification command**: Always include one. No verification = loop runs forever.
2. **Vague success criteria**: "Make it work" → bad. "All tests pass" → good.
3. **Stories too large**: If story could take 30+ min, split it.
4. **Missing state files for large tasks**: Always generate PRD for multi-story work.
5. **Forgetting --max-iterations**: Always set a safety limit.

## Customization Options

When generating prompts, ask user about:
- Preferred iteration limit
- Verification commands (test framework, linter, etc.)
- Whether to include auto-commit behavior
- Specific coding standards or patterns to follow
