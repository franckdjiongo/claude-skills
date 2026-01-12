# Assets Directory

This directory is for files that will be used in command outputs, not loaded into Claude's context.

## What Goes Here

**Template Files:**
- Starter project templates
- Boilerplate code structures
- Configuration file templates

**Example:**
```
assets/
├── templates/
│   ├── basic-command.md          # Basic slash command template
│   ├── advanced-command.md       # Advanced command with all features
│   └── mcp-wrapper-command.md    # Template for wrapping MCP commands
└── examples/
    ├── workflow-command.md       # Example multi-step workflow
    └── testing-command.md        # Example testing command
```

## Usage in Slash Commands

When creating slash commands, Claude can reference these templates:

```markdown
Copy the template from assets/templates/basic-command.md and customize it.
```

## Note

This skill currently doesn't require any asset files since:
- Command templates are in references/templates.md for easy reference
- Examples are in references/examples.md for context loading
- No binary assets or large boilerplate needed

Assets would be useful if we were providing:
- Complete project scaffolding (e.g., `assets/starter-projects/`)
- Binary files like logos or icons
- Large configuration files
- Multi-file boilerplates
