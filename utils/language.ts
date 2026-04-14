// ============================================
// Cals2Gains - Language Utility
// ============================================
// Single source of truth for the active app language.
// Use this in services (openai, recipeService, voiceLog, etc.)
// so AI-generated content always matches the user's setting.

import i18n from '../i18n';

export type AppLanguage = 'es' | 'en';

/**
 * Returns the language currently active in the app.
 * Reads from i18n which is synced with the user's preference in settings.
 * Falls back to 'es' if anything is undefined.
 */
export function getAppLanguage(): AppLanguage {
  const lang = i18n.language;
  if (lang === 'en') return 'en';
  return 'es'; // default
}
