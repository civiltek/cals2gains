/**
 * Adaptive Macro Engine Service
 * Dynamically adjusts user goals based on adherence, progress, and feedback
 * Phase 2 Premium Feature
 */

import { COLORS, BRAND_COLORS, BRAND_FONTS } from '../theme';
import { HealthData } from './healthKit';

// ============================================================================
// Types
// ============================================================================

export type GoalMode = 'lose_fat' | 'gain_muscle' | 'recomp' | 'maintain' | 'mini_cut' | 'lean_bulk';

export interface AdherenceScore {
  calorieAdherence: number;
  proteinAdherence: number;
  consistency: number;
  overall: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface GoalAdjustment {
  type: 'increase' | 'decrease' | 'maintain';
  calorieChange: number;
  proteinChange?: number;
  reason: string;
  reasonEs: string;
  confidence: number;
  suggestedDuration?: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  timestamp: Date;
}

export interface UserGoals {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  goalType: string;
  tdee: number;
  bmr: number;
}

export interface WeightEntry {
  date: Date;
  weight: number;
  unit: 'kg' | 'lbs';
}

export interface ActivityAdjustment {
  /** Positive = user burned more than expected (suggest eating more) */
  calorieChange: number;
  messageEs: string;
  messageEn: string;
  /** Relative magnitude: low (<200 kcal), medium (200-500), high (>500) */
  magnitude: 'low' | 'medium' | 'high';
}

/** Resultado de `detectExcessiveWeightLoss` — §8.3 Metodología */
export interface ExcessiveLossResult {
  trigger: boolean;
  messageEs: string;
  messageEn: string;
  /**
   * Cambio calórico sugerido (siempre +150 kcal cuando trigger=true).
   * No se aplica automáticamente desde este helper — lo orquesta el caller,
   * que debe consultar `user.autoAdaptEnabled` antes de mutar objetivos.
   */
  suggestedCalorieChange: number;
  /** Porcentaje estimado de pérdida semanal (informativo). */
  weeklyLossPct?: number;
}

export interface GoalModeConfig {
  calorieFactor: number;
  proteinMultiplier: number;
  carbsPct: number;
  fatPct: number;
  description: string;
  descriptionEs: string;
  emoji: string;
  duration?: string;
}

// ============================================================================
// Adaptive Macro Engine Class
// ============================================================================

export class AdaptiveMacroEngine {
  private static readonly CALORIE_ADHERENCE_WINDOW = 10; // ±10%
  private static readonly PROTEIN_ADHERENCE_WINDOW = 5; // ±5g
  private static readonly MIN_DAYS_FOR_ANALYSIS = 7;
  private static readonly WEIGHT_CHANGE_THRESHOLD = 0.5; // kg
  private static readonly ADJUSTMENT_INCREMENT = 50; // calories

