# Web application data layer (Step 5)

The skills library has a web application (`skills-app/`) that needs its data layer updated.

Edit `skills-app/src/data/skills.ts` with three additions:

## 5a. Add Repository to `repositories` Array

```typescript
export const repositories: Repository[] = [
  // ... existing repos ...
  {
    id: '{repo-id}',
    name: '{Repo Display Name}',
    url: 'https://github.com/{owner}/{repo}',
    description: '{Brief description}',
    isLocal: false,
    skillCount: {number-of-skills},
  },
];
```

## 5b. Add Categories to `categories` Array

```typescript
export const categories: Category[] = [
  // ... existing categories ...
  { id: '{repo-id}-{domain}', name: '{Display Name}', icon: '{LucideIcon}', skillCount: {n}, repository: '{repo-id}' },
];
```

Common Lucide icons: `Zap`, `Bot`, `Database`, `FileText`, `Users`, `Code`, `Sparkles`, `Bug`, `GitBranch`, `BookOpen`, `Files`, `Palette`, `Terminal`, `Building`

## 5c. Add Skills to `skills` Array

```typescript
export const skills: Skill[] = [
  // ... existing skills ...
  {
    id: '{skill-id}',
    name: '{Skill Display Name}',
    description: '{Skill description}',
    repository: '{repo-id}',
    category: '{repo-id}-{domain}',
    categoryName: '{Category Display Name}',
    tags: ['{tag1}', '{tag2}'],
    path: '{skills-path}/{skill-name}/SKILL.md',
    externalUrl: 'https://github.com/{owner}/{repo}/tree/main/{skills-path}/{skill-name}',
    isLocal: false,
  },
];
```

## 5d. Update `getRepositoryColor` Function (Optional)

If you want a custom accent color for the new repository:

```typescript
export const getRepositoryColor = (repo: string): string => {
  switch (repo) {
    case 'claude-skills':
      return 'var(--accent-cyan)';
    case 'superpowers':
      return 'var(--accent-magenta)';
    case 'anthropic-skills':
      return 'var(--accent-gold)';
    case '{repo-id}':
      return 'var(--accent-green)';  // or another accent
    default:
      return 'var(--accent-cyan)';
  }
};
```
