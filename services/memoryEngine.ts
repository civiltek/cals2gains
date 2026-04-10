/**
 * Memory Engine Service
 * Learns user eating patterns and provides contextual meal suggestions
 * Phase 2 Premium Feature
 */

import { COLORS } from '../theme';

// ============================================================================
// Types
// ============================================================================

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  timestamp: Date;
  ingredients?: string[];
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface EatingPatterns {
  frequentFoods: { name: string; count: number }[];
  mealTimes: Record<MealType, string>;
  avgCaloriesPerMeal: Record<MealType, number>;
  topPairings: string[][];
  preferredCuisines?: string[];
  averageMealsPerDay: number;
}

export interface Suggestion {
  type: 'time' | 'food' | 'macro';
  message: string;
  messageEs: string;
  action?: string;
  confidence: number;
}

export interface FoodSuggestion {
  name: string;
  nutrition: Nutrition;
  fitScore: number;
  source: 'template' | 'recent' | 'ai';
  templateId?: string;
  reason: string;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserGoals {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  goalType: string;
}

export interface MealTemplate {
  id: string;
  name: string;
  nutrition: Nutrition;
  mealType: MealType;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ============================================================================
// Memory Engine Class
// ============================================================================

export class MemoryEngine {
  private static readonly MIN_HISTORY_DAYS = 7;
  private static readonly PATTERN_ANALYSIS_WINDOW = 30;
  private static readonly FREQUENT_FOOD_THRESHOLD = 3;

