# Skill Discovery Guide

When creating task files, check which skills are available in the codebase and assign them to tasks that would benefit.

## LLM-Specific Conventions

Different LLMs use different instruction files and skill directories. **Each LLM can only read skills from its own designated folder.**

| LLM | Instructions File | Skills Directory |
|-----|-------------------|------------------|
| **Claude Code** | `CLAUDE.md` | `.claude/skills/` |
| **Codex** | `AGENTS.md` | `.codex/skills/` |
| **Google Antigravity** | `AGENTS.md` | `.agent/skills/` |
| **Gemini** | `AGENTS.md` | `.gemini/skills/` |
| **Other LLMs** | `AGENTS.md` | Varies |

> **Important**: Skills in `.agent/skills/` are only readable by Google Antigravity. Claude Code cannot read them, and vice versa.

## Skill Discovery Process

1. **Check the appropriate instructions file** based on the LLM you're using:
   - Claude Code → `CLAUDE.md`
   - Codex/Antigravity/Gemini/Others → `AGENTS.md`
2. **Search the LLM's specific skill directory**:
   - `.claude/skills/` for Claude Code
   - `.codex/skills/` for Codex
   - `.agent/skills/` for Google Antigravity
   - `.gemini/skills/` for Gemini
3. **Also check common locations**:
   - `skills/` folder in root (often shared)
   - Any standalone `SKILL.md` files in the codebase

## Common Skill Locations

```bash
# Find all SKILL.md files
find . -name "SKILL.md" -type f

# Or with ripgrep
rg -l "^---" --glob "**/SKILL.md"
```

## Assigning Skills to Tasks

For each task, evaluate:

1. **Does the task involve a specialized domain?** (e.g., API design, database migrations, testing)
2. **Is there a skill that provides workflows for this domain?**
3. **Would the skill reduce ambiguity or improve quality?**

### Example Skill Mappings

| Task Type | Likely Skills |
|-----------|---------------|
| API endpoint creation | `api-design`, `openapi-spec` |
| Database schema changes | `convex-schema`, `prisma-migrations` |
| Frontend components | `react-patterns`, `component-library` |
| Testing | `tdd-workflow`, `playwright-testing` |
| Documentation | `docs-workflow-generator`, `readme-templates` |
| Code review | `code-review`, `pr-template` |

### Task File Required Skills Section

In each task file, include:

```md
## Required Skills

- [skill-name] - Brief reason why this skill helps

> If no skill is required, state: "No specific skill required for this task."
```

### Multiple Skills

If a task benefits from multiple skills, list them in order of importance:

```md
## Required Skills

- [primary-skill] - Main workflow guidance
- [secondary-skill] - Supplementary patterns
```

## Validation

Before finalizing task files:
- Ensure all referenced skills actually exist in the codebase
- Verify skill names match exactly (case-sensitive)
- Confirm the skill is appropriate for the task scope
