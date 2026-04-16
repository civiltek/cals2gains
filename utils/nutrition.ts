// Cals2Gains - Nutrition Utility Functions

import { ActivityLevel, FitnessGoal, Nutrition, UserGoals, UserProfile } from '../types';

// Minimum days of health data required to trust the moving average
const MIN_HEALTH_DAYS = 3;

export function calculateBMR(profile: UserProfile): number {
  const { weight, height, age, gender } = profile;
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export function calculateTDEE(profile: UserProfile): number {
  return Math.round(calculateBMR(profile) * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

/**
 * Calculate TDEE using real activity data from HealthKit / Health Connect.
 * Uses a 7-day moving average of active calories to smooth daily variance.
 *
 * @param bmr         Basal metabolic rate (kcal/day) from Mifflin-St Jeor
 * @param avgActiveCalories7d  Average active kcal/day over last 7 days (0 = no data)
 * @param daysWithData         How many of the 7 days actually had data
 * @returns Dynamic TDEE, or null when there's insufficient data (falls back to static)
 */
export function calculateDynamicTDEE(
  bmr: number,
  avgActiveCalories7d: number,
  daysWithData: number
): number | null {
  if (daysWithData < MIN_HEALTH_DAYS || avgActiveCalories7d <= 0) return null;

  // Apply a small discount (0.9) to account for wearable over-estimation
  const adjustedActive = Math.round(avgActiveCalories7d * 0.9);

  // Dynamic TDEE = BMR + real active calories
  return Math.round(bmr + adjustedActive);
}

export function calculateRecommendedGoals(profile: UserProfile): UserGoals {
  const tdee = calculateTDEE(profile);
  let targetCalories = tdee;

  switch (profile.goal as FitnessGoal) {
    case 'lose_weight':    targetCalories = Math.round(tdee * 0.8); break;
    case 'gain_muscle':    targetCalories = Math.round(tdee * 1.1); break;
    default:               targetCalories = tdee;
  }

  let proteinRatio: number, carbsRatio: number, fatRatio: number;
  switch (profile.goal as FitnessGoal) {
    case 'lose_weight':  proteinRatio = 0.35; carbsRatio = 0.35; fatRatio = 0.30; break;
    case 'gain_muscle':  proteinRatio = 0.30; carbsRatio = 0.45; fatRatio = 0.25; break;
    default:             proteinRatio = 0.25; carbsRatio = 0.45; fatRatio = 0.30;
  }

  return {
    calories: targetCalories,
    protein: Math.round((targetCalories * proteinRatio) / 4),
    carbs: Math.round((targetCalories * carbsRatio) / 4),
    fat: Math.round((targetCalories * fatRatio) / 9),
    fiber: profile.gender === 'male' ? 38 : 25,
  };
}

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  return {
    calories: Math.round((a.calories + b.calories) * 10) / 10,
    protein: Math.round((a.protein + b.protein) * 10) / 10,
    carbs: Math.round((a.carbs + b.carbs) * 10) / 10,
    fat: Math.round((a.fat + b.fat) * 10) / 10,
    fiber: Math.round(((a.fiber || 0) + (b.fiber || 0)) * 10) / 10,
  };
}

export function emptyNutrition(): Nutrition {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

export function calculatePercentage(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(Math.round((current / goal) * 100), 100);
}

export function formatMacro(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  return (Math.round(value * 10) / 10).toString();
}

export function getRemainingNutrition(current: Nutrition, goals: UserGoals): Nutrition {
  return {
    calories: Math.max(0, goals.calories - current.calories),
    protein: Math.max(0, goals.protein - current.protein),
    carbs: Math.max(0, goals.carbs - current.carbs),
    fat: Math.max(0, goals.fat - current.fat),
    fiber: Math.max(0, goals.fiber - (current.fiber || 0)),
  };
}
