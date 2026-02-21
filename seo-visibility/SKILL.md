---
name: seo-visibility
description: Comprehensive SEO overhaul for React/TypeScript websites. Implements structured data (JSON-LD), enhanced meta tags, AI discoverability (llms.txt), robots.txt with AI crawler directives, sitemap improvements, and generates a detailed marketing action plan. Use when the user asks to (1) improve SEO for a website, (2) add structured data or schema markup, (3) make a site discoverable by AI chatbots, (4) create llms.txt files, (5) optimize meta tags, robots.txt, or sitemap, (6) generate an SEO action plan or marketing strategy, (7) add AI crawler directives, or (8) any request mentioning "SEO", "search engine optimization", "AI discoverability", "structured data", "schema markup", "llms.txt", or "search visibility".
---

# SEO Visibility Skill

Perform a comprehensive SEO overhaul on any React/TypeScript website, covering technical implementation, AI discoverability, and a detailed marketing action plan.

## Step 1: Gather Project Information

Ask the user for the following (skip what's already known from the codebase):

1. **Company name** and one-line description
2. **Location**: city, region, country, coordinates (optional)
3. **Services offered** with brief descriptions
4. **Pricing** (if public)
5. **SaaS products** (if any) with status (pre-launch, available)
6. **Languages supported** and locale URL structure (e.g., `/fr`, `/en`)
7. **Social media URLs** (LinkedIn, Twitter, GitHub, etc.)
8. **Contact info**: email, phone, address
9. **Target audience/market**
10. **Founding date, team size** (optional)

If working on an existing codebase, read the project structure first to infer as much as possible before asking.

## Step 2: Detect Project Structure

Identify:

- **SEO component**: Search for existing route-level SEO/meta management (`RouteSeo`, `Helmet`, `Meta`, etc.)
- **index.html**: Location and current meta tags
- **Public directory**: Location of `robots.txt`, `sitemap.xml`
- **Router setup**: Route structure, locale handling
- **Existing structured data**: Any JSON-LD already in place
- **Navigation components**: Header/Footer for aria-label additions

## Step 3: Implement Structured Data

Create a modular `structuredData.ts` file (or equivalent) in the SEO component directory. See [references/structured-data-schemas.md](references/structured-data-schemas.md) for all schema patterns.

Build these schemas adapted to the project:

1. **Organization** — company info, logo, contacts, social profiles, expertise, service areas
2. **WebSite** — linked to Organization via publisher
3. **LocalBusiness/ProfessionalService** — geo, pricing, offers catalog, languages
4. **WebPage** (dynamic per-page) — url, title, description, locale, dateModified
5. **BreadcrumbList** (dynamic per-page) — localized breadcrumbs
6. **Service ItemList** — for service pages
7. **FAQPage** — 8-12 FAQs in each supported language
8. **Pricing Offers** — for pricing pages (if public pricing exists)
9. **SoftwareApplication** — for SaaS product pages (if applicable)

Assign schema combinations per route type (see schema assignment table in reference).

## Step 4: Enhance SEO Component

Update the existing SEO/meta component. See [references/meta-tags-and-html.md](references/meta-tags-and-html.md) for patterns.

Add per-page:
- `keywords` meta tag
- Enhanced `robots`: `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
- Dynamic JSON-LD injection (clear on route change, rebuild per route)
- Canonical URL
- Hreflang alternates (if multilingual)

## Step 5: Enhance index.html

Add to `<head>`. See [references/meta-tags-and-html.md](references/meta-tags-and-html.md):

- Improved meta description with value proposition
- Expanded keywords (bilingual if applicable)
- Geo tags (`geo.region`, `geo.placename`)
- `referrer`, `format-detection`, `rating` meta
- Static hreflang tags (if multilingual)
- `dns-prefetch` and `preconnect` for external domains
- `theme-color` per `prefers-color-scheme`
- `og:image:alt` and `twitter:image:alt`
- AI discoverability link to `/llms.txt`
- Static Organization + WebSite JSON-LD as fallback

## Step 6: Create AI Discoverability Files

See [references/ai-discoverability.md](references/ai-discoverability.md) for templates.

1. **`public/llms.txt`** — Concise company summary following llms.txt standard
2. **`public/llms-full.txt`** — Comprehensive profile with services, pricing, FAQ, metadata

Adapt all content to the specific company. Include bilingual FAQ if multilingual site.

## Step 7: Update robots.txt

See robots.txt template in [references/meta-tags-and-html.md](references/meta-tags-and-html.md).

- Block admin/protected routes from all crawlers
- Add explicit `Allow` for AI crawlers: GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, ClaudeBot, Anthropic-ai, Cohere-ai, Meta-ExternalAgent, CCBot, Bytespider
- Allow `/llms.txt` and `/llms-full.txt` for GPTBot
- Include Sitemap directive

## Step 8: Update sitemap.xml

- Add `image:image` namespace and homepage image entries
- Update `lastmod` dates to current date
- Add `llms.txt` and `llms-full.txt` entries
- Ensure hreflang cross-references for all bilingual pages

## Step 9: Add Supporting Files

- **`public/.well-known/security.txt`** — RFC 9116 security contact (expiry 1 year out)
- **`public/humans.txt`** — Team and technology credits
- **`aria-label`** on navigation elements (Header, Footer)

## Step 10: Generate Documentation

Create `docs/SEO_IMPROVEMENTS.md` with:

1. **Summary table** of all technical changes
2. **Technical implementation details** for each file modified/created
3. **AI discoverability** section explaining what was done and why
4. **8-phase marketing action plan** — see [references/marketing-action-plan.md](references/marketing-action-plan.md):
   - Phase 1: Foundation (GBP, GSC, Bing, GA4, schema validation)
   - Phase 2: Directory & citations (tiered directories, NAP consistency)
   - Phase 3: Content & authority (pillar-cluster model, link building, reviews)
   - Phase 4: Social signals (LinkedIn strategy, other platforms)
   - Phase 5: Video & audio SEO (YouTube, podcast)
   - Phase 6: Email marketing (newsletter strategy)
   - Phase 7: PR & media (digital PR, expert sourcing)
   - Phase 8: Advanced technical (prerendering, CWV, ads)
5. **Monthly maintenance checklist** (weekly cadence)
6. **Competitor analysis process** (quarterly)
7. **Key metrics table** with tools and cadence
8. **Budget estimation**
9. **Priority order** for time-limited execution
10. **Content strategy** recommendations for AI discoverability
11. **Tools and resources** (free + paid)
12. **Files changed** table

Adapt all recommendations to the specific business: company name, services, location, languages, target market.

## Step 11: Validate

- Run the project's lint/typecheck/build commands to ensure no regressions
- List all files created/modified for the user's review
