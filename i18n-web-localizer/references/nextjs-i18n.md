# Next.js i18n Implementation

## Table of Contents

1. [App Router with next-intl](#app-router-with-next-intl)
2. [Pages Router with next-i18next](#pages-router-with-next-i18next)
3. [Language Toggler](#language-toggler)
4. [SEO Considerations](#seo-considerations)

---

## App Router with next-intl

### Installation

```bash
npm install next-intl
```

### Project Structure

```
app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx
│   └── about/
│       └── page.tsx
├── globals.css
messages/
├── en.json
└── fr.json
middleware.ts
i18n/
├── request.ts
└── routing.ts
```

### Configuration

Create `i18n/routing.ts`:

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed' // or 'always' for /en/about style
});
```

Create `i18n/request.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

Create `middleware.ts`:

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(fr|en)/:path*']
};
```

Update `next.config.js`:

```javascript
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withNextIntl(nextConfig);
```

### Layout Setup

Create `app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Translation Files

Create `messages/en.json`:

```json
{
  "HomePage": {
    "title": "Welcome",
    "description": "This is the home page"
  },
  "Navigation": {
    "home": "Home",
    "about": "About"
  }
}
```

Create `messages/fr.json`:

```json
{
  "HomePage": {
    "title": "Bienvenue",
    "description": "Ceci est la page d'accueil"
  },
  "Navigation": {
    "home": "Accueil",
    "about": "À propos"
  }
}
```

### Usage in Components

**Server Component:**

```tsx
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('HomePage');
  
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </main>
  );
}
```

**Client Component:**

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function ClientComponent() {
  const t = useTranslations('Navigation');
  return <nav>{t('home')}</nav>;
}
```

### Linking Between Locales

```tsx
import { Link } from '@/i18n/routing';

// Automatically uses current locale
<Link href="/about">About</Link>

// Force specific locale
<Link href="/about" locale="fr">À propos</Link>
```

Create `i18n/routing.ts` with Link export:

```typescript
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

---

## Pages Router with next-i18next

### Installation

```bash
npm install next-i18next react-i18next i18next
```

### Configuration

Create `next-i18next.config.js`:

```javascript
/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
  },
  localePath: './public/locales',
};
```

Update `next.config.js`:

```javascript
const { i18n } = require('./next-i18next.config');

module.exports = {
  i18n,
};
```

### Translation Files

```
public/
└── locales/
    ├── en/
    │   └── common.json
    └── fr/
        └── common.json
```

### App Setup

Update `pages/_app.tsx`:

```tsx
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';

function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default appWithTranslation(App);
```

### Page Usage

```tsx
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';

export default function Home() {
  const { t } = useTranslation('common');
  
  return <h1>{t('title')}</h1>;
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'en', ['common'])),
  },
});
```

---

## Language Toggler

### App Router (next-intl)

```tsx
'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'fr' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button onClick={toggleLocale}>
      {locale === 'en' ? 'FR' : 'EN'}
    </button>
  );
}
```

### Pages Router (next-i18next)

```tsx
import { useRouter } from 'next/router';
import Link from 'next/link';

export function LanguageToggle() {
  const { locale, asPath } = useRouter();
  const newLocale = locale === 'en' ? 'fr' : 'en';

  return (
    <Link href={asPath} locale={newLocale}>
      {locale === 'en' ? 'FR' : 'EN'}
    </Link>
  );
}
```

---

## SEO Considerations

### Metadata with next-intl

```tsx
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'fr': '/fr',
      },
    },
  };
}
```

### Hreflang Tags

```tsx
// In layout or page
<link rel="alternate" hrefLang="en" href="https://example.com/en" />
<link rel="alternate" hrefLang="fr" href="https://example.com/fr" />
<link rel="alternate" hrefLang="x-default" href="https://example.com" />
```
