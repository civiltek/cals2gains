/**
 * Personal Nutrition Engine - Phase 3
 * Hyper-personalized meal suggestions and adaptive goal management
 * for Cals2Gains React Native app
 */

import { COLORS } from '../theme';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: Date;
  frequency: number; // how many times eaten
}

export interface WeightEntry {
  date: Date;
  weight: number;
}

export interface AdherenceScore {
  weeklyAdherence: number; // 0-100: % of days hitting calorie goal
  macroAdherence: number; // 0-100: avg accuracy to macro targets
  consistency: number; // 0-100: how consistently user logs
}

export interface UserGoals {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export type GoalMode = 'lose_fat' | 'gain_muscle' | 'recomp' | 'maintain' | 'mini_cut' | 'lean_bulk';
export type DayType = 'training' | 'rest' | 'light';

export interface Suggestion {
  id: string;
  name: string;
  calories: number;
  protein: number;
  reasoning: string; // Spanish explanation
  source: 'history' | 'ai_generated' | 'challenge';
  imageUrl?: string;
}

export interface QuickAction {
  id: string;
  label: string; // Spanish
  icon: string;
  context: string; // 'pre_workout' | 'post_workout' | 'water_reminder'
  suggestedCalories?: number;
}

export interface AutoAdjustment {
  newCalories: number;
  newProtein: number;
  newCarbs: number;
  newFat: number;
  reasoning: string; // Spanish explanation of why adjustment was made
  confidence: number; // 0-1 confidence score
  changePercentage: number; // e.g., +5 for +5% increase
}

// ============================================================================
// PERSONAL ENGINE SERVICE
// ============================================================================

export class PersonalEngine {
  /**
   * Generates 5 hyper-personalized meal suggestions
   *
   * Strategy:
   * - 2 from user's eating history (favorite, frequent meals)
   * - 2 AI-generated based on macros and goals
   * - 1 challenge suggestion (new food to try)
   */
  static getPersonalizedSuggestions(
    userId: string,
    history: FoodEntry[],
    goals: UserGoals,
    timeOfDay: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    dayType: DayType
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Get remaining macros for the day
    const remaining = this.calculateRemainingMacros(goals);

    // 1. Add 2 suggestions from history (most frequent + favorite)
    const topFrequent = this.getTopFrequentFoods(history, 2);
    topFrequent.forEach(food => {
      suggestions.push({
        id: `hist_${food.id}`,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        reasoning: `Comes frecuentemente en tu historial. Encaja bien con tus macros restantes.`,
        source: 'history',
      });
    });

    // 2. Add 2 AI-generated suggestions based on remaining macros
    const aiSuggestions = this.generateAISuggestions(
      remaining,
      timeOfDay,
      dayType,
      goals.proteinGrams
    );
    suggestions.push(...aiSuggestions.slice(0, 2));

    // 3. Add 1 challenge suggestion (new/uncommon food)
    const challengeSuggestion = this.generateChallengeSuggestion(remaining, timeOfDay);
    suggestions.push(challengeSuggestion);

    return suggestions;
  }

  /**
   * Generates weekly auto-adjustments based on weight trend and adherence
   *
   * Algorithm:
   * - Check weight trend over last 7-14 days
   * - Compare vs goal (expected 0.5-1 lb/week loss or 0.5 lb/week gain)
   * - Adjust calories by ±100-200 based on adherence and trend
   * - Preserve macro ratios unless specific adjustment needed
   */
  static generateAutoAdjustments(
    weights: WeightEntry[],
    adherence: AdherenceScore,
    currentGoals: UserGoals,
    goalMode: GoalMode
  ): AutoAdjustment {
    // Calculate weight trend (last 7 days)
    const recentWeights = weights.slice(-7);
    const weightTrend = this.calculateWeightTrend(recentWeights);

    // Expected weekly change based on goal mode
    const expectedChange = this.getExpectedWeeklyChange(goalMode);

    // Compare actual vs expected
    const trendDifference = expectedChange - weightTrend;

    // Determine adjustment magnitude based on adherence and difference
    let calorieAdjustment = 0;
    let reasoning = '';
    let confidence = 0;

    if (Math.abs(trendDifference) < 0.25) {
      // On track - no adjustment needed
      calorieAdjustment = 0;
      reasoning = `Tu peso está siguiendo el plan. Mantén tu ingesta actual de ${currentGoals.dailyCalories} calorías.`;
      confidence = 0.9;
    } else if (trendDifference > 0.25) {
      // Not losing/gaining enough
      if (adherence.weeklyAdherence > 85) {
        // User is adhering well, reduce calories more
        calorieAdjustment = -150;
        reasoning = `Tu peso no cambia como esperado. Reducimos 150 calorías para acelerar progreso.`;
        confidence = 0.85;
      } else {
        // User isn't adhering well, small adjustment
        calorieAdjustment = -75;
        reasoning = `Tu adherencia es variable. Pequeño ajuste de -75 calorías para mejor control.`;
        confidence = 0.7;
      }
    } else {
      // Losing/gaining too fast
      calorieAdjustment = 100;
      reasoning = `Tu peso cambia rápidamente. Aumentamos 100 calorías para ritmo más sostenible.`;
      confidence = 0.8;
    }

    // Calculate new macro targets (preserve ratios)
    const newCalories = Math.max(1200, currentGoals.dailyCalories + calorieAdjustment);
    const proteinRatio = currentGoals.proteinGrams / currentGoals.dailyCalories;
    const carbRatio = currentGoals.carbsGrams / currentGoals.dailyCalories;
    const fatRatio = currentGoals.fatGrams / currentGoals.dailyCalories;

    return {
      newCalories,
      newProtein: Math.round(newCalories * proteinRatio / 4), // 4 cal/g
      newCarbs: Math.round(newCalories * carbRatio / 4),
      newFat: Math.round(newCalories * fatRatio / 9), // 9 cal/g
      reasoning,
      confidence,
      changePercentage: (calorieAdjustment / currentGoals.dailyCalories) * 100,
    };
  }