  /**
   * Analyzes meal history to identify eating patterns
   * @param meals Array of meal entries
   * @param days Number of days to analyze
   * @returns EatingPatterns object with insights
   */
  public static analyzeEatingPatterns(
    meals: Meal[],
    days: number = this.PATTERN_ANALYSIS_WINDOW
  ): EatingPatterns {
    if (meals.length === 0) {
      return this.getEmptyPatterns();
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentMeals = meals.filter(
      (meal) => new Date(meal.timestamp) >= cutoffDate
    );

    if (recentMeals.length === 0) {
      return this.getEmptyPatterns();
    }

    return {
      frequentFoods: this.extractFrequentFoods(recentMeals),
      mealTimes: this.extractMealTimes(recentMeals),
      avgCaloriesPerMeal: this.calculateAvgCaloriesPerMealType(recentMeals),
      topPairings: this.extractTopPairings(recentMeals),
      preferredCuisines: this.inferCuisinePreferences(recentMeals),
      averageMealsPerDay: this.calculateAvgMealsPerDay(recentMeals, days),
    };
  }

  /**
   * Generates contextual meal suggestions based on time, history, and remaining macros
   * @param currentTime Current time
   * @param todayMeals Meals logged today
   * @param goals User's nutrition goals
   * @param patterns Analyzed eating patterns
   * @returns Array of suggestions
   */
  public static getSuggestions(
    currentTime: Date,
    todayMeals: Meal[],
    goals: UserGoals,
    patterns: EatingPatterns
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Time-based suggestion
    const timelineSuggestion = this.generateTimelineSuggestion(
      currentTime,
      patterns
    );
    if (timelineSuggestion) {
      suggestions.push(timelineSuggestion);
    }

    // History-based suggestion
    const historySuggestion = this.generateHistorySuggestion(
      currentTime,
      patterns,
      todayMeals
    );
    if (historySuggestion) {
      suggestions.push(historySuggestion);
    }

    // Macro-based suggestion
    const macroSuggestion = this.generateMacroSuggestion(
      todayMeals,
      goals
    );
    if (macroSuggestion) {
      suggestions.push(macroSuggestion);
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Recommends foods that fit remaining daily nutrition
   * @param remainingNutrition Macro targets minus logged amounts
   * @param patterns User's eating patterns
   * @param templates Available meal templates
   * @returns Top 5 food suggestions with fit scores
   */
  public static getWhatToEatNext(
    remainingNutrition: Nutrition,
    patterns: EatingPatterns,
    templates: MealTemplate[]
  ): FoodSuggestion[] {
    const suggestions: FoodSuggestion[] = [];

    // Score templates by macro fit and relevance
    const scoredTemplates = templates.map((template) => ({
      template,
      fitScore: this.calculateMacroFitScore(
        template.nutrition,
        remainingNutrition
      ),
      source: 'template' as const,
    }));

    // Filter and sort by fit score
    const topSuggestions = scoredTemplates
      .filter((s) => s.fitScore > 0.5)
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 5)
      .map((s) => ({
        name: s.template.name,
        nutrition: s.template.nutrition,
        fitScore: s.fitScore,
        source: s.source,
        templateId: s.template.id,
        reason: this.generateFitReason(s.template, s.fitScore),
      }));

    return topSuggestions;
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private static getEmptyPatterns(): EatingPatterns {
    return {
      frequentFoods: [],
      mealTimes: {
        breakfast: '08:00',
        lunch: '12:30',
        dinner: '19:00',
        snack: '15:00',
      },
      avgCaloriesPerMeal: {
        breakfast: 400,
        lunch: 600,
        dinner: 600,
        snack: 200,
      },
      topPairings: [],
      preferredCuisines: [],
      averageMealsPerDay: 3,
    };
  }

  private static extractFrequentFoods(meals: Meal[]): { name: string; count: number }[] {
    const foodCounts = new Map<string, number>();

    meals.forEach((meal) => {
      const current = foodCounts.get(meal.name) || 0;
      foodCounts.set(meal.name, current + 1);
    });

    return Array.from(foodCounts.entries())
      .filter(([_, count]) => count >= this.FREQUENT_FOOD_THRESHOLD)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private static extractMealTimes(meals: Meal[]): Record<MealType, string> {
    const mealTypeHours: Record<MealType, number[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    meals.forEach((meal) => {
      const hour = new Date(meal.timestamp).getHours();
      mealTypeHours[meal.mealType].push(hour);
    });

    const mealTimes: Record<MealType, string> = {
      breakfast: '08:00',
      lunch: '12:30',
      dinner: '19:00',
      snack: '15:00',
    };

    Object.entries(mealTypeHours).forEach(([mealType, hours]) => {
      if (hours.length > 0) {
        const avgHour = Math.round(
          hours.reduce((a, b) => a + b, 0) / hours.length
        );
        const minutes = Math.round(
          (hours.reduce((a, b) => a + b, 0) % hours.length) / hours.length * 60
        );
        mealTimes[mealType as MealType] =
          `${String(avgHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    });

    return mealTimes;
  }

  private static calculateAvgCaloriesPerMealType(meals: Meal[]): Record<MealType, number> {
    const caloriesByType: Record<MealType, number[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    meals.forEach((meal) => {
      caloriesByType[meal.mealType].push(meal.calories);
    });

    const avgCalories: Record<MealType, number> = {
      breakfast: 400,
      lunch: 600,
      dinner: 600,
      snack: 200,
    };

    Object.entries(caloriesByType).forEach(([mealType, calories]) => {
      if (calories.length > 0) {
        avgCalories[mealType as MealType] = Math.round(
          calories.reduce((a, b) => a + b, 0) / calories.length
        );
      }
    });

    return avgCalories;
  }

  private static extractTopPairings(meals: Meal[]): string[][] {
    const pairingMap = new Map<string, number>();
    const pairingDetails = new Map<string, string[]>();

    for (let i = 0; i < meals.length - 1; i++) {
      const current = meals[i];
      const next = meals[i + 1];

      const sameDay =
        new Date(current.timestamp).getDate() ===
        new Date(next.timestamp).getDate();

      if (sameDay) {
        const key = [current.name, next.name].sort().join('||');
        const count = (pairingMap.get(key) || 0) + 1;
        pairingMap.set(key, count);

        if (!pairingDetails.has(key)) {
          pairingDetails.set(key, [current.name, next.name]);
        }
      }
    }

    return Array.from(pairingMap.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key]) => pairingDetails.get(key) || []);
  }

  private static inferCuisinePreferences(_meals: Meal[]): string[] {
    // Placeholder for ML-based cuisine inference
    return ['Mediterranean', 'Asian', 'American'];
  }

  private static calculateAvgMealsPerDay(meals: Meal[], days: number): number {
    if (meals.length === 0) return 0;
    return Number((meals.length / days).toFixed(1));
  }

  private static generateTimelineSuggestion(
    currentTime: Date,
    patterns: EatingPatterns
  ): Suggestion | null {
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    // Check if within 1 hour of typical meal time
    for (const [mealType, mealTime] of Object.entries(patterns.mealTimes)) {
      const [mealHour, mealMinute] = mealTime.split(':').map(Number);
      const mealDate = new Date();
      mealDate.setHours(mealHour, mealMinute, 0, 0);

      const diffMinutes = Math.abs(
        currentTime.getTime() - mealDate.getTime()
      ) / 60000;

      if (diffMinutes < 60) {
        const avgCal = patterns.avgCaloriesPerMeal[mealType as MealType];
        return {
          type: 'time',
          message: `It's ${mealTime}, you usually have ${mealType} now (avg ${avgCal} cal)`,
          messageEs: `Es ${mealTime}, normalmente comes ${mealType} ahora (prom ${avgCal} cal)`,
          action: mealType,
          confidence: 0.9,
        };
      }
    }

    return null;
  }

  private static generateHistorySuggestion(
    currentTime: Date,
    patterns: EatingPatterns,
    _todayMeals: Meal[]
  ): Suggestion | null {
    if (patterns.frequentFoods.length === 0) return null;

    const topFood = patterns.frequentFoods[0];
    const dayOfWeek = currentTime.getDay();

    return {
      type: 'food',
      message: `You had ${topFood.name} ${topFood.count} times before`,
      messageEs: `Comiste ${topFood.name} ${topFood.count} veces antes`,
      action: topFood.name,
      confidence: 0.7,
    };
  }

  private static generateMacroSuggestion(
    todayMeals: Meal[],
    goals: UserGoals
  ): Suggestion | null {
    const consumed = todayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const proteinRemaining = goals.targetProtein - consumed.protein;

    if (proteinRemaining > 20) {
      return {
        type: 'macro',
        message: `You need ${Math.round(proteinRemaining)}g more protein to hit your goal`,
        messageEs: `Necesitas ${Math.round(proteinRemaining)}g más de proteína`,
        confidence: 0.85,
      };
    }

    return null;
  }

  private static calculateMacroFitScore(
    templateNutrition: Nutrition,
    remainingNutrition: Nutrition
  ): number {
    // Calculate how well the template fits remaining macros
    const calorieRatio = Math.min(
      templateNutrition.calories / remainingNutrition.calories,
      1
    );
    const proteinRatio = Math.min(
      templateNutrition.protein / remainingNutrition.protein,
      1
    );
    const carbsRatio = Math.min(
      templateNutrition.carbs / remainingNutrition.carbs,
      1
    );

    const score =
      (calorieRatio * 0.4 + proteinRatio * 0.35 + carbsRatio * 0.25) * 100;

    return Math.min(score / 100, 1.0);
  }

  private static generateFitReason(
    template: MealTemplate,
    fitScore: number
  ): string {
    if (fitScore > 0.9) {
      return 'Perfect macro fit';
    } else if (fitScore > 0.75) {
      return 'Good fit for remaining macros';
    } else {
      return `${Math.round(fitScore * 100)}% macro fit`;
    }
  }
}

export default MemoryEngine;
