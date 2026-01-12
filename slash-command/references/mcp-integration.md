# MCP Integration Guide

Complete guide for integrating Model Context Protocol (MCP) servers with Claude Code slash commands.

## MCP Overview

The Model Context Protocol (MCP) is an open standard that enables standardized connections between AI models and external data sources, tools, and services. Think of it as "USB-C for AI applications."

Claude Code functions as both:
- **MCP Client**: Connects to MCP servers to access their tools
- **MCP Server**: Exposes built-in tools to other applications

## MCP Slash Commands

MCP servers can expose prompts that automatically become available as slash commands in Claude Code.

### Command Format

```bash
/mcp__servername__promptname [arguments]
```

**Components:**
- `mcp__` - Prefix indicating MCP command
- `servername` - Name of the MCP server
- `promptname` - Name of the prompt exposed by the server
- `arguments` - Optional arguments the prompt accepts

### Examples

```bash
# GitHub MCP server
/mcp__github__create_issue "Bug: Login fails"
/mcp__github__list_prs
/mcp__github__pr_review 456

# Jira MCP server
/mcp__jira__create_task "Implement feature X" high
/mcp__jira__update_status PROJ-123 done

# Database MCP server
/mcp__db__query "SELECT * FROM users WHERE active = true"
/mcp__db__schema users
```

## MCP Server Configuration

### Project-Level Configuration

Create `.mcp.json` in your repository root (shared with team):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"],
      "env": {
        "SENTRY_ORG": "your-org",
        "SENTRY_PROJECT": "your-project",
        "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN}"
      }
    }
  }
}
```

### User-Level Configuration

Add to `~/.config/claude-code/settings.json` (personal servers):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/path/to/supabase-mcp-server/index.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_KEY": "${SUPABASE_KEY}"
      }
    }
  }
}
```

## Managing MCP Connections

### Using /mcp Command

View and manage MCP servers:

```bash
# List all configured servers
/mcp

# View server status and available tools
/mcp status

# Authenticate with OAuth-enabled servers
/mcp auth github

# Clear authentication tokens
/mcp clear-auth github

# Reload MCP configuration
/mcp reload
```

### Debugging MCP Issues

Launch Claude Code with MCP debug flag:

```bash
claude --mcp-debug
```

This helps identify:
- Configuration issues
- Connection problems
- Authentication failures
- Tool availability problems

## MCP Permissions

### Tool-Specific Permissions

Configure which MCP tools Claude can access:

```bash
/permissions
```

**Permission Rules:**
- ✅ `mcp__github` - Approves ALL tools from github server
- ✅ `mcp__github__get_issue` - Approves specific tool only
- ❌ `mcp__github__*` - Wildcards NOT supported

**Best Practice:** Start specific, expand as needed.

### Security Configuration

```json
{
  "permissions": {
    "allow": [
      "mcp__github__list_prs",
      "mcp__github__create_issue",
      "mcp__jira__create_task"
    ],
    "deny": [
      "mcp__github__delete_repo"
    ]
  }
}
```

## Popular MCP Servers

### Official Anthropic Servers

**GitHub** - Repository management
```bash
npm i -g @modelcontextprotocol/server-github
```

Available prompts:
- `create_issue` - Create GitHub issue
- `list_prs` - List pull requests
- `pr_review` - Review pull request
- `search_code` - Search codebase

**Puppeteer** - Browser automation
```bash
npm i -g @modelcontextprotocol/server-puppeteer
```

Available prompts:
- `navigate` - Navigate to URL
- `screenshot` - Capture screenshot
- `click` - Click element
- `fill_form` - Fill form fields

**Sentry** - Error monitoring
```bash
npm i -g @sentry/mcp-server
```

Available prompts:
- `list_issues` - List recent issues
- `get_issue` - Get issue details
- `resolve_issue` - Resolve issue

### Community Servers

**Context7** - Documentation search
```bash
npm i -g @context7/mcp-server
```

