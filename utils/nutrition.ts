// Cals2Gains - Nutrition Utility Functions

import { ActivityLevel, FitnessGoal, GoalMode, Nutrition, UserGoals, UserProfile } from '../types';
import { calculateMacroTargets } from './macros';

// Minimum days of health data required to trust the moving average
const MIN_HEALTH_DAYS = 3;

/**
 * Wearable calibration factor — consumer wearables overestimate active calories:
 * Apple Watch ~9 % high (Shcherbina et al., J Pers Med 2017),
 * Fitbit 12-18 % high (Fuller et al., JMIR Mhealth Uhealth 2020).
 * We apply a 10 % discount to approach real expenditure.
 */
export const WEARABLE_CALIBRATION_FACTOR = 0.9;

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

// Dampening applied to the activity delta: half of the extra/missing activity
// flows into the target. Prevents a 20k-step day from moving the target +1000 kcal.
// Pure design choice, not clinical consensus — tuneable if telemetry requires.
export const ACTIVITY_DAMPENING = 0.5;

/**
 * Calculate TDEE using real activity data from HealthKit / Health Connect.
 *
 * Anti double-count formula:
 *   TDEE_base       = BMR * PAL               (activity already assumed by profile)
 *   delta_activity  = active_real * CORRECTION − BMR * (PAL − 1)
 *   TDEE_dynamic    = TDEE_base + delta * DAMPENING
 *
 * Bounded to [BMR*1.15, BMR*2.5] for sanity.
 *
 * @returns Dynamic TDEE, or null when there's insufficient data (fall back to static).
 */
export function calculateDynamicTDEE(
  bmr: number,
  pal: number,
  avgActiveCalories7d: number,
  daysWithData: number
): number | null {
  if (daysWithData < MIN_HEALTH_DAYS || avgActiveCalories7d <= 0) return null;

  const tdeeBase = bmr * pal;
  const activityExpected = bmr * (pal - 1);
  const activityReal = avgActiveCalories7d * WEARABLE_CALIBRATION_FACTOR;
  const delta = activityReal - activityExpected;

  const dynamic = tdeeBase + delta * ACTIVITY_DAMPENING;
  const clamped = Math.max(bmr * 1.15, Math.min(bmr * 2.5, dynamic));
  return Math.round(clamped);
}

/** Returns the PAL multiplier for a given ActivityLevel. */
export function getActivityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_MULTIPLIERS[level];
}

/**
 * Map the legacy `FitnessGoal` enum to the canonical `GoalMode` used by
 * `calculateMacroTargets`. `improve_health` and `maintain_weight` both map to
 * `maintain` (same calorie factor).
 */
function fitnessGoalToGoalMode(goal: FitnessGoal): GoalMode {
  switch (goal) {
    case 'lose_weight':    return 'lose_fat';
    case 'gain_muscle':    return 'gain_muscle';
    case 'maintain_weight':
    case 'improve_health':
    default:               return 'maintain';
  }
}

/**
 * Legacy entry point — kept to preserve the public API used by callers that
 * operate on `FitnessGoal` instead of `GoalMode`. Delegates to the canonical
 * `calculateMacroTargets`.
 */
export function calculateRecommendedGoals(profile: UserProfile): UserGoals {
  const goalMode = fitnessGoalToGoalMode(profile.goal as FitnessGoal);
  const targets = calculateMacroTargets(profile, goalMode);
  return {
    calories: targets.calories,
    protein: targets.protein,
    carbs: targets.carbs,
    fat: targets.fat,
    fiber: targets.fiber,
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
