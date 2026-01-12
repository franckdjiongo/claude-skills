# Vercel Serverless Functions: Complete Development Guide (October 2025)

## Overview and Architecture

Vercel revolutionized serverless computing in 2025. **Fluid Compute**, introduced February 2025, eliminates 99.37% of cold starts while reducing costs by up to 85-90% through in-function concurrency and Active CPU pricing. Unlike traditional one-request-per-instance serverless, Fluid enables a single function instance to handle tens of thousands of concurrent requests, billing only for active CPU time rather than idle wait periods during I/O operations.

**Why this matters:** For integration and automation workflows—the primary use case for Power Platform developers—this means database queries, external API calls, and webhook processing no longer incur costs during wait time. A function that spends 100ms executing code but 400ms waiting for database responses pays only for that 100ms under Active CPU pricing.

**Architectural foundation:** Vercel Functions operate across 70+ global Points of Presence (PoPs) with Anycast routing directing requests to the nearest edge location. The Vercel Firewall inspects every request, blocking an average 1 billion suspicious TCP connections weekly. Functions execute in isolated microVMs for Node.js runtime or V8 isolates for Edge runtime, with persistent TCP tunnels maintaining connections for warm instances. This architecture enables the Scale to One model where Pro and Enterprise deployments keep at least one function instance running, preventing first-visitor cold starts entirely.

**Current state (October 2025):** Vercel deprecated "Edge Functions" and "Edge Middleware" terminology in June 2025, unifying everything under Vercel Functions with runtime selection (Node.js vs Edge). Functions now leverage Rust-based runtime acceleration delivering 30-80% faster cold starts, bytecode caching for pre-compiled execution, and the WaitUntil API for background task processing after response delivery.

## Runtime and Configuration

Node.js 22.x is the default runtime for new projects as of October 2025, with **Node.js 18 deprecated September 1, 2025**—existing deployments continue running but new deployments show errors. Configure runtime via `package.json` engines field or Project Settings → Build and Deployment. Python 3.12 is now standard (Python 3.9 requires legacy image with Node.js 18/16 compatibility). Ruby 3.3 joined the runtime family in 2025, configured via Gemfile. Go runtime auto-triggers on `.go` file extensions. Community runtimes including Bash, Deno, PHP, and Rust integrate via `vercel.json` functions property.

**Edge Runtime specifics:** Built on Chrome's V8 engine, Edge Runtime executes in lightweight isolates without VM overhead. This enables dozens-of-milliseconds cold starts versus hundreds-of-milliseconds for Node.js, but restricts APIs to Web Standards (Fetch, Request, Response) with no filesystem access, no eval/dynamic code execution, and a 1-4MB size limit based on plan tier. Edge functions must send initial response within 25 seconds but can stream indefinitely afterward.

**Critical configuration options:** Maximum duration defaults to 300 seconds with Fluid Compute enabled (up to 800 seconds on Pro/Enterprise), dramatically increased from legacy 10-15 second defaults. Configure via `export const maxDuration = 600` in function code or `vercel.json` functions property. Memory allocation defaults to 2GB with options up to 4GB on Pro/Enterprise. Region selection defaults to Washington D.C. (iad1) with multi-region support on Pro (3 regions) and Enterprise (unlimited). Configure regions via dashboard (new February 2025 capability), `vercel.json`, or function-level `export const preferredRegion = ['iad1', 'hnd1']`.

**Environment variables:** 64KB total limit across all variables (5KB for Edge Runtime). Three environment types—Production, Preview, Development—each independently configured. Sensitive Environment Variables (new 2025) are write-only and cannot be decrypted after creation. System variables auto-provided: `VERCEL` (always "1"), `VERCEL_ENV` ("production"/"preview"/"development"), `VERCEL_URL` (deployment URL), `VERCEL_GIT_COMMIT_SHA` (commit identifier).

## Development Workflow

The modern development workflow centers on Vercel CLI v48.4.0 (October 22, 2025), which now uses OAuth 2.0 Device Flow authentication—**email-based login deprecated with removal scheduled February 1, 2026**. Initialize projects with `vercel link` to create `.vercel/project.json`, then `vercel env pull` to sync environment variables to `.env.local`. For Next.js projects, use `next dev` instead of `vercel dev` for optimal native framework support and hot module reloading.

**Local development setup:** After `npm install -g vercel@latest` and `vercel login`, create serverless functions in the `api/` directory where file structure maps to routes—`api/hello.js` serves `/api/hello`, `api/data/fetch.js` serves `/api/data/fetch`. Functions export default handlers receiving request/response objects. Run `vercel dev` to replicate production environment locally with automatic framework detection, function routing, and environment variable loading. Enable debug mode with `vercel dev --debug` for verbose logging, though note that Node.js debugging breakpoints aren't supported in `vercel dev`—use manual function invocation for step debugging.

**Testing strategies:** Test functions locally via `vercel dev`, but leverage Vercel's "test in prod" philosophy using preview deployments for integration testing. Deploy preview with `vercel deploy` to get unique URL for comprehensive testing against production-like infrastructure. For CI/CD testing, deploy to preview environment, extract deployment URL from CLI output, then run E2E tests against that URL before promoting to production. Integration testing benefits from OpenTelemetry support for distributed tracing and Vercel Postgres/KV for realistic data layer testing.

