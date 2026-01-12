---
name: bun-migration
description: Migrate Node.js projects to Bun runtime with comprehensive patterns for package management, testing, APIs, and configuration. Use when the user asks to migrate a project from Node.js to Bun, convert npm/yarn to bun, replace Jest with bun test, optimize a Node.js application with Bun, or asks about Bun compatibility, Bun APIs, or Bun configuration. Also triggers on questions about bun:sqlite, Bun.serve, Bun.file, Bun.password, bunfig.toml, or replacing Node-specific packages with Bun alternatives.
---

# Bun Migration Skill

Migrate Node.js projects to Bun 1.3.x runtime. For full technical details, code examples, and configuration references, see [references/migration-guide.md](references/migration-guide.md).

## Migration Phases

Execute in order. Skip phases only when explicitly not applicable.

### Phase 1: Pre-Migration Assessment

1. Install Bun alongside Node: `curl -fsSL https://bun.sh/install | bash`
2. Audit dependencies for compatibility (see Problematic Packages below)
3. Test-run with Bun: `bun run index.js` or `bun test`
4. Benchmark current Node.js performance (startup, throughput, memory)
5. Verify no blockers: incompatible native modules, Node-exclusive features, clustering requirements

### Phase 2: Package Manager Migration

| npm/Yarn | Bun |
|----------|-----|
| `npm install` | `bun install` |
| `npm install <pkg>` | `bun add <pkg>` |
| `npm install -D <pkg>` | `bun add -d <pkg>` |
| `npm uninstall <pkg>` | `bun rm <pkg>` |
| `npm run <script>` | `bun <script>` |
| `npx <pkg>` | `bunx <pkg>` |

After migration:
- Commit `bun.lockb` to git
- Remove `package-lock.json` or `yarn.lock`
- Update CI to use `bun install --frozen-lockfile`

### Phase 3: Configuration

Create `bunfig.toml` for project-specific settings:

```toml
[run]
preload = ["./env-loader.ts"]  # Scripts to run before main

[test]
root = "./tests"
preload = ["./tests/setup.ts"]
coverage = true

[install]
exact = true
```

Update `tsconfig.json` for Bun:

```json
{
  "compilerOptions": {
    "module": "Preserve",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["bun-types"]
  }
}
```

### Phase 4: Test Migration (Jest → bun test)

| Jest | bun test |
|------|----------|
| `describe()` | `describe()` ✓ |
| `it()` / `test()` | `it()` / `test()` ✓ |
| `expect()` | `expect()` ✓ |
| `beforeAll/afterAll` | ✓ |
| `jest.fn()` | `mock()` from `bun:test` |
| `jest.mock()` | `mock.module()` |
| `jest.spyOn()` | `spyOn()` |

Example mock conversion:

```typescript
// Jest
jest.mock('./db', () => ({ query: jest.fn() }));

// Bun
import { mock } from "bun:test";
mock.module('./db', () => ({ query: mock(() => []) }));
```

For DOM testing, use Happy DOM:
```toml
# bunfig.toml
[test]
preload = ["./tests/setup.ts"]
```

```typescript
// tests/setup.ts
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();
```

### Phase 5: Fix Common Issues

| Issue | Solution |
|-------|----------|
| Native module load error | Replace with Bun alternative (see Problematic Packages) |
| `process.versions.node` undefined | Use `process.versions.bun \|\| process.versions.node` |
| Duplicate .env loading | Remove `dotenv` (Bun auto-loads .env) |
| Inspector/debugger | Use `bun --inspect` and debug.bun.sh |

### Phase 6: Adopt Bun-Native Features

Remove unnecessary dependencies:
- `cross-fetch`, `node-fetch` → Bun has `fetch` globally
- `dotenv` → Bun auto-loads `.env`
- `nodemon` → `bun --watch`
- `ts-node` → Bun runs TS natively
- `bcrypt`, `argon2` → `Bun.password`
- `better-sqlite3` → `bun:sqlite`

Bundler migration (esbuild → Bun.build):
```javascript
// Before (esbuild)
await esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  platform: 'browser'
});

// After (Bun)
await Bun.build({
  entrypoints: ['src/index.tsx'],  // lowercase 'p'
  target: 'browser'                 // not 'platform'
});
```

### Phase 7: Validation

1. Re-run benchmarks, compare to Phase 1 baseline
2. Monitor error rates in staging
3. Gradual production rollout (canary deployment)

## Problematic Packages

| Package | Issue | Alternative |
|---------|-------|-------------|
| `better-sqlite3` | ABI mismatch | `bun:sqlite` (3-6× faster) |
| `node-canvas` v2 | V8 C++ APIs | `@napi-rs/canvas` |
| `node-pty` | Missing symbol | `bun-pty` |
| `sharp` | Native issues on Alpine | Add to `trustedDependencies` |
| `bcrypt` / `argon2` | Native C++ | `Bun.password.hash()` |
| `zeromq`, `leveldown` | V8 addons | No workaround yet |

## Bun API Quick Reference

### HTTP Server
```javascript
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/health") return new Response("OK");
    return new Response("Not Found", { status: 404 });
  }
});
```

### File I/O
```javascript
const file = Bun.file('input.txt');
const text = await file.text();
await Bun.write('output.txt', text);
```

### Password Hashing
```javascript
const hash = await Bun.password.hash(password);  // Argon2id default
const valid = await Bun.password.verify(password, hash);
```

### SQLite
```javascript
import { Database } from "bun:sqlite";
const db = new Database("app.db");
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)");
const rows = db.query("SELECT * FROM users").all();
```

### Shell Commands
```javascript
import { $ } from "bun";
await $`echo "Hello"`;
// Or fine-grained:
const proc = Bun.spawn({ cmd: ["git", "status"], stdout: "pipe" });
```

## CI/CD (GitHub Actions)

```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: 'latest'
- uses: actions/cache@v4
  with:
    path: ~/.bun/install/cache
    key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}
- run: bun install --frozen-lockfile
- run: bun test --coverage
- run: bun run build
```

## Dockerfile

```dockerfile
FROM oven/bun:1.3.3-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY . .
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
```

## When NOT to Migrate

- Application depends on V8-specific native addons without alternatives
- Critical APM/monitoring tools don't support Bun
- Deployment environment can't run Bun (e.g., restricted Lambda)
- Application is primarily database/IO-bound (marginal gains)

## Performance Expectations

| Optimization | Expected Gain |
|-------------|---------------|
| `Bun.file()` vs `fs.readFile` | ~10× faster |
| `bun:sqlite` vs better-sqlite3 | 3-6× faster |
| `bun install` vs npm | ~7× faster |
| `bun test` vs Jest | 10-30× faster |
| HTTP throughput | ~2.5× higher |
| Cold start | ~3× faster |

For complete code examples, compatibility matrices, and debugging guides, see [references/migration-guide.md](references/migration-guide.md).
