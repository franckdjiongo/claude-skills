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

## Multi-Repository Skills Registry

This repository maintains a **skills registry** (`skills-registry.yaml`) that catalogs skills across multiple repositories. This allows you to discover and reference skills without duplicating them.

### Registry Structure

The registry tracks:
- **Local skills**: Skills in this repository (claude-skills)
- **External skills**: Skills in other repositories (e.g., obra/superpowers)

### Registered External Repositories

| Repository | Description |
|------------|-------------|
| [obra/superpowers](https://github.com/obra/superpowers) | Composable skills for coding agents - TDD, debugging, collaboration |
| [anthropics/skills](https://github.com/anthropics/skills) | Official Anthropic skills - documents, creative design, MCP, and enterprise workflows |

### Using the Registry

**For Claude**: When the user needs a skill, first check the registry to see if it exists locally or externally:
1. Check `skills-registry.yaml` for the skill
2. If local, use the skill directly from this repo
3. If external, inform the user which repository contains it and provide the URL

**For Humans**: Use the registry manager script:
```bash
# List all skills
python scripts/registry-manager.py list

# Search for skills
python scripts/registry-manager.py search "tdd"
python scripts/registry-manager.py search "debugging"

# Get info about a specific skill
python scripts/registry-manager.py info test-driven-development

# List by repository
python scripts/registry-manager.py list --repo superpowers

# List categories
python scripts/registry-manager.py categories

# Scan for new local skills
python scripts/registry-manager.py scan
```

### Adding External Repositories

To add a new external repository to the registry:

1. Edit `skills-registry.yaml`
2. Add the repository under the `repositories:` section
3. Add its skills under the appropriate category in `categories:`
4. Update the `skill_index:` quick reference section

### External Skills Quick Reference

**From obra/superpowers:**
- `test-driven-development` - RED-GREEN-REFACTOR cycle for TDD
- `systematic-debugging` - 4-phase root cause analysis
- `verification-before-completion` - Verify work before marking complete
- `brainstorming` - Structured brainstorming sessions
- `writing-plans` / `executing-plans` - Plan creation and execution
- `dispatching-parallel-agents` - Coordinate parallel agents
- `requesting-code-review` / `receiving-code-review` - Code review workflow
- `using-git-worktrees` - Git worktrees for parallel work
- `subagent-driven-development` - Development with coordinated subagents

**From anthropics/skills:**
- `pdf` - PDF manipulation, extraction, creation, merging, splitting
- `docx` - Word document creation, editing, tracked changes
- `pptx` - Presentation creation, editing, layouts
- `xlsx` - Spreadsheet creation, formulas, data analysis
- `algorithmic-art` - Generative art with p5.js
- `canvas-design` - Visual art creation in PNG/PDF
- `frontend-design` - Production-grade frontend interfaces
- `theme-factory` - Styling artifacts with preset themes
- `mcp-builder` - Build MCP servers for LLM tool integration
- `webapp-testing` - Test web apps with Playwright
- `web-artifacts-builder` - Multi-component HTML artifacts
- `doc-coauthoring` - Structured documentation co-authoring
- `internal-comms` - Internal communications templates

## Skills Library Web Application

The repository includes a **mobile-first web application** (`skills-app/`) for browsing and discovering skills.

### Tech Stack

- **Vite + React + TypeScript** - Fast development and production builds
- **Motion (Framer Motion)** - Spring animations and transitions
- **Lucide React** - Icon library
- **CSS Custom Properties** - Theming system

### Running the App

```bash
cd skills-app
npm install
npm run dev     # Development server
npm run build   # Production build
```

### Design System

The app uses a **Neo-Terminal / Cyberpunk** aesthetic:
- Dark theme with deep blacks (`#0a0a0f`)
- Electric accents: cyan (`#00f0ff`), magenta (`#ff00d4`), gold (`#ffd700`)
- JetBrains Mono (code) + Outfit (display) fonts
- Holographic card effects with mouse-tracking glow
- Scanline overlay and grid background

### App Structure

```
skills-app/
├── src/
│   ├── components/     # React components (Header, SkillCard, etc.)
│   ├── data/           # Skills data layer (skills.ts)
│   ├── styles/         # Global CSS and design tokens
│   └── types/          # TypeScript type definitions
├── index.html
└── package.json
```

### Adding Skills to the App

Skills data is centralized in `src/data/skills.ts`. To add new skills:

1. Add the skill object to the `skills` array
2. Update category counts if needed
3. The app will automatically pick up the changes

### Key Components

| Component | Purpose |
|-----------|---------|
| `Header` | Logo, search bar with terminal-style cursor |
| `CategoryChips` | Horizontal scrolling category filter |
| `SkillCard` | Holographic skill card with glow effects |
| `SkillGrid` | Responsive grid (1/2/3 columns) |
| `SkillDetail` | Bottom sheet (mobile) / modal (desktop) |
| `Sidebar` | Repository browser and source filtering |

## Working with Skills

When modifying skills:
- The `description` must clearly specify trigger conditions for automatic invocation
- Reference paths in SKILL.md are relative to the skill directory
- Python scripts should be self-contained or use standard library only
- Keep reference materials focused - link to external docs rather than duplicating
