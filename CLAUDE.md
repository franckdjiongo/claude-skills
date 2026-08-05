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
- `power-automate-worktree-manager` - Manage git worktrees for Power Automate development
- `custom-connector-generator` - Create Power Automate connectors from OpenAPI specs
- `dataverse-query-optimizer` - Optimize FetchXML and OData queries
- `dataverse-csharp-plugin-engineer` - Build, debug, harden, test, and deploy Dataverse C# plug-ins
- `governance-script-generator` - Generate PAC CLI and PowerShell governance scripts
- `power-platform-docs` - Power Platform documentation standards
- `teams-message-polisher` - Polish messages for Microsoft Teams
- `code-app-create` - Create, scaffold, and initialize a new Power Apps code app from scratch
- `code-app-connect` - Connect a Power Apps code app to data sources and implement CRUD operations
- `code-app-deploy` - Deploy a Power Apps code app, manage ALM, configure security and monitoring
- `add-dataverse` - Add Dataverse tables to a Power Apps code app with generated TypeScript models and services
- `pp-solution-sync` - Sync Power Platform solution exports from ~/Downloads into local project folders
- `secure-pa-http-trigger` - Secure a Power Automate HTTP-trigger flow with Entra ID auth and rewire every caller
- `sync-to-azure` - Syncs the current Power Apps Code App to the Fernand Gilbert Ltée Azure DevOps repository under code-apps/<app-name>/.

**Claude Code Extensibility**
- `skill-creator` - Guide for creating new skills with proper structure and patterns
- `subagent-architect` - Design and create Claude Code sub-agents
- `slash-command` - Create custom Claude Code slash commands
- `prompt-engineer` - Claude prompting best practices
- `docs-workflow-generator` - Generate PRD, task breakdown, roadmap, and documentation workflow
- `ralph-prompt-generator` - Generate auto-compact-resilient Ralph Wiggum loop prompts
- `schedule-plan-execution` - Schedule autonomous Claude Code sessions to execute implementation plans at specific times
- `screenshot-context-builder` - Rename batches of generic screenshots and embed image references in prompts
- `session-review` - Generate an honest retrospective of the current Claude Code session
- `claude-hook-creator` - Create or revise Claude Code hooks in settings.json or subagent frontmatter
- `create-subagent` - Scaffold a well-formed Claude Code subagent (.claude/agents/<name>.md)
- `meta-govern` - Master governance skill: bootstrap, audit, migrate, and evolve Claude Code project workflows
- `setup-insights` - Bootstrap the Insight Coaching System (coaching hooks, logging, quality gates) in a project
- `loop-autonomy` - Run an autonomous work loop over a backlog using subscription-included mechanisms
- `cloud-night-shift` - Orchestrate chained autonomous overnight cloud runs via claude.ai routines
- `pipeline-audit` - Reverse-engineer and grade a project's brainstorm→plan→implementation skill pipeline
- `handoff` - Compact the current conversation into a handoff document for another agent to pick up
- `adversarial-pr-review` - Run an ultracode multi-agent ADVERSARIAL review over the working diff so a change is bulletproof and "compliant" BEFORE its pull request is opened,…
- `update-dev-tools` - Autonomously update this macOS machine's local developer toolchain — Python (current stable) + its doc libraries and Node (LTS), both via mise, plus…
- `brain-capture` - Extract 0-3 candidate memories (facts/decisions/preferences/lessons/routines/ conventions worth remembering long-term) from the session that is about…
- `workstation-friction-capture` - Triage the workstation-tool frictions logged during the session that is about to end and report genuine structural defects as chips/notes to the hub (source de vérité : repo workstation, copie conforme ici)
- `brief-chantier` - Standard for autonomous-execution work plans ("plans de chantier").
- `workos` - Use when the user asks for a WorkOS docs URL, term, or dashboard field (Sign-in endpoint, initiate_login_uri, Redirect URI, `WORKOS_*` env vars), or…