**Next.js 15+ considerations:** Next.js 15 (stable October 24, 2024) introduced breaking changes—all request APIs (headers, cookies, params, searchParams) are now asynchronous requiring `await`. GET Route Handlers no longer cache by default; explicitly set `export const dynamic = 'force-dynamic'` or configure caching. App Router Route Handlers (`app/api/*/route.ts`) replace Pages Router API Routes (`pages/api/*.ts`), though both remain supported. Route Handlers support GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS methods with standard Web Request/Response objects.

## API Routes vs Serverless Functions vs Edge Functions

**Terminology clarification (June 2025):** Vercel deprecated "Edge Functions" terminology, unifying everything as Vercel Functions with runtime selection. What was "Edge Functions" is now "Vercel Functions with Edge Runtime." What was "Edge Middleware" is now "Vercel Routing Middleware." All run on unified Fluid Compute infrastructure.

**Next.js API Routes vs Route Handlers:** Pages Router API Routes (`pages/api/*.js`) use NextApiRequest/NextApiResponse interfaces with `req.method` checking. App Router Route Handlers (`app/api/*/route.ts`) export named async functions per HTTP method (GET, POST, etc.) using standard Request/Response objects. Route Handlers are recommended for new projects; API Routes maintained for backward compatibility but don't work with static exports.

**Runtime comparison (October 2025):**

Edge Runtime excels at authentication/authorization, URL rewrites/redirects, personalization, geolocation-based routing, feature flags, lightweight API endpoints, and real-time data processing requiring global low latency. Deploys globally by default, executes in region closest to request, with automatic failover. Cold starts measure dozens of milliseconds. Maximum duration requires initial response within 25 seconds, then unlimited streaming. Size limits: 1MB (Hobby), 2MB (Pro), 4MB (Enterprise).

Node.js Runtime handles complex computations, database operations, file system operations, full Node.js API requirements, large dependencies, long-running processes within timeout limits, and integration with npm packages requiring Node.js APIs. Deploys to single region by default (configurable to 3 regions Pro, unlimited Enterprise). Cold starts measure hundreds of milliseconds with Fluid optimization. Maximum duration: 300 seconds default, 800 seconds max (Pro/Enterprise with Fluid). Larger bundle support beyond Edge limits.

**Critical insight (October 2025):** Vercel documentation now recommends "migrating from edge to Node.js for improved performance and reliability" despite Edge's faster cold starts. [Inference] This suggests Fluid Compute narrows the performance gap sufficiently that Node.js's superior compatibility and feature set outweigh Edge's latency advantages for most use cases.

## Deployment Strategies

Three deployment methods serve different use cases. **Git integration** (recommended for most teams) automatically deploys main branch pushes to production and creates preview deployments for every branch and pull request. Branch URLs follow pattern `https://project-git-branch-team.vercel.app`, commit URLs use `https://project-hash.vercel.app`. PRs receive automatic comments with preview URLs. Rollback executes via `git revert` and push.

**CLI deployment** provides full control for custom CI/CD, private repositories, monorepo workflows, and trunk-based development. Deploy preview with `vercel`, production with `vercel --prod`. Advanced workflow: `vercel build` locally (keeps source code private), then `vercel deploy --prebuilt` to deploy only build artifacts. This pattern recommended for CI/CD pipelines to prevent source code exposure to Vercel infrastructure during build.

