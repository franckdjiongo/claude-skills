# Advanced Patterns and Edge Cases

## Multi-Phase Features

For very large features, break into phases with separate PRDs:

```bash
# Phase 1: Data layer
/ralph-loop "Phase 1: Implement data models per prd-phase1.json..." --max-iterations 30

# Phase 2: API layer  
/ralph-loop "Phase 2: Build API endpoints per prd-phase2.json..." --max-iterations 40

# Phase 3: Frontend
/ralph-loop "Phase 3: Create UI components per prd-phase3.json..." --max-iterations 50
```

## Error Analysis Loops

For debugging/fixing existing code:

```
/ralph-loop "Analyze and fix errors in [PATH].

## Process
1. Run [ERROR_DETECTION_COMMAND]
2. Parse error output
3. Fix each error systematically
4. Re-run detection after each fix
5. Log fixed issues in progress.txt

## State Tracking
- Update progress.txt with each error fixed
- Include error type and solution

Output <promise>CLEAN</promise> when [ERROR_DETECTION_COMMAND] shows zero errors." --max-iterations 30 --completion-promise "CLEAN"
```

## Database/Backup Analysis

For Converge backups or similar database error hunting:

```
/ralph-loop "Analyze [DATABASE/BACKUP_PATH] for errors.

## CRITICAL: Read State First
1. Read progress.txt for previous findings
2. Check what tables/files already analyzed

## Process
1. List all tables/files to analyze
2. For each, run validation/check
3. Log errors found in progress.txt with:
   - Location (table/file/line)
   - Error type
   - Severity
4. Propose fixes in progress.txt

## Completion
When all tables/files analyzed:
- Summarize total errors by type
- List recommended fixes priority order
Output <promise>ANALYSIS_COMPLETE</promise>" --max-iterations 50 --completion-promise "ANALYSIS_COMPLETE"
```

## TDD Loop Pattern

```
/ralph-loop "Implement [FEATURE] using TDD per prd.json.

## Per Story Workflow
1. Read acceptance criteria
2. Write failing tests FIRST
3. Run tests (should fail)
4. Implement minimal code to pass
5. Run tests (should pass)
6. Refactor if needed
7. Update prd.json passes: true

Output <promise>GREEN</promise> when all stories pass and all tests green." --max-iterations 60 --completion-promise "GREEN"
```

## Refactoring/Migration Loop

```
/ralph-loop "Migrate from [OLD] to [NEW] per prd.json.

## Pre-flight
1. Read prd.json for migration stories
2. Read progress.txt for completed migrations
3. Ensure tests pass before starting: [TEST_COMMAND]

## Per Story
1. Migrate component per story spec
2. Run tests after each migration
3. If tests break: fix before continuing
4. Commit: 'migrate: [component] from [old] to [new]'
5. Update prd.json passes: true

## Rollback Plan
If migration breaks >3 tests and can't fix:
1. Git revert the migration
2. Log blocker in progress.txt
3. Continue to next story

Output <promise>MIGRATED</promise> when all stories complete." --max-iterations 80 --completion-promise "MIGRATED"
```

## Overnight Batch Script

For running multiple projects overnight:

```bash
#!/bin/bash
# overnight-ralph.sh

PROJECTS=(
  "/path/to/project1:50"
  "/path/to/project2:30"
  "/path/to/project3:40"
)

for entry in "${PROJECTS[@]}"; do
  IFS=':' read -r path iterations <<< "$entry"
  echo "Starting Ralph on $path with $iterations iterations"
  cd "$path"
  claude -p "/ralph-loop 'Continue work per prd.json. Read prd.json and progress.txt first. Output <promise>COMPLETE</promise> when done.' --max-iterations $iterations --completion-promise 'COMPLETE'"
done
```

## Handling External Dependencies

When tasks depend on external services:

```
/ralph-loop "Implement [FEATURE] with external API integration.

## Read State First
1. prd.json for stories
2. progress.txt for API learnings

## API Testing
Before calling real API:
1. Check if mock available
2. Use mock for development
3. Note API quirks in progress.txt

## Rate Limiting
If API returns 429:
1. Log in progress.txt
2. Wait or use cached response
3. Continue with next task

Output <promise>INTEGRATED</promise> when all stories pass." --max-iterations 40 --completion-promise "INTEGRATED"
```

## Recovery After Auto-Compact

If you return to a session after auto-compact:

```
/ralph-loop "RECOVERY: Continue work from last state.

## Recovery Steps
1. Read prd.json - identify incomplete stories
2. Read progress.txt - understand last state
3. Run git status - check uncommitted work
4. Run git log -5 - see recent commits

## Resume
Continue from first story with passes: false.

Output <promise>COMPLETE</promise> when all done." --max-iterations 30 --completion-promise "COMPLETE"
```

## Iteration Limit Guidelines

| Task Type | Suggested Limit |
|-----------|-----------------|
| Single fix (lint, type error) | 10-15 |
| Single feature | 20-30 |
| Multi-story feature | 50-80 |
| Large refactor | 80-100 |
| Full system migration | 100+ (use phases) |

## Debugging Loop Failures

Common issues and solutions:

1. **Loop exits immediately**: Completion promise found in initial output. Make promise unique.

2. **Loop never completes**: Verification command never passes. Check command is correct.

3. **Same error repeated**: Claude not learning from failures. Add explicit "log errors to progress.txt" instruction.

4. **Runs out of iterations**: Stories too large. Split into smaller stories.

5. **Work lost after compact**: State files not being read. Ensure "Read prd.json FIRST" is prominent.
