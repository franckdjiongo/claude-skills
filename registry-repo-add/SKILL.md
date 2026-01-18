---
name: registry-repo-add
description: >-
  Add external skill repositories to the skills registry. Use when the user wants to:
  (1) Add a new GitHub repository containing skills to the registry,
  (2) Integrate external skills from another repo like obra/superpowers,
  (3) Expand the skills catalog with third-party skill collections,
  (4) Register a new skills source without duplicating the skills locally.
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

Edit `skills-registry.yaml` with three additions:

#### 3a. Add Repository Entry

```yaml
repositories:
  # ... existing repos ...

  {repo-id}:
    url: https://github.com/{owner}/{repo}
    local_path: null
    description: {Brief description of the repository}
    is_local: false
    skills_path: {skills-path}/  # e.g., "skills/" or "" for root
```

#### 3b. Add Category Entries

```yaml
categories:
  # ... existing categories ...

  {repo-id}-{domain}:
    name: "{Repo Name}: {Domain}"
    skills:
      - name: {skill-name}
        repository: {repo-id}
        path: {skills-path}/{skill-name}/SKILL.md
        description: {Skill description}
        tags: [{relevant}, {tags}]
        external_url: https://github.com/{owner}/{repo}/tree/main/{skills-path}/{skill-name}
```

#### 3c. Update Quick Reference Index

```yaml
skill_index:
  # ... existing entries ...

  # External skills ({repo-id})
  {skill-name}: { repo: {repo-id}, category: {repo-id}-{domain} }
```

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

### Step 5: Verify the Registry

Run the registry manager to verify the addition:

```bash
python scripts/registry-manager.py repos
python scripts/registry-manager.py list --repo {repo-id}
python scripts/registry-manager.py info {skill-name}
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
6. Verify with `registry-manager.py list --repo ai-skills`

## Registry File Location

- **Registry**: `skills-registry.yaml` (root of claude-skills repo)
- **Documentation**: `CLAUDE.md` (root of claude-skills repo)
- **Manager script**: `scripts/registry-manager.py`
