# Best practices, advanced features, troubleshooting

## Best Practices

### Command Design

**DO:**
- Use clear, descriptive command names
- Include helpful argument hints
- Write concise descriptions
- Use appropriate models for task complexity
- Organize with namespacing
- Add extended thinking for complex tasks
- Specify allowed-tools when using bash
- Include step-by-step instructions
- Use examples in command body

**DON'T:**
- Create overly generic commands
- Mix multiple unrelated workflows
- Use extended thinking for simple tasks
- Allow unrestricted bash access
- Create commands for one-time tasks
- Duplicate functionality across commands

### Token Efficiency

- Keep commands focused and concise
- Use references for detailed information
- Avoid repetitive explanations
- Let extended thinking handle complexity
- Use appropriate model (Haiku for simple tasks)

### Team Collaboration

**Project Commands:**
- Document in CLAUDE.md
- Add to version control
- Include usage examples
- Coordinate naming conventions
- Review before merging

**Personal Commands:**
- Keep truly personal workflows separate
- Don't overlap with project commands
- Document for future self

### Testing Commands

Before committing:
1. Test with various argument combinations
2. Verify bash commands execute correctly
3. Check file references work
4. Confirm extended thinking triggers
5. Test error handling
6. Validate output quality

## Advanced Features

### MCP Integration

Claude Code can invoke MCP server prompts as slash commands:

**Format:** `/mcp__servername__promptname`

**Example:**
```bash
/mcp__github__create_issue "Bug: Login fails"
/mcp__jira__create_task "Implement feature X" high
```

**Note:** MCP commands are auto-discovered from connected servers.

### Multi-Step Workflows

Chain commands for complex workflows:

```markdown
---
description: Full feature development workflow
---

Complete feature development for: $ARGUMENTS

**Phase 1: Planning**
Think about the feature implementation approach.

**Phase 2: Implementation**
1. Create feature branch
2. Implement code changes
3. Add unit tests
4. Update documentation

**Phase 3: Quality Assurance**
1. Run `/project:test:unit`
2. Run `/project:test:e2e`
3. Run `/project:code-review`

**Phase 4: Deployment**
1. Create commit with `/project:commit`
2. Push changes
3. Create PR with description
```

### Conditional Logic

Use clear conditional instructions:

```markdown
---
description: Smart test runner
---

Run appropriate tests for: $ARGUMENTS

1. Check file extension
2. If *.test.ts: run `npm test $ARGUMENTS`
3. If *.spec.ts: run `npm run test:spec $ARGUMENTS`
4. If *.e2e.ts: run `npm run test:e2e $ARGUMENTS`
5. Otherwise: search for related test files and run those
```

## Troubleshooting

### Command Not Appearing in /help

**Causes:**
- Missing description in frontmatter
- File not saved with .md extension
- File in wrong directory
- Syntax error in frontmatter

**Solution:**
- Add description field to frontmatter
- Verify file is named correctly
- Check file location (.claude/commands/ or ~/.claude/commands/)
- Validate YAML syntax

### Command Not Executing Bash Commands

**Causes:**
- Missing allowed-tools in frontmatter
- Incorrect tool specification
- Missing ! prefix

**Solution:**
```yaml
allowed-tools: Bash(command:*)
```

### Arguments Not Working

**Causes:**
- Incorrect placeholder usage
- Missing argument-hint

**Solution:**
- Use $ARGUMENTS or $1, $2, etc.
- Add argument-hint to show users expected format

### Extended Thinking Not Triggering

**Causes:**
- Missing keywords in command body
- Wrong keyword spelling

**Solution:**
- Include: "think", "think hard", "think harder", or "ultrathink"
- Place keywords in natural context
