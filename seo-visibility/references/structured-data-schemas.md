# Structured Data Schemas Reference

JSON-LD schema patterns for service-based websites. Adapt all values to the target project.

## Organization Schema

```typescript
function buildOrganizationSchema(config: SeoConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${config.siteUrl}/#organization`,
    name: config.companyName,
    url: config.siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${config.siteUrl}/logo.png`,
      width: 512,
      height: 512,
    },
    description: config.description,
    foundingDate: config.foundingDate,
    numberOfEmployees: config.employeeCount,
    slogan: config.slogan,
    contactPoint: config.languages.map((lang) => ({
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: lang,
      url: `${config.siteUrl}/${lang}/contact`,
    })),
    sameAs: config.socialUrls, // LinkedIn, Twitter, GitHub, etc.
    knowsAbout: config.expertiseAreas,
    areaServed: config.serviceAreas.map((area) => ({
      '@type': area.type, // 'Country', 'State', 'City'
      name: area.name,
    })),
  };
}
```

## WebSite Schema

```typescript
function buildWebSiteSchema(config: SeoConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${config.siteUrl}/#website`,
    url: config.siteUrl,
    name: config.companyName,
    publisher: { '@id': `${config.siteUrl}/#organization` },
    inLanguage: config.languages.map((l) => `${l}-${config.countryCode}`),
  };
}
```

## LocalBusiness / ProfessionalService Schema

Use `ProfessionalService` for consulting/tech firms. Use `LocalBusiness` for physical storefronts.

```typescript
function buildLocalBusinessSchema(config: SeoConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${config.siteUrl}/#localbusiness`,
    name: config.companyName,
    url: config.siteUrl,
    telephone: config.phone,
    email: config.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: config.city,
      addressRegion: config.region,
      addressCountry: config.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: config.latitude,
      longitude: config.longitude,
    },
    priceRange: config.priceRange, // e.g., '$$'
    currenciesAccepted: config.currency, // e.g., 'CAD'
    paymentAccepted: config.paymentMethods?.join(', '),
    knowsLanguage: config.languages,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: config.services.map((s, i) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          description: s.description,
        },
        position: i + 1,
      })),
    },
  };
}
```

## WebPage Schema (per-page, dynamic)

```typescript
function buildWebPageSchema(config: SeoConfig, page: PageMeta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': page.url,
    url: page.url,
    name: page.title,
    description: page.description,
    inLanguage: page.locale,
    isPartOf: { '@id': `${config.siteUrl}/#website` },
    about: { '@id': `${config.siteUrl}/#organization` },
    dateModified: new Date().toISOString().split('T')[0],
  };
}
```

## BreadcrumbList Schema (per-page, dynamic)

```typescript
function buildBreadcrumbSchema(config: SeoConfig, page: PageMeta) {
  const items = [
    { name: page.locale === 'fr' ? 'Accueil' : 'Home', url: `${config.siteUrl}/${page.locale}` },
  ];
  if (page.breadcrumbLabel) {
    items.push({ name: page.breadcrumbLabel, url: page.url });
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

## Service ItemList Schema

```typescript
function buildServiceListSchema(config: SeoConfig, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: locale === 'fr' ? 'Nos services' : 'Our Services',
    itemListElement: config.services.map((s, i) => ({
      '@type': 'Service',
      position: i + 1,
      name: s.localizedNames[locale],
      description: s.localizedDescriptions[locale],
      serviceType: s.type,
      category: s.category,
      provider: { '@id': `${config.siteUrl}/#organization` },
      areaServed: config.serviceAreas.map((a) => ({ '@type': a.type, name: a.name })),
    })),
  };
}
```

## FAQPage Schema

```typescript
function buildFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
```

## Pricing Offers Schema

```typescript
function buildPricingSchema(
  config: SeoConfig,
  plans: Array<{
    name: string;
    price: number;
    priceCurrency: string;
    unitCode: string; // 'MON' for monthly, 'HUR' for hourly
    description: string;
  }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Pricing Plans',
    itemListElement: plans.map((plan, i) => ({
      '@type': 'Offer',
      position: i + 1,
      name: plan.name,
      description: plan.description,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: plan.price,
        priceCurrency: plan.priceCurrency,
        unitCode: plan.unitCode,
      },
    })),
  };
}
```

## SoftwareApplication Schema

```typescript
function buildSoftwareSchema(app: {
  name: string;
  description: string;
  url: string;
  category: string;
  availability: string; // 'PreOrder', 'InStock', 'OutOfStock'
  os: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    description: app.description,
    url: app.url,
    applicationCategory: app.category,
    operatingSystem: app.os,
    offers: { '@type': 'Offer', availability: `https://schema.org/${app.availability}` },
  };
}
```

## Schema Assignment per Route

| Route       | Schemas                                                           |
| ----------- | ----------------------------------------------------------------- |
| Home        | Organization + WebSite + WebPage + Breadcrumbs + LocalBusiness + FAQ |
| Services    | Organization + WebSite + WebPage + Breadcrumbs + Service ItemList |
| Pricing     | Organization + WebSite + WebPage + Breadcrumbs + Pricing Offers   |
| Contact     | Organization + WebSite + WebPage + Breadcrumbs + LocalBusiness    |
| About       | Organization + WebSite + WebPage + Breadcrumbs                    |
| SaaS pages  | Organization + WebSite + WebPage + Breadcrumbs + SoftwareApplication |
| Blog posts  | Organization + WebSite + WebPage + Breadcrumbs + Article          |
| Portfolio   | Organization + WebSite + WebPage + Breadcrumbs                    |

## SeoConfig Type

```typescript
interface SeoConfig {
  companyName: string;
  siteUrl: string;
  description: string;
  foundingDate?: string;
  employeeCount?: string;
  slogan?: string;
  phone?: string;
  email?: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  priceRange?: string;
  currency?: string;
  paymentMethods?: string[];
  languages: string[];
  socialUrls: string[];
  expertiseAreas: string[];
  serviceAreas: Array<{ type: string; name: string }>;
  services: Array<{
    name: string;
    description: string;
    type: string;
    category: string;
    localizedNames: Record<string, string>;
    localizedDescriptions: Record<string, string>;
  }>;
}

interface PageMeta {
  url: string;
  title: string;
  description: string;
  locale: string;
  breadcrumbLabel?: string;
}
```