  /**
   * Calculates user adherence to their nutrition goals
   * @param meals Array of meal entries
   * @param goals Current nutrition goals
   * @param days Number of days to analyze
   * @returns AdherenceScore with metrics
   */
  public static calculateAdherenceScore(
    meals: Meal[],
    goals: UserGoals,
    days: number = 7
  ): AdherenceScore {
    if (meals.length === 0 || days < this.MIN_DAYS_FOR_ANALYSIS) {
      return this.getEmptyAdherenceScore();
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const recentMeals = meals.filter(
      (meal) => new Date(meal.timestamp) >= cutoffDate
    );

    if (recentMeals.length === 0) {
      return this.getEmptyAdherenceScore();
    }

    // Group meals by day
    const mealsByDay = this.groupMealsByDay(recentMeals);
    const dayCount = Object.keys(mealsByDay).length;

    if (dayCount < this.MIN_DAYS_FOR_ANALYSIS) {
      return this.getEmptyAdherenceScore();
    }

    // Calculate metrics
    const calorieAdherence = this.calculateCalorieAdherence(
      mealsByDay,
      goals,
      dayCount
    );
    const proteinAdherence = this.calculateProteinAdherence(
      mealsByDay,
      goals,
      dayCount
    );
    const consistency = this.calculateConsistency(mealsByDay, dayCount);

    const overall =
      calorieAdherence * 0.4 +
      proteinAdherence * 0.35 +
      consistency * 0.25;

    return {
      calorieAdherence,
      proteinAdherence,
      consistency,
      overall,
      trend: this.calculateTrend(mealsByDay, goals, dayCount),
    };
  }

  /**
   * Determines if goals should be adjusted based on progress and adherence
   * @param weights Array of weight measurements
   * @param goals Current nutrition goals
   * @param adherenceScore User's adherence metrics
   * @param goalType Type of goal (e.g., 'lose_fat', 'gain_muscle')
   * @returns GoalAdjustment recommendation or null
   */
  public static shouldAdjustGoals(
    weights: WeightEntry[],
    goals: UserGoals,
    adherenceScore: AdherenceScore,
    goalType: string
  ): GoalAdjustment | null {
    if (weights.length < 3) {
      return null; // Need at least 3 weeks of data
    }

    // Sort weights by date
    const sortedWeights = [...weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const recentWeight = sortedWeights[sortedWeights.length - 1].weight;
    const previousWeight = sortedWeights[sortedWeights.length - 2]?.weight || recentWeight;
    const threeWeeksAgo = sortedWeights[Math.max(0, sortedWeights.length - 3)].weight;

    const weightChange = recentWeight - threeWeeksAgo;

    // Handle low adherence first
    if (adherenceScore.overall < 0.6) {
      return {
        type: 'maintain',
        calorieChange: 0,
        reason: 'Low adherence detected. Focus on consistency before adjusting targets.',
        reasonEs: 'Se detectó baja adherencia. Enfócate en consistencia antes de ajustar.',
        confidence: 0.95,
      };
    }

    // Weight loss goal: weight stalling
    if (goalType === 'lose_fat' && Math.abs(weightChange) < this.WEIGHT_CHANGE_THRESHOLD) {
      if (adherenceScore.overall > 0.8) {
        return {
          type: 'decrease',
          calorieChange: this.ADJUSTMENT_INCREMENT * 2,
          reason: 'Weight loss stalled with high adherence. Suggest increasing deficit.',
          reasonEs:
            'Pérdida de peso estancada con alta adherencia. Sugerir aumentar déficit.',
          confidence: 0.85,
          suggestedDuration: 2,
        };
      }
    }

    // Weight gain goal: gaining too fast
    if (
      (goalType === 'gain_muscle' || goalType === 'lean_bulk') &&
      weightChange > 0.5 * 3 // More than 0.5kg per week average
    ) {
      if (adherenceScore.overall > 0.75) {
        return {
          type: 'decrease',
          calorieChange: this.ADJUSTMENT_INCREMENT,
          reason: 'Weight gain too rapid. Reduce surplus to preserve body composition.',
          reasonEs: 'Ganancia de peso demasiado rápida. Reducir superávit.',
          confidence: 0.8,
        };
      }
    }

    // Recomp: high protein, stable weight, progress in other metrics
    if (
      goalType === 'recomp' &&
      Math.abs(weightChange) < this.WEIGHT_CHANGE_THRESHOLD &&
      adherenceScore.proteinAdherence > 0.85
    ) {
      return {
        type: 'maintain',
        calorieChange: 0,
        reason: 'Excellent progress on recomp. Maintain current targets.',
        reasonEs: 'Excelente progreso en recomposición. Mantén los objetivos actuales.',
        confidence: 0.9,
      };
    }

    return null;
  }

  /**
   * Determines whether today's macro target should be adjusted based on
   * real activity data from HealthKit / Health Connect.
   *
   * Returns an ActivityAdjustment when the gap between actual active calories
   * and the expected active calories (derived from the static multiplier) is
   * ≥ 200 kcal, otherwise null (no suggestion needed).
   *
   * @param healthData  Today's summary from HealthKit / Health Connect
   * @param staticTDEE  Static TDEE computed from profile + activity multiplier
   * @param bmr         Basal metabolic rate (used to derive expected active cal)
   */
  public static shouldAdjustForActivity(
    healthData: HealthData,
    staticTDEE: number,
    bmr: number
  ): ActivityAdjustment | null {
    const THRESHOLD = 200; // kcal

    const expectedActiveCalories = Math.max(0, staticTDEE - bmr);
    const actualActiveCalories = healthData.activeCalories;
    const delta = actualActiveCalories - expectedActiveCalories;

    if (Math.abs(delta) < THRESHOLD) return null;

    const rounded = Math.round(Math.abs(delta) / 50) * 50; // round to nearest 50
    const magnitude: ActivityAdjustment['magnitude'] =
      Math.abs(delta) < 300 ? 'low' : Math.abs(delta) < 600 ? 'medium' : 'high';

    if (delta > 0) {
      return {
        calorieChange: rounded,
        messageEs: `Hoy has quemado ~${rounded} kcal extra. ¿Quieres ajustar tus macros?`,
        messageEn: `You burned ~${rounded} extra kcal today. Adjust your macros?`,
        magnitude,
      };
    } else {
      return {
        calorieChange: -rounded,
        messageEs: `Hoy has quemado ~${rounded} kcal menos de lo estimado. Puedes reducir tu objetivo.`,
        messageEn: `You burned ~${rounded} fewer kcal than estimated. You may reduce your target.`,
        magnitude,
      };
    }
  }

  /**
   * Returns macro distribution config for a specific goal mode
   * @param mode Goal mode (e.g., 'lose_fat', 'gain_muscle')
   * @returns GoalModeConfig with calorie and macro percentages
   */
  public static getGoalModeConfig(mode: GoalMode): GoalModeConfig {
    const configs: Record<GoalMode, GoalModeConfig> = {
      lose_fat: {
        calorieFactor: 0.8, // -20% TDEE
        proteinMultiplier: 2.2, // High protein to preserve muscle
        carbsPct: 0.35,
        fatPct: 0.25,
        description: 'Lose body fat while preserving muscle',
        descriptionEs: 'Pierde grasa corporal preservando músculo',
        emoji: '🔥',
        duration: '12-16 semanas',
      },
      gain_muscle: {
        calorieFactor: 1.1, // +10% TDEE
        proteinMultiplier: 2.0, // High protein for muscle synthesis
        carbsPct: 0.45,
        fatPct: 0.25,
        description: 'Build muscle with clean surplus',
        descriptionEs: 'Construye músculo con superávit limpio',
        emoji: '💪',
        duration: '8-12 semanas',
      },
      recomp: {
        calorieFactor: 1.0, // Maintenance
        proteinMultiplier: 2.4, // Very high protein for simultaneous gain/loss
        carbsPct: 0.4,
        fatPct: 0.25,
        description: 'Build muscle while losing fat',
        descriptionEs: 'Construye músculo mientras pierdes grasa',
        emoji: '♻️',
        duration: '10-14 semanas',
      },
      maintain: {
        calorieFactor: 1.0, // Maintenance
        proteinMultiplier: 1.8, // Moderate protein
        carbsPct: 0.4,
        fatPct: 0.35,
        description: 'Maintain weight and performance',
        descriptionEs: 'Mantén peso y rendimiento',
        emoji: '⚖️',
      },
      mini_cut: {
        calorieFactor: 0.75, // -25% TDEE
        proteinMultiplier: 2.4, // Very high protein for muscle preservation
        carbsPct: 0.25,
        fatPct: 0.15,
        description: 'Rapid fat loss in 4-6 weeks',
        descriptionEs: 'Pérdida rápida de grasa en 4-6 semanas',
        emoji: '✂️',
        duration: '4-6 semanas',
      },
      lean_bulk: {
        calorieFactor: 1.05, // +5% TDEE
        proteinMultiplier: 1.9, // Moderate-high protein
        carbsPct: 0.48,
        fatPct: 0.27,
        description: 'Moderate muscle gain with minimal fat',
        descriptionEs: 'Ganancia moderada de músculo con mínima grasa',
        emoji: '📈',
        duration: '10-12 semanas',
      },
    };

    return configs[mode];
  }

  /**
   * Detecta ritmo de pérdida de peso excesivo — §8.3 METODOLOGIA_NUTRICIONAL.md
   *
   * Criterio: media móvil de 7 días descendiendo >1 % del peso corporal
   * durante 2 semanas consecutivas.
   *
   * Implementación: comparamos la media móvil 7d del final (hoy) contra la
   * media móvil 7d de hace 7 días (=primera semana) y la media de hace 14
   * días (=semana anterior). Si ambos descensos (semana N vs N-1 y N-1 vs
   * N-2) superan 1 % del peso corporal medio, `trigger = true`.
   *
   * Reg UE 2024/1689 Art. 50 + MDR Regla 11: copy orientativo NUNCA
   * prescriptivo. Copy canónico: INFORME_LEGAL_v1.md §7 Acción 9.
   *
   * @param weights  Historial de pesajes (cualquier orden).
   * @param currentWeight  Peso actual (kg) — usado como fallback para calcular
   *                       el umbral porcentual si no hay suficiente historia.
   */
  public static detectExcessiveWeightLoss(
    weights: WeightEntry[],
    currentWeight: number,
  ): ExcessiveLossResult {
    const negResult: ExcessiveLossResult = {
      trigger: false,
      messageEs: '',
      messageEn: '',
      suggestedCalorieChange: 0,
    };

    if (!weights || weights.length < 5) return negResult;

    // Normalizar a kg y ordenar por fecha ascendente
    const normalized = weights
      .map((w) => ({
        date: new Date(w.date).getTime(),
        kg: w.unit === 'lbs' ? w.weight * 0.45359237 : w.weight,
      }))
      .filter((w) => !isNaN(w.date) && !isNaN(w.kg) && w.kg > 0)
      .sort((a, b) => a.date - b.date);

    if (normalized.length < 5) return negResult;

    const now = Date.now();
    const DAY = 24 * 3600 * 1000;

    const avgInWindow = (centerMs: number, windowDays = 7) => {
      const lo = centerMs - windowDays * DAY;
      const hi = centerMs + windowDays * DAY;
      const inWin = normalized.filter((w) => w.date >= lo && w.date <= hi);
      if (inWin.length === 0) return null;
      const sum = inWin.reduce((s, w) => s + w.kg, 0);
      return sum / inWin.length;
    };

    const avgNow = avgInWindow(now);
    const avg7dAgo = avgInWindow(now - 7 * DAY);
    const avg14dAgo = avgInWindow(now - 14 * DAY);

    if (avgNow == null || avg7dAgo == null || avg14dAgo == null) {
      return negResult;
    }

    const baselineWeight = currentWeight || avgNow;
    const threshold = 0.01 * baselineWeight; // 1 %

    const drop1 = avg7dAgo - avgNow;     // pérdida última semana
    const drop2 = avg14dAgo - avg7dAgo;  // pérdida semana anterior

    if (drop1 > threshold && drop2 > threshold) {
      const weeklyLossPct = (drop1 / baselineWeight) * 100;
      return {
        trigger: true,
        // Copy canónico — INFORME_LEGAL_v1.md §7 Acción 9
        messageEs:
          'Hemos detectado que tu ritmo de pérdida está siendo superior al rango habitualmente recomendado. Suele ser señal de que el déficit es demasiado agresivo. Vamos a ajustar tu objetivo calórico al alza (+150 kcal/día). Puedes revertirlo en Ajustes. Si esta pérdida rápida es deliberada y la estás haciendo con supervisión profesional, dinos para no volver a ajustar.',
        messageEn:
          'We detected that your rate of loss is higher than the commonly recommended range. This usually means the deficit is too aggressive. We are going to adjust your calorie goal upwards (+150 kcal/day). You can revert it in Settings. If this rapid loss is intentional and under professional supervision, let us know so we do not adjust again.',
        suggestedCalorieChange: 150,
        weeklyLossPct,
      };
    }

    return negResult;
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private static getEmptyAdherenceScore(): AdherenceScore {
    return {
      calorieAdherence: 0,
      proteinAdherence: 0,
      consistency: 0,
      overall: 0,
      trend: 'stable',
    };
  }

  private static groupMealsByDay(meals: Meal[]): Record<string, Meal[]> {
    const mealsByDay: Record<string, Meal[]> = {};

    meals.forEach((meal) => {
      const dateKey = new Date(meal.timestamp)
        .toISOString()
        .split('T')[0];
      if (!mealsByDay[dateKey]) {
        mealsByDay[dateKey] = [];
      }
      mealsByDay[dateKey].push(meal);
    });

    return mealsByDay;
  }

  private static calculateCalorieAdherence(
    mealsByDay: Record<string, Meal[]>,
    goals: UserGoals,
    dayCount: number
  ): number {
    let adherentDays = 0;

    Object.values(mealsByDay).forEach((meals) => {
      const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
      const lowerBound = goals.targetCalories * (1 - this.CALORIE_ADHERENCE_WINDOW / 100);
      const upperBound = goals.targetCalories * (1 + this.CALORIE_ADHERENCE_WINDOW / 100);

      if (totalCalories >= lowerBound && totalCalories <= upperBound) {
        adherentDays++;
      }
    });

    return Math.min(adherentDays / dayCount, 1.0);
  }

  private static calculateProteinAdherence(
    mealsByDay: Record<string, Meal[]>,
    goals: UserGoals,
    dayCount: number
  ): number {
    let adherentDays = 0;

    Object.values(mealsByDay).forEach((meals) => {
      const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
      const lowerBound = goals.targetProtein - this.PROTEIN_ADHERENCE_WINDOW;
      const upperBound = goals.targetProtein + this.PROTEIN_ADHERENCE_WINDOW;

      if (totalProtein >= lowerBound && totalProtein <= upperBound) {
        adherentDays++;
      }
    });

    return Math.min(adherentDays / dayCount, 1.0);
  }

  private static calculateConsistency(
    mealsByDay: Record<string, Meal[]>,
    dayCount: number
  ): number {
    let consistentDays = 0;

    Object.values(mealsByDay).forEach((meals) => {
      // At least 2 meals logged per day
      if (meals.length >= 2) {
        consistentDays++;
      }
    });

    return Math.min(consistentDays / dayCount, 1.0);
  }

  private static calculateTrend(
    mealsByDay: Record<string, Meal[]>,
    goals: UserGoals,
    dayCount: number
  ): 'improving' | 'stable' | 'declining' {
    const sortedDays = Object.entries(mealsByDay).sort(
      ([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()
    );

    if (sortedDays.length < 3) {
      return 'stable';
    }

    // Compare first third to last third
    const thirdSize = Math.floor(sortedDays.length / 3);
    const firstThird = sortedDays.slice(0, thirdSize);
    const lastThird = sortedDays.slice(sortedDays.length - thirdSize);

    const firstAdherence = this.calculateAverageAdherence(
      firstThird,
      goals
    );
    const lastAdherence = this.calculateAverageAdherence(
      lastThird,
      goals
    );

    const improvement = lastAdherence - firstAdherence;

    if (improvement > 0.1) {
      return 'improving';
    } else if (improvement < -0.1) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  private static calculateAverageAdherence(
    dayEntries: [string, Meal[]][],
    goals: UserGoals
  ): number {
    const adherences = dayEntries.map(([_, meals]) => {
      const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
      const calorieError = Math.abs(totalCalories - goals.targetCalories) / goals.targetCalories;
      return Math.max(0, 1 - calorieError);
    });

    if (adherences.length === 0) return 0;
    return adherences.reduce((a, b) => a + b, 0) / adherences.length;
  }
}

export default AdaptiveMacroEngine;
