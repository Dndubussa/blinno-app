import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import swTranslations from './locales/sw.json';
import frTranslations from './locales/fr.json';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

// Default language
export const DEFAULT_LANGUAGE = 'en';

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      sw: {
        translation: swTranslations,
      },
      fr: {
        translation: frTranslations,
      },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order and from where user language should be detected
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Keys or params to lookup language from
      lookupLocalStorage: 'i18nextLng',
      // Cache user language on
      caches: ['localStorage'],
    },
  });

export default i18n;