**Convex Database**
- `convex-queries` - Convex query patterns and best practices
- `convex-mutations` - Convex mutation patterns and guidelines
- `convex-actions-general` - Convex actions and general patterns
- `convex-agents-files` - Convex agents file handling
- `convex-agents-rate-limiting` - Rate limiting patterns for Convex agents
- `convex-agents-debugging` - Debugging techniques for Convex agents
- `convex-agents-context` - Customize LLM context with RAG injection and cross-thread search
- `convex-agents-fundamentals` - Core setup and configuration for Convex agents
- `convex-agents-human-agents` - Human-in-the-loop integration for hybrid workflows
- `convex-agents-messages` - Message handling and UIMessages for conversation display
- `convex-agents-rag` - Retrieval-Augmented Generation patterns for knowledge bases
- `convex-agents-streaming` - Real-time response streaming for chat UIs
- `convex-agents-threads` - Conversation thread management
- `convex-agents-tools` - Tool definitions for external APIs and database operations
- `convex-agents-usage-tracking` - Token consumption tracking for billing
- `convex-agents-workflows` - Durable multi-step agent workflows
- `convex` - Umbrella skill for all Convex development patterns (routes to specific skills)
- `convex-agents` - Building AI agents with thread management, tool integration, streaming, and workflows
- `convex-best-practices` - Guidelines for production-ready Convex apps
- `convex-component-authoring` - Create and publish self-contained Convex components
- `convex-cron-jobs` - Scheduled function patterns for background tasks
- `convex-file-storage` - File upload, serving, storage, and deletion
- `convex-functions` - Writing queries, mutations, actions with validation and error handling
- `convex-http-actions` - HTTP endpoint routing, webhooks, authentication, and CORS
- `convex-migrations` - Schema migration strategies and zero-downtime patterns
- `convex-realtime` - Reactive subscriptions, optimistic updates, and paginated queries
- `convex-schema-validator` - Schema definition, typing, index configuration, and validation
- `convex-security-audit` - Deep security review for authorization and data access boundaries
- `convex-security-check` - Quick security audit checklist for Convex apps
- `convex-remote-mcp` - Build a production-ready REMOTE MCP server (Streamable HTTP) hosted INSIDE an EXISTING Convex backend — exposing your Convex functions as…

**Text & Document Processing**
- `whatsapp-formatter` - Format text for WhatsApp with proper syntax
- `text-refiner` - General text refinement
- `doc-converter` - Document format conversion
- `doc-consolidator` - Consolidate multiple documents

**Meeting & Transcript Analysis**
- `meeting-transcript-analyzer` - Analyze meeting transcripts
- `meeting-followup-extractor` - Extract action items from meetings
- `cobacam-meeting-minutes-creator` - French Canadian meeting minutes (procès-verbaux)
- `rotation-responsabilites` - Manage responsibility rotation schedules
- `prep-discussion` - Prepare discussion points with a colleague from reference files (Teams message, email, discussion list, or personal notes)
- `meeting-to-tasks` - Reconcile meeting synthesis with codebase state to produce a structured task tracking document
- `renommer-fichiers-rencontre` - Rename meeting transcription (.docx) and meeting summary (.md) files per personal naming conventions
- `lexicon-capture` - Analyze the voice-dictated prompts of the session that is about to end, spot recurring mis-transcriptions, and submit each as a candidate correction to the workstation Lexique (source de vérité : repo workstation, copie conforme ici)

**Development & DevOps**
- `vercel-expert-developer` - Vercel serverless functions
- `bun-migration` - Migrate Node.js projects to Bun
- `vite-react-ts-setup` - Vite + React + TypeScript project setup
- `firestore-mastery` - Firebase Firestore patterns
- `i18n-web-localizer` - Web internationalization
- `api-test-script-generator` - Generate API test scripts
- `github-issue-creator` - Create GitHub issues programmatically
- `avoid-feature-creep` - Prevent feature creep when building software and AI-powered products
- `supacode-cli` - Control Supacode from the terminal (worktrees, tabs, and surfaces)
- `workos-widgets` - Use when the user is implementing, embedding, or debugging a WorkOS Widget — specifically the User Management, User Profile, Admin Portal SSO…

