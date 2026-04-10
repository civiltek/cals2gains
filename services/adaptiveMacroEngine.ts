/**
 * Adaptive Macro Engine Service
 * Dynamically adjusts user goals based on adherence, progress, and feedback
 * Phase 2 Premium Feature
 */

import { COLORS, BRAND_COLORS, BRAND_FONTS } from '../theme';

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
        duration: '12-16 weeks',
      },
      gain_muscle: {
        calorieFactor: 1.1, // +10% TDEE
        proteinMultiplier: 2.0, // High protein for muscle synthesis
        carbsPct: 0.45,
        fatPct: 0.25,
        description: 'Build muscle with clean surplus',
        descriptionEs: 'Construye músculo con superávit limpio',
        emoji: '💪',
        duration: '8-12 weeks',
      },
      recomp: {
        calorieFactor: 1.0, // Maintenance
        proteinMultiplier: 2.4, // Very high protein for simultaneous gain/loss
        carbsPct: 0.4,
        fatPct: 0.25,
        description: 'Build muscle while losing fat',
        descriptionEs: 'Construye músculo mientras pierdes grasa',
        emoji: '♻️',
        duration: '10-14 weeks',
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
        duration: '4-6 weeks',
      },
      lean_bulk: {
        calorieFactor: 1.05, // +5% TDEE
        proteinMultiplier: 1.9, // Moderate-high protein
        carbsPct: 0.48,
        fatPct: 0.27,
        description: 'Moderate muscle gain with minimal fat',
        descriptionEs: 'Ganancia moderada de músculo con mínima grasa',
        emoji: '📈',
        duration: '10-12 weeks',
      },
    };

    return configs[mode];
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
