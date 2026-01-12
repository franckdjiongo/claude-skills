# Husky & lint-staged

## Setup

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

## .husky/pre-commit

```bash
pnpm exec lint-staged
```

## lint-staged Configuration

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,html}": ["prettier --write"]
  }
}
```

Or create `.lintstagedrc.json`:

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,html}": ["prettier --write"]
}
```

## Optional: Type Check on Commit

For stricter checks, add type checking (slower):

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write", "bash -c 'pnpm exec tsc --noEmit'"]
  }
}
```

Note: Type checking all files on each commit can be slow. Consider running it only in CI.

## Optional: Commit Message Linting

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

Create `commitlint.config.js`:

```javascript
export default { extends: ['@commitlint/config-conventional'] }
```

Add `.husky/commit-msg`:

```bash
pnpm exec commitlint --edit "$1"
```

## Bypassing Hooks

For emergency commits:

```bash
git commit --no-verify -m "emergency fix"
```

## Troubleshooting

If hooks don't run:

```bash
# Reinstall hooks
rm -rf .husky
pnpm exec husky init
echo "pnpm exec lint-staged" > .husky/pre-commit
```
