# Bun migration snippets

Config, test, bundler, API, CI and Docker snippets moved out of SKILL.md.

### Configuration

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

### Test migration (Jest to bun test)

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
### Bundler

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
