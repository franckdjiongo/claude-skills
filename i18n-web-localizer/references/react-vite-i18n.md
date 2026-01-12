# React + Vite i18n with react-i18next

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Translation Files](#translation-files)
4. [Usage Patterns](#usage-patterns)
5. [Language Toggler](#language-toggler)
6. [Advanced Features](#advanced-features)

## Installation

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

## Configuration

Create `src/i18n/index.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    defaultNS: 'common',
    ns: ['common'],
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n;
```

Import in `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Translation Files

Create `public/locales/en/common.json`:

```json
{
  "nav": {
    "home": "Home",
    "about": "About",
    "contact": "Contact"
  },
  "button": {
    "submit": "Submit",
    "cancel": "Cancel",
    "save": "Save"
  },
  "language": {
    "en": "English",
    "fr": "Français"
  }
}
```

Create `public/locales/fr/common.json`:

```json
{
  "nav": {
    "home": "Accueil",
    "about": "À propos",
    "contact": "Contact"
  },
  "button": {
    "submit": "Soumettre",
    "cancel": "Annuler",
    "save": "Enregistrer"
  },
  "language": {
    "en": "English",
    "fr": "Français"
  }
}
```

## Usage Patterns

### Basic Hook Usage

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <nav>
      <a href="/">{t('nav.home')}</a>
      <a href="/about">{t('nav.about')}</a>
    </nav>
  );
}
```

### With Namespace

```tsx
const { t } = useTranslation('errors');
// Uses public/locales/{lng}/errors.json
```

### Interpolation

```tsx
// Translation: "Hello, {{name}}!"
t('greeting', { name: 'Armel' })
```

### Pluralization (ICU)

```json
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

```tsx
t('items', { count: 5 }) // "5 items"
```

### Trans Component (JSX in translations)

```tsx
import { Trans } from 'react-i18next';

// Translation: "Read our <link>terms</link> and <link2>privacy policy</link2>"
<Trans
  i18nKey="legal"
  components={{
    link: <a href="/terms" />,
    link2: <a href="/privacy" />
  }}
/>
```

## Language Toggler

### Simple Toggle

```tsx
import { useTranslation } from 'react-i18next';

function LanguageToggle() {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button onClick={toggleLanguage}>
      {i18n.language === 'en' ? 'FR' : 'EN'}
    </button>
  );
}
```

### Dropdown Select

```tsx
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

function LanguageSelect() {
  const { i18n } = useTranslation();
  
  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {languages.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
```

## Advanced Features

### Suspense Loading

```tsx
import { Suspense } from 'react';

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyTranslatedApp />
    </Suspense>
  );
}
```

### Update HTML Lang Attribute

```tsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function App() {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  
  return <>{/* ... */}</>;
}
```

### Date/Number Formatting

```tsx
const { i18n } = useTranslation();

// Dates
new Intl.DateTimeFormat(i18n.language, {
  dateStyle: 'long'
}).format(new Date())

// Numbers
new Intl.NumberFormat(i18n.language, {
  style: 'currency',
  currency: 'CAD'
}).format(1234.56)
```

### Lazy Loading Namespaces

```tsx
const { t } = useTranslation('dashboard', { useSuspense: false });
```
