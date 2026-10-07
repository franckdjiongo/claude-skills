# Registry entries (Step 3)

Edit `skills-registry.yaml` with three additions:

## 3a. Add Repository Entry

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

## 3b. Add Category Entries

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

## 3c. Update Quick Reference Index

```yaml
skill_index:
  # ... existing entries ...

  # External skills ({repo-id})
  {skill-name}: { repo: {repo-id}, category: {repo-id}-{domain} }
```
