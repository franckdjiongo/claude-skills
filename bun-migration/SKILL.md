---
name: bun-migration
description: "Migrate Node.js projects to Bun 1.3.x: package manager, bunfig.toml, Jest to bun test, Bun-native APIs (bun:sqlite, Bun.serve, Bun.file, Bun.password). Use for Node to Bun migration, npm/yarn to bun, Bun compatibility questions."
---

# Bun Migration Skill

Migrate Node.js projects to Bun 1.3.x. Code snippets: [references/snippets.md](references/snippets.md). Full technical details, compatibility matrices and debugging: [references/migration-guide.md](references/migration-guide.md).

## Migration phases

Execute in order. Skip a phase only when it is explicitly not applicable.

### Phase 1: Pre-migration assessment

1. Install Bun alongside Node: `curl -fsSL https://bun.sh/install | bash`
2. Audit dependencies for compatibility (see Problematic packages)
3. Test-run with Bun: `bun run index.js` or `bun test`
4. Benchmark current Node.js performance (startup, throughput, memory)
5. Verify no blockers: incompatible native modules, Node-exclusive features, clustering requirements

### Phase 2: Package manager

| npm/Yarn | Bun |
|----------|-----|
| `npm install` | `bun install` |
| `npm install <pkg>` | `bun add <pkg>` |
| `npm install -D <pkg>` | `bun add -d <pkg>` |
| `npm uninstall <pkg>` | `bun rm <pkg>` |
| `npm run <script>` | `bun <script>` |
| `npx <pkg>` | `bunx <pkg>` |

Then commit the Bun lockfile, remove `package-lock.json` or `yarn.lock`, and use `bun install --frozen-lockfile` in CI.

### Phase 3: Configuration

Create `bunfig.toml` (`[run]`, `[test]`, `[install]`) and update `tsconfig.json` (`module: Preserve`, `moduleResolution: bundler`, `types: ["bun-types"]`). Snippets: `references/snippets.md`.

### Phase 4: Test migration (Jest to bun test)

| Jest | bun test |
|------|----------|
| `describe()`, `it()`/`test()`, `expect()`, `beforeAll/afterAll` | unchanged |
| `jest.fn()` | `mock()` from `bun:test` |
| `jest.mock()` | `mock.module()` |
| `jest.spyOn()` | `spyOn()` |

DOM testing uses Happy DOM via a `[test] preload` file. Snippets: `references/snippets.md`.

### Phase 5: Fix common issues

| Issue | Solution |
|-------|----------|
| Native module load error | Replace with Bun alternative (see Problematic packages) |
| `process.versions.node` undefined | Use `process.versions.bun \|\| process.versions.node` |
| Duplicate .env loading | Remove `dotenv` (Bun auto-loads .env) |
| Inspector/debugger | Use `bun --inspect` and debug.bun.sh |

### Phase 6: Adopt Bun-native features

Remove unnecessary dependencies:
- `cross-fetch`, `node-fetch`: global `fetch`
- `dotenv`: Bun auto-loads `.env`
- `nodemon`: `bun --watch`
- `ts-node`: Bun runs TS natively
- `bcrypt`, `argon2`: `Bun.password`
- `better-sqlite3`: `bun:sqlite`

Bundler: esbuild to `Bun.build` uses `entrypoints` (lowercase p) and `target` (not `platform`). API snippets (Bun.serve, Bun.file, Bun.password, bun:sqlite, `$` shell), GitHub Actions and Dockerfile: `references/snippets.md`.

### Phase 7: Validation

1. Re-run benchmarks, compare to the Phase 1 baseline
2. Monitor error rates in staging
3. Gradual production rollout (canary)

## Problematic packages

| Package | Issue | Alternative |
|---------|-------|-------------|
| `better-sqlite3` | ABI mismatch | `bun:sqlite` (3-6x faster) |
| `node-canvas` v2 | V8 C++ APIs | `@napi-rs/canvas` |
| `node-pty` | Missing symbol | `bun-pty` |
| `sharp` | Native issues on Alpine | Add to `trustedDependencies` |
| `bcrypt` / `argon2` | Native C++ | `Bun.password.hash()` |
| `zeromq`, `leveldown` | V8 addons | No workaround yet |

## When NOT to migrate

- Application depends on V8-specific native addons without alternatives
- Critical APM/monitoring tools do not support Bun
- Deployment environment cannot run Bun (e.g., restricted Lambda)
- Application is primarily database/IO-bound (marginal gains)

## Performance expectations

| Optimization | Expected gain |
|-------------|---------------|
| `Bun.file()` vs `fs.readFile` | ~10x faster |
| `bun:sqlite` vs better-sqlite3 | 3-6x faster |
| `bun install` vs npm | ~7x faster |
| `bun test` vs Jest | 10-30x faster |
| HTTP throughput | ~2.5x higher |
| Cold start | ~3x faster |