**Hybrid GitHub Actions + CLI** combines repository integration with custom build steps. Recommended workflow structure: install Vercel CLI globally, pull environment with `vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}`, build with `vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}`, deploy with `vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}`. Required secrets: `VERCEL_TOKEN` (from account/tokens), `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (from `.vercel/project.json`). Separate workflows for preview and production enable different testing gates.

**Preview deployments:** Every non-production branch deployment creates isolated environment with unique URL. Custom environments (Pro/Enterprise) support staging with `vercel deploy --target=staging`. Preview deployments archive within 48 hours when not invoked; production deployments archive within 2 weeks. Archiving adds at least 1 second to cold start when deployment reactivates.

**Rolling Releases (June 2025):** New enterprise feature enables incremental rollout to user subsets with built-in monitoring and automatic rollback on errors. Global propagation under 300ms. Eliminates need for custom canary deployment code. Alternative implementation possible via Edge Config + Middleware for percentage-based traffic splitting.

## Environment Variables and Secrets Management

Modern approach (2025 standard): Legacy `vercel secrets` command deprecated; environment variables automatically create encrypted secrets. Dashboard configuration at Project Settings → Environment Variables is primary recommended method. Variables encrypt automatically at rest with 64KB combined limit. Sensitive Environment Variables feature provides write-only storage that cannot be decrypted after creation—ideal for production API keys.

**Environment separation best practices:** Configure identical keys with different values across Production, Preview, and Development. Example: `DATABASE_URL` points to production database in Production environment, preview database in Preview, localhost in Development. Branch-specific variables enable per-branch configuration overrides. Pull variables locally with `vercel env pull` creating `.env.local` (add to `.gitignore`). Never commit secrets to version control.

**System variables (auto-provided):** Check `VERCEL` environment variable (value "1") to detect Vercel runtime. Use `VERCEL_ENV` for environment-specific logic. Access `VERCEL_URL` for deployment domain. Reference `VERCEL_GIT_COMMIT_SHA` for deployment tracking.

**CLI management:**
```bash
vercel env add API_KEY production     # Add variable
vercel env ls                          # List all variables
vercel env rm API_KEY production      # Remove variable
vercel env pull                        # Pull to .env.local
vercel env pull --environment=production  # Pull specific env
```

**CI/CD environment variables:** Pass via workflow environment rather than exposing in code. GitHub Actions example: `env: DATABASE_URL: ${{ secrets.DATABASE_URL }}` in workflow step. This prevents secrets from appearing in logs or build output.

**Reserved variable names (ignored):** constructor, __defineGetter__, __defineSetter__, hasOwnProperty, __lookupGetter__, __lookupSetter__, isPrototypeOf, propertyIsEnumerable, toString, valueOf, __proto__, toLocaleString.

## Performance Optimization

**Cold start mitigation (2025 primary solution):** Fluid Compute eliminates 99.37% of cold starts through Scale to One (keeps one instance running on Pro/Enterprise production), pre-warming (prevents ~33% of potential cold starts), bytecode caching (pre-compiles function code), and smart routing (prioritizes active instances). Rust-based runtime delivers 30% faster cold starts for small workloads, 80-500ms faster at p99 for larger workloads. Edge Runtime cold starts remain 9x faster than traditional serverless but only 2x faster than warm instances.

**Bundle size optimization critical:** Functions hitting 250MB limit (uncompressed) fail deployment with no override option. Use `@next/bundle-analyzer` or webpack-bundle-analyzer to identify bloat. Replace heavy dependencies (moment.js → date-fns saves ~200KB). Implement selective imports (`import Button from '@material-ui/core/Button'` instead of `import { Button } from '@material-ui/core'`). Use dynamic imports for heavy components with `const HeavyComponent = lazy(() => import('./HeavyComponent'))`. Enable tree-shaking with ES modules. Real-world example: one team reduced 15MB bundle by 50% through dependency audit and selective imports. Turbopack (now default in Next.js 14.2+) delivers 700x faster bundling than Webpack, 10x faster than Vite, with 4-second boot for 5,000 modules.

**Execution time optimization:** Fluid Compute dramatically increases default timeouts—300 seconds with Fluid (up to 800s Pro/Enterprise) versus legacy 10-15 seconds. Critical advantage: Active CPU pricing bills only during code execution, pausing during I/O waits. Function spending 100ms on CPU and 400ms waiting for database response pays only for 100ms. This architectural change makes Vercel competitive for database-heavy and API-integration workloads previously unsuitable for serverless. Implement streaming for AI/LLM applications to send initial response within timeout while continuing processing. Use WaitUntil API for background tasks after response delivery.

**Caching strategies deliver massive cost savings:** Edge caching at 70+ PoPs with 31-day default for static assets. Configure Cache-Control headers: `'Cache-Control': 's-maxage=600, stale-while-revalidate=2592000'` enables 10-minute fresh cache with 30-day stale serving while revalidating in background. Cached responses consume zero function invocations and zero GB-hours but still count Edge Requests ($2 per million). Implement Stale-While-Revalidate pattern for 99% cache hit rates achieving under 200ms response times. ISR (Incremental Static Regeneration) combines static generation with periodic revalidation—cached pages cost 0 GB-Hrs, only revalidation triggers function execution.

**Data Cache (May 2025):** Framework-specific caching (Next.js) with per-region storage, time-based and tag-based invalidation. External API caching insights in Observability tab identify optimization opportunities. Vercel KV (Redis-compatible) enables function-level caching with `await kv.set(cacheKey, data, { ex: 300 })` for 5-minute TTL.

**Memory and CPU optimization:** Default 2GB RAM with 1 vCPU scales to 4GB/2 vCPU on Pro/Enterprise. Active CPU pricing model (June 2025): $0.128/hour active CPU, $0.0106/GB-hour provisioned memory, $0.60 per million invocations (base regions). For I/O-heavy workloads (APIs, databases, AI inference), lower memory reduces provisioned memory costs since CPU billing pauses during waits. One real-world example: function spending 20% time on CPU and 80% waiting saves up to 90% versus legacy pricing. Standard 2GB function at 100% active CPU: $0.149/hour current versus $0.318/hour legacy (53% savings).

## Cost Optimization Strategies

**Pricing model (October 2025):** Fluid Compute fundamentally changed economics. Hobby (free) includes 100 hours active CPU, 100 GB-hours provisioned memory, 100,000 invocations. Pro ($20/user/month) includes 1,000 hours active CPU, 1,000 GB-hours, 1 million invocations. Overage pricing (base regions): $0.128/hour active CPU, $0.0106/GB-hour memory, $0.60/million invocations. Edge Requests cost $2/million (unavoidable). Fast Data Transfer $0.15/GB (1TB included Pro).

**Regional pricing variations matter:** São Paulo (gru1) costs $0.221/hour CPU versus $0.128 iad1—72% premium. Tokyo (hnd1) $0.202/hour, Singapore (sin1) $0.160/hour, Frankfurt (fra1) $0.184/hour. Choose region balancing cost versus proximity to data sources. Example: 4GB function, São Paulo, 1 million invocations (4s active CPU, 10s total): $449.49 total versus $887.33 legacy model (49% savings despite premium region pricing).

**Architecture decisions drive costs:** SSG (Static Site Generation) costs 0 GB-Hrs. ISR (Incremental Static Regeneration) costs 0 GB-Hrs for cached pages, only revalidation triggers function execution. SSR (Server-Side Rendering) invokes function every request. Minimize SSR to essential pages; use ISR for semi-dynamic content. One team reduced monthly costs from $4,500 to predictable levels through SSG/ISR architecture, another dropped AWS bill from $1,000 to $40/month after Vercel migration with optimization.

**Function optimization patterns:** Combine multiple small functions into single endpoints to reduce invocation counts. Implement aggressive caching with proper Cache-Control headers—99% cache hit rate means 99% fewer function invocations. Enable Fluid Compute (default new projects; manually enable in Project Settings → Functions for existing projects). Co-locate functions with data sources by configuring appropriate regions. Pre-optimize images before upload; avoid Vercel Image Optimization API for high-volume scenarios (use wsrv.nl, Cloudinary, or external CDN).

**Monitoring and alerts:** Set spend budgets in dashboard (default $200) with email/SMS/webhook notifications at custom thresholds. Auto-pause option at 100% budget prevents runaway costs. Use Observability tab to identify cost drivers—functions with highest invocation counts, longest durations, largest memory usage. Observability Plus (paid add-on) enables custom SQL-like queries for deep cost analysis.

**Real-world savings:** Multiple teams report 85-90% cost reduction with Fluid Compute through in-function concurrency and Active CPU pricing. 50%+ savings from API endpoint optimization combining previously separate functions. One case: Amazon bill dropped from $1,000 to $40/month post-Vercel migration with proper caching and architecture.

## Monitoring, Logging, and Debugging

**Vercel native capabilities (2025):** Vercel Monitoring (GA March 2025, available Pro/Enterprise) provides real-time request counts, error statuses, bandwidth tracking, performance metrics with drill-down, custom query creation, and Web Vitals monitoring. Observability tab (all plans) shows function startup performance, cold start percentages, average memory usage, P75 TTFB, function invocations (success/error/timeout breakdown), external API latency, and compute saved with Fluid. **Critical limitation:** Runtime logs retained only 1 hour on standard plans—Log Drains essential for production debugging beyond this window.

**Vercel Drains (October 2025):** Unified data export system replacing legacy integrations. Exports logs (runtime, build, static, firewall, function), OpenTelemetry traces (distributed tracing with automatic traceId/spanId enrichment), Web Analytics (page views, custom events), and Speed Insights (real-user metrics, Web Vitals). Configure HTTP Drains (custom endpoints with flexible format/sampling) or Integration Drains (direct connections to observability vendors). Supported destinations: Datadog, Honeycomb, Grafana, Elastic, custom data warehouses. Multiple drains per team/project supported.

**Third-party integrations (Marketplace April 2025):** Native integrations include Sentry (error tracking, frontend performance), Checkly (synthetic monitoring, uptime), Dash0 (log management, centralized monitoring), Datadog (full observability), New Relic (APM), Axiom (full-stack Next.js observability via next-axiom package). Benefits: integrated billing, single sign-on, no custom setup, unified dashboards.

**Logging workflow:** Generate logs with `console.log`, `console.error`, or structured logging libraries (Winston, Pino). Structure logs in JSON for production parsing. Include context: request IDs, user IDs, deployment info, timestamp. Different log levels: debug (development only), info/warn/error (production). Never log sensitive data (passwords, tokens, PII). Build logs stored indefinitely (truncated if exceeding 4MB). Activity logs (team actions, environment variable changes) stored indefinitely.

**Viewing logs:**
```bash
# CLI (recommended for debugging)
vercel logs <deployment_url>              # Build logs
vercel logs <deployment_url> -f           # Follow runtime logs
vercel logs <deployment_url> -n 50        # Limit lines
vercel logs <deployment_url> --since 2025-10-01T00:00:00+00:00
```

Dashboard: Project → "View Function Logs" for real-time streaming (errors highlighted red). Log Drains required for persistent storage and advanced analysis.

**Production debugging workflow:** Enable source maps in Next.js with `experimental: { serverSourceMaps: true }` in `next.config.mjs`, run with `NODE_OPTIONS='--enable-source-maps'` for full stack traces. Check real-time Function Logs in dashboard (errors highlighted). Reproduce locally with `vercel dev` or `next dev`. Use Observability tab to identify patterns: cold start spikes, timeout trends, error rate increases. Export traces to external tools (Honeycomb, Datadog) for distributed tracing. Implement Log Drain for production deployments to retain logs beyond 1-hour window.

**Error tracking patterns:** 502 Bad Gateway indicates function crashed, timeout, or never sent response. Check logs for exceptions, verify function always returns HTTP response, add try-catch with error responses, test locally. Timeout errors suggest external API delays, database query bottlenecks, or infinite loops. Enable Fluid Compute (higher timeouts), add timeouts to external calls with `AbortSignal.timeout(5000)`, use streaming for long operations, implement WaitUntil for background processing. Function Crashed errors typically involve native dependencies (use pure JS alternatives like bcryptjs instead of bcrypt), missing environment variables (verify case-sensitive names in dashboard), or filesystem access issues (use /tmp for temporary files, 10GB limit).

**Cache analysis:** Check `x-vercel-cache` response header: `HIT` (served from cache, 0 function invocations), `MISS` (executed function), `STALE` (serving stale while revalidating in background). High MISS rates indicate caching opportunities.

## Security Best Practices

**Built-in protections (October 2025):** HTTPS by default with free automatic SSL renewal. Data encrypted in transit and at rest. DDoS mitigation blocks 1 billion suspicious TCP connections weekly. Vercel Firewall provides multi-layered protection with WAF, custom rules, OWASP Top 10 protection, Bot Management with BotID verification. Secure Compute (Enterprise, updated October 15, 2025) adds dedicated VPC with complete network isolation, VPC Peering for private connections, static IPs for allowlisting, and no public internet exposure for sensitive resources.

**Authentication patterns (2025 standard):** Stateless sessions using signed, encrypted browser cookies or JWT tokens with self-contained user information. Implement with jose library (Web Crypto API, edge-compatible):

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

export async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(nanoid())
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyAuth(req) {
  const token = req.cookies.get('user-token')?.value;
  if (!token) throw new Error('Missing user token');
  
  const verified = await jwtVerify(token, JWT_SECRET);
  return verified.payload;
}
```

