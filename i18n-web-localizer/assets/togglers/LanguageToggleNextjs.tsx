/**
 * Language Toggle Components for Next.js App Router + next-intl
 * Requires: next-intl configured with routing
 */

'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';

// ============================================
// OPTION 1: Simple Button Toggle (EN/FR)
// ============================================
export function LanguageToggleButton() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'fr' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={toggleLocale}
      className="px-3 py-1.5 text-sm font-medium rounded-md 
                 bg-neutral-800 text-neutral-200 
                 hover:bg-neutral-700 transition-colors"
      aria-label={`Switch to ${locale === 'en' ? 'French' : 'English'}`}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </button>
  );
}

// ============================================
// OPTION 2: Dropdown Select
// ============================================
export function LanguageSelect() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const languages = [
    { code: 'en', label: 'English', flag: '🇨🇦' },
    { code: 'fr', label: 'Français', flag: '🇨🇦' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(pathname, { locale: e.target.value });
  };

  return (
    <select
      value={locale}
      onChange={handleChange}
      className="px-3 py-1.5 text-sm rounded-md 
                 bg-neutral-800 text-neutral-200 
                 border border-neutral-700
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Select language"
    >
      {languages.map(({ code, label, flag }) => (
        <option key={code} value={code}>
          {flag} {label}
        </option>
      ))}
    </select>
  );
}

// ============================================
// OPTION 3: Pill Toggle (Side by Side)
// ============================================
export function LanguagePillToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
  ];

  return (
    <div 
      className="inline-flex rounded-full bg-neutral-800 p-1"
      role="radiogroup"
      aria-label="Language selection"
    >
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => router.replace(pathname, { locale: code })}
          className={`px-4 py-1 text-sm font-medium rounded-full transition-colors
            ${locale === code
              ? 'bg-blue-600 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
            }`}
          role="radio"
          aria-checked={locale === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// OPTION 4: Link-based Toggle (SEO-friendly)
// ============================================
import { Link } from '@/i18n/routing';

export function LanguageLinkToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === 'en' ? 'fr' : 'en';

  return (
    <Link
      href={pathname}
      locale={otherLocale}
      className="px-3 py-1.5 text-sm font-medium rounded-md 
                 bg-neutral-800 text-neutral-200 
                 hover:bg-neutral-700 transition-colors"
      aria-label={`Switch to ${locale === 'en' ? 'French' : 'English'}`}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </Link>
  );
}

// ============================================
// OPTION 5: Full Language Name Toggle
// ============================================
export function LanguageFullToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'fr' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={toggleLocale}
      className="inline-flex items-center gap-2 px-3 py-1.5 
                 text-sm font-medium rounded-md 
                 bg-neutral-800 text-neutral-200 
                 hover:bg-neutral-700 transition-colors"
      aria-label={`Current: ${locale === 'en' ? 'English' : 'Français'}. Click to switch.`}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      {locale === 'en' ? 'Français' : 'English'}
    </button>
  );
}
