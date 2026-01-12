# Node.js to Bun Migration: Complete Technical Reference Guide

**Version: Bun 1.3.x | Last Updated: December 2025**

Bun has emerged as a compelling Node.js alternative, offering 4-7× faster package installation and ~2.5× higher HTTP throughput than Node, along with native TypeScript execution without transpilation. This guide covers everything needed to evaluate, plan, and execute a migration from Node.js to Bun, including compatibility matrices, step-by-step procedures, and concrete code examples for each migration pattern.

---

## 1. Executive Summary

### Bun vs Node.js: Key Differences at a Glance

Bun is a JavaScript runtime built on WebKit's JavaScriptCore engine (Safari), whereas Node.js uses Google's V8 (Chrome). Bun consolidates multiple tools into a single binary – it is not just a runtime but also a package manager (`bun install`), test runner (`bun test`), and bundler (`Bun.build`) – eliminating the need for separate utilities like npm/Yarn, Jest, or Webpack. Node.js, by contrast, relies on a mature ecosystem of separate tools and libraries developed over more than a decade, offering rock-solid stability and a vast registry of packages.

The table below highlights some key differences between Bun and Node.js:

| Dimension | Bun (v1.3.x) | Node.js (v18+/v20+) |
|-----------|--------------|---------------------|
| JavaScript Engine | JavaScriptCore (WebKit) – Zig runtime | V8 (Chromium) – C++ runtime |
| TypeScript Support | Native (no transpilation needed) | Requires external tools (tsc, ts-node) |
| Package Manager | Built-in (`bun install`) – ~7× faster than npm | External (npm, yarn, pnpm) |
| Test Runner | Built-in (`bun test`) – Jest-compatible | External (Jest, Mocha, etc.) |
| Bundler | Built-in (`Bun.build()`) | External (esbuild, Webpack) |
| HTTP Server | `Bun.serve()` – ~160k req/s (optimized C++ HTTP server) | `http.createServer()` – ~64k req/s (need Express for routing) |
| Startup Time | ~5–20ms (very fast cold starts) | ~50–100ms (notable startup delay) |
| Memory Footprint | ~60 MB RSS (hello world) | ~30 MB RSS (hello world) |
| Ecosystem Maturity | Rapidly growing – most npm packages work, but not all yet | Very mature – virtually all use-cases covered |

Bun's design prioritizes performance and developer experience: It achieves extremely fast package installs via optimized system calls and in-memory operations (benchmarks show `bun install` can be 7× faster than npm and 17× faster than Yarn). Its built-in HTTP server and I/O primitives leverage zero-copy techniques and async optimizations to maximize throughput. By contrast, Node's strength lies in its stability and the breadth of its ecosystem – nearly any library or tool you need has a Node package, and long-term support (LTS) releases are battle-tested in production.

### When to Migrate vs. When to Delay

**Migrate to Bun when:**

