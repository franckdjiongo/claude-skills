# Workflow patterns, merge strategy, advanced usage, troubleshooting

Moved out of SKILL.md. Quick start and the safety-relevant merge order stay in SKILL.md.

## Workflow Patterns

### Pattern 1: Independent Flows (Recommended)

**Use when:** Building completely separate flows with no shared components.

**Process:**
1. Create all worktrees from same base branch
2. Build flows in parallel with Claude Code
3. Merge in any order
4. Run validation after each merge

**Benefits:**
- Minimal merge conflicts
- Maximum parallelization
- Flexible merge order

### Pattern 2: Dependent Flows

**Use when:** Flows share connections, variables, or child flows.

**Process:**
1. Identify dependencies before creating worktrees
2. Create worktrees in dependency order
3. Merge foundation flows first
4. Pull latest before starting dependent flows
5. Coordinate merge timing

**Considerations:**
- Higher conflict risk
- Requires coordination
- Sequential merging recommended

### Pattern 3: Experimental Approaches

**Use when:** Testing multiple solutions to same problem.

**Process:**
1. Create worktrees for each approach
2. Implement solutions in parallel
3. Compare results
4. Cherry-pick winning approach
5. Discard unsuccessful worktrees

## Merge Strategy

### Pre-Merge Checklist

Before merging each worktree:

1. **Check status:**
   ```bash
   bash scripts/manage_worktrees.sh status
   ```

2. **Ensure clean working directory:**
   - All changes committed
   - No pending modifications

3. **Update base branch:**
   ```bash
   git checkout main
   git pull
   ```

4. **Run validation in worktree:**
   - Use custom `/validate-flow` command
   - Ensure flow builds successfully
   - Run any tests

### Merge Order

**Recommended order:**
1. Infrastructure changes (connections, environment variables)
2. Independent flows (any order)
3. Dependent flows (dependency order)

### Handling Conflicts

If merge conflicts occur:

1. Review conflict markers in files
2. Understand both changes
3. Manually resolve conflicts:
   - For connections: merge both sets
   - For solution.xml: keep newer version + merge component lists
   - For flow definitions: rare - usually independent files
4. Test resolution thoroughly
5. Complete merge: `git commit`

## Best Practices

### 1. Consistent Base Branch

Always create worktrees from same base:
```bash
git checkout main
git pull
python scripts/create_worktrees.py <flows...>
```

### 2. Regular Commits

Commit in each worktree after logical units:
- Connection configuration
- Trigger setup
- Actions implementation
- Error handling
- Testing completion

### 3. Coordination Communication

When building dependent flows:
- Document dependencies in commit messages
- Note when foundation flows are merged
- Coordinate timing across worktrees

### 4. Environment Consistency

Ensure each worktree has:
- `.env` files (copied automatically)
- Connection credentials
- API keys
- Environment URLs

### 5. Validation Cadence

After each merge:
- Export solution
- Import to test environment
- Run validation
- Fix issues before next merge

## Advanced Usage

### Custom Branch Prefixes

Use different prefixes for categorization:

```bash
# Feature flows
python scripts/create_worktrees.py flow1 flow2 --prefix feature

# Enhancement flows  
python scripts/create_worktrees.py flow1 flow2 --prefix enhance

# Bug fixes
python scripts/create_worktrees.py flow1 flow2 --prefix fix
```

### Company-Specific Workflows

For multi-company development:

```bash
# Company A flows
python scripts/create_worktrees.py \
  approval email notification \
  --prefix company-a/flow

# Company B flows
python scripts/create_worktrees.py \
  sync report audit \
  --prefix company-b/flow
```

### Automated Workflow

Create helper function in shell config:

```bash
# Add to ~/.bashrc or ~/.zshrc
pa-parallel() {
    python ~/path/to/scripts/create_worktrees.py "$@"
    echo "Worktrees created! Open new terminals and run 'claude' in each."
}

# Usage
pa-parallel flow1 flow2 flow3
```


## Troubleshooting

### "Branch already exists"
Use different branch name or delete existing:
```bash
git branch -d flow/old-name
```

### "Directory already exists"
Remove directory or use different path:
```bash
rm -rf ../my-repo-flow-name
```

### "Uncommitted changes"
Commit or stash changes before removing:
```bash
cd worktree-path
git add .
git commit -m "Save work"
```

Or force remove (loses changes):
```bash
git worktree remove path --force
```

### "Merge conflicts"
1. Review conflict markers
2. Manually resolve
3. Test resolution
4. Complete merge: `git commit`

### Stale worktree references
Clean up deleted directories:
```bash
git worktree prune
```

## Example End-to-End Workflow

**Scenario:** Build 9 Power Automate flows for two companies in one day.

```bash
# 1. Create all worktrees
cd ~/repos/power-automate-flows
python scripts/create_worktrees.py \
  company-a-approval company-a-notification company-a-report company-a-sync \
  company-b-approval company-b-notification company-b-report company-b-sync \
  shared-error-handler

# 2. Open 9 terminal tabs, navigate to each worktree, start Claude Code
# Terminal 1: cd ../power-automate-flows-company-a-approval && claude
# Terminal 2: cd ../power-automate-flows-company-a-notification && claude
# ... (repeat for all 9)

# 3. In each Claude session, use custom commands:
# - /build-flow
# - /validate-flow
# - Commit when complete

# 4. Check status before merging
bash scripts/manage_worktrees.sh status

# 5. Merge completed flows (interactive)
bash scripts/manage_worktrees.sh
# Select option 3, merge each flow one by one

# 6. After all merges, cleanup
bash scripts/manage_worktrees.sh
# Select option 5 to cleanup all worktrees

# 7. Push to remote
git push
```

**Result:** 9 flows built in parallel, properly merged, and cleaned up in a single day.

