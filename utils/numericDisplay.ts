// ============================================
// Cals2Gains — Numeric Display Helper (Fase B)
// ============================================
// Usado cuando el usuario ha declarado `eating_sensitive` (RGPD Art. 9.2.a).
// En ese caso `user.numericDisplayMode = 'hidden'` y las pantallas deben
// OCULTAR las cifras de calorías y macros — reemplazándolas por etiquetas
// cualitativas ("registrado", "alto/medio/bajo en proteína") o emoji.
//
// IMPORTANTE: los cálculos internos NO cambian. Solo la presentación.
// Ver INFORME_LEGAL_v1.md §7 Acción 8 + METODOLOGIA_NUTRICIONAL.md §8.4.

import { NumericDisplayMode } from '../types';

export function isNumericHidden(
  mode: NumericDisplayMode | undefined | null,
): boolean {
  return mode === 'hidden';
}

/** Reemplazo cualitativo para una cifra de calorías. */
export function formatCaloriesForDisplay(
  kcal: number,
  mode: NumericDisplayMode | undefined | null,
  fallbackLabel = 'registrado',
): string {
  if (isNumericHidden(mode)) return fallbackLabel;
  return `${Math.round(kcal)} kcal`;
}

/**
 * Reemplazo cualitativo para una cifra de proteína en gramos.
 * Banda: <15 g = bajo, 15-30 g = medio, >30 g = alto.
 * Referencia: Areta 2013, ISSN 2017.
 */
export function formatProteinForDisplay(
  grams: number,
  mode: NumericDisplayMode | undefined | null,
): { label: string; emoji: string } {
  if (!isNumericHidden(mode)) {
    return { label: `${Math.round(grams)} g`, emoji: '' };
  }
  if (grams >= 30) return { label: 'alto en proteína', emoji: '💪' };
  if (grams >= 15) return { label: 'proteína media', emoji: '🥚' };
  return { label: 'poco en proteína', emoji: '🥗' };
}

/** Devuelve "" si ocultamos números, o el string normal si no. */
export function hideIfSensitive(
  text: string,
  mode: NumericDisplayMode | undefined | null,
  replacement = '',
): string {
  return isNumericHidden(mode) ? replacement : text;
}
