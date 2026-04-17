// ============================================
// Cals2Gains — Weekly rebalance of calories & macros
// ============================================
// Given the last 7 days of actual intake + dynamic TDEE, compute today's
// target so that the weekly budget comes out on plan.
//
// Clinical guardrails (non-negotiable):
//   - Protein never rebalanced down (floor by g/kg depending on goal)
//   - Absolute kcal floor: max(BMR*1.1, 1200♀/1500♂)
//   - Absolute kcal ceiling: dynamic_TDEE + 700
//   - Daily band vs base target: ±25% (maintain), -10/+25% (cut), -20/+15% (bulk)
//   - Kill switch: age < 18, BMI < 18.5, base target < BMR*1.2
//
// Design choices (not consensus, tuneable):
//   - Rolling 7d window (internal), natural week for UI
//   - Goal kcal adjustment ±500 cut / ±300 bulk
// ============================================

import { FitnessGoal, UserGoals, UserProfile } from '../types';
import { calculateBMR, getActivityMultiplier } from './nutrition';

export type GoalType = 'cut' | 'maintain' | 'bulk';

/** Map app FitnessGoal to internal rebalance goal type. */
export function goalTypeFromFitnessGoal(g: FitnessGoal): GoalType {
  if (g === 'lose_weight') return 'cut';
  if (g === 'gain_muscle') return 'bulk';
  return 'maintain'; // maintain_weight, improve_health
}

/** Weekly kcal delta applied on top of summed TDEEs. */
const GOAL_KCAL_ADJUSTMENT: Record<GoalType, number> = {
  cut: -500,
  maintain: 0,
  bulk: 300,
};

/** Protein floor in g/kg body weight (consensus range). */
const PROTEIN_FLOOR_G_PER_KG: Record<GoalType, number> = {
  cut: 2.2,
  maintain: 1.8,
  bulk: 1.6,
};

/** Fat floor in g/kg body weight (hormonal minimum). */
const FAT_FLOOR_G_PER_KG = 0.6;

/** Hard absolute kcal floor by sex (safety net). */
const ABSOLUTE_KCAL_FLOOR_FEMALE = 1200;
const ABSOLUTE_KCAL_FLOOR_MALE = 1500;

/** Kcal ceiling over dynamic TDEE — prevents disguised binge days. */
const CEILING_OVER_TDEE = 700;

/** Daily band vs base target (lower, upper). */
const DAILY_BAND: Record<GoalType, [number, number]> = {
  cut: [0.9, 1.25],
  maintain: [0.75, 1.25],
  bulk: [0.8, 1.15],
};

export interface DailyEntry {
  /** YYYY-MM-DD */
  date: string;
  /** Dynamic TDEE computed for that day (kcal). If no health data that day, fallback to base TDEE. */
  tdeeDynamic: number;
  /** Kcal actually consumed (logged meals). 0 if day not yet started. */
  consumedKcal: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  consumedFiber: number;
  /** True if this entry corresponds to today. */
  isToday: boolean;
}

export type RebalanceFlag =
  | 'kill_switch_age'
  | 'kill_switch_bmi'
  | 'kill_switch_target_below_bmr'
  | 'at_absolute_floor'
  | 'at_absolute_ceiling'
  | 'capped_high_carryover_forward'
  | 'capped_low_carryover_forward'
  | 'protein_floor_enforced'
  | 'low_carb_forced'
  | 'insufficient_data';

export interface TodayTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Base daily target (no rebalance) for comparison in UI. */
  baseTarget: number;
  /** Explanations / warnings for the UI banner. */
  flags: RebalanceFlag[];
}

function bmi(profile: UserProfile): number {
  const h = profile.height / 100;
  return profile.weight / (h * h);
}

function absoluteFloor(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  const sexFloor = profile.gender === 'male'
    ? ABSOLUTE_KCAL_FLOOR_MALE
    : ABSOLUTE_KCAL_FLOOR_FEMALE;
  return Math.max(Math.round(bmr * 1.1), sexFloor);
}

/**
 * Returns a non-null flag if the user must NOT be rebalanced (safety).
 * When set, the caller should use the static target instead.
 */
export function checkKillSwitch(
  profile: UserProfile,
  baseGoals: UserGoals
): RebalanceFlag | null {
  const bmr = calculateBMR(profile);

  if (profile.age < 18) return 'kill_switch_age';
  if (bmi(profile) < 18.5) return 'kill_switch_bmi';
  if (baseGoals.calories > 0 && baseGoals.calories < bmr * 1.2) {
    return 'kill_switch_target_below_bmr';
  }
  // TODO: once medicalFlags type lands (legal worktree), short-circuit on
  // eating_disorder_history. Until then, rely on baseTarget < BMR*1.2 heuristic.

  return null;
}