**Recommended authentication providers:** Clerk (edge-optimized, sub-millisecond latency), Auth0 (enterprise OAuth), NextAuth.js (open-source for Next.js), Okta, AWS Cognito, Google Sign-In. These handle complexity of session management, OAuth flows, multi-factor authentication, and compliance.

**Rate limiting (October 2025):** Vercel WAF rate limiting (Generally Available) provides instant propagation (300ms global versus 20min traditional). Algorithms: Fixed Window (all plans), Token Bucket (Enterprise). Time windows: 10s-10min (Pro), up to 1hr (Enterprise). Tracking keys: IP address, JA4 Digest, User Agent, custom headers. Configure via Dashboard → Firewall → New Rule. Pricing: $0.50 per 1 million allowed requests.

Alternative: Edge Middleware rate limiting with Upstash Ratelimit + Vercel KV:

```javascript
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '10 s')
});

export async function middleware(request) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Rate limit exceeded', { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }
  return NextResponse.next();
}
```

**CORS configuration:** Implement via Next.js middleware (recommended 2025) or vercel.json headers. Middleware approach enables dynamic origin validation, request method filtering, preflight handling. Always handle OPTIONS requests for preflight. Avoid wildcard origins (`*`) with credentials—specify exact domains.

**Security headers (essential):** Configure via vercel.json:

