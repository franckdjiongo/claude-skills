# Syntax reference: frontmatter fields, arguments, bash, file references, namespacing, extended thinking

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