**Postgres** - Database operations
```bash
npm i -g @postgres/mcp-server
```

**Linear** - Project management
```bash
npm i -g @linear/mcp-server
```

## Creating Custom MCP Slash Commands

Wrap MCP commands in slash commands for better UX.

### Example: GitHub Issue Workflow

**File:** `.claude/commands/github/issue-workflow.md`

```markdown
---
argument-hint: [title] [labels]
description: Complete GitHub issue creation workflow
---

Create GitHub issue: "$1" with labels: $2

Steps:
1. Validate issue doesn't already exist
2. Create issue using MCP: /mcp__github__create_issue "$1"
3. Add labels: $2
4. Assign to appropriate team member based on labels
5. Link to relevant project board
6. Create branch for issue
7. Notify team in Slack

Provide issue URL and next steps.
```

### Example: Database Query with Safety

**File:** `.claude/commands/db/safe-query.md`

```markdown
---
argument-hint: [query]
description: Execute database query with safety checks
---

Think about the database query: $ARGUMENTS

## Safety Analysis
1. Detect query type (SELECT, INSERT, UPDATE, DELETE)
2. If destructive (UPDATE/DELETE without WHERE):
   - STOP and warn user
   - Show affected row count estimate
   - Require explicit confirmation
3. Check for SQL injection patterns
4. Validate table exists

## Execution
If safe, execute via MCP:
/mcp__db__query "$ARGUMENTS"

## Results
- Display results in formatted table
- Show execution time
- Show row count
- Suggest optimizations if slow
```

### Example: Multi-Service Deployment

**File:** `.claude/commands/deploy/full-stack.md`

```markdown
---
description: Deploy full-stack application across services
---

Think hard about deployment strategy.

Deploy application with coordinated rollout:

## Phase 1: Pre-Deployment
1. Run tests: `npm test`
2. Build assets: `npm run build`
3. Check Sentry for existing issues: /mcp__sentry__list_issues
4. Notify team in Slack

## Phase 2: Database
1. Backup database: /mcp__db__backup production
2. Run migrations: /mcp__db__migrate
3. Verify schema changes

## Phase 3: Backend Deployment
1. Deploy to staging
2. Run smoke tests
3. Check Sentry for new errors
4. Deploy to production with gradual rollout

## Phase 4: Frontend Deployment
1. Deploy static assets to CDN
2. Update service workers
3. Verify asset loading

## Phase 5: Verification
1. Check all health endpoints
2. Monitor error rates: /mcp__sentry__list_issues --since 5m
3. Verify user flows
4. Check performance metrics

## Phase 6: Communication
1. Update status page
2. Notify stakeholders: /mcp__slack__post "Deployment complete"
3. Document any issues

Provide deployment summary with metrics.
```

## MCP + Slash Command Patterns

### Pattern 1: Validation Wrapper

Wrap MCP commands with validation logic:

```markdown
---
description: Validated GitHub PR creation
---

Create PR with validation: $ARGUMENTS

Validation:
1. Check branch is ahead of main
2. Verify all tests pass
3. Check no merge conflicts
4. Validate CI status

If valid:
/mcp__github__create_pr "$ARGUMENTS"

If invalid:
- Report specific failures
- Suggest fixes
- Do NOT create PR
```

### Pattern 2: Multi-Step Workflow

Chain multiple MCP calls:

```markdown
---
description: Complete feature deployment workflow
---

1. Create Jira ticket: /mcp__jira__create_task
2. Create GitHub issue: /mcp__github__create_issue
3. Link issue to ticket: /mcp__jira__link_issue
4. Create feature branch: git commands
5. Setup monitoring: /mcp__sentry__create_alert
6. Notify team: /mcp__slack__post
```

### Pattern 3: Conditional Execution

Use MCP commands based on conditions:

