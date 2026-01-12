---
name: slash-command
description: Expert generator for Claude Code custom slash commands following Anthropic best practices. Creates new slash commands or updates existing ones with proper frontmatter (allowed-tools, argument-hint, description, model), supports arguments ($ARGUMENTS, $1, $2), bash execution (!), file references (@), namespacing, and extended thinking keywords. Use when the user wants to create, update, optimize, or troubleshoot custom slash commands for Claude Code (.claude/commands/ or ~/.claude/commands/), needs help with command structure, frontmatter configuration, or wants to implement advanced features like MCP integration or multi-step workflows.
---

# Claude Code Slash Command Expert

Expert generator for creating and updating Claude Code custom slash commands following Anthropic's official best practices and documentation.

## Core Concepts

### Command Types

**Project Commands** (`.claude/commands/`)
- Stored in repository, shared with team
- Version controlled and collaborative
- Shown as "(project)" or "(project:namespace)" in /help
- Use for team workflows and project-specific automation

**Personal Commands** (`~/.claude/commands/`)
- Stored in home directory, available across all projects
- User-specific, not shared
- Shown as "(user)" or "(user:namespace)" in /help
- Use for personal productivity and cross-project workflows

### Command Structure

Every slash command is a Markdown file with optional YAML frontmatter:

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*)
argument-hint: [issue-number] [priority]
description: Brief description shown in /help
model: claude-sonnet-4-20250514
disable-model-invocation: false
---

# Command instructions here

Use $ARGUMENTS for all arguments or $1, $2, etc. for positional arguments.
Execute bash commands with ! prefix.
Reference files with @ prefix.
Trigger extended thinking with "think", "think hard", "think harder", or "ultrathink".
```

## Frontmatter Fields

### allowed-tools
List of tools the command can use. Must be specified to use bash commands.

**Format:**
```yaml
allowed-tools: Bash(command1:*), Bash(command2:subcommand:*)
```

**Examples:**
```yaml
# Git operations
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)

# Multiple tool types
allowed-tools: Bash(npm:*), Bash(git:*), View

# File system operations
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(grep:*)
```

### argument-hint
Hint shown during autocomplete to guide users on expected arguments.

**Format:**
```yaml
argument-hint: [param1] [param2] [optional-param3]
```

**Examples:**
```yaml
argument-hint: [issue-number]
argument-hint: [pr-number] [priority] [assignee]
argument-hint: add [tagId] | remove [tagId] | list
```

### description
Brief description of what the command does. Shown in /help output. If not provided, uses first line of command body.

**Best Practices:**
- Keep under 100 characters
- Be specific and action-oriented
- Include key functionality

**Examples:**
```yaml
description: Create a git commit with conventional commit format
description: Review pull request for security, performance, and style
description: Analyze code for performance bottlenecks and suggest optimizations
```

### model
Specify a particular Claude model for this command.

**Format:**
```yaml
model: claude-sonnet-4-20250514
model: claude-3-5-haiku-20241022
```

**When to Use:**
- Haiku for simple, fast operations (formatting, basic analysis)
- Sonnet for complex reasoning and code generation
- Match model to task complexity

### disable-model-invocation
Prevent Claude from automatically invoking this command via SlashCommand tool.

```yaml
disable-model-invocation: true
```

## Argument Handling

### Using $ARGUMENTS
Captures all arguments passed to the command as a single string.

**Example Command:**
```markdown
---
argument-hint: [issue-number]
description: Fix a GitHub issue
---

Please analyze and fix GitHub issue: $ARGUMENTS

Follow these steps:
1. Use `gh issue view $ARGUMENTS` to get issue details
2. Search codebase for relevant files
3. Implement necessary changes
4. Write and run tests
5. Create commit and PR
```

**Usage:**
```bash
/fix-issue 1234
/fix-issue #1234 with high priority
```

### Using Positional Arguments ($1, $2, $3, etc.)
Access specific arguments individually.

**Example Command:**
```markdown
---
argument-hint: [pr-number] [priority] [assignee]
description: Review pull request with specific parameters
---

Review PR #$1 with priority $2 and assign to $3.

Focus on:
- Security vulnerabilities
- Performance implications
- Code style consistency
```

**Usage:**
```bash
/review-pr 456 high @john
```

**When to Use Positional vs $ARGUMENTS:**
- Positional: When you need to use arguments separately in different parts of the command
- $ARGUMENTS: When you want to pass everything as one block of text

## Bash Command Execution

Execute bash commands before the slash command runs using `!` prefix. The output is included in command context.

**Requirements:**
- Must include `allowed-tools` with `Bash` tool
- Specify which bash commands to allow

**Example:**
```markdown
---
allowed-tools: Bash(git status:*), Bash(git diff:*)
description: Show current git changes
---

!git status

!git diff

Analyze the above git status and diff output. Summarize the changes and suggest next steps.
```

**Advanced Example - Multiple Commands:**
```markdown
---
allowed-tools: Bash(npm test:*), Bash(npm run:lint:*)
description: Run tests and linting
---

!npm test

!npm run lint

Review the test and lint results above. Report any failures or warnings.
```

## File References

Include file contents in commands using `@` prefix.

**Example:**
```markdown
---
description: Review code quality of specific file
---

Review the code quality of @src/auth/login.ts

Focus on:
- Security best practices
- Error handling
- Code clarity and maintainability
```

**Multiple Files:**
```markdown
Review these related files for consistency:
- @src/components/Header.tsx
- @src/components/Footer.tsx
- @src/styles/layout.css
```

## Namespacing

Organize commands in subdirectories for better organization.

**Structure:**
```
.claude/commands/
├── dev/
│   ├── code-review.md  → /code-review (project:dev)
│   └── refactor.md     → /refactor (project:dev)
├── test/
│   ├── unit.md         → /unit (project:test)
│   └── e2e.md          → /e2e (project:test)
└── deploy/
    └── staging.md      → /staging (project:deploy)
```

**Note:** Subdirectories appear in description but NOT in command name. They're for organization and context, not for execution.

## Extended Thinking

Trigger extended thinking by including keywords in your command.

**Thinking Levels:**
- `think` - Basic extended thinking (4K tokens)
- `think hard` - Deeper analysis (10K tokens)
- `think harder` - Complex reasoning (16K tokens)
- `ultrathink` - Maximum depth (32K tokens)

**Example:**
```markdown
---
description: Deep architectural analysis
---

Think hard about the best approach to implement real-time notifications.

Consider:
1. Scalability implications
2. Technology stack options (WebSockets, SSE, polling)
3. Database design
4. Security considerations
5. Cost analysis

Provide detailed recommendations with trade-offs.
```

**When to Use:**
- Architectural decisions
- Complex refactoring
- Security analysis
- System design
- Performance optimization

## Command Templates

See `references/templates.md` for complete template library including:
- Git workflows
- Code review
- Test generation
- Documentation
- Refactoring
- Performance analysis
- Security audit
- And more

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

## References

For additional guidance:
- **references/templates.md**: Complete command template library
- **references/examples.md**: Real-world command examples
- **references/mcp-integration.md**: Working with MCP servers

## Quick Reference

**Create Project Command:**
```bash
echo "Your command content" > .claude/commands/command-name.md
```

**Create Personal Command:**
```bash
echo "Your command content" > ~/.claude/commands/command-name.md
```

**Create Namespaced Command:**
```bash
mkdir -p .claude/commands/namespace
echo "Your command content" > .claude/commands/namespace/command-name.md
```

**Test Command:**
```bash
/command-name [arguments]
```

**View All Commands:**
```bash
/help
```