**Specialized Workflows**
- `bpmn-creator` - Create BPMN 2.0 process diagrams
- `google-forms-builder` - Generate Google Forms via Apps Script
- `obsidian-vault-architect` - Design Obsidian vault structures
- `dtsx-workflow-analyzer` - Analyze SSIS DTSX packages
- `design-elevation` - Apply professional design thinking to documentary artifacts (presentations, plans HTML, reports, dashboards, PDFs, data viz); shipped websites and app UIs route to ship-polished-ui instead (part of `design-studio` plugin)
- `app-blueprint` - Reverse-engineer a codebase into a comprehensive Application Blueprint (EN/FR)
- `brand-forge` - Automate a full brand package (verified name, slogans, logo concepts, palette, typography) producing brand-package.md + brand-tokens.css that hand off into the design pipeline; a logo/image prompt on an existing name routes to chatgpt-image-prompt-architect (part of `design-studio` plugin)
- `seo-visibility` - Implement SEO, structured data, AI discoverability, and marketing visibility improvements
- `domain-driven-design` - Expert advisor for DDD: strategic design, tactical design, architecture, anti-patterns, and migration
- `mac-uninstall` - Completely or partially uninstall macOS applications removing all associated files
- `chatgpt-image-prompt-architect` - Turn a vague visual request into a premium, ready-to-paste ChatGPT image prompt (gpt-image-2) for logos, flyers, ads, mockups, and more, with automatic AutoMintech branding on marketing assets
- `design-forge` - UX/UI Quality Analyst and Design Brief Architect with three modes: AUDIT (analyze screenshots/video for defects and AI slop, emit a scored report with paste-ready correction prompts), TEST (actively drive a live app with computer-use tools), and BRIEF (turn a non-designer's idea into a premium design prompt); includes a brief→build→verify pipeline
- `galley` - POINTEUR — absorbé par le skill unifié `workstation` (source de vérité : repo workstation, references/galley.md) ; revue d'artefacts HTML via les outils MCP html_review_* ou la CLI `bun run review`
- `ship-polished-ui` - Single entry point for all client websites and app UIs (create or improve); runs a non-negotiable real-browser visual QA loop and posts a Verification Ledger before done; documentary artifacts route to design-elevation (part of `design-studio` plugin)

**Plugins (installable bundles)**
- `design-studio` - Plugin container bundling `brand-forge`, `ship-polished-ui`, and `design-elevation` as three skills plus a `visual-qa-inspector` agent — the complete design pipeline (branding → premium UIs → documentary artifacts) as one installable plugin for Claude Code and Codex. Sources of truth remain the standalone `~/.claude/skills/` copies until switched (see `design-studio/SWITCH.md`); `scripts/sync-design-studio.mjs` keeps the plugin mirrored to the repo skills.

**Email (Resend)**
- `resend` - Resend email platform umbrella that routes to send, inbound, agent inbox, and template sub-skills
- `resend-send-email` - Send transactional, notification, and bulk emails via the Resend API
- `resend-templates` - Create, update, publish, and manage Resend email templates via the API
- `resend-inbound` - Receive emails with Resend: inbound domains, webhooks, and content/attachment retrieval
- `resend-agent-email-inbox` - Set up a secure email inbox for an AI agent with content safety measures

## Creating New Skills

1. Create a new directory with a descriptive kebab-case name
2. Create `SKILL.md` with proper YAML frontmatter (name, description)
3. Write clear behavioral directives, step-by-step workflows, and examples
4. Add `references/` for domain-specific documentation
5. Include `templates/` for any structured output formats
6. Add helper `scripts/` if automation is needed
7. **Update BOTH data sources** (see below)

### IMPORTANT: Updating Skill Data in Two Places

When adding new skills, you MUST update TWO separate files:

1. **`skills-registry.yaml`** - The master registry for CLI/programmatic access
   - Add skill to the appropriate category under `categories:`
   - Add entry to `skill_index:` at the bottom
   - Update `last_updated` date (format: `"YYYY-MM-DD"`)

2. **`skills-app/src/data/skills.ts`** - The web app's data source
   - Add skill object to the `skills` array
   - Update `skillCount` in the matching category
   - Update `skillCount` in the 'all' category
   - Update `skillCount` in the repository entry

The registry and the app have separate data files. Updating one does NOT automatically update the other.

3. **`CLAUDE.md`** (this file) - Update the Skill Categories section to list the new skill.

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
| [vudovn/antigravity-kit](https://github.com/vudovn/antigravity-kit) | Modular AI agent skills - 40 skills covering frontend, backend, testing, security, and architecture |
| [resend](https://github.com/resend) | Email skills for AI agents - best practices, React Email templates, and Resend API integration |
| [DanielKerridge/claude-code-power-platform-skills](https://github.com/DanielKerridge/claude-code-power-platform-skills) | Power Platform skills - plan, build, deploy, and test Power Apps, Dataverse, plugins, PCF controls |
| [microsoft/power-platform-skills](https://github.com/microsoft/power-platform-skills) | Official Microsoft Power Platform plugins - Power Pages, Model Apps, and Power Apps for Claude Code and GitHub Copilot |
| [korchard333/claude-power-platform-community](https://github.com/korchard333/claude-power-platform-community) | Community Power Platform skills - agent personas, code apps, Dataverse, security, ALM, AI Builder, and 40 domain skills |

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

Use `python scripts/registry-manager.py list` or browse `skills-registry.yaml` to see all external skills. Key repositories:

| Repository | Focus |
|------------|-------|
| [obra/superpowers](https://github.com/obra/superpowers) | TDD, debugging, code review, git worktrees, planning |
| [anthropics/skills](https://github.com/anthropics/skills) | PDF/Word/Excel/PPT, generative art, MCP builder, frontend design |
| [vudovn/antigravity-kit](https://github.com/vudovn/antigravity-kit) | 40+ skills: frontend, backend, DevOps, testing, security, architecture |
| [resend](https://github.com/resend) | Email deliverability, React Email, Resend API |
| [DanielKerridge/claude-code-power-platform-skills](https://github.com/DanielKerridge/claude-code-power-platform-skills) | Power Apps, Dataverse, PCF controls, plugins, visual QA |
| [microsoft/power-platform-skills](https://github.com/microsoft/power-platform-skills) | Power Pages, Model Apps, Power Apps code apps, connectors |
| [korchard333/claude-power-platform-community](https://github.com/korchard333/claude-power-platform-community) | Agent personas, code apps, Dataverse, security, ALM, AI Builder, Power BI |

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
