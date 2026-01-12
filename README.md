# Claude Code Skills Library

A curated collection of specialized skills that extend Claude Code's capabilities for specific domains and workflows.

## What are Skills?

Skills are prompt engineering configurations that transform Claude Code into a domain expert. Each skill contains:

- **SKILL.md** - The main skill definition with YAML frontmatter and detailed instructions
- **references/** - Domain-specific documentation, patterns, and guides
- **scripts/** - Helper scripts for automation (Python, Bash, etc.)
- **templates/** - Template files for structured outputs
- **assets/** - Static resources and examples

## Available Skills

### Power Platform & Microsoft
| Skill | Description |
|-------|-------------|
| `power-automate-flow-builder` | Generate production-ready Power Automate flows as JSON |
| `power-automate-expert` | Power Automate consulting and enterprise patterns |
| `custom-connector-generator` | Create connectors from OpenAPI/Swagger specs |
| `dataverse-query-optimizer` | Optimize FetchXML and OData queries |
| `governance-script-generator` | PAC CLI and PowerShell governance scripts |
| `power-platform-docs` | Documentation standards for Power Platform |

### Claude Code Extensibility
| Skill | Description |
|-------|-------------|
| `skill-creator` | Guide for creating new skills with proper structure and patterns |
| `subagent-architect` | Design and create Claude Code sub-agents |
| `slash-command` | Create custom Claude Code slash commands |
| `prompt-engineer` | Claude prompting best practices |

### Text & Document Processing
| Skill | Description |
|-------|-------------|
| `whatsapp-formatter` | Format text with WhatsApp syntax (bold, lists, emojis) |
| `teams-message-polisher` | Polish messages for Microsoft Teams |
| `text-refiner` | General text refinement and improvement |
| `doc-converter` | Convert between document formats |
| `doc-consolidator` | Merge and consolidate multiple documents |

### Meeting & Transcript Analysis
| Skill | Description |
|-------|-------------|
| `meeting-transcript-analyzer` | Analyze meeting transcripts |
| `meeting-followup-extractor` | Extract action items from meetings |
| `cobacam-meeting-minutes-creator` | French Canadian procès-verbaux |

### Development & DevOps
| Skill | Description |
|-------|-------------|
| `vercel-expert-developer` | Vercel serverless functions |
| `bun-migration` | Migrate Node.js projects to Bun |
| `vite-react-ts-setup` | Vite + React + TypeScript setup |
| `firestore-mastery` | Firebase Firestore patterns |
| `i18n-web-localizer` | Web internationalization (React, Next.js) |
| `api-test-script-generator` | Generate API test scripts |
| `github-issue-creator` | Create GitHub issues programmatically |

### Specialized Workflows
| Skill | Description |
|-------|-------------|
| `bpmn-creator` | Create BPMN 2.0 process diagrams |
| `google-forms-builder` | Generate Google Forms via Apps Script |
| `obsidian-vault-architect` | Design Obsidian vault structures |
| `dtsx-workflow-analyzer` | Analyze SSIS DTSX packages |
| `design-elevation` | Elevate design quality through questioning |
| `gpt5-prompt-architect` | GPT-5 prompt engineering patterns |

## Usage

### With Claude Code

Skills are automatically available when Claude Code is run in this repository. Claude will invoke the appropriate skill based on your request.

```bash
# Example: Format text for WhatsApp
claude "Format this message for WhatsApp: Meeting tomorrow at 10am to discuss budget"

# Example: Create a Power Automate flow
claude "Create a flow that syncs Dataverse contacts to SharePoint"

# Example: Optimize a Dataverse query
claude "Optimize this FetchXML query: <fetch>...</fetch>"
```

### Manual Skill Invocation

You can explicitly invoke a skill:

```bash
claude "Use the whatsapp-formatter skill to format: ..."
```

## Creating New Skills

1. Create a directory with a kebab-case name
2. Add `SKILL.md` with YAML frontmatter:

```markdown
---
name: my-skill
description: >-
  Description of what the skill does and when to use it.
  Include trigger phrases for automatic invocation.
---

# My Skill

[Detailed instructions, workflows, and examples]
```

3. Add supporting files as needed:
   - `references/` for domain documentation
   - `scripts/` for helper automation
   - `templates/` for output structures

## Skill Design Principles

- **Single Responsibility** - Each skill focuses on one domain
- **Action-Oriented** - Default to action, minimize questions
- **Rich Examples** - Include input/output examples
- **Reference Integration** - Read reference files before complex outputs
- **Validation** - Include quality checklists where appropriate

## License

MIT
