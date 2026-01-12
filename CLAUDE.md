# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Claude Code Skills Library** - a curated collection of specialized skills that extend Claude Code's capabilities for specific domains and workflows. Each skill is a self-contained directory containing a `SKILL.md` file (the skill definition) plus optional reference materials, scripts, and templates.

## Skill Structure

Every skill follows this standard structure:

```
skill-name/
├── SKILL.md              # Required: Main skill definition with YAML frontmatter
├── references/           # Optional: Domain knowledge, guides, patterns
├── scripts/              # Optional: Helper scripts (Python, Bash, etc.)
├── templates/            # Optional: Template files for output generation
├── assets/               # Optional: Static resources, example files
└── README.md             # Optional: Additional documentation
```

### SKILL.md Format

All skills use YAML frontmatter followed by markdown content:

```markdown
---
name: skill-name
description: >-
  Comprehensive description of the skill's purpose and when to use it.
  Include trigger phrases like "Use when the user wants to..." for automatic invocation.
---

# Skill Title

[Detailed instructions, workflows, patterns, and examples]
```

The `description` field is critical - it determines when Claude Code should invoke the skill automatically.

## Skill Categories

**Power Platform & Microsoft**
- `power-automate-flow-builder` - Generate production-ready Power Automate flows with JSON definitions
- `power-automate-expert` - Power Automate consulting and pattern guidance
- `custom-connector-generator` - Create Power Automate connectors from OpenAPI specs
- `dataverse-query-optimizer` - Optimize FetchXML and OData queries
- `governance-script-generator` - Generate PAC CLI and PowerShell governance scripts
- `power-platform-docs` - Power Platform documentation standards

**Claude Code Extensibility**
- `skill-creator` - Guide for creating new skills with proper structure and patterns
- `subagent-architect` - Design and create Claude Code sub-agents
- `slash-command` - Create custom Claude Code slash commands
- `prompt-engineer` - Claude prompting best practices

**Text & Document Processing**
- `whatsapp-formatter` - Format text for WhatsApp with proper syntax
- `teams-message-polisher` - Polish messages for Microsoft Teams
- `text-refiner` - General text refinement
- `doc-converter` - Document format conversion
- `doc-consolidator` - Consolidate multiple documents

**Meeting & Transcript Analysis**
- `meeting-transcript-analyzer` - Analyze meeting transcripts
- `meeting-followup-extractor` - Extract action items from meetings
- `cobacam-meeting-minutes-creator` - French Canadian meeting minutes (procès-verbaux)

**Development & DevOps**
- `vercel-expert-developer` - Vercel serverless functions
- `bun-migration` - Migrate Node.js projects to Bun
- `vite-react-ts-setup` - Vite + React + TypeScript project setup
- `firestore-mastery` - Firebase Firestore patterns
- `i18n-web-localizer` - Web internationalization
- `api-test-script-generator` - Generate API test scripts
- `github-issue-creator` - Create GitHub issues programmatically

**Specialized Workflows**
- `bpmn-creator` - Create BPMN 2.0 process diagrams
- `google-forms-builder` - Generate Google Forms via Apps Script
- `obsidian-vault-architect` - Design Obsidian vault structures
- `dtsx-workflow-analyzer` - Analyze SSIS DTSX packages
- `design-elevation` - Elevate design quality through systematic questioning

## Creating New Skills

1. Create a new directory with a descriptive kebab-case name
2. Create `SKILL.md` with proper YAML frontmatter (name, description)
3. Write clear behavioral directives, step-by-step workflows, and examples
4. Add `references/` for domain-specific documentation
5. Include `templates/` for any structured output formats
6. Add helper `scripts/` if automation is needed

### Key Skill Design Principles

- **Single Responsibility**: Each skill focuses on one domain or workflow
- **Action-Oriented**: Default to action when possible, minimize clarifying questions
- **Rich Examples**: Include input/output examples for each major use case
- **Reference Integration**: Read reference files before generating complex outputs
- **Validation**: Include quality checklists where appropriate

## Working with Skills

When modifying skills:
- The `description` must clearly specify trigger conditions for automatic invocation
- Reference paths in SKILL.md are relative to the skill directory
- Python scripts should be self-contained or use standard library only
- Keep reference materials focused - link to external docs rather than duplicating
