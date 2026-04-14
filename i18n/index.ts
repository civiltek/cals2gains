// ============================================
// Cals2Gains - i18n Setup
// ============================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import es from './es';
import en from './en';

// ============================================
// SUPPORTED LANGUAGES
// ============================================

export interface LanguageOption {
  code: string;
  label: string;   // Name in its own language
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

// Only es and en have full translation files — others fallback to en
const resources = {
  es: { translation: es },
  en: { translation: en },
};

// Detect device language
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'es';
const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);
const defaultLanguage = supportedCodes.includes(deviceLanguage) ? deviceLanguage : 'es';

// Persistence key for saved language
const LANGUAGE_STORAGE_KEY = 'cals2gains_language';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage, // Will be overridden by loadSavedLanguage
  fallbackLng: 'en',    // Fallback to English for unsupported languages
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
  react: {
    useSuspense: false,
  },
});

// Load persisted language on startup
(async () => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    // Silently fail — will use device language
  }
})();

export default i18n;

/**
 * Change app language and persist selection
 */
export async function changeLanguage(lang: string) {
  await i18n.changeLanguage(lang);
  // Persist selection
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Silently fail
  }
}

/**
 * Get current language code
 */
export function getCurrentLanguage(): string {
  return i18n.language || 'es';
}

/**
 * Get the display info for the current language
 */
export function getCurrentLanguageInfo(): LanguageOption {
  const current = i18n.language || 'es';
  return SUPPORTED_LANGUAGES.find(l => l.code === current) || SUPPORTED_LANGUAGES[0];
}