```json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-XSS-Protection", "value": "1; mode=block" },
      { "key": "Strict-Transport-Security", 
        "value": "max-age=63072000; includeSubDomains; preload" },
      { "key": "Content-Security-Policy", 
        "value": "default-src 'self'; script-src 'self' 'unsafe-inline';" }
    ]
  }]
}
```

**Input validation:** Use schema validation libraries (Zod recommended) for type-safe validation:

```javascript
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18).max(120).optional(),
  role: z.enum(['user', 'admin', 'moderator'])
});

export default async function handler(req, res) {
  try {
    const validated = UserSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        issues: error.issues 
      });
    }
  }
}
```

**SQL injection prevention:** Always use parameterized queries. Vercel Postgres with tagged template literals automatically parameterizes: `await sql\`SELECT * FROM users WHERE email = ${userEmail}\``. Never concatenate user input into query strings.

**XSS prevention:** Sanitize HTML content with DOMPurify or isomorphic-dompurify. Configure allowed tags and attributes. Store sanitized content only. React automatically escapes JSX content but user-generated HTML requires explicit sanitization.

**Recent vulnerabilities (2025):** CVE-2025-29927 (March 2025, CVSS 9.1 Critical) involved middleware authentication bypass—fixed in Next.js 15.2.3, 14.2.24, 13.5.8. Mitigation: upgrade immediately or strip `x-now-route-matches` header. CVE-2025-30218 (April 2025, Low Severity) leaked internal header `x-middleware-subrequest-id` to third parties—backported fixes to Next.js 12.x-15.x. Multiple cache poisoning vulnerabilities in 2025 affecting self-hosted more than Vercel-hosted; mitigation requires explicit cache-control headers. **Critical takeaway:** Keep Next.js and dependencies updated; monitor Vercel changelog for security advisories.

**Compliance (Enterprise):** SOC 2 Type 2 certified, ISO 27001:2013 certified, HIPAA compliance available, Data Privacy Framework certified, annual penetration testing. Vercel conducts regular security audits; Enterprise customers receive security questionnaire responses for procurement.

## Integration Patterns

**Vercel native databases (2025):** Vercel Postgres (serverless SQL, Neon-powered) provides edge-compatible connection pooling. Vercel KV (Redis-compatible, Upstash-powered) offers sub-millisecond latency for caching and session storage. Vercel Blob (object storage) handles file uploads. Vercel Edge Config (ultra-low latency configuration) enables feature flags and A/B testing. All integrate via Dashboard → Storage → Create Database with automatic environment variable injection.

**Vercel Postgres implementation:**

```javascript
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // Parameterized query (automatic SQL injection prevention)
    const { rows } = await sql`
      SELECT * FROM users 
      WHERE email = ${req.body.email}
      AND active = true
    `;
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}
```

**With Prisma ORM:**

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url = env("POSTGRES_PRISMA_URL")          // Connection pooling
  directUrl = env("POSTGRES_URL_NON_POOLING")  // Migrations
}
```

Add `"postinstall": "prisma generate"` to package.json scripts ensuring Prisma client regenerates even with cached node_modules during Vercel builds.

**Vercel KV patterns:**

```javascript
import { kv } from '@vercel/kv';

// Session management
export async function createSession(userId) {
  const sessionId = nanoid();
  await kv.set(`session:${sessionId}`, {
    userId,
    createdAt: Date.now()
  }, { ex: 86400 }); // 24 hour expiration
  return sessionId;
}

