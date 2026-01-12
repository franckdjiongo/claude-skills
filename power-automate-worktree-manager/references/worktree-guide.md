# Git Worktree Reference for Power Automate Development

## Quick Command Reference

### Create Worktree
```bash
# Basic syntax
git worktree add <path> -b <branch-name> <base-branch>

# Example
git worktree add ../my-repo-approval-flow -b flow/approval-flow main
```

### List Worktrees
```bash
# Simple list
git worktree list

# Detailed (porcelain format for scripting)
git worktree list --porcelain
```

### Remove Worktree
```bash
# Remove worktree (must have clean working directory)
git worktree remove <path>

# Force remove (even with uncommitted changes)
git worktree remove <path> --force
```

### Prune Stale References
```bash
# Remove worktree references for deleted directories
git worktree prune
```

## Power Automate Flow Parallel Development Patterns

### Pattern 1: Independent Flows
**Use when:** Building completely separate flows with no shared components.

**Example:** Creating approval flow, notification flow, and data sync flow.

**Approach:**
- Create one worktree per flow
- Each Claude instance works independently
- Merge in any order
- Low risk of conflicts

### Pattern 2: Related Flows with Shared Dependencies
**Use when:** Building flows that share common connections, variables, or child flows.

**Example:** Multiple flows using the same SharePoint site or Dataverse table.

**Approach:**
- Create worktrees in dependency order
- Merge shared components first
- Pull latest before starting dependent flows
- Higher risk of conflicts - coordinate merging

### Pattern 3: Feature + Validation
**Use when:** Building a flow and its validation/testing flow simultaneously.

**Example:** Creating a flow and a test harness.

**Approach:**
- Create worktree for main flow
- Create second worktree for validation flow
- Merge main flow first
- Update validation flow with merged changes before completing

### Pattern 4: Iterative Enhancement
**Use when:** Making multiple experimental improvements to existing flows.

**Example:** Testing different error handling approaches or performance optimizations.

**Approach:**
- Create worktrees for each approach
- Run parallel tests
- Cherry-pick the winning solution
- Discard others

## Power Automate Flow Naming Conventions

### Branch Naming
```bash
flow/<flow-name>              # New flow
enhance/<flow-name>           # Enhancement to existing flow
fix/<flow-name>-<issue>       # Bug fix
refactor/<flow-name>          # Refactoring
test/<flow-name>              # Testing/validation flow
```

### Worktree Directory Naming
```bash
<repo-name>-<flow-name>       # Standard format
<repo-name>-<company>-<flow>  # Multi-company format
```

## Conflict Resolution Strategies

### Common Conflict Scenarios in Power Automate

**Scenario 1: Connections.json modifications**
- Multiple flows adding different connections
- Resolution: Merge both sets of connections
- Strategy: Review and keep all unique connections

**Scenario 2: Solution.xml changes**
- Version numbers, component lists
- Resolution: Accept newer version, manually merge component lists
- Strategy: Use sequential merging to minimize conflicts

**Scenario 3: Flow definition JSON**
- Different flows in same directory
- Resolution: Rare - usually independent files
- Strategy: Accept both changes

**Scenario 4: Shared variables or parameters**
- Multiple flows modifying shared environment variables
- Resolution: Consolidate into single source of truth
- Strategy: Merge early, communicate changes

### Merge Strategy for Power Automate

**Recommended Approach:**
1. Merge infrastructure changes first (connections, environment variables)
2. Merge independent flows in any order
3. Merge dependent flows in dependency order
4. Run validation after each merge

## Automation Workflow Examples

### Example 1: Create 9 Flows for Different Scenarios

```bash
# Create all worktrees at once
python scripts/create_worktrees.py \
  sharepoint-approval \
  dataverse-sync \
  email-notification \
  teams-announcement \
  scheduled-report \
  exception-handler \
  data-transformation \
  integration-webhook \
  audit-log-processor
```

### Example 2: Merge Completed Flows

```bash
# Interactive merge
bash scripts/manage_worktrees.sh

# Command-line merge
bash scripts/manage_worktrees.sh merge flow/sharepoint-approval main
```

### Example 3: Status Check Before Merge

```bash
# Check all worktrees for uncommitted changes
bash scripts/manage_worktrees.sh status
```

## Best Practices for Power Automate with Worktrees

### 1. Consistent Base Branch
Always create worktrees from the same base branch to minimize conflicts:
```bash
git checkout main
git pull
python scripts/create_worktrees.py <flows...>
```

### 2. Commit Regularly in Each Worktree
Commit after completing each logical unit:
- Connection configuration complete
- Trigger configured
- Actions implemented
- Error handling added
- Testing completed

### 3. Pull Before Merge
Before merging a worktree, ensure base branch is up to date:
```bash
git checkout main
git pull
git merge flow/my-flow
```

### 4. Sequential Validation
After each merge, validate the solution:
- Export solution
- Import to test environment
- Run validation tests
- Fix issues before next merge

### 5. Environment Files
Always copy .env files to worktrees:
- Connection strings
- API keys
- Environment URLs
- Testing credentials

### 6. Coordinate Cross-Dependencies
When flows depend on each other:
- Document dependencies in commit messages
- Merge in dependency order
- Pull latest before starting dependent work
- Communicate status across worktrees

### 7. Use Custom Slash Commands Consistently
In each Claude Code session:
- Use the same slash commands (e.g., `/build-flow`, `/validate-flow`)
- Follow the same structure
- Maintain consistent naming patterns
- Document any deviations

## Troubleshooting

### Error: "fatal: invalid reference"
**Cause:** Branch name already exists
**Solution:** Use a different branch name or delete the existing branch

### Error: "worktree already exists"
**Cause:** Directory already exists
**Solution:** Remove the directory or use a different path

### Error: "cannot remove worktrees with uncommitted changes"
**Cause:** Uncommitted changes in worktree
**Solution:** 
1. Commit or stash changes
2. Or use `--force` flag (will lose changes)

### Error: "merge conflicts"
**Cause:** Multiple changes to same files
**Solution:**
1. Review conflict markers
2. Manually resolve conflicts
3. Test resolution
4. Complete merge with `git commit`

### "Lost" Worktree
**Cause:** Directory deleted but Git still tracks it
**Solution:**
```bash
git worktree prune
```

## Integration with Claude Code

### Starting a Session
```bash
cd <worktree-path>
claude

# Or with specific task
claude --print "Build the approval flow using /build-flow command"
```

### Using Custom Commands
Each worktree maintains its own `.llm/` directory for Claude Code:
- `.llm/todo.md` - Task list
- `.llm/context.md` - Additional context
- Custom slash commands work independently in each session

### Parallel Session Management
**Recommended Setup:**
- Use terminal multiplexer (tmux/screen) or separate terminal windows
- Label each terminal with flow name
- Use consistent working directory names
- Monitor all sessions from a dashboard/script

## Performance Considerations

### Disk Space
Worktrees share the .git directory but duplicate working files:
- Minimal overhead compared to cloning
- ~10-50MB per worktree for typical Power Automate repo
- Clean up completed worktrees promptly

### Git Operations
All worktrees share the same repository:
- Fetch affects all worktrees
- Push/pull work from any worktree
- Branch operations are global

### Build/Dependency Installation
For repos with dependencies:
- Each worktree may need separate `npm install` or equivalent
- Consider symlinking node_modules if read-only
- Use script to automate dependency installation across worktrees