  /**
   * Suggests quick actions for gym context
   * Perfect for "gym mode" - pre/post workout, water reminders
   */
  static getGymFlowSuggestions(dayType: DayType, timeOfDay: string): QuickAction[] {
    const actions: QuickAction[] = [];

    if (dayType === 'training') {
      // Pre-workout (30-60 min before)
      if (['08:00', '09:00', '10:00'].includes(timeOfDay.slice(0, 5))) {
        actions.push({
          id: 'preworkout_carbs',
          label: 'Comida pre-entreno',
          icon: 'flash',
          context: 'pre_workout',
          suggestedCalories: 200,
        });
      }

      // Post-workout (0-60 min after)
      if (['11:00', '12:00', '13:00', '18:00', '19:00', '20:00'].includes(timeOfDay.slice(0, 5))) {
        actions.push({
          id: 'postworkout_protein',
          label: 'Colación post-entreno',
          icon: 'checkmark-circle',
          context: 'post_workout',
          suggestedCalories: 250,
        });
      }
    }

    // Always suggest water reminder
    actions.push({
      id: 'water_reminder',
      label: 'Registrar agua',
      icon: 'water',
      context: 'water_reminder',
    });

    return actions;
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private static calculateRemainingMacros(goals: UserGoals) {
    // Simplified - in real app would fetch today's logged meals
    return {
      calories: goals.dailyCalories,
      protein: goals.proteinGrams,
      carbs: goals.carbsGrams,
      fat: goals.fatGrams,
    };
  }

  private static getTopFrequentFoods(history: FoodEntry[], count: number): FoodEntry[] {
    return history
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, count);
  }

  private static generateAISuggestions(
    remaining: any,
    timeOfDay: string,
    dayType: DayType,
    proteinGoal: number
  ): Suggestion[] {
    // Simulate AI meal suggestions based on remaining macros
    const suggestions: Suggestion[] = [];

    // Suggestion 1: High protein option
    suggestions.push({
      id: 'ai_protein_1',
      name: 'Pecho de pollo con arroz integral',
      calories: 450,
      protein: 45,
      reasoning: `Alto en proteína para apoyar tu objetivo de ${proteinGoal}g diarios.`,
      source: 'ai_generated',
    });

    // Suggestion 2: Balanced macro option
    suggestions.push({
      id: 'ai_balanced_1',
      name: 'Salmón con batata y brócoli',
      calories: 520,
      protein: 35,
      reasoning: `Balance perfecto de proteína, grasas saludables y carbohidratos complejos.`,
      source: 'ai_generated',
    });

    return suggestions;
  }

  private static generateChallengeSuggestion(remaining: any, timeOfDay: string): Suggestion {
    // Suggest something new to keep diet interesting
    return {
      id: 'challenge_new',
      name: 'Tofu a la parrilla con quinoa',
      calories: 380,
      protein: 20,
      reasoning: `Prueba algo nuevo hoy. ¡Expandir tu paleta mantiene la dieta interesante!`,
      source: 'challenge',
    };
  }

  private static calculateWeightTrend(weights: WeightEntry[]): number {
    if (weights.length < 2) return 0;

    const firstWeight = weights[0].weight;
    const lastWeight = weights[weights.length - 1].weight;

    return firstWeight - lastWeight; // negative = gained weight
  }

  private static getExpectedWeeklyChange(goalMode: GoalMode): number {
    const changes: Record<GoalMode, number> = {
      lose_fat: -0.75, // -0.75 lb/week
      gain_muscle: 0.5,
      recomp: 0,
      maintain: 0,
      mini_cut: -1.5, // aggressive cut
      lean_bulk: 0.5,
    };
    return changes[goalMode];
  }
}

export default PersonalEngine;