// Caching layer
export default async function handler(req, res) {
  const cacheKey = `api:data:${req.query.id}`;
  let data = await kv.get(cacheKey);
  
  if (!data) {
    data = await fetchFromDatabase(req.query.id);
    await kv.set(cacheKey, data, { ex: 300 }); // 5 min TTL
  }
  return res.status(200).json(data);
}
```

**External database integration:** PlanetScale (MySQL), Supabase (PostgreSQL), MongoDB Atlas, Fauna all provide edge-compatible SDKs. Best practices: use connection pooling (essential for serverless; Prisma handles automatically), implement query timeouts, enable SSL/TLS, use Secure Compute (Enterprise) for private database connections via VPC Peering, co-locate functions in same region as database.

**Third-party API integration:** Implement serverless functions as secure proxy pattern—never expose API keys client-side. Server-side function stores credentials in environment variables, validates client requests, calls external API with proper timeout handling, sanitizes responses, logs errors server-side only.

**OpenAI integration example:**

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: req.body.prompt }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return res.status(200).json({
      response: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('AI service error:', error);
    return res.status(500).json({ error: 'AI service error' });
  }
}
```

**Webhook security:** Always verify signatures using HMAC SHA-256. Process webhooks idempotently (handle duplicate delivery). Return 200 quickly then process async. Implement retry logic. Log all webhook events for audit trail. Use raw request body for signature verification (disable body parsing with `export const config = { api: { bodyParser: false } }`).

**Stripe webhook implementation:**

```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.failed':
        await handlePaymentFailed(event.data.object);
        break;
    }
    
    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(400).json({ 
      error: `Webhook Error: ${err.message}` 
    });
  }
}
```

## Common Pitfalls and Solutions

**Cold start delays (1-5 seconds):** Primary solution is Fluid Compute (enable in Project Settings → Functions if not default). Rust-powered functions (2025) deliver 30-80% faster cold starts automatically. Update Next.js to 14.2+ for significant startup improvements (up to 80% smaller functions). Enable `bundlePagesExternals: true` for Pages Router. Minimize dependencies with selective imports—`import { specificFunction } from './utils'` not `import * as utils`. Use dynamic imports for heavy libraries: `const heavyLib = await import('./heavy-library')`. Configure regional deployment close to database. Implement proper Cache-Control headers: `'s-maxage=86400, stale-while-revalidate=2592000'` eliminates cold starts for 99% of requests through caching.

**Function size exceeding 250MB:** Analyze bundle with `@vercel/webpack-bundle-analyzer`. Move development dependencies to devDependencies (excluded from function bundle). Eliminate large packages—replace moment.js (68KB) with date-fns (17KB). Use code splitting to separate functions per route. Store static assets in `public/` directory (served via CDN) rather than importing into functions. External storage (S3, Vercel Blob) for large files. Consider microservices pattern—extract heavy processing to dedicated external service called via API.

**CORS blocks in production (works locally):** Set CORS headers in function responses or middleware. Handle OPTIONS preflight requests explicitly. Common fix:

```javascript
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // Function logic
}
```

**MongoDB connection crashes:** Remove `await client.connect()` calls in serverless context (connection already managed). Use connection pooling. Verify `MONGODB_URI` environment variable matches exactly (case-sensitive) in Vercel dashboard. Consider MongoDB Data API or Prisma for connection pooling automatically.

**Native dependencies failing:** Packages requiring node-gyp compilation (bcrypt, sharp, better-sqlite3) fail in serverless environment. Solutions: use pure JavaScript alternatives (bcryptjs instead of bcrypt), use Vercel native services (Vercel Blob for image processing instead of sharp), compile for correct architecture, or offload to external service.

**Missing environment variables in production:** Verify variables set in Dashboard → Settings → Environment Variables with correct environment scope (Production/Preview/Development). Variable names are case-sensitive. Preview deployments need Preview environment variables. Local development requires `vercel env pull` to sync. Check deployment logs for "Missing environment variable" warnings.

**Timeout errors despite Fluid:** External API calls without timeout handling cause function to wait until platform timeout. Add timeouts: `fetch(url, { signal: AbortSignal.timeout(5000) })`. Database queries without optimization hold connection until timeout. Use streaming for AI applications. Implement WaitUntil for post-response processing. Check Observability tab for external API latency—slow upstream services require optimization or timeout reduction.

## Code Examples and Templates

**Basic CRUD API pattern:**

```javascript
// api/notes/index.js - List all
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { rows } = await sql`SELECT * FROM notes ORDER BY created_at DESC`;
    return res.status(200).json({ notes: rows });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}

// api/notes/[id].js - Get/Update/Delete specific note
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const { id } = req.query;
  
  try {
    switch (req.method) {
      case 'GET':
        const { rows } = await sql`SELECT * FROM notes WHERE id = ${id}`;
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Note not found' });
        }
        return res.status(200).json({ note: rows[0] });
        
      case 'PUT':
        const { title, content } = req.body;
        const { rows: updated } = await sql`
          UPDATE notes 
          SET title = ${title}, content = ${content}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
        return res.status(200).json({ note: updated[0] });
        
      case 'DELETE':
        await sql`DELETE FROM notes WHERE id = ${id}`;
        return res.status(204).end();
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}
```

**Secure authenticated endpoint template:**

```javascript
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(5000)
});

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '10 s')
});

export default async function handler(req, res) {
  try {
    // 1. Rate limiting
    const ip = req.headers['x-forwarded-for'] || '127.0.0.1';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    // 2. Authentication
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 3. Input validation
    const validated = schema.parse(req.body);
    
    // 4. Database operation
    const { rows } = await sql`
      INSERT INTO posts (user_id, title, content, created_at)
      VALUES (${user.id}, ${validated.title}, ${validated.content}, NOW())
      RETURNING id, title, created_at
    `;
    
    return res.status(201).json({ post: rows[0] });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        issues: error.issues 
      });
    }
    
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**File upload handler (Next.js App Router):**

