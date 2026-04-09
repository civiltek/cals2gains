// ============================================
// Cals2Gains - i18n Setup
// ============================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import es from './es';
import en from './en';

const resources = {
  es: { translation: es },
  en: { translation: en },
};

// Detect device language
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'es';
const defaultLanguage = ['es', 'en'].includes(deviceLanguage) ? deviceLanguage : 'es';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;

/**
 * Change app language
 */
export function changeLanguage(lang: 'es' | 'en') {
  i18n.changeLanguage(lang);
}

/**
 * Get current language
 */
export function getCurrentLanguage(): 'es' | 'en' {
  return (i18n.language as 'es' | 'en') || 'es';
}