/**
 * Compute today's rebalanced target given the week's dailyEntries.
 *
 * @param profile      User anthropometrics
 * @param baseGoals    Static user goals (calories + macros) the user accepted
 * @param goalType     'cut' | 'maintain' | 'bulk'
 * @param entries      Rolling 7-day entries (ordered oldest→newest, includes today)
 * @returns            Today's target or null if rebalance must be skipped
 */
export function computeTodayTarget(
  profile: UserProfile,
  baseGoals: UserGoals,
  goalType: GoalType,
  entries: DailyEntry[]
): TodayTarget | null {
  const kill = checkKillSwitch(profile, baseGoals);
  if (kill) return null;

  if (entries.length === 0) return null;

  const todayIdx = entries.findIndex((e) => e.isToday);
  if (todayIdx === -1) return null;

  const pastEntries = entries.slice(0, todayIdx);
  const daysRemaining = entries.length - todayIdx; // includes today

  // Weekly kcal budget = Σ tdeeDynamic per day + goal adjustment * 7
  const goalAdjust = GOAL_KCAL_ADJUSTMENT[goalType];
  const weeklyBudget = entries.reduce((sum, e) => sum + e.tdeeDynamic, 0)
    + goalAdjust * entries.length;

  const consumedKcal = pastEntries.reduce((sum, e) => sum + e.consumedKcal, 0);
  const remainingKcal = weeklyBudget - consumedKcal;
  const rawDailyKcal = remainingKcal / daysRemaining;

  // Base single-day target for comparison + band reference
  const baseDaily = entries[todayIdx].tdeeDynamic + goalAdjust;

  // Guardrails
  const [bandLo, bandHi] = DAILY_BAND[goalType];
  const floorAbs = absoluteFloor(profile);
  const ceilAbs = entries[todayIdx].tdeeDynamic + CEILING_OVER_TDEE;

  const floor = Math.max(floorAbs, Math.round(baseDaily * bandLo));
  const ceiling = Math.min(ceilAbs, Math.round(baseDaily * bandHi));

  const flags: RebalanceFlag[] = [];
  let dailyKcal = Math.round(rawDailyKcal);

  if (dailyKcal > ceiling) {
    flags.push('capped_high_carryover_forward');
    dailyKcal = ceiling;
    if (ceiling === ceilAbs) flags.push('at_absolute_ceiling');
  } else if (dailyKcal < floor) {
    flags.push('capped_low_carryover_forward');
    dailyKcal = floor;
    if (floor === floorAbs) flags.push('at_absolute_floor');
  }

  // Macros — protein & fat have floors; carbs are the residual buffer
  const proteinG = Math.max(
    Math.round(profile.weight * PROTEIN_FLOOR_G_PER_KG[goalType]),
    baseGoals.protein
  );
  if (proteinG > baseGoals.protein) flags.push('protein_floor_enforced');

  const fatG = Math.max(
    Math.round(profile.weight * FAT_FLOOR_G_PER_KG),
    Math.round((dailyKcal * 0.25) / 9)
  );

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  let carbsKcal = dailyKcal - proteinKcal - fatKcal;

  // Carbs safety net: keep >= 50 g when possible by reducing extra fat
  const MIN_CARBS_G = 50;
  if (carbsKcal < MIN_CARBS_G * 4) {
    const deficitKcal = MIN_CARBS_G * 4 - carbsKcal;
    const adjustedFatG = Math.max(
      Math.round(profile.weight * FAT_FLOOR_G_PER_KG),
      Math.round((fatKcal - deficitKcal) / 9)
    );
    carbsKcal = dailyKcal - proteinKcal - adjustedFatG * 9;
    if (carbsKcal < MIN_CARBS_G * 4) {
      flags.push('low_carb_forced');
    }
    return {
      calories: dailyKcal,
      protein: proteinG,
      carbs: Math.max(0, Math.round(carbsKcal / 4)),
      fat: adjustedFatG,
      fiber: computeFiberFloor(profile, dailyKcal),
      baseTarget: Math.round(baseDaily),
      flags,
    };
  }

  return {
    calories: dailyKcal,
    protein: proteinG,
    carbs: Math.round(carbsKcal / 4),
    fat: fatG,
    fiber: computeFiberFloor(profile, dailyKcal),
    baseTarget: Math.round(baseDaily),
    flags,
  };
}

/** Fiber floor: max(25F/38M, 14g per 1000 kcal). */
function computeFiberFloor(profile: UserProfile, kcal: number): number {
  const sexFloor = profile.gender === 'male' ? 38 : 25;
  return Math.max(sexFloor, Math.round((kcal * 14) / 1000));
}

/**
 * Convenience: if user doesn't have dynamic TDEE enabled or data is missing,
 * compute the static base target using profile+goalType only. Kept here so
 * callers have one place to ask for "the target to use right now".
 */
export function computeStaticTarget(
  profile: UserProfile,
  baseGoals: UserGoals
): UserGoals {
  return baseGoals.calories > 0
    ? baseGoals
    : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
}

// Re-export PAL accessor for external callers (weeklyStore needs it to compute tdeeDynamic)
export { getActivityMultiplier };