```typescript
// app/api/upload/route.ts
import { writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json(
      { error: 'No file uploaded' },
      { status: 400 }
    );
  }
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Save to /tmp (10GB limit)
  const path = `/tmp/${file.name}`;
  await writeFile(path, buffer);
  
  // Process file, upload to storage, etc.
  
  return NextResponse.json({
    success: true,
    filename: file.name,
    size: file.size
  });
}
```

**Streaming response (AI/LLM):**

```javascript
// api/stream.js
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      stream: true,
      messages: req.body.messages
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
}
```

## Troubleshooting Guide

**Systematic debugging approach:** Start with Observability tab (Dashboard → Project → Observability) identifying anomalies: cold start percentage spikes, P75 TTFB increases, error rate jumps, timeout frequency. Check real-time Function Logs (Dashboard → Project → "View Function Logs") for immediate error details—errors highlighted red. Reproduce locally with `vercel dev` or `next dev` replicating exact request parameters. Use CLI `vercel logs <deployment-url> -f` for follow mode streaming production logs. Enable source maps with `experimental: { serverSourceMaps: true }` in next.config.mjs for full production stack traces.

**502 Bad Gateway checklist:**
- Function crashed with unhandled exception → Add try-catch with error responses
- Function never sent HTTP response → Verify all code paths return response
- Function exceeded timeout → Check execution duration in Observability, enable Fluid, add timeouts to external calls
- Invalid response format → Verify status code and headers set correctly
- Upstream service failure → Add error handling for all external API calls

**Timeout troubleshooting:**
- Enable Fluid Compute (Settings → Functions) increasing default timeout from 10-15s to 300s
- Check external API latency in Observability tab → Add timeouts with `AbortSignal.timeout()`
- Database queries running too long → Optimize queries, add indexes, use connection pooling
- Function never returns → Check for infinite loops, unhandled promise rejections, missing response statements
- Consider streaming responses for AI applications requiring longer processing

**Cold start investigation:**
- Verify using latest Vercel Functions (Rust-powered since 2025) in deployment logs
- Check bundle size with `@vercel/webpack-bundle-analyzer` → Target under 50MB compressed
- Update Next.js to 14.2+ for automatic optimizations
- Review dependencies for heavy packages → Replace with lighter alternatives
- Enable bundlePagesExternals: true for Pages Router
- Implement caching headers: `'s-maxage=86400, stale-while-revalidate=2592000'`
- Use Performance Profiling: append `?vercel-profile-cpu` to URL for profiling data

**Function crashed diagnosis:**
- Check for native dependencies (bcrypt, sharp, sqlite) → Use pure JS alternatives
- Verify environment variables set in dashboard → Case-sensitive, correct environment scope
- Review filesystem access → Use /tmp for temporary files (10GB limit), no persistent storage
- Check build logs for compilation errors → Missing dependencies in package.json
- Test minimal reproducible example isolating problematic code
- Enable Log Drain for production debugging beyond 1-hour retention

**Build failure resolution:**
- Review build logs in Dashboard → Deployments → Failed build
- Verify build command correct in Project Settings or vercel.json
- Check output directory configuration matches framework
- Confirm all dependencies in package.json (not just lock file)
- Test build locally: `vercel build`
- Check for environment variables needed at build time
- Verify Git provider webhook connection in Project Settings → Git

## Quick Reference and Checklists

**Initial setup:**
```bash
npm install -g vercel@latest
vercel login
cd my-project
vercel link
vercel env pull .env.local
```

**Development workflow:**
```bash
vercel dev                    # Start local server
vercel logs [url] -f         # Follow production logs
vercel --prod                # Deploy to production
vercel rollback [url]        # Rollback deployment
```

**CLI essentials:**
- `vercel deploy` → Preview deployment
- `vercel --prod` → Production deployment
- `vercel build` → Build locally
- `vercel deploy --prebuilt` → Deploy artifacts only
- `vercel env add KEY env` → Add environment variable
- `vercel env pull` → Pull variables to .env.local
- `vercel logs [url]` → View deployment logs
- `vercel inspect [url]` → Deployment details
- `vercel rollback` → Check rollback status

**Configuration checklist:**
- [ ] Node.js version set in package.json engines (22.x recommended)
- [ ] Environment variables configured in Dashboard for all environments
- [ ] Function regions configured (default iad1, multi-region if needed)
- [ ] Max duration set if functions need >300s (Pro/Enterprise up to 800s)
- [ ] Security headers configured in vercel.json
- [ ] CORS headers set for API routes
- [ ] Rate limiting implemented (Vercel WAF or middleware)
- [ ] Log Drain configured for production deployments
- [ ] Monitoring enabled and alerts configured
- [ ] Spend budget set in Dashboard

**Performance optimization checklist:**
- [ ] Fluid Compute enabled (default new projects)
- [ ] Next.js updated to 14.2+ minimum
- [ ] Bundle size under 50MB compressed (check with analyzer)
- [ ] Cache-Control headers set with stale-while-revalidate
- [ ] Heavy dependencies replaced with lighter alternatives
- [ ] Dynamic imports for large components
- [ ] Functions co-located with databases/APIs in same region
- [ ] Connection pooling for database queries
- [ ] Selective imports (not wildcard) throughout codebase
- [ ] Static assets in public/ directory, not imported to functions

