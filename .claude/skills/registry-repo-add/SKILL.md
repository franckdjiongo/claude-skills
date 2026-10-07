---
name: registry-repo-add
description: "Add external skill repositories (e.g. a GitHub repo like obra/superpowers) to the skills registry without duplicating skills locally. Use to register a new skills source or expand the catalog with third-party collections."
---

# Registry Repo Add

Add external skill repositories to the multi-repository skills registry (`skills-registry.yaml`).

## Workflow

### Step 1: Analyze the External Repository

Fetch and analyze the repository to understand its structure:

```bash
# Use WebFetch to examine the repository
WebFetch: https://github.com/{owner}/{repo}
Prompt: "List all skill directories. Look for SKILL.md files or similar patterns. What is the skills path structure?"
```

Identify:
- **Skills path**: Where skills are located (e.g., `skills/`, root, `src/skills/`)
- **Skill list**: Names of all available skills
- **Skill format**: Whether they use SKILL.md or similar pattern

### Step 2: Categorize the Skills

Group the discovered skills into logical categories:

| Category Pattern | Example Skills |
|------------------|----------------|
| `{repo}-testing` | test-driven-development, debugging |
| `{repo}-collaboration` | code-review, brainstorming |
| `{repo}-meta` | writing-skills, using-{repo} |

Use descriptive category IDs: `{repo}-{domain}` (e.g., `superpowers-testing`).

### Step 3: Update the Registry

Edit `skills-registry.yaml` with three additions: a `repositories:` entry (`url`, `local_path: null`, `description`, `is_local: false`, `skills_path`), one `categories:` entry per `{repo-id}-{domain}` listing each skill, and `skill_index:` lines. Exact YAML shapes: [references/registry-entries.md](references/registry-entries.md).

### Step 4: Update CLAUDE.md

Add the new repository to the "Registered External Repositories" table:

```markdown
| [{owner}/{repo}](https://github.com/{owner}/{repo}) | {Description} |
```

Add a quick reference section for the new repo's skills:

```markdown
**From {owner}/{repo}:**
- `{skill-1}` - {description}
- `{skill-2}` - {description}
```

### Step 5: Update the Web Application Data Layer

Edit `skills-app/src/data/skills.ts`: add the repository to `repositories`, categories to `categories`, skills to `skills`, and optionally an accent in `getRepositoryColor`. Exact TypeScript shapes and icon list: [references/web-app-data.md](references/web-app-data.md).

### Step 6: Verify the Registry

Run the registry manager to verify the addition:

```bash
python scripts/registry-manager.py repos
python scripts/registry-manager.py list --repo {repo-id}
python scripts/registry-manager.py info {skill-name}
```

Optionally, test the web app:

```bash
cd skills-app && npm run build
```

## Example: Adding a New Repository

**User request**: "Add the repository https://github.com/example/ai-skills to the registry"

**Execution**:
1. Fetch `https://github.com/example/ai-skills` to discover skills
2. Find skills in `skills/` directory: `prompt-chaining`, `multi-agent`, `evaluation`
3. Create categories: `ai-skills-prompting`, `ai-skills-agents`
4. Add to `skills-registry.yaml`:
   - Repository entry under `repositories:`
   - Categories with skills under `categories:`
   - Index entries under `skill_index:`
5. Update CLAUDE.md with the new repo
6. Update `skills-app/src/data/skills.ts`:
   - Add repository to `repositories` array
   - Add categories to `categories` array
   - Add skills to `skills` array
7. Verify with `registry-manager.py list --repo ai-skills`
8. Build web app to validate: `cd skills-app && npm run build`

## File Locations

| File | Purpose |
|------|---------|
| `skills-registry.yaml` | Main registry (YAML) |
| `CLAUDE.md` | Documentation for Claude Code |
| `scripts/registry-manager.py` | CLI tool for registry management |
| `skills-app/src/data/skills.ts` | Web app data layer (TypeScript) |