- **New projects or microservices are starting fresh**, especially in TypeScript. Bun's native TS support and swift startup improve developer experience (DX).
- **Serverless or edge functions need faster cold starts and execution.** Bun often delivers ~3× faster cold starts (e.g. ~20 ms vs 60 ms for a simple function), directly benefiting latency-sensitive deployments.
- **High-throughput HTTP APIs or real-time services** would gain from Bun's performance. In benchmarks, a simple Bun HTTP service can handle 2–4× more requests/sec than the same logic on Node.
- **Developer workflows are bottlenecked by slow builds, tests, or installs.** Teams frustrated with long `npm install` times or slow Jest test runs will find Bun dramatically faster (e.g. `bun test` can run a test suite 10–30× faster than Jest in many cases, thanks to Bun's optimized runner and JIT).
- **Opportunities to use Bun-native APIs exist.** Projects that can leverage built-ins like `bun:sqlite` (for an embedded DB), `Bun.password.hash()` (for auth), or `Bun.S3` (for object storage) can simplify their stack and improve performance by dropping external packages.

**Delay or avoid migrating when:**

- **Your application depends on native addons that use V8-specific C++ APIs.** Examples include low-level libraries like `node-pty`, certain versions of `canvas` (node-canvas v2), `better-sqlite3`, or `zeromq`. These rely on Node's internals and may not function under Bun's JavaScriptCore engine. (Bun's Node-API support is extensive, but not all Node addons work yet – see Compatibility and Problematic Packages below.)
- **Critical tooling doesn't yet support Bun.** If your observability stack (APM, profilers, etc.) or other infrastructure expects Node, you may need to wait. For example, some monitoring agents or profiling tools (e.g. DataDog, New Relic instrumentation) may assume a Node runtime and not fully work on Bun.
- **Your team's operational expertise and ecosystem center on Node.js.** In large enterprise environments with heavy use of Node-specific workflows, build pipelines, and debugging tools, sticking with Node might be safer until Bun matures further. (Node's 13+ years of stability and LTS support are reassuring for regulated or mission-critical systems.)
- **The application is heavily I/O-bound or CPU-bound outside JS** (e.g. database-bound). In scenarios where Node spends most time waiting on a database or performing native computations, Bun's improvements may only yield modest gains (~5–10%). In such cases, the migration effort might not be justified immediately.
- **Deployment constraints prevent using Bun.** For example, if you must deploy to an environment that doesn't easily support Bun (such as an AWS Lambda environment without a custom runtime), you may have to wait or use Node for the time being.

In summary, Bun is an attractive choice for new and performance-critical projects where its speed and integrated tooling shine – you can expect 40–300% performance improvements in many scenarios. Node.js remains a prudent choice for maximum compatibility and proven stability, especially if you rely on niche packages or long-term support guarantees.

---

## 2. Compatibility Matrix

Bun aims for near drop-in compatibility with Node.js core APIs. It passes the majority of Node's own test suites and can run popular frameworks like Next.js, Express, and others unmodified. As of Bun v1.3, core module support is as follows:

| Node.js Core Module | Bun Support | Notes / Exceptions |
|---------------------|-------------|-------------------|
| `node:assert` | 100% | Fully compatible (all Node assert methods work) |
| `node:buffer` | 100% | Fully compatible (`Buffer` global available) |
| `node:crypto` | ⚠ Partial | Missing some rarely-used APIs (`secureHeapUsed()`, FIPS mode) |
| `node:child_process` | ⚠ Partial | Basic spawning works, but no `proc.gid` / `proc.uid`; limited IPC (no FD/handle passing) |
| `node:cluster` | ⚠ Partial | Works, but cluster load-balancing is Linux-only via `SO_REUSEPORT` |
| `node:dgram` | >90% | UDP datagram support added in Bun 1.2+ (passes most tests) |
| `node:dns` | >90% | DNS module supported (networking functions work) |
| `node:events` | 100% | Fully compatible (`EventEmitter` behaves identically) |
| `node:fs` | ~92% | Fully implemented; minor differences in some error messages. Bun also offers high-level file APIs (`Bun.file`, etc.) |
| `node:http` | Full | HTTP/HTTPS modules supported. (Note: Bun's HTTP client buffers outgoing request bodies rather than streaming by default.) |
| `node:http2` | ⚠ ~95% | HTTP/2 implemented (client & server) but missing a few options (`allowHTTP1`, `http2stream.pushStream`, etc.) |
| `node:https` | ⚠ Mostly | HTTPS works, but custom Agent usage may differ (Bun doesn't always utilize Node's Agent settings yet) |
| `node:inspector` | None | Not implemented (uses WebKit inspector protocol instead) |
| `node:net` | Full | TCP/IPC networking fully supported |
| `node:os` | 100% | Fully compatible |
| `node:path` | 100% | Fully compatible |
| `node:readline` | Full | Readline supported (e.g. for CLIs, REPLs) |
| `node:repl` | None | Not implemented (no built-in Node REPL) |
| `node:stream` | Full | Streams supported (both Node stream and Web Streams APIs) |
| `node:test` | ⚠ Partial | Experimental Node test module partially supported (Bun's own test runner is preferred) |
| `node:tls` | ⚠ Partial | Most TLS functionality works; missing legacy `createSecurePair()` |
| `node:url` | Full | Fully compatible (`URL`, `URLSearchParams` as in Node v18+) |
| `node:util` | ⚠ Partial | Missing few seldom-used methods (e.g. `util.getSystemErrorMap()`) |
| `node:v8` | ⚠ Partial | Some V8-specific APIs stubbed or use JavaScriptCore equivalents (`v8.serialize` yields JSC format, etc.) |
| `node:vm` | ⚠ Mostly | VM module works for basic use; missing `vm.measureMemory()` |
| `node:worker_threads` | ⚠ Partial | Worker threads supported but some options not implemented (`stdin`, `resourceLimits`, etc.) |
| `node:zlib` | ~98% | Full compression/decompression support (including Brotli) |

**Notes:** Aside from the modules above, most other core APIs are fully supported in Bun. Modules like `console`, `querystring`, `string_decoder`, `timers`, `util.promisify`, `punycode`, `dns`, `zlib`, etc. behave the same as in Node (Bun passes nearly all corresponding Node test cases). Bun also provides browser-like globals – e.g. `AbortController`, `File`, `URL`, `fetch`, `Headers` – which align with standard Web APIs. In a few cases, engine differences exist: for instance, `process.versions.node` is not defined in Bun (it uses `process.versions.bun` instead). Such differences are minor but can affect code that does environment sniffing (addressed later in Anti-Patterns).

**Native Addon Compatibility:** Bun implements ~95% of Node's N-API interface, meaning most native addons built via Node-API work out-of-the-box. You can `require()` precompiled `.node` binaries or compile them with `node-gyp` under Bun just as you would in Node. Native modules that rely on V8-specific APIs or NAN (older Node native abstractions) may not work yet, since Bun's JavaScriptCore engine doesn't support V8 internals. In practice, the vast majority of popular native addons (bcrypt, canvas, database drivers, etc.) either run fine or have easy alternatives in Bun. If a package works on Node but fails on Bun, it's considered a bug – the Bun team actively encourages filing issues to close such gaps.

---

## 3. Problematic npm Packages

Despite Bun's high compatibility with Node, a few npm packages are known to be problematic under Bun (usually due to native bindings or engine-specific assumptions). The table below lists some of these packages and how to deal with them:

| Package | Issue | Workaround / Alternative |
|---------|-------|-------------------------|
| `better-sqlite3` | ABI version mismatch (Node native addon) | Use built-in `bun:sqlite` (embedded SQLite, ~3–6× faster) |
| `node-canvas` v2 | Uses V8-specific C++ APIs (Canvas bindings) | Use `@napi-rs/canvas` (N-API canvas implementation) |
| `node-pty` | Missing symbol (expects Node internals) | Use `bun-pty` (community Bun port) or spawn processes directly via Bun |
| `sharp` | Native module issues on Alpine/Linux musl | Add "sharp" to "trustedDependencies" in package.json (allow Bun to build it) |
| `bcrypt` / `argon2` | Native modules (C++) – now work in Bun since v1.0.19 | Prefer Bun's built-in `Bun.password.hash()` API for hashing |
| `zeromq`, `bson-ext`, `re2` | V8 C++ addons (regex, etc.) | Not supported on Bun (no workaround yet) |
| `leveldown` / `pouchdb` | V8 C++ storage addons | Not supported on Bun (use pure-JS alternatives) |
| `@sentry/profiling-node` | Uses V8 internals for profiling | Not supported on Bun |
| `gpu.js` | Compiled against Node-specific ABI | Not currently supported on Bun |

**Additional notes:** Many problematic packages above have pure-JS or Bun-native alternatives. For example, instead of `bcrypt` or `argon2` modules, you can use `Bun.password` (see Bun API Catalog) for built-in password hashing. Instead of `better-sqlite3`, Bun's `Database` class from `bun:sqlite` offers equal functionality with higher performance. Where no equivalent exists yet (e.g. some graphics libraries), consider deferring those features or running them in a Node microservice if absolutely necessary. Packages like `ts-node`, `nodemon`, or `dotenv` are unnecessary in Bun – Bun can execute TypeScript natively, auto-reload with `--watch`, and auto-load `.env` files by default, so these tooling packages can be removed to avoid conflicts. Overall, if ~95% of your dependencies are standard or pure JS, Bun will likely run them unmodified. For the few that pose issues, use the known workarounds above or consult Bun's compatibility tracker for updates.

---

## 4. Step-by-Step Migration Guide

Migrating a Node.js project to Bun can be done incrementally. The process below is organized into seven phases, each addressing a specific aspect of the migration. Following these phases in order will help ensure a smooth transition:

### Phase 1: Pre-Migration Assessment

1. **Install Bun alongside Node:** Begin by installing Bun on your system without removing Node.js. (On macOS/Linux, a one-liner is: `curl -fsSL https://bun.sh/install | bash` which installs Bun to `~/.bun`. On Windows, use Scoop or Chocolatey as per Bun docs.) Having both runtimes available allows side-by-side testing.

2. **Audit dependencies for compatibility:** Review your `package.json` for any of the Problematic Packages listed above or other native addons. An easy way is to search your project for build clues, e.g. running:

```bash
# Check for native addons requiring compilation
grep -r "node-gyp" package.json */package.json

# List all dependencies (including transitive)
bun pm ls --all

# Look for known problematic names
# e.g., canvas, sharp, better-sqlite3, node-pty, zeromq, etc.
```

For each critical dependency, check Bun's documentation or issue tracker to confirm support status. Aim to identify any V8-specific modules upfront and find alternatives (as noted in the compatibility section).

3. **Dual-run tests in Bun:** If possible, start running your test suite or a subset of the application under Bun while still using Node in production. For example, execute `bun run index.js` or `bun test` locally to see if things work. This parallel testing can catch issues early without risking your stable Node environment. It's normal to encounter a few errors at this stage; note them for the Phase 5 fixes.

4. **Benchmark current performance:** Record baseline metrics under Node.js to later quantify Bun's impact. Measure things like startup time (how quickly a simple script or server begins), throughput (req/sec on critical endpoints), and memory usage (RSS) of your app. This will help validate the improvements after migration and ensure Bun's slightly higher base memory usage (due to bundling in more features) isn't a concern for your deployment.

5. **Checklist of blockers:** Ensure the following are addressed before proceeding:
   - [ ] No critical dependency is a known incompatible native module (or you have a replacement plan).
   - [ ] The app does not rely on Node-exclusive features like the Inspector protocol or built-in REPL (Bun has its own inspector and no REPL).
   - [ ] Tests do not depend on Node-specific scheduling quirks (e.g. exact order of microtasks vs `process.nextTick` – Bun's ordering might differ slightly).
   - [ ] If using clustering, you're not depending on cross-process socket sharing beyond what Bun supports (Bun only supports socket handoff on Linux via reuseport).

### Phase 2: Migrate Package Manager (Dependencies)

Switch from npm/Yarn/pnpm to Bun's built-in package manager. Bun's installer is a drop-in replacement that understands the npm registry and package.json just like npm does.

**Command equivalents:** Common package management commands translate as follows:

| npm / Yarn | Bun Equivalent |
|------------|----------------|
| `npm install` (or `yarn install`) | `bun install` |
| `npm install <pkg>` | `bun add <pkg>` |
| `npm install -D <pkg>` (dev dep) | `bun add -d <pkg>` |
| `npm uninstall <pkg>` | `bun rm <pkg>` |
| `npm run <script>` | `bun <script>` (or `bun run <script>`) |
| `npx <package> <args>` | `bunx <package> <args>` |
| `npm ci` | `bun install --frozen-lockfile` |

**Migration steps:**

```bash
# 1. Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# 2. Remove old lockfiles (npm, Yarn, pnpm)
rm package-lock.json yarn.lock pnpm-lock.yaml

# 3. Install dependencies with Bun (generates bun.lockb)
bun install

# 4. If certain packages require postinstall scripts (node-gyp builds, etc.), 
#    ensure they're allowed:
#    Add a "trustedDependencies" field in package.json for those package names.
```

For example, if you use packages like esbuild, sharp, or node-gyp that run install scripts, add to your package.json:

```json
{
  "trustedDependencies": ["esbuild", "sharp", "node-gyp"]
}
```

When you run `bun install`, Bun will create its own lockfile (by default a binary `bun.lockb`). The first time, Bun will also auto-convert your existing lockfile (npm's package-lock.json, Yarn's yarn.lock, etc.) into its format if present. (It leaves the original lockfile intact for safety.) Going forward, use Bun's lockfile for consistency – consider committing `bun.lockb` to version control. In CI environments, use `bun install --frozen-lockfile` (analogous to `npm ci`) to ensure the lockfile is respected and not inadvertently updated.

Bun's installer is extremely fast – often several times faster than npm – due to parallelized downloads and a more efficient engine. It installs packages into the standard `node_modules/` structure, so tools expecting that folder will still work. By default, Bun uses a npm/Yarn-style hoisted layout; if you need an isolated (pnpm-style) layout, Bun supports that via the `--isolated` or `--linker=isolated` option. Bun also intelligently skips or parallelizes certain install scripts for speed (for example, it may skip redundant steps in well-known packages) – if needed, you can force all scripts to run by setting environment variable `BUN_FEATURE_FLAG_DISABLE_IGNORE_SCRIPTS=1`, but this is rarely required.

### Phase 3: Update Project Scripts

Convert your package.json scripts and developer workflows to use Bun instead of Node.js or third-party tools:

**Use `bun` in place of `node`:** Any scripts that directly invoke `node` (or `ts-node`) should be changed to use Bun. For example:

Before (package.json):
```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc && webpack --mode production",
    "test": "jest",
    "start": "node dist/index.js"
  }
}
```

After (package.json):
```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build ./src/index.ts --outdir=dist --minify",
    "test": "bun test",
    "start": "bun dist/index.js"
  }
}
```

In the example above, `nodemon` and the separate `tsc && webpack` build step are eliminated – Bun's `--watch` flag handles auto-reloading the server on changes (replacing nodemon), and Bun's bundler can handle production builds. Bun can directly execute TypeScript and JSX files, so running `bun src/index.ts` just works (the `--watch` flag makes it restart on file changes). If you had a script like `"start": "ts-node src/index.ts"`, simply replace it with `"start": "bun src/index.ts"` – no separate TS compiler needed.

**Leverage `bun run` for package scripts and CLIs:** Bun will look at your package.json scripts first when you run `bun <name>`. For example, `bun dev` will execute the "dev" script if defined. If no script matches, Bun will try to run an executable (like how npx works). This means many npm script conventions work out-of-the-box. Also, global CLI tools can often be replaced by `bunx`: for instance, use `bunx create-react-app` instead of `npx create-react-app`. In package scripts, you can call local binaries directly; e.g., `"lint": "eslint src/"` can be run with `bun run lint` and Bun will resolve eslint from your devDependencies automatically.

**Remove unneeded dev dependencies:** Tools like nodemon, ts-node, rimraf (for cross-platform RM), dotenv-cli, etc., are not needed with Bun:

- Bun's `--watch` flag covers nodemon's use-case (and even supports hot reload via `--hot`).
- Bun executes TypeScript, so ts-node is unnecessary.
- Bun's built-in `Bun.write`, `fs.rm`, etc., work consistently across OSes, so utilities like rimraf can be dropped.
- Bun automatically loads a `.env` file at startup, so explicit dotenv calls can be removed to avoid double-loading variables.

**Use Bun's bundler for builds:** If your build script used Webpack, Rollup, or esbuild, consider switching to `bun build` (see Phase 5 below). This can simplify your toolchain by using Bun's integrated bundler that understands your code natively.

**Adjust debugging workflows:** If you had scripts like `"inspect": "node --inspect index.js"`, you will use Bun's inspector differently (see Performance & Debugging section). Bun can run with `bun --inspect` but note that it uses a WebKit-based inspector, not Chrome DevTools directly. We'll set up VSCode debugging in the Configuration section.

After updating scripts, run `bun install` once more to ensure Bun has linked any binaries (it will create symlinks in `node_modules/.bin` like npm does). You can now try starting your app with `bun run dev` or `bun start` and see it come up using Bun.

### Phase 4: Test Migration (Jest → bun:test)

Bun comes with a high-performance test runner that is largely compatible with Jest's syntax and features. Transitioning your tests involves minimal changes:

**Switch the test script:** In package.json, change `"test": "jest"` (or mocha) to `"test": "bun test"`. Running `bun test` will discover and execute test files (it looks for `*.test.[jt]s` and similar by default).

**Most tests work unmodified.** Bun's test runner supports Jest's global functions like `describe`, `it` / `test`, `expect`, and even intercepts imports of `@jest/globals` to use Bun's own implementations. Assertions and basic mocking (`jest.fn()`, etc.) are compatible. You might already find that `bun test` just runs your existing tests successfully.

**Minor syntax changes (optional):** If you directly imported from `@jest/globals`, you can switch to Bun's test module. For example:

```javascript
// Before (Jest):
import { test, expect } from '@jest/globals';

// After (Bun):
import { test, expect, describe, mock } from 'bun:test';
```

This import change isn't strictly required – Bun will run tests without it – but using `bun:test` gives you access to Bun's additional test features (like the mock functions) and ensures types come from Bun.

**Mocking differences:** Bun provides a built-in mock API to replace Jest's module mocking. For instance:

```javascript
// Jest style
jest.mock('./myModule', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'mocked' }))
}));

// Bun style
mock.module('./myModule', () => ({
  fetchData: mock(() => Promise.resolve({ data: 'mocked' }))
}));
```

Simple usage of `jest.mock` for static replacements may work as-is, but advanced Jest mocking functions (like `jest.spyOn` or automatic mocks) might not exist. Bun's mock utilities cover common needs, but you may need to adjust complex tests.

**DOM testing:** If your tests rely on JSDOM (e.g. React component tests), Bun's runner doesn't include a full DOM by default. A recommended solution is to use Happy DOM (an efficient DOM implementation). Install it as a dev dep: `bun add -d @happy-dom/global-registrator`. Then, in a test setup file (e.g. `tests/setup.ts`):

```javascript
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();
```

Add this setup file to Bun's test config. In `bunfig.toml`:

```toml
[test]
preload = ["./tests/setup.ts"]
```

This will register a global DOM implementation before your tests run, similar to JSDOM. (Happy DOM is API-compatible with JSDOM for most usages.)

**TypeScript test support:** If your tests are written in TS, Bun handles them out-of-the-box. You might want to add type definitions for the test globals to avoid TypeScript compiler complaints. Bun provides these via `bun-types`. One approach is adding a reference at the top of your global test setup:

```typescript
/// <reference types="bun-types/test" />
```

Alternatively, include `"types": ["bun-types"]` in your tsconfig (as shown in the Configuration section). This ensures `describe`, `it`, etc., are recognized by TypeScript.

**Jest features not yet in Bun:** A few Jest features may not be fully supported. For example, some matcher extensions like `expect(...).toHaveReturned()` might be missing, and Jest's snapshot testing is supported but without interactive CLI updates. If you use snapshot testing, you can run `bun test --update-snapshots` to update them (similar to Jest). Bun stores snapshots in a `__snapshots__` directory by default. Also note, manual mocks (using mocks folders) are not auto-resolved by Bun's test runner in the current version. You may need to import mocks manually or use Bun's `mock.module` as shown.

In general, if your test suite is mostly standard Jest tests (using describe/it and expect), they should run under Bun with little to no changes. After migrating, run `bun test` and ensure all tests pass. If some fail due to differences in timers, mocks, or environment, adjust them accordingly or consult Bun's documentation for testing. You can also still run Mocha or other test frameworks on Bun via `bunx` (for example `bunx mocha`), but using Bun's own runner is recommended for best performance and integration.

### Phase 5: Fix Common Issues

At this stage, try launching your application with Bun (`bun run start`) and see if it starts, and run your full test suite with `bun test`. It's common to hit a few errors on first run. Below are some common migration issues and how to solve them:

**Native module load errors:** If Bun crashes on a `require('something')` of a `.node` binary, it means a native addon failed to load. The error might say a module was compiled against a different Node version or similar. Identify the module from the stack trace and apply the earlier suggestions (e.g. replace bcrypt with a pure JS alternative or Bun's API, switch sqlite3 to `bun:sqlite`, etc.). After swapping out an incompatible package for a supported one, run `bun install` again to update dependencies, then retry. For example, replacing `bcrypt` with `bcryptjs` (which shares the same API) allows you to keep your code unchanged aside from the import line, since bcryptjs exports the same interface.

**Environment detection quirks:** Many Node packages do environment sniffing. For instance:

```javascript
if (process.versions.node) {
  // Node-specific logic
}
```

In Bun, `process.versions.node` is undefined (Bun uses `process.versions.bun` instead). Code like the above will assume it's not running in Node (which is true) and might skip needed logic. Fix: Adjust such checks to include Bun, or use feature detection instead. For example:

```javascript
if (process.versions.bun || process.versions.node) { ... }
```

Or better, check for the feature you need (e.g. `if (typeof Bun !== 'undefined')` for a Bun-specific global). If the problematic check is in a third-party dependency, you can sometimes shim it by defining `process.versions.node` to some dummy value at startup – but use this hack sparingly. The ideal solution is to update the logic to not be Node-specific.

**Duplicate `.env` loading:** Bun automatically loads a `.env` file on startup into `process.env`. If your code also uses `dotenv.config()`, you might end up loading environment variables twice or in a different order. Typically this is harmless, but it could overwrite variables. Solution: Remove explicit dotenv usage when running under Bun. You likely no longer need dotenv in your dependencies. If you require more control (e.g. you don't want Bun to auto-load), there is an env var to disable Bun's auto .env, but simplest is to just remove the redundant call.

**File path differences (Windows):** If your app runs on Windows, test it with Bun on Windows as well. Bun aims for full Windows support, but it's newer and there may be path normalization differences (e.g. how backslashes are handled). Use Node's path utilities (`path.join`, etc.) instead of manual string concatenation for paths to avoid any path separator issues. Overall, Windows support in Bun 1.x is improving quickly, but not as battle-tested as Linux/macOS, so be sure to run your test suite on Windows if it's a target.

**Debugging & Inspector adjustments:** If you were using Node's `--inspect` flag and connecting a debugger (Chrome DevTools or VSCode), note that Bun uses a different inspector protocol (WebKit's). The good news: Bun can still be debugged – you run `bun --inspect` and then open the URL it prints (using the DevTools UI at debug.bun.sh). We cover details in the Performance & Debugging section. For now, be aware that attaching a debugger requires a different approach; you might rely on console logs in the interim for debugging during migration, or set up the VSCode config for Bun's inspector as shown later.

**Lockfile and module resolution issues:** After migrating, commit your Bun lockfile (`bun.lockb`) to git, just as you would commit a package-lock or yarn.lock. Remove or ignore the old lockfiles to avoid confusion. In CI, update your pipelines to use `bun install`. If you use a monorepo or any tools that read package-lock.json, make sure they can handle the new setup (or consider generating a text lockfile with `bun install --save-lockfile` if absolutely needed for diffability – Bun can output a yarn.lock format for comparison if you run with certain flags). In most cases, sticking with bun.lockb is fine; treat it as the source of truth for dependencies.

Most migrations report only a handful of quick fixes like the above before everything "just works." If you run into a more obscure error, it's likely a known issue being tracked in Bun's GitHub issues (Bun's compatibility is evolving rapidly). Searching the error message in the Bun repository or forums can often yield a workaround or an upcoming fix.

### Phase 6: Opt-In to Bun Features & Optimize

Once your application is running correctly on Bun, you can start cleaning up Node-specific cruft and taking advantage of Bun's unique features for better performance and simplicity:

**Remove unnecessary dependencies:** Revisit your package.json and prune tools that Bun makes redundant. Common examples include:

- **Polyfills and shims:** Packages like `cross-fetch` (or `node-fetch` prior to Node 18) are not needed – Bun provides `fetch` globally. Similarly, `abort-controller` or `form-data` packages can be dropped since Bun has those Web APIs built-in.
- **Build tooling:** If you were using a complex build process (webpack, Babel, etc.) primarily to bundle or transpile for Node, you might simplify or remove it. Bun can often run your source code directly (including JSX/TS), and for production builds the `Bun.build()` bundler can replace tools like esbuild or Rollup. For example, a custom webpack config for bundling a frontend app could be replaced with a one-liner `bun build` command (as in the scripts above).
- **Dev utilities:** As mentioned, things like `nodemon`, `ts-node`, `concurrently`, etc., that were there to aid Node development can be removed in favor of Bun's native capabilities.

**Use Bun's bundler for production builds:** If your project involves bundling (front-end assets or serverless function bundling), consider switching to Bun's built-in bundler. It's powered by Bun's JavaScriptCore engine and integrated TypeScript support. For instance, if you previously had:

```
"build": "tsc && esbuild src/index.tsx --bundle --outfile=dist/index.js --platform=node"
```

you could replace it with:

```
"build": "bun build src/index.tsx --outdir=dist --target=node --minify"
```

Bun's bundler uses a similar API to esbuild but with slight differences in options. Key syntax differences include:

- `entryPoints` becomes `entrypoints` (lowercase "p") in the JS API.
- `platform` becomes `target` (e.g. target can be "browser", "node", etc.).
- The `--bundle` flag is implicit (Bun always bundles in `Bun.build`).
- Externalizing dependencies uses space-separated arguments (e.g. `--external react` instead of `--external:react`).

**Example (esbuild → Bun.build):**

```javascript
// Before (using esbuild directly or via CLI)
await esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outdir: 'dist',
  minify: true,
  platform: 'browser',
});

// After (using Bun.build)
await Bun.build({
  entrypoints: ['src/index.tsx'], // (note the lowercase 'p')
  outdir: 'dist',
  minify: true,
  target: 'browser', // (instead of platform)
});
```

By using Bun's bundler, you avoid needing separate bundler binaries and you benefit from Bun's fast JS engine for the build process. `Bun.build` can handle JSX, CSS imports, etc., similar to esbuild. (As of Bun v1.3, it's quite capable for many bundling tasks, though not as extensively configurable as Webpack.)

**Integrate Bun into CI/CD:** Using Bun in your CI pipelines can speed up installation and testing steps significantly. For example, on GitHub Actions you can use the official Setup Bun action instead of Setup Node:

```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: 'latest'
- run: bun install --frozen-lockfile
- run: bun test --coverage
- run: bun run build
```

The `oven-sh/setup-bun` action installs Bun on the runner. We also added an actions/cache step (see example below) to cache Bun's package cache between runs, improving repeat build times. Bun's test runner will automatically output test results in a format that GitHub can parse for annotations (failing tests will show up in the PR interface). If using GitLab CI or others, you can similarly install Bun (e.g. use the official Docker image `oven/bun:latest` as the base of your CI job, which comes with Bun pre-installed).

**Deploy with Bun's Docker image:** If your deployment uses Docker containers, consider basing images on the official `oven/bun` image. For example:

```dockerfile
# Use official Bun (Alpine) base image
FROM oven/bun:1.3.3-alpine
WORKDIR /app

# Install dependencies in a separate stage for caching
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

EXPOSE 3000
CMD ["bun", "run", "start"]
```

The above multi-stage Dockerfile copies dependencies and installs them in one layer, then copies the rest of the code. The image uses the lightweight Alpine-based Bun runtime. Using Bun's image ensures you have the correct Bun version and a slim base (the image is smaller than a full Node image with similar tools). In general, treat Bun just like Node in your Docker strategy – you can even multi-stage between Node and Bun if needed (e.g. build with Node, run with Bun), but usually sticking to Bun throughout is simpler.

**Gradual rollout & monitoring:** It's wise to do a phased rollout of the Bun version of your app. For example, deploy it to a staging environment or a small percentage of production traffic (canary) while keeping the Node version running in parallel. Monitor key metrics: error rates, response times, memory usage. Bun's logging and error reporting will be similar to Node's (stack traces, etc., appear in console). If an issue arises, you can quickly flip traffic back to Node while investigating. Having feature flags or config toggles to switch the runtime can be helpful during this transition period.

By the end of Phase 6, your app is fully using Bun in all environments, and you've eliminated unnecessary Node-specific dependencies and configurations. The final phase is to validate that everything in production meets expectations.

### Phase 7: Post-Migration Validation

In production (or a staging environment that closely resembles it), verify that the app under Bun meets or exceeds the benchmarks and stability of the Node version:

**Performance benchmarking:** Re-run the same benchmarks you did in Phase 1, now on Bun. You should see noticeably faster startup and request handling. For example, if a particular Node.js service handled ~40k req/sec, Bun might handle ~100k+ req/sec with the same hardware. If Node took 60 ms to initialize a script, Bun might do it in ~20 ms. Also observe memory usage: Bun's processes often use a bit more memory than Node's (due to Bun's internal structures and eager loading of some Web APIs). A simple "Hello World" HTTP server might be ~60 MB RSS on Bun vs ~30 MB on Node – this overhead is usually acceptable given typical server memory, but it's good to confirm it's not an issue for you.

**Stability & error monitoring:** Track application logs and any error reporting systems (Sentry, etc.). Bun should throw errors in a similar way to Node (with error names and stack traces). One difference: Bun may have fewer built-in runtime warnings – for instance, Node prints warnings for unhandled promise rejections or deprecated APIs, whereas Bun might not, or might do so differently. Ensure that critical code (like uncaught exceptions, rejection handling) behaves as expected. If you use process managers like PM2 or Docker to keep the app running, Bun processes work fine with those (they exit with non-zero codes on crashes, etc., just like Node).

**Memory and CPU profiling:** If you suspect any memory leaks or performance issues under load, Bun provides tools to dig deeper (discussed in the next section). You can trigger garbage collection manually via `Bun.gc(true)` in a pinch (useful for testing if memory is freed), or generate heap snapshots to analyze memory usage over time. For CPU issues, you can run Bun with `--cpu-prof` to get a profile for analysis in Chrome DevTools. Typically, however, if your app ran fine on Node, it will run fine on Bun – just faster.

With careful validation, you can be confident that the Bun-based deployment is performing well. At this point, you have successfully migrated your project to Bun! You can now fully embrace Bun's features and enjoy the speed improvements and simplified tooling. The following sections provide a reference for Bun-specific APIs and configurations you can leverage to get the most out of Bun in production.

---

## 5. Bun-Native API Catalog (with Node.js Comparisons)

One of Bun's strengths is the rich set of built-in APIs it provides, often replacing the need for separate npm packages or even core Node modules. Many of these are exposed via the global `Bun` object or special imports like `bun:sqlite`. Below is a catalog of commonly used Bun-native features, with comparisons to how you'd achieve the equivalent in Node.js:

### HTTP Servers: Bun.serve() vs Node's http.createServer (or Express)

**Node.js (Express or built-in http):**

```javascript
// Using Express (Node.js example)
const express = require('express');
const app = express();
app.get('/api/status', (req, res) => res.send('OK'));
app.listen(3000, () => console.log('Node listening'));
```

**Bun:**

```javascript
// Bun's built-in HTTP server
Bun.serve({
  port: 3000,
  fetch(req) {
    if (req.url.endsWith("/api/status")) {
      return new Response("OK");
    }
    return new Response("Not Found", { status: 404 });
  }
});
console.log("Bun listening on http://localhost:3000");
```

**What's happening:** Bun's `serve()` creates an extremely fast HTTP server without needing any framework. In the example above, Bun handles routing in the `fetch(req)` handler using web-standard Request/Response objects (similar to a Service Worker or Deno approach). This removes the overhead of Express – Bun can handle a "hello world" route with far lower latency and overhead. In one benchmark, Bun's HTTP server handled ~110k req/sec versus ~30k req/sec for Node's built-in HTTP (and about 22k req/sec for Node with Express). The performance gain comes from Bun's optimized C++ HTTP parser and lack of middleware overhead.

Starting with Bun v1.2, you can also define a `routes` object in `Bun.serve` for declarative routing (including dynamic URL parameters and method-specific handlers). For example, instead of writing logic in the fetch function, you can do:

```javascript
Bun.serve({
  port: 3000,
  routes: {
    "/health": new Response("OK"),
    "/users/:id": req => Response.json({ id: req.params.id }),
    "/api/posts": {
      GET: () => {/* ... */},
      POST: async req => {/* ... */}
    }
  }
});
```

This built-in router covers many use cases of frameworks like Express but with zero extra dependencies. If your Node app used Express middleware, you will need to replace or refactor those for Bun. Common tasks like JSON parsing or static file serving are trivial with Bun (requests have `.json()` method, and you can serve static files by returning `new Response(Bun.file('path/to.file'))`). There isn't an out-of-the-box equivalent of every Express middleware, but many libraries (like body parsers, cookie parsers) might not be needed due to Bun's Web API approach, or can be replaced with small functions.

**Bottom line:** For new servers, use `Bun.serve()` to maximize performance. It's fully capable of handling routing and WebSockets, and it significantly reduces latency and CPU usage. If you have an existing large Express app, you can actually run Express on Bun (since Bun supports the Node http module and middleware) – but you'd be foregoing a lot of Bun's potential performance. Many early adopters report that porting a simple Express app to Bun's native server not only improves throughput but also simplifies the code (since you can often remove dependencies).

### File I/O: Bun.file() and Bun.write() vs Node's fs module

**Node.js (using `fs/promises`):**

```javascript
const { readFile, writeFile } = require('fs/promises');
const data = await readFile('input.txt', 'utf8');
await writeFile('output.txt', data);
```

**Bun:**

```javascript
const file = Bun.file('input.txt'); // BunFile handle (lazy-loaded file reference)
const text = await file.text();     // read file content as string
await Bun.write('output.txt', file); // efficiently copy to output (zero-copy)
```

**What's happening:** Bun provides high-level file utilities that operate faster and more conveniently than Node's standard fs. `Bun.file(path)` returns a `BunFile` object, which behaves like a Blob / File in browser environments. Importantly, creating a BunFile does not immediately load the file into memory – it's a lazy reference. Only when you call an async method like `.text()`, `.arrayBuffer()`, or stream it does Bun actually read the data. You can also check `file.size` or `file.type` (MIME type guessing) without reading the contents.

`Bun.write(destination, data)` is a powerful, optimized write function. It accepts a variety of data types (string, Buffer/TypedArray, BunFile, or even another Response/Blob) and writes them to the destination using the most efficient system calls available. In the example above, passing a BunFile to `Bun.write` triggers an in-kernel file-to-file copy (on supported platforms, Bun uses `sendfile(2)` or equivalent). This means Bun can copy an entire file's contents without ever transferring them to user-land JavaScript – achieving performance that often exceeds even Unix command-line utilities. In fact, Bun's own implementation of the Unix `cat` command (reading from a file and writing to stdout) is about 2× faster than GNU cat on large files.

For reading, you can use `await file.text()`, `await file.json()`, or `await file.arrayBuffer()` to get file content easily. For writing, `Bun.write` is usually preferred over manual `fs.writeFile` because it will automatically choose the fastest way to write the given data (e.g. it can pipe a Response body to a file without buffering it fully in JS memory).

Node's `fs` module is of course still available in Bun for compatibility. You can mix and match – e.g. using `fs.readdir` to list files and then `Bun.file()` to read one of them. But Bun's APIs often yield shorter and more performant code for common tasks.

**Other handy file features:**
- `await file.stream()` gives a WHATWG ReadableStream of the file (useful for streaming large files to a network response, etc.).
- `file.slice(start, end)` works like Blob.slice, allowing you to work with file ranges.
- Bun lacks some less common fs features – for example, `fs.watchFile` (but Bun has its own `fs.watch` for file watching which is usually sufficient).

### Cryptography & Passwords: Bun.password and Bun.hash() vs bcrypt/crypto libraries

**Node.js (bcrypt example):**

```javascript
const bcrypt = require('bcrypt'); // requires native addon pre-built or compiled
const hash = await bcrypt.hash(password, 12);
const match = await bcrypt.compare(password, hash);
```

**Bun:**

```javascript
const hash = await Bun.password.hash(password); // default uses Argon2id
const ok = await Bun.password.verify(password, hash);
```

**What's happening:** Bun provides a `Bun.password` API for common password hashing and verification tasks. Under the hood, this supports Argon2 (the default algorithm) and bcrypt. The hashed output is returned as a string in a standard format including the algorithm and parameters, so you can store it like any regular password hash. For example, `Bun.password.hash("secret")` might return a string like `$argon2id$v=19$m=4096,t=3,p=1$...$...`. Bun's implementation is highly optimized (written in Zig and using native code), giving you the security of Argon2/bcrypt without needing an external dependency that compiles a C++ addon.

If you specifically need bcrypt with a certain cost factor, you can pass options:

```javascript
const bcryptHash = await Bun.password.hash("secret", { algorithm: "bcrypt", cost: 10 });
```

And verification automatically detects the type from the hash string:

```javascript
const isValid = await Bun.password.verify("secret", bcryptHash);
```

This will use bcrypt since the hash starts with the bcrypt signature. Similarly, Argon2 options (memoryCost, timeCost, parallelism) can be specified if needed.

Using Bun's password API has a big advantage beyond performance: it handles some edge cases that libraries like bcrypt (npm) do not. For instance, bcrypt (the algorithm) has a 72-byte password length limit after which it truncates input. Bun's implementation will automatically pre-hash longer passwords with SHA-512 so that you don't lose entropy (bcrypt npm might silently ignore characters beyond 72 bytes). Little details like this make Bun's crypto safer by default.

For other cryptographic needs, Bun includes the standard `crypto` module (with most Node crypto APIs). Additionally, Bun offers a simple `Bun.hash()` function for one-shot hashing:

```javascript
const digest = Bun.hash(Buffer.from("hello world"), "sha256");
```

This returns a hex string of the SHA-256 hash. It's a shortcut for creating a crypto Hash object and updating it. Bun also supports Web Crypto (`crypto.subtle.digest`, etc.) for promise-based cryptography, and it uses platform-accelerated implementations where possible.

**Takeaway:** You can eliminate packages like bcrypt, argon2, or crypto-js by using Bun's built-ins. This not only reduces install complexity (no native module compilation needed for bcrypt) but also often improves performance.

### Database & Storage: bun:sqlite, Bun.SQL, and more vs Node database drivers

**SQLite (embedded database):** In Node, using SQLite typically means installing `sqlite3` or `better-sqlite3` (which are native addons). Bun includes SQLite built-in via the `bun:sqlite` module:

```javascript
import { Database } from "bun:sqlite";

const db = new Database("app.db"); // opens (or creates) a SQLite database file
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)");

// Insert data
const insert = db.query("INSERT INTO users (name) VALUES (?)");
insert.run("Alice");
insert.run("Bob");

// Query data
const rows = db.query("SELECT * FROM users").all();
console.log(rows); // e.g. [ { id: 1, name: "Alice" }, { id: 2, name: "Bob" } ]
```

Bun's SQLite is inspired by the better-sqlite3 API (it's synchronous, returning results directly). It's extremely fast – roughly 3–6× faster than better-sqlite3 in Bun's own benchmarks, since it avoids the cost of going in and out of JS as much as possible. Despite being synchronous from the JavaScript perspective, Bun's SQLite operations are performed efficiently in native code under the hood. You can use transactions via `db.transaction()` to group operations, and even stream results if needed. If you're migrating code that used sqlite3 (the older callback-based library), switching to `Database` from `bun:sqlite` will simplify your code significantly and remove the need for an external dependency.

**PostgreSQL / MySQL:** As of Bun 1.3, an official Bun native Postgres client is still in the works (some experimental `Bun.pg` APIs exist). For now, you can use existing pure-JS libraries (like `pg` for Postgres or `mysql2` for MySQL) – they generally work since Bun supports Node's networking and Buffer APIs. That said, once Bun's native clients mature, you can expect better performance by using them. If your Node app uses an ORM (like Prisma, TypeORM, etc.), check compatibility; many of these should work on Bun as long as their underlying drivers do.

**Key-Value stores (Redis):** Bun provides a built-in Redis client accessible via `Bun.redis` / `Bun.RedisClient` in recent versions. This can often replace packages like `redis` or `ioredis`. Usage is straightforward (similar to other Redis clients):

```javascript
const client = new Bun.RedisClient({ hostname: "127.0.0.1", port: 6379 });
await client.connect();
await client.set("key", "value");
const val = await client.get("key");
```

This is still experimental, but promises to be faster due to Bun's optimized TCP handling.

**Other storage and cloud services:** Bun has a few other surprises – for instance, a built-in AWS S3 client (`Bun.S3` class) and AWS Signature v4 generator. These aren't full replacements for the AWS SDK, but for basic use-cases (uploading to S3, etc.) they can save a lot of bloat. There's also a planned Bun key-value store API (`Bun.kv` or similar) for simple data caching, but in the meantime you can use SQLite or even the filesystem for that.

**Summary:** Many Node apps pull in heavy database drivers or ORMs. With Bun, you might:
- Use `bun:sqlite` for any local database needs (faster than external libs).
- Continue using your existing DB client for Postgres/MySQL/Mongo (most will work on Bun), or switch to a lightweight driver and let Bun handle the performance.
- Use Bun's emerging built-ins for Redis, S3, etc., to reduce dependencies.

### Subprocesses & Shell Commands: Bun.spawn and the $ tag vs Node's child_process

Bun can launch subprocesses similarly to Node's `child_process.spawn` or the popular `execa` library, but Bun offers a more ergonomic API and better integration with promises. In particular, Bun provides a shell tag (`$`) to run shell commands inline:

```javascript
import { $ } from "bun";

await $`echo "Hello from Bun shell"`;
```

The above will execute the command in backticks (`echo "Hello from Bun shell"`) in a subprocess and resolve when it completes. The stdout and stderr are captured into the promise result (and also printed to console by default). It's very reminiscent of shell scripting and makes automating tasks easy.

For more fine-grained control, Bun has `Bun.spawn` which is similar to `child_process.spawn`:

```javascript
const proc = Bun.spawn({
  cmd: ["git", "status"],
  stdout: "pipe",
  stderr: "pipe"
});
const out = await new Response(proc.stdout).text();
```

Here, `proc` is a Process object that you can interact with. By default, Bun's processes are non-blocking and return a ProcessPromise – an promise that resolves when the process exits, but also has properties for the running process (like `proc.stdin`, `proc.stdout`). This dual nature means you can `await Bun.spawn({...})` directly to get the exit status once done, or handle the streams in the meantime.

Bun's process handling is implemented with libuv under the hood, like Node's, so it's very efficient. One thing to note: when using the template string `$` style, Bun runs the command through the system shell by default. However, if you prefer to avoid shell interpretation, you can supply an array to `Bun.spawn` directly (as shown with `cmd: ["git", "status"]`). Bun's shell tag is more for convenience in scripts (similar to how Deno's `Deno.spawn` or npm's `zx` allow). It's great for tasks like deployment scripts, automation, etc., within a Bun project.

**Comparison to Node:** In Node, you might use `child_process.exec` to run a quick command or `spawn` for streaming. Bun's APIs cover both in one. For example, where Node's `exec` returns a callback with buffered output, Bun's `$` returns a promise with the output. Where Node's `spawn` returns an event emitter stream, Bun's `Bun.spawn` returns an object you can await or stream from.

**Synchronous processes:** Bun also has `Bun.spawnSync` for when you need to run something synchronously (similar to Node's `spawnSync`), but generally, the async versions are preferred for performance and non-blocking behavior.

### Web APIs and Polyfills in Bun

One design goal of Bun is to provide a browser-like environment out-of-the-box. This means many Web APIs that you would have to polyfill or that are missing in Node are already present in Bun's global scope:

- **Fetch API:** In Node.js, until recently you had to use `node-fetch` or Axios for HTTP requests. Bun provides `fetch`, `Request`, `Response`, and `Headers` globally, conforming to the standard Fetch API. You can do `await fetch('https://api.example.com')` just like in browser JavaScript. This is extremely useful for writing universal code (the same code works in browser and Bun). It also means you can drop dependencies like axios if you just need simple HTTP calls.

- **Web Streams:** Bun implements the WHATWG Streams API (i.e. `ReadableStream`, `WritableStream`, `TransformStream`) natively. Node's core streams (the `stream` module) are also supported, but having Web Streams means you can work with the standardized streaming interfaces (which are used by Fetch API, etc.). In Node, using Web Streams required either Node v18+ (which partially supports them) or polyfills. In Bun, they're just there.

- **Web Crypto:** The `crypto.subtle` API (part of Web Cryptography) is available as `globalThis.crypto.subtle`. For example, you can do `await crypto.subtle.digest("SHA-256", data)` in Bun. Node's own `crypto` module is present too, but the subtle API provides Promises and is web-standard. Additionally, `crypto.randomUUID()` is available to easily generate UUIDs.

- **Timers & microtasks:** Functions like `queueMicrotask`, `setImmediate` (from Node), `setTimeout`, `setInterval` are all available and behave as expected. Bun's event loop will schedule these as in Node.

- **EventTarget and DOM events:** Bun includes the `EventTarget` class and related event infrastructure. You can create custom event emitters using `class MyThing extends EventTarget { ... }` and dispatch events – useful for patterns that might use EventTarget in browser. Node doesn't natively have EventTarget (it uses EventEmitter), so this is a nice addition for code sharing.

- **Alert / Prompt (CLI):** Surprisingly, Bun even implements `alert()`, `confirm()`, and `prompt()` in a way suitable for CLI use. For example, `alert("Hello")` will print "Hello" to stdout. These are mainly for convenience when writing quick scripts (so you can reuse browsery code that calls alert/prompt). They are no-ops or simple wrappers (e.g. prompt will attempt to read from stdin).

- **High-level parsers:** Bun has built-in support for certain data formats. For instance, `Bun.yaml` can parse YAML strings to objects (so you might not need a js-yaml package), and `Bun.toml` can parse TOML. There's also a `Bun.Glob` for matching filesystem paths with glob patterns.

In essence, Bun tries to eliminate the need for many lightweight npm packages by baking common functionality in. If you find yourself about to add a dependency for something trivial (like UUID generation, hashing, parsing a .env or YAML, etc.), check Bun's docs – there's a good chance it's already provided. This reduces bloat and improves performance (since Bun's built-ins are often implemented in native code).

---

## 6. Anti-Patterns and Errors to Avoid

While using Bun, keep an eye out for some common pitfalls and differences. Avoiding these anti-patterns will save you debugging time:

- **Using unsupported native modules:** As discussed in the compatibility section, avoid installing libraries with native bindings that Bun cannot run. If you accidentally do `bun add some-native-package` and it fails, you might see cryptic errors about missing symbols or version mismatches. **Solution:** Stick to the pure JS alternatives or Bun's built-ins where possible. When in doubt, search Bun's GitHub issues for the package name – often someone has reported if it doesn't work, or the Bun team might have a recommended workaround.

- **Not adjusting environment checks for Bun:** Many libraries assume if not in a browser, then it's Node. For example, code that checks for `typeof window === 'undefined'` or existence of `process` might mis-detect Bun. Another example, as mentioned, is code checking `process.versions.node`. **Solution:** Use feature detection whenever possible (check for APIs, not environment names). If you need to conditionally detect Bun, use `if (process.versions.bun)` or `if (globalThis.Bun)` which is a reliable indicator. If you maintain a library that needs to run on both Node and Bun, ensure any Bun-specific code is only run when on Bun, otherwise guard it (e.g. don't call `Bun.write()` in code running on Node).

- **Requiring Bun-specific modules in Node:** If you write code intended to sometimes run on Node, be careful not to unconditionally import Bun-only modules. For instance, `import { Database } from "bun:sqlite";` will throw if run in Node (since Node has no idea what `bun:sqlite` is). If you need dual compatibility, you might do:

```javascript
let Database;
if (globalThis.Bun) {
  ({ Database } = await import("bun:sqlite"));
} else {
  Database = require('better-sqlite3');
}
```

Or separate the code paths. This way Node can still require its fallback module. If your project is Bun-only, you don't need to worry about this, but it's worth noting for shared libraries.

- **Ignoring Bun's warnings:** Bun may print warnings to the console for certain Node APIs it hasn't implemented. For example, using an unsupported method like `util.inspect.custom` might log a warning. Don't ignore these warnings – they're telling you that something in your code isn't actually working (even if it's not throwing an error). In such cases, check Bun's documentation or GitHub to find the proper way. Often, Bun will have an alternative approach or the functionality is simply not there yet.

- **Overloading a single thread:** Bun is fast, but it's still fundamentally single-threaded for JavaScript execution (like Node, unless you use workers). If you have an extremely CPU-bound task (e.g. image processing in pure JS or large computations), Bun will execute it faster than Node per thread, but you may still need to parallelize across threads or processes to meet your needs. Don't assume that because Bun is faster you can do everything on one core – Node best practices like using worker threads or clustering for heavy CPU tasks still apply when needed. Bun does support `new Worker('script.js')` (with some limitations), and it supports a `--workers n` CLI flag to cluster your server process (similar to pm2's cluster mode) which uses multiple OS processes behind the scenes.

- **Relying on Node-specific quirks:** There are edge-case behavioral differences between V8 and JavaScriptCore, though they are minor. One example is the exact ordering of microtasks vs nextTick – Bun's ordering might differ from Node's in complex sequences (though in general it follows the spec, whereas Node's `process.nextTick` has its own queue that runs before Promises). If your code relies on a specific scheduling (which is not a good practice in any case), it might behave differently. Another example is if you were using undocumented Node internals (like `Module._nodeModulePaths`), those may be no-ops in Bun or absent. **Solution:** Stick to documented behaviors and test critical async logic under both Node and Bun to ensure it's robust.

- **TypeScript config pitfalls:** As mentioned earlier, ensure your tsconfig.json is set up for Bun. One common mistake is having both `@types/node` and `@types/bun` in your project – this can cause conflicts where types like `Buffer` or global `fetch` are defined twice, leading to TS errors like "Duplicate identifier 'fetch'". **Solution:** Decide which environment's types you want. If you're migrating fully to Bun, remove `@types/node` and include `bun-types`. If you need to support both, you might use conditional type imports or separate configs. The tsconfig provided in the Configuration Templates section is tuned for Bun and avoids these issues.

- **Forgetting to update `bunfig.toml`:** If you created a `bunfig.toml` to customize Bun's behavior during development, make sure you carry those settings to production (and into version control). For example, if you enabled `install.frozenLockfile` or set a test coverage threshold in bunfig, those should be checked in so everyone uses them. A pitfall would be enabling something locally in bunfig.toml but not committing it, so CI or other developers run with different settings.

In summary, treat Bun as what it is – a new runtime very similar to Node.js, but not identical. 90% of the time, you can run Node code on Bun with no changes. The other 10% are covered by the considerations above. By avoiding these common pitfalls, you'll have a much easier time migrating and won't be tripped up by subtle differences.

### Behavioral Differences Summary

To recap some key behavior differences and engine-specific quirks between Node.js and Bun, here's a quick comparison table:

| Aspect | Node.js | Bun |
|--------|---------|-----|
| Microtask order | `process.nextTick` queue runs before Promises (Node-specific microtask queue) | Bun follows Web semantics (Promises and microtasks as per spec; no Node nextTick queue, but Bun implements nextTick similar to setImmediate) |
| `require()` in ESM | Not allowed (throws error in pure ESM context) | Allowed – Bun lets you `require()` inside ES modules (returns a CJS namespace) |
| `process.title` | Can be set to change process name (on Linux/macOS) | No-op on Linux/macOS in Bun (setting it does nothing) |
| Uncaught Exception Output | Prints stack trace to stderr (Node's formatting) | Also prints stack, but with syntax-highlighted output and possibly different formatting (Bun prints code frames by default) |
| Inspector Debugging | Chrome DevTools via V8 Inspector protocol (`ws://127.0.0.1:9229`) | WebKit Inspector protocol – use `bun --inspect` and open debug.bun.sh (or Safari DevTools). VSCode requires a different attach config (see below). |
| Memory allocator stats | Not easily available by default (requires internal V8 flags or modules) | Can print mimalloc stats with env var `MIMALLOC_SHOW_STATS=1` (Bun uses mimalloc) |
| Module resolution | require can resolve JSON, optional file extensions, Node's algorithm | Bun's import resolver is more web-like: it assumes ESM imports and uses a "bundler" resolution mode by default. It supports most Node resolution rules, but some differences exist (Bun might be stricter about file extensions unless `moduleResolution: "bundler"` is set in tsconfig). |
| Buffer global | Always available (Node polyfills it in ESM too as of v18) | Available in Bun as well (Bun includes the Buffer global to maintain compatibility). |

Most of these differences are minor, but they can surface in edge cases. The key point is that Bun aligns with browser standards where Node sometimes doesn't (module resolution, global APIs), and Bun doesn't implement some Node internals that aren't needed in a Bun world.

### Common Error Messages and Solutions

When migrating, you might encounter specific runtime errors. Here are a few common ones and how to address them:

**Native module version mismatch:**

```
Error: The module 'canvas.node' was compiled against NODE_MODULE_VERSION 115.
This version of Bun requires NODE_MODULE_VERSION 108.
```

**Cause:** This means a native addon was built for a different Node ABI. Bun's Node-API compatibility aims to avoid this, but if the addon isn't pure N-API or was precompiled for a specific Node version, it can fail. **Solution:** Use an alternative implementation if possible (in this example, use `@napi-rs/canvas` or a pure JS canvas library). If none exists, you may have to wait until Bun supports that module or the module publishes a Bun-compatible build.

**Dependency expecting a higher Node version:**

```
error: yargs parser supports a minimum Node.js version of 12.
```

**Cause:** Some packages check the Node version at runtime and throw if it's lower than expected. Bun's `process.version` might not satisfy them (Bun might report a version or not have `process.versions.node`). **Solution:** Often, you can bypass such checks by setting an env var if the library provides one. For yargs, for example, setting `YARGS_MIN_NODE_VERSION=0.1.2` tricked it into running. Alternatively, patch the package or use an older version that doesn't have that check. This is a rare scenario, mostly older libraries or ones with specific Node targeting.

**Node internal not implemented:**

```
TypeError: Cannot read properties of undefined (reading '_nodeModulePaths')
```

**Cause:** The code is trying to use Node's module resolution internals (like `Module._nodeModulePaths`), which Bun doesn't implement (or returns undefined). **Solution:** Typically, this comes from a library doing something hacky to manipulate module loading. You'd need to patch or polyfill it. In some cases, simply removing that usage is fine (it might be trying to do something Bun doesn't need). If it's your own code (unlikely), avoid using Node's internal Module methods. If it's a third-party, consider forking it or lobbying the maintainer to support Bun.

In general, if you see an error and it references something Node-specific, the strategy is:
1. Identify which package or code is triggering it.
2. See if there's an updated version of that package or a Bun-specific fork.
3. If not, find an alternative or implement a simple workaround (sometimes setting a global or env var as shown can do it).
4. Keep track of these and check Bun's release notes – many gaps are being filled quickly, so what required a workaround today may be fixed in the next Bun release.

---

## 7. Configuration Templates

This section provides ready-to-use configuration files and snippets to integrate Bun into your project's tooling. Adopting these will ensure your development environment, CI pipelines, and editors are all set up for Bun.

### bunfig.toml – Bun Configuration File

While optional, a `bunfig.toml` at the project root lets you tweak Bun's behavior and default settings. Here is a comprehensive example covering common options (you can omit sections you don't need – Bun will use defaults):

```toml
# Top-level runtime settings:
preload = ["./bun-preload.ts"]        # Scripts to run before any "bun run" entry (e.g., polyfills or global setup)
logLevel = "warn"                      # Log level: "debug", "info", "warn", "error"
smol = false                           # (Experimental) Use smaller memory limits (at some cost to performance)

[define]
"process.env.NODE_ENV" = '"production"' # Define compile-time constants (strings must be in quotes inside quotes)

[loader]
".txt" = "text"                        # Example: import .txt files as text
".graphql" = "text"                    # Import .graphql files as text (could also use "file" to get a BunFile)

# Test runner configuration:
[test]
root = "./tests"                       # Directory where tests are located
preload = ["./tests/setup.ts"]         # File to load before running tests (for global test setup)
coverage = true                        # Enable coverage collection
coverageThreshold = 0.8                # Fail tests if coverage falls below 80%
coverageReporter = "lcov"              # Coverage report format (lcov for CI, etc.)
coverageDir = "./coverage"             # Directory to output coverage info
# randomize = true                     # (If you want to randomize test order each run)
# reporter = "spec"                    # You can specify a reporter ("spec" is default pretty output, "dots", "junit", etc.)

# Package manager settings:
[install]
optional = true                        # Install optionalDependencies by default (true is default behavior)
dev = true                             # Install devDependencies by default (true is default)
exact = true                           # Pin exact versions when adding new deps (similar to npm --save-exact)
frozenLockfile = false                 # If true, bun install will fail if bun.lockb is out of date (like npm ci)

[install.scopes]
"@myorg" = "https://npm.pkg.github.com/" # Example: custom registry for @myorg scope

[install.cache]
dir = "~/.bun/install/cache"           # Location of global cache (for npm tarballs, etc.)

# (You can also configure "install.registry" to set a specific npm registry mirror if needed)
```

This configuration is meant as a reference – you can trim it down to just the parts you need. A few highlights from above:

- **preload scripts:** You can specify scripts to automatically run before Bun executes your code. For example, if you need to set up some globals or polyfills consistently, list them under `preload`. Similarly, for tests, `test.preload` can be used to set up testing globals (as we did for Happy DOM in Phase 4).

- **run settings:** If you have scripts with Node shebangs (e.g. a script file starting with `#!/usr/bin/env node`), Bun by default will actually spawn Node to run those, assuming you didn't mean to run them with Bun. You can override this by setting `run.bun = true` (not shown above, but in older Bun versions you could put `run.bun = true` to force Bun to take over Node-shebang scripts). In recent Bun, this might not be necessary unless you hit that scenario.

- **Test config:** We enabled coverage and set a threshold. Bun's coverage is built-in (no need for nyc/istanbul). If you set `coverage = true`, you can also pass `--coverage` on the CLI to get a coverage summary. The other fields like `randomize` help ensure your tests don't rely on order. The reporter can be changed if you prefer dots or CI-friendly output (JUnit). Bun can even output JUnit XML results to a file for CI (`bun test --reporter=junit --reporter-outfile results.xml`).

- **Install config:** The example shows how to set up things like always installing optional dependencies (Bun does by default, whereas npm might skip if platform mismatch), and forcing `--frozen-lockfile` mode by default if you wanted (we left it false here because sometimes you want Bun to update lockfile if needed; in CI you'd use the flag). We also demonstrate how to specify a custom registry for certain scopes (e.g. for private packages on GitHub Packages, etc.), and how to adjust cache directory. If you're in an environment with a custom npm registry mirror (like a company proxy), you can set `registry = "https://my.registry/"` under `[install]`.

Bun's defaults are sensible, so you only need a bunfig.toml if you want to change things. For instance, many projects will have no bunfig.toml at all, or maybe just a small one for test settings.

### tsconfig.json – Recommended TypeScript Configuration for Bun

If your project is using TypeScript, you'll want to configure it to take advantage of Bun's module resolution and types. Below is a `tsconfig.json` that works well with Bun:

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "tests/**/*", "bun-preload.ts"]
}
```

**Key points:**

- We use `"module": "Preserve"` and `"moduleResolution": "bundler"`. These are new options in TypeScript 5+. "Preserve" tells TS not to transpile ESM import/export statements at all – this works in tandem with Bun's loader which understands ESM natively. "bundler" resolution mode allows TypeScript to resolve modules the way Bun does (including bare module specifiers, exports maps, etc., similar to how a bundler or Bun will resolve them). This prevents TS from complaining about imports that lack extensions or are using subpath imports that Node's resolution might not handle but Bun can.

- **allowImportingTsExtensions:** Bun allows you to import a `.ts` file directly with extension (and it will compile it). This TS flag prevents the compiler from erroring on those import statements.

- **verbatimModuleSyntax:** This ensures that TS keeps import syntax intact (no rewriting default imports to require, etc.), which is useful when module is "Preserve".

- **No emit:** We rely on Bun to run and bundle our TS, so we set `noEmit: true`. We still use `tsc` for type checking (maybe in CI or via `bun x tsc --noEmit`).

- We include `"types": ["bun-types"]` to bring in Bun's definitions (which cover Bun globals like Bun object, and also the extended APIs like File and fetch if not already included via lib DOM). We also specified `lib: ["ESNext"]`. If you are writing code that touches DOM APIs in Bun (like using fetch or WebSocket in Bun, which is actually fine), you might also include `"DOM"` in lib to get DOM types. However, including "DOM" can sometimes conflict with Node types. In our case, since we're targeting Bun and included bun-types, we get types for most Web APIs through bun-types anyway (bun-types re-exports lib.dom where appropriate).

This configuration aligns TypeScript's understanding with Bun's runtime behavior, minimizing friction. If you generated a project with `bun init`, you likely have a similar tsconfig already. The main differences from a typical Node tsconfig are the use of `"moduleResolution": "bundler"` and including bun's types.

### GitHub Actions CI – Example Workflow

To run tests and builds on GitHub Actions using Bun, you can use a workflow like:

```yaml
name: CI
on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 'latest'

      - name: Cache Bun cache
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lockb') }}

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run lint
        run: bun run lint

      - name: Run tests
        run: bun test --coverage

      - name: Build project
        run: bun run build
```

**Notes:**

- We use the `oven-sh/setup-bun@v2` action to install Bun on the runner. This is maintained by the Bun team and handles downloading the specified version (we used `latest` which grabs the latest stable Bun, or you could pin a version like `1.3.3`).

- We add a caching step for `~/.bun/install/cache`. Bun caches downloaded npm packages (tarballs) in this directory. Caching it between CI runs means subsequent runs won't hit the network for already cached packages, which speeds things up. We key the cache on the OS and the hash of the lockfile (if dependencies haven't changed, cache is reused).

- Then we run `bun install --frozen-lockfile` to ensure the bun.lockb is up to date and used strictly.

- Run lint (assuming you have a lint script in package.json).

- Run tests with coverage. Bun will produce a coverage report (by default text summary, and full lcov in ./coverage folder if configured). You could add steps to upload coverage to a service or to store artifacts if needed.

- Finally run the build (if applicable, e.g. building a production bundle or compiling assets).

This workflow is analogous to a typical Node one, but it's usually faster due to Bun's speed. Bun's test runner also integrates with GitHub Actions – failing tests will automatically create annotations (you'll see them in the Actions log and as inline comments on PRs for failing lines) without any extra config.

If you need to collect test results or coverage as artifacts, you can do so as usual (e.g., save the bun-tests.xml if you use `--reporter=junit`, or upload the coverage folder).

For GitLab CI, you can simply use Bun's Docker image in your CI script or install Bun via curl in a setup step. For instance:

```yaml
image: oven/bun:latest

install_and_test:
  script:
    - bun install --frozen-lockfile
    - bun test --reporter=junit --reporter-outfile=bun-junit.xml
  artifacts:
    when: always
    reports:
      junit: bun-junit.xml
```

In this example, we used the official Bun Docker image as the job image, ran tests, and saved the JUnit results for GitLab to pick up.

### Dockerfile – Deploying a Bun app with Docker

Using Bun in a Docker container is straightforward. The recommended approach is to use the official Bun base image, which comes in multiple flavors (alpine, debian, etc.). Here's an example multi-stage Dockerfile for a production build:

```dockerfile
# Stage 1: Base with Bun
FROM oven/bun:1.3.3 as base
WORKDIR /app
# The 'base' image has Bun installed at /bun and in PATH

# Stage 2: Dependencies layer
FROM base as deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Stage 3: Build/Release
FROM base as release
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# If you have build steps (if not already done via bun build in CI):
# RUN bun build src/index.ts --outdir dist --minify

# Use a non-root user for safety (the Bun base image provides a 'bun' user)
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
```

**Explanation:**

- We use the official Bun image (here version 1.3.3). This image is typically based on Alpine or Debian slim, containing the Bun binary. It sets up a `bun` user as well.

- We split into stages to optimize image caching:
  - In the `deps` stage, we copy just the package.json and lockfile and run `bun install --production`. This layer will be cached as long as those files don't change, which speeds up builds when only app code changes.
  - In the `release` stage, we copy the node_modules from the deps stage, then copy the rest of the app code. Since we used `--production`, devDependencies aren't included, keeping the prod image smaller.

- (Optional) If you have a build step (e.g. transpiling or bundling code), you could either do it in the release stage or include it in a separate stage. Depending on your setup, you might also do builds outside of Docker and just COPY the built files in.

- We switch to the non-root `bun` user provided by the image for security (so the app doesn't run as root in the container).

- Finally, we use `CMD` to start the app using Bun. In this case, assuming package.json has a `"start": "bun dist/index.js"` or similar, we could do `CMD ["bun", "run", "start"]`. Or directly `CMD ["bun", "dist/index.js"]` to run a built file. Adjust this to your app's start command. The example above uses `bun run start` which will look up the start script.

This Dockerfile yields a small image that only contains your app, its dependencies, and Bun. No Node.js needed at all. Deployment is essentially the same as with Node, except you're using Bun's base image.

### VS Code Launch Configuration – Debugging with Bun

Visual Studio Code can be used to debug Bun applications. Although Bun's debugging uses WebKit's inspector, VS Code has an extension/adapter that can work (VSCode's JS debug can partially attach to Bun's inspector).

Add a `.vscode/launch.json` to your project:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "request": "launch",
      "name": "Launch Bun App",
      "program": "${workspaceFolder}/src/index.ts",
      "cwd": "${workspaceFolder}",
      "stopOnEntry": false
    },
    {
      "type": "bun",
      "request": "attach",
      "name": "Attach to Bun (Inspector)",
      "address": "127.0.0.1",
      "port": 6499
    }
  ]
}
```

**A few notes:**

- The `"type": "bun"` debug adapter is provided by the Bun VSCode extension (which you should install from the VS Code marketplace). This extension knows how to launch Bun with the inspector and communicate with it.

- The first configuration above will launch your app (replace `program` with the entry file of your app) with Bun's inspector.

- The second config is for attaching to an already-running Bun instance. For instance, if you run `bun --inspect index.ts` from the terminal, Bun will print something like `debug WebSocket listening on ws://127.0.0.1:6499`. You can use the attach config to attach VS Code's debugger to that process (port 6499 by default).

- Once attached, you can set breakpoints, step through code, etc., similar to Node debugging. Keep in mind the inspector is WebKit's, so a few things might behave slightly differently (e.g. VSCode's support isn't 100% feature parity with Node's, but basic stepping and variable viewing works).

Alternatively, you can simply use Chrome or Safari to debug by visiting debug.bun.sh as Bun suggests, but for many developers, sticking in VS Code is convenient.

With these configurations in place (bunfig.toml, tsconfig.json, CI, Docker, and editor setup), your project is fully equipped to use Bun in development and production.

---

## 8. Performance Optimization

Bun is fast by default, but you can squeeze out even more performance with some optimizations and by using Bun's profiling tools. Below is a quick reference of optimizations and their typical impact:

| Optimization | Expected Gain (vs. Node equivalent) |
|-------------|-------------------------------------|
| Use `Bun.file()` instead of `fs.readFile` for large files | ~10× faster file reads (zero-copy streaming) |
| Use `Bun.write()` instead of `fs.writeFile` | ~3× faster writes (optimized syscalls) |
| Use `bun:sqlite` instead of `better-sqlite3` / `sqlite3` | 3–6× faster database operations |
| Use `Bun.password` instead of bcrypt/argon2 npm packages | Built-in native code (faster hashing; no startup cost) |
| Use static routes in `Bun.serve()` when possible | ~15% faster routing than dynamic checks (no function call overhead) |
| Run `bun build --minify` instead of external bundlers | ~1.7× faster builds than esbuild (and much faster than Webpack) |
| Use `bun install` instead of npm/yarn | ~7× faster installs on average |
| Use `bun test` instead of Jest | 10–30× faster test execution (especially for large test suites) |

Keep in mind actual gains will vary with workloads, but Bun consistently outperforms Node in I/O-heavy and startup scenarios. Compute-bound JavaScript code also often runs faster on Bun (JavaScriptCore has very strong JIT performance for certain patterns), though the differences can be narrower for long-running CPU tasks.

Beyond code changes, consider running multiple Bun processes for multi-core CPUs (just like you would scale Node). Bun's `--workers` flag can launch a cluster of workers that listen on the same port (on Linux this uses reuseport under the hood for load balancing). For example, `bun --workers 4 run src/server.ts` would utilize 4 processes. This can nearly linear scale throughput on CPU-bound workloads.

### Profiling and Debugging Bun

Bun provides tools similar to Node for profiling CPU and memory:

- **CPU Profiling:** You can run your app with `bun --cpu-prof app.js` and it will produce a `profile.cpuprofile` file when it exits. This file is compatible with Chrome DevTools – open DevTools (in Chrome), go to the Performance tab, load the file, and you can inspect the flame chart to see where time is spent. This is great for identifying hot functions or bottlenecks in your code.

- **Programmatic profiling:** In code, you can use the `bun:jsc` module to start/stop a sampling profiler:

```javascript
import { startSamplingProfiler, stopSamplingProfiler } from "bun:jsc";

startSamplingProfiler();
// ... run some code section ...
const cpuProfile = stopSamplingProfiler();
await Bun.write("section.cpuprofile", cpuProfile);
```

This allows you to profile only a specific section of code (you start it, then stop and get the profile). The output can again be loaded in DevTools. This is analogous to using Node's `profiler.startProfiling()` in the Inspector API.

- **Memory Profiling:** To get a heap snapshot, use `Bun.gc()` to trigger a garbage collection (if you want a clean slate), then:

```javascript
import { generateHeapSnapshot } from "bun:jsc";

const snapshot = await generateHeapSnapshot();
await Bun.write("heap.heapsnapshot", snapshot);
```

The `heap.heapsnapshot` file can be opened in Chrome or Safari's developer tools (in the Memory tab) to inspect memory usage, find leaks, etc. Note: Safari's dev tools might be more naturally suited since Bun's heap snapshot format is WebKit's.

- **Memory leak detection:** Bun uses the mimalloc allocator for native memory. You can set environment variable `MIMALLOC_SHOW_STATS=1` to have it print memory statistics on exit. If you see "not all freed!" messages or growing totals across runs, that could indicate a memory leak at the native level (possibly in Bun or in a native addon). This is more of a low-level diagnostic, but can be useful in long-running services to ensure memory is stable.

- **Inspector and Debugging:** As covered earlier, you can launch Bun with `bun --inspect` to enable debugging. Bun will print a WebSocket URL (e.g. `ws://127.0.0.1:6499` by default). You can either:
  - Open debug.bun.sh in a browser, which is an online instance of WebKit's inspector front-end that will connect to your process.
  - Open Safari (if on Mac) and go to the Develop menu – you should see the Bun process listed and can open a debugger for it (since Safari can natively speak to WebKit debuggers).
  - Use VSCode with the Bun extension as shown in config above.

Bun supports `--inspect-brk` (break at start) and `--inspect-wait` (wait for a debugger to attach before running) which are useful for debugging early startup code. When connected, you can set breakpoints, etc. The debugging experience is fairly similar to Node's, though keep in mind it's an evolving area (the Bun team is actively improving the debug experience).

- **Console output:** Bun's `console.log` and friends are quite nice – they output in color and with proper depth by default. If you find logs getting cut off (too shallow), you can adjust `--console-depth` flag when running Bun. By default, Bun prints more object levels than Node, which is helpful.

- **Production monitoring:** Running a Bun app in production isn't much different than Node. Use your process manager of choice. If using Docker/Kubernetes, treat it like a Node service. For metrics and APM, there's not yet official Bun support in most vendors – however, many Node tracing libraries that use open standards (OpenTelemetry) can run on Bun if they don't have native bindings. Community is working on it, so expect better APM integration as Bun gains adoption. In the meantime, basic OS-level metrics (CPU, memory) and Bun's own profiling tools can be used if you suspect performance issues in production.

Finally, keep an eye on Bun's releases (they are frequent). Upgrading Bun regularly can yield instant wins – e.g., Bun 1.2 improved various performance aspects and fixed memory overhead issues, and Bun 1.3 might bring further Node API compatibility and speed-ups. The Bun team often highlights performance improvements in release notes, so staying up-to-date ensures you're getting the best out of the runtime.

---

## 9. Sources and References

- **Bun Official Documentation** – Primary reference for Bun's APIs, runtime behavior, and Node compatibility. Key sections include:
  - Node.js Compatibility (overview of Node core support)
  - HTTP Server (using Bun.serve, routing, etc.)
  - File I/O (Bun.file, Bun.write usage)
  - bun:sqlite (embedded SQLite database API)
  - Bundler (esbuild compatibility)
  - bunfig.toml (configuration options for Bun)
  - TypeScript Support (how Bun handles TS, recommended tsconfig)
  - Debugger (inspector usage and tools)
  - Benchmarking (using Bun's profiling and benchmarking tools)

- **Bun GitHub Repository** – Especially the Issues and Discussions sections. These are invaluable for finding if a specific package is known to be incompatible or if a certain feature is planned/fixed. For example, the tracking issue for Node-API support and V8 API parity provide insight into Bun's progress on native modules.

- **Official Bun Guides** – Bun's website has guides for common migration scenarios:
  - From npm to Bun installation – steps and tips for replacing npm/Yarn with bun install.
  - Jest to Bun test runner – detailed guide on converting a Jest suite to bun:test.
  - Replacing esbuild with Bun bundler – covers differences in bundler CLI and API.

- **CI & Docker Resources** –
  - GitHub Actions Setup Bun: oven-sh/setup-bun (GitHub Action used in the CI example) – documentation on usage and options.
  - Bun Docker Guide: Bun + Docker guide – official tips for containerizing Bun apps.

- **Bun Release Notes:**
  - Bun 1.2 Blog Post – details on features like text-based lockfiles, improved compatibility, etc.
  - Bun 1.3 Blog Post – highlights of performance updates and new APIs in Bun v1.3 (the target version for this guide).

- **Community Articles & Benchmarks:**
  - ByteIota Blog – "Migrating from Node.js to Bun 1.1: Production Guide" (Nov 2025). A detailed write-up from early adopters that informed parts of our migration steps and uncovered gotchas (like handling `process.versions`, replacing bcrypt, etc.).
  - Strapi Engineering – "Bun vs Node.js: A Practical Comparison" (Sept 2025). Provided real-world performance stats (e.g. 4× throughput improvement) and context for when Bun makes sense.
  - BetterStack – "Why bun install Is So Fast?" (Nov 2025). Explains the technical reasons Bun outperforms npm (system call reductions, caching) and provides benchmark numbers for install speed. This backs the "~7× faster" install claim.
  - Reddit/Hacker News threads – Community feedback often shares edge-case experiences (for example, confirming that Express works on Bun albeit without performance gains, or noting memory usage patterns in Bun vs Node). These can be found in r/bun and HN discussions, and can be insightful for troubleshooting unconventional issues.

Each of the above sources contributed to the best practices and data in this guide. As Bun continues to evolve rapidly, keep an eye on the official docs and community forums for the latest tips and fixes.

---

**Happy migrating to Bun! 🚀**