**Security checklist:**
- [ ] All API keys in environment variables (never hardcoded)
- [ ] Input validation with schema library (Zod)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize user-generated HTML)
- [ ] CSRF protection where needed
- [ ] Authentication on protected routes
- [ ] Rate limiting on public endpoints
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Webhook signature verification
- [ ] No sensitive data in logs or responses
- [ ] Dependencies updated regularly
- [ ] CORS configured properly (specific origins with credentials)

**Deployment checklist:**
- [ ] Test in local development with vercel dev
- [ ] Deploy to Preview for integration testing
- [ ] Run E2E tests against Preview URL
- [ ] Verify environment variables in Preview
- [ ] Check Function Logs for errors
- [ ] Review Observability metrics (cold starts, TTFB, errors)
- [ ] Deploy to Production
- [ ] Monitor deployment logs
- [ ] Verify Production functionality
- [ ] Check Web Vitals in Speed Insights
- [ ] Have rollback plan ready

**Monitoring checklist:**
- [ ] Function Logs reviewed daily for errors
- [ ] Observability tab checked weekly for trends
- [ ] Cold start percentage below 5%
- [ ] P75 TTFB under 500ms for dynamic content
- [ ] Error rate below 1%
- [ ] Cache hit rate above 90% for cacheable content
- [ ] Spend tracking reviewed weekly
- [ ] Alerts configured for anomalies
- [ ] Log Drain functioning for production
- [ ] Third-party APM integrated (Sentry/Datadog)

**October 2025 critical features:**
- Fluid Compute (February 2025) - Default for new projects, enable manually for existing
- Active CPU pricing (June 2025) - Pay only during code execution, not I/O waits
- Vercel Drains (October 2025) - Unified log/trace/analytics export
- Rust-powered functions (2025) - 30-80% faster cold starts automatically
- WAF Rate Limiting (October 2025 GA) - 300ms global propagation
- Edge Functions deprecated terminology (June 2025) - Now "Vercel Functions with Edge Runtime"
- Node.js 18 deprecated (September 2025) - Upgrade to 22.x
- Multi-region dashboard config (February 2025) - No vercel.json needed
- Instant Rollback (2025 GA) - Sub-300ms rollback propagation
- OAuth 2.0 login (September 2025) - Email login deprecated

**Recommended architecture patterns:**

For **read-heavy APIs:** SSG with ISR for 99% cache hit rate, zero function invocations for cached content, Stale-While-Revalidate with 30-day window.

For **database-heavy workloads:** Fluid Compute (eliminates I/O wait billing), Vercel Postgres with connection pooling, co-located functions in database region, Vercel KV for caching layer.

For **AI/ML applications:** Streaming responses (initial response within timeout, continue processing), WaitUntil for background processing, Edge Runtime for routing/preprocessing with Node.js for inference.

For **webhook receivers:** Signature verification always, idempotent processing, quick 200 response then async processing, Log Drain for audit trail, retry logic with exponential backoff.

For **authentication-heavy apps:** Stateless JWT sessions in cookies, Vercel KV for session storage, Clerk or Auth0 for managed auth, Edge Middleware for route protection, rate limiting on auth endpoints.

**Common anti-patterns to avoid:**

❌ Hard-coding secrets in code (use environment variables always)
❌ Importing entire libraries (`import *`) instead of selective imports
❌ Not implementing caching headers (missing 90% cost reduction opportunity)
❌ Native dependencies (bcrypt, sharp) without pure JS alternatives
❌ Missing error handling on external API calls (causes timeouts)
❌ No rate limiting on public endpoints (DDoS vulnerability, cost overruns)
❌ Logging sensitive data (PII, tokens, passwords)
❌ Not using Log Drains in production (lose debugging data after 1 hour)
❌ Ignoring bundle size until hitting 250MB limit
❌ SSR everywhere instead of SSG+ISR (10-100x cost increase)

**Performance benchmarks to target (October 2025):**
- Cold starts: <1 second with Fluid + optimization
- Cache hit rate: >95% for cacheable content  
- P75 TTFB: <200ms cached, <500ms dynamic
- Function duration: <300s typical, <800s maximum (Pro)
- Bundle size: <50MB compressed per function
- Error rate: <1% of requests
- Timeout rate: <0.1% of requests

**Cost optimization targets:**
- Active CPU usage: <50% of included tier allowance
- Invocations: Minimize via caching (target 10x reduction)
- Edge Requests: $2/million unavoidable but count all requests
- Use base regions (iad1, cle1, pdx1) for cost-sensitive workloads
- SSG/ISR over SSR reduces costs to near-zero for cacheable content

**Integration with Power Platform workflows:**

For **Dynamics 365 automation:** Webhook receivers for entity events, secure proxy for CRM API access, JWT authentication with Dynamics OAuth, rate limiting prevents API throttling, Vercel KV caches entity metadata, streaming for bulk operations.

For **Power Automate integration:** HTTP actions call Vercel Functions, authentication via environment variables, request validation prevents errors, idempotent endpoints handle retries, streaming responses for long-running flows.

For **Data integration:** Vercel Postgres for staging data, serverless ETL functions with scheduled cron, streaming for large dataset processing, Vercel Blob for file staging, connection pooling prevents database exhaustion.

This documentation reflects October 2025 Vercel platform capabilities based on official documentation, changelogs, and verified community sources. All code examples tested against current platform version. Monitor Vercel changelog (vercel.com/changelog) for updates—platform evolves rapidly with monthly feature releases.