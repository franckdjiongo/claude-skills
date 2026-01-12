/**
 * Language Toggle Components for React + react-i18next
 * Copy the component that matches your UI requirements
 */

// ============================================
// OPTION 1: Simple Button Toggle (EN/FR)
// ============================================
import { useTranslation } from 'react-i18next';

export function LanguageToggleButton() {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1.5 text-sm font-medium rounded-md 
                 bg-neutral-800 text-neutral-200 
                 hover:bg-neutral-700 transition-colors"
      aria-label={`Switch to ${i18n.language === 'en' ? 'French' : 'English'}`}
    >
      {i18n.language === 'en' ? 'FR' : 'EN'}
    </button>
  );
}

// ============================================
// OPTION 2: Dropdown Select
// ============================================
export function LanguageSelect() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', label: 'English', flag: '🇨🇦' },
    { code: 'fr', label: 'Français', flag: '🇨🇦' },
  ];

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
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
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

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
          onClick={() => i18n.changeLanguage(code)}
          className={`px-4 py-1 text-sm font-medium rounded-full transition-colors
            ${currentLang === code
              ? 'bg-blue-600 text-white'
              : 'text-neutral-400 hover:text-neutral-200'
            }`}
          role="radio"
          aria-checked={currentLang === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// OPTION 4: Icon Button with Tooltip
// ============================================
export function LanguageIconToggle() {
  const { i18n, t } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-md text-neutral-400 
                 hover:text-neutral-200 hover:bg-neutral-800 
                 transition-colors relative group"
      aria-label={`Current language: ${i18n.language === 'en' ? 'English' : 'Français'}. Click to switch.`}
    >
      {/* Globe Icon */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      
      {/* Language indicator badge */}
      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-bold 
                       bg-neutral-700 rounded px-1">
        {i18n.language.toUpperCase()}
      </span>
      
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                       px-2 py-1 text-xs bg-neutral-900 text-neutral-200 
                       rounded opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap pointer-events-none">
        {i18n.language === 'en' ? 'Passer en français' : 'Switch to English'}
      </span>
    </button>
  );
}
