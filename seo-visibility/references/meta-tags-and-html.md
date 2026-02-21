# Meta Tags & HTML Enhancement Reference

Comprehensive meta tag patterns for `index.html` and per-route SEO components.

## index.html Enhancements

Add/update these elements in `<head>`:

### Core Meta Tags

```html
<meta name="description" content="[Company] — [value proposition]. [CTA]." />
<meta name="keywords" content="[keyword1], [keyword2], [bilingual terms]" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
<meta name="author" content="[Company Name]" />
<meta name="rating" content="general" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<meta name="format-detection" content="telephone=no" />
```

### Geo Tags (local SEO)

```html
<meta name="geo.region" content="[CC-RR]" />  <!-- e.g., CA-QC, US-CA -->
<meta name="geo.placename" content="[City]" />
```

### Hreflang Tags (multilingual)

For each language supported, add static hreflang in `<head>`:

```html
<link rel="alternate" hreflang="fr" href="https://[domain]/fr" />
<link rel="alternate" hreflang="en" href="https://[domain]/en" />
<link rel="alternate" hreflang="x-default" href="https://[domain]/fr" />
```

### Theme Color (per color scheme)

```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
```

### Performance Hints

```html
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<!-- Add dns-prefetch for any external domains: analytics, CDNs, APIs -->
```

### AI Discoverability Link

```html
<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable company info" />
```

### Open Graph

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="[Company Name]" />
<meta property="og:title" content="[Page Title]" />
<meta property="og:description" content="[Description]" />
<meta property="og:url" content="https://[domain]" />
<meta property="og:image" content="https://[domain]/og-image.png" />
<meta property="og:image:alt" content="[Descriptive alt text]" />
<meta property="og:locale" content="[locale]" />
```

### Twitter Card

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[Page Title]" />
<meta name="twitter:description" content="[Description]" />
<meta name="twitter:image" content="https://[domain]/og-image.png" />
<meta name="twitter:image:alt" content="[Descriptive alt text]" />
<meta name="twitter:url" content="https://[domain]" />
```

## Per-Route SEO Component

The SEO component should dynamically set per-page:

1. `<title>` — keyword-optimized, unique per page
2. `<meta name="description">` — compelling, under 160 chars
3. `<meta name="keywords">` — relevant terms for the page
4. `<meta name="robots">` — `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
5. `<link rel="canonical">` — canonical URL for the page
6. `<link rel="alternate" hreflang="...">` — per-page hreflang pairs
7. Open Graph tags — per-page title, description, url, image
8. Twitter Card tags — matching OG
9. JSON-LD structured data — route-specific schema combinations (see structured-data-schemas.md)

### Dynamic JSON-LD Injection Pattern

```typescript
// Clear previous JSON-LD on route change, inject new schemas
useEffect(() => {
  document.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove());
  const schemas = getSchemaForRoute(routeKey, locale);
  schemas.forEach((schema) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
  return () => document.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove());
}, [routeKey, locale]);
```

## robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/

# AI Crawlers
User-agent: GPTBot
Allow: /
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /admin/

User-agent: ChatGPT-User
Allow: /
Disallow: /admin/

User-agent: Google-Extended
Allow: /
Disallow: /admin/

User-agent: PerplexityBot
Allow: /
Disallow: /admin/

User-agent: ClaudeBot
Allow: /
Disallow: /admin/

User-agent: Anthropic-ai
Allow: /
Disallow: /admin/

User-agent: Cohere-ai
Allow: /
Disallow: /admin/

User-agent: Meta-ExternalAgent
Allow: /
Disallow: /admin/

User-agent: CCBot
Allow: /
Disallow: /admin/

User-agent: Bytespider
Allow: /
Disallow: /admin/

Sitemap: https://[domain]/sitemap.xml
```

## sitemap.xml Enhancements

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- For each page, include hreflang alternates -->
  <url>
    <loc>https://[domain]/fr</loc>
    <xhtml:link rel="alternate" hreflang="fr" href="https://[domain]/fr"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://[domain]/en"/>
    <lastmod>2026-02-21</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <!-- Homepage image entries -->
    <image:image>
      <image:loc>https://[domain]/og-image.png</image:loc>
      <image:title>[Company Name]</image:title>
    </image:image>
  </url>
  <!-- Add llms.txt entries -->
  <url>
    <loc>https://[domain]/llms.txt</loc>
    <lastmod>2026-02-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

## Accessibility (SEO-relevant)

```html
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Footer navigation">...</nav>
```

## Supporting Files

### security.txt (`public/.well-known/security.txt`)

```
Contact: mailto:security@[domain]
Expires: [one year from now, ISO 8601]
Preferred-Languages: [languages]
Canonical: https://[domain]/.well-known/security.txt
```

### humans.txt (`public/humans.txt`)

```
/* TEAM */
[Role]: [Name]
Site: [URL]
Location: [City, Country]

/* TECHNOLOGY */
Framework: [React, Vue, etc.]
Build: [Vite, Webpack, etc.]
Language: [TypeScript, etc.]
Hosting: [Provider]
```
