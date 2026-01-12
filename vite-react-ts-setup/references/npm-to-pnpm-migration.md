# npm to pnpm Migration Guide

## Detection

Signs a project uses npm instead of pnpm:
- `package-lock.json` exists
- `node_modules/` has flat structure
- No `pnpm-lock.yaml`
- Scripts use `npm run` instead of `pnpm`

## Migration Steps

### 1. Install pnpm

```bash
# Via npm (global)
npm install -g pnpm

# Or via corepack (Node 16.9+)
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. Clean Up

```bash
# Remove npm artifacts
rm -rf node_modules
rm package-lock.json
```

### 3. Import Lockfile (Optional)

If you want to preserve exact versions from the npm lockfile:

```bash
# Recreate package-lock.json temporarily
npm install

# Import to pnpm
pnpm import

# Clean up again
rm -rf node_modules package-lock.json
```

### 4. Install with pnpm

```bash
pnpm install
```

### 5. Prevent npm Usage

Add to `package.json`:

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

### 6. Create .npmrc

```ini
# .npmrc
strict-peer-dependencies=false
auto-install-peers=true
```

### 7. Update Scripts

Replace in `package.json`:
- `npm run` → `pnpm`
- `npm install` → `pnpm add`
- `npm ci` → `pnpm install --frozen-lockfile`
- `npx` → `pnpm exec` or `pnpm dlx`

### 8. Update Husky Hooks

If using Husky, update `.husky/pre-commit`:

```bash
# Old (npm)
npx lint-staged

# New (pnpm)
pnpm exec lint-staged
```

### 9. Update CI/CD

GitHub Actions example:

```yaml
# Old
- run: npm ci
- run: npm run build

# New
- uses: pnpm/action-setup@v4
  with:
    version: 9
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
- run: pnpm run build
```

### 10. Update Documentation

Replace npm commands in README:

```markdown
# Old
npm install
npm run dev

# New
pnpm install
pnpm dev
```

## Troubleshooting

### Peer Dependency Issues

If you get peer dependency errors:

```ini
# .npmrc
strict-peer-dependencies=false
auto-install-peers=true
```

### Missing Dependencies

pnpm's strict node_modules structure may expose phantom dependencies. If a package fails:

1. Check if it's missing from `dependencies`/`devDependencies`
2. Add it explicitly: `pnpm add <package>`

### Legacy Package Compatibility

For packages that require flat node_modules:

```ini
# .npmrc (last resort)
shamefully-hoist=true
```

Or hoist specific packages:

```ini
# .npmrc
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
public-hoist-pattern[]=@types/*
```

## Benefits After Migration

- 2-3x faster installs
- 50-70% disk space savings (content-addressable store)
- Stricter dependency isolation (catches phantom dependencies)
- Better monorepo support with workspaces