```markdown
---
description: Smart bug reporting
---

Analyze bug and report appropriately.

If severity is critical:
- Create Sentry issue: /mcp__sentry__create_issue
- Page on-call: /mcp__pagerduty__trigger
- Post in #incidents: /mcp__slack__post

If severity is high:
- Create GitHub issue: /mcp__github__create_issue
- Post in #bugs: /mcp__slack__post

Otherwise:
- Create Jira ticket: /mcp__jira__create_task
```

## Best Practices

### Security

1. **Never commit secrets to `.mcp.json`**
   ```json
   {
     "env": {
       "API_KEY": "${API_KEY}"  // ✅ Use env variables
     }
   }
   ```

2. **Use principle of least privilege**
   ```bash
   # Approve only needed tools
   /permissions allow mcp__github__create_issue
   /permissions deny mcp__github__delete_repo
   ```

3. **Validate MCP inputs**
   ```markdown
   Validate $ARGUMENTS before passing to MCP:
   - Check for SQL injection
   - Validate format
   - Sanitize user input
   ```

### Performance

1. **Cache MCP responses when possible**
   ```markdown
   Check if data is already available before calling MCP
   ```

2. **Batch MCP operations**
   ```markdown
   Instead of 10 separate calls, use batch endpoints
   ```

3. **Use appropriate timeouts**
   ```markdown
   Set reasonable timeouts for MCP operations
   ```

### Error Handling

1. **Graceful degradation**
   ```markdown
   If MCP server unavailable:
   - Provide alternative approach
   - Don't fail entire operation
   ```

2. **Clear error messages**
   ```markdown
   If MCP call fails:
   - Explain what went wrong
   - Suggest how to fix
   - Provide manual alternative
   ```

3. **Retry logic**
   ```markdown
   For transient failures:
   - Retry with backoff
   - Limit retry attempts
   - Log failures
   ```

## Troubleshooting

### MCP Server Not Connecting

**Issue:** Server not appearing in `/mcp` list

**Solutions:**
1. Check `.mcp.json` syntax
2. Verify server is installed
3. Check environment variables
4. Run with `--mcp-debug`

### MCP Commands Not Available

**Issue:** `/mcp__server__prompt` not found

**Solutions:**
1. Verify server is connected: `/mcp status`
2. Check server exposes prompts
3. Restart Claude Code
4. Check permissions

### Authentication Issues

**Issue:** MCP commands fail with auth errors

**Solutions:**
1. Re-authenticate: `/mcp auth server-name`
2. Verify token/credentials
3. Check token expiration
4. Update credentials in env

### Performance Issues

**Issue:** MCP commands slow or timing out

**Solutions:**
1. Check network connectivity
2. Verify server is responsive
3. Reduce batch sizes
4. Add caching layer
5. Consider local MCP server

## Advanced Topics

### Custom MCP Server Development

Create your own MCP server to expose custom prompts:

```typescript
// my-mcp-server.ts
import { MCPServer } from '@modelcontextprotocol/sdk';

const server = new MCPServer({
  name: 'my-service',
  version: '1.0.0'
});

// Define a prompt
server.addPrompt('create_widget', {
  description: 'Create a new widget',
  arguments: {
    name: { type: 'string', required: true },
    color: { type: 'string', required: false }
  },
  handler: async (args) => {
    // Implementation
    return { success: true, widgetId: '123' };
  }
});

server.listen(3001);
```

### MCP Server Testing

Test MCP servers before integration:

```bash
# Test server connection
curl http://localhost:3001/health

# Test prompt
curl -X POST http://localhost:3001/prompts/create_widget \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'
```

## Resources

**Official Documentation:**
- MCP Specification: https://spec.modelcontextprotocol.io
- Claude Code MCP Guide: https://docs.anthropic.com/en/docs/claude-code/mcp

**Community:**
- Awesome MCP: https://github.com/punkpeye/awesome-mcp
- MCP Examples: https://github.com/modelcontextprotocol/servers

**Support:**
- Claude Code Issues: https://github.com/anthropics/claude-code/issues
- MCP Discord: [Link to Discord]
