// ============================================
// Cals2Gains - Macro Preset Configurations
// ============================================

import { MacroPresetConfig, UserGoals } from '../types';

export const MACRO_PRESETS: MacroPresetConfig[] = [
  {
    id: 'balanced',
    nameEs: 'Equilibrado',
    nameEn: 'Balanced',
    descriptionEs: '30% proteína, 40% carbohidratos, 30% grasa',
    descriptionEn: '30% protein, 40% carbs, 30% fat',
    proteinPct: 0.30,
    carbsPct: 0.40,
    fatPct: 0.30,
    icon: '⚖️',
  },
  {
    id: 'high_protein',
    nameEs: 'Alta Proteína',
    nameEn: 'High Protein',
    descriptionEs: '40% proteína, 35% carbohidratos, 25% grasa',
    descriptionEn: '40% protein, 35% carbs, 25% fat',
    proteinPct: 0.40,
    carbsPct: 0.35,
    fatPct: 0.25,
    icon: '💪',
  },
  {
    id: 'keto',
    nameEs: 'Cetogénica (Keto)',
    nameEn: 'Ketogenic (Keto)',
    descriptionEs: '25% proteína, 5% carbohidratos, 70% grasa',
    descriptionEn: '25% protein, 5% carbs, 70% fat',
    proteinPct: 0.25,
    carbsPct: 0.05,
    fatPct: 0.70,
    icon: '🥑',
  },
  {
    id: 'low_fat',
    nameEs: 'Baja en Grasa',
    nameEn: 'Low Fat',
    descriptionEs: '30% proteína, 50% carbohidratos, 20% grasa',
    descriptionEn: '30% protein, 50% carbs, 20% fat',
    proteinPct: 0.30,
    carbsPct: 0.50,
    fatPct: 0.20,
    icon: '🥗',
  },
  {
    id: 'custom',
    nameEs: 'Personalizado',
    nameEn: 'Custom',
    descriptionEs: 'Establece tus propios porcentajes',
    descriptionEn: 'Set your own percentages',
    proteinPct: 0.30,
    carbsPct: 0.40,
    fatPct: 0.30,
    icon: '🎯',
  },
];

/**
 * Calculate macro goals from a preset and calorie target
 */
export function calculateGoalsFromPreset(
  preset: MacroPresetConfig,
  calories: number
): Omit<UserGoals, 'fiber'> {
  // Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
  return {
    calories,
    protein: Math.round((calories * preset.proteinPct) / 4),
    carbs: Math.round((calories * preset.carbsPct) / 4),
    fat: Math.round((calories * preset.fatPct) / 9),
  };
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): MacroPresetConfig | undefined {
  return MACRO_PRESETS.find((p) => p.id === id);
}