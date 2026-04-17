// ============================================
// Cals2Gains — Weekly rebalance of calories & macros
// ============================================
// Given the last 7 days of actual intake + dynamic TDEE, compute today's
// target so that the weekly budget comes out on plan.
//
// Canonical constants are aligned with METODOLOGIA_NUTRICIONAL.md (legal
// worktree confident-lamarr). Any divergence must be resolved in favour of
// that document per its §0 ("si el código y este documento divergen, gana
// este documento"). The static target comes from `utils/macros.ts`
// (calculateMacroTargets); this file only adds DAILY redistribution based
// on the rolling 7-day window of actual intake + dynamic TDEE.
// ============================================

import { FitnessGoal, GoalMode, User, UserGoals, UserProfile } from '../types';
import { calculateBMR, getActivityMultiplier } from './nutrition';

/**
 * Internal rebalance goal type — mapped from the user's GoalMode (advanced,
 * 6 values) or FitnessGoal (simple, 4 values). Aligned with nutrition agent
 * requirements (R7 NUTRITION-MODES).
 */
export type GoalType =
  | 'cut'        // lose_weight / lose_fat
  | 'mini_cut'   // aggressive short-term cut
  | 'maintain'   // maintain_weight / improve_health / maintain
  | 'recomp'     // simultaneous fat loss + muscle (maintenance with high protein)
  | 'bulk'       // gain_muscle
  | 'lean_bulk'; // conservative surplus

/**
 * Map the user's goal to internal rebalance goal type. Prefers the advanced
 * `goalMode` (6 values) if set, otherwise falls back to `FitnessGoal` (simple).
 */
export function goalTypeFromUser(user: Pick<User, 'goalMode' | 'profile'>): GoalType {
  if (user.goalMode) {
    switch (user.goalMode) {
      case 'lose_fat': return 'cut';
      case 'mini_cut': return 'mini_cut';
      case 'gain_muscle': return 'bulk';
      case 'lean_bulk': return 'lean_bulk';
      case 'recomp': return 'recomp';
      case 'maintain': return 'maintain';
    }
  }
  return goalTypeFromFitnessGoal(user.profile.goal);
}

/** Back-compat helper: map FitnessGoal (simple mode) to internal goal type. */
export function goalTypeFromFitnessGoal(g: FitnessGoal): GoalType {
  if (g === 'lose_weight') return 'cut';
  if (g === 'gain_muscle') return 'bulk';
  return 'maintain'; // maintain_weight, improve_health
}

/**
 * TDEE factor applied per goal mode — canonical from METODOLOGIA §3.1 and
 * mirrored verbatim in utils/macros.ts (legal worktree). The weekly budget
 * is `Σ(tdeeDynamic * factor)` so the rebalance stays in step with the
 * static onboarding target when activity is average.
 */
const GOAL_TDEE_FACTOR: Record<GoalType, number> = {
  cut: 0.80,       // lose_fat
  mini_cut: 0.75,
  maintain: 1.00,
  recomp: 1.00,
  bulk: 1.10,      // gain_muscle
  lean_bulk: 1.05,
};

/**
 * Protein floor in g/kg body weight — canonical centres from METODOLOGIA
 * §3.2 (ISSN 2017 Jäger et al., Helms 2014). Mirrors utils/macros.ts
 * PROTEIN_G_PER_KG so a user on average activity gets the same protein
 * target whether the static or the rebalanced path runs.
 */
const PROTEIN_FLOOR_G_PER_KG: Record<GoalType, number> = {
  cut: 2.1,        // lose_fat
  mini_cut: 2.4,
  maintain: 1.7,
  recomp: 2.3,
  bulk: 1.9,       // gain_muscle
  lean_bulk: 1.9,
};

/**
 * Hormonal fat floor (g/kg) — METODOLOGIA §8.2. Below this the risk of
 * hypogonadism (♂) and hypothalamic amenorrhea (♀) grows materially
 * (Fahrenholtz 2018; Loucks 2003).
 */
const FAT_FLOOR_G_PER_KG = 0.5;

/** Hard absolute kcal floor by sex (safety net — EFSA minimums). */
const ABSOLUTE_KCAL_FLOOR_FEMALE = 1200;
const ABSOLUTE_KCAL_FLOOR_MALE = 1500;

/** Kcal ceiling over dynamic TDEE — prevents disguised binge days. */
const CEILING_OVER_TDEE = 700;

/** Daily band vs base target (lower, upper). More restrictive for mini_cut/lean_bulk. */
const DAILY_BAND: Record<GoalType, [number, number]> = {
  cut: [0.9, 1.25],
  mini_cut: [0.95, 1.10],
  maintain: [0.75, 1.25],
  recomp: [0.85, 1.15],
  bulk: [0.8, 1.15],
  lean_bulk: [0.9, 1.10],
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
  | 'kill_switch_pregnancy'
  | 'kill_switch_breastfeeding'
  | 'kill_switch_eating_disorder'
  | 'kill_switch_clinical_condition'
  | 'kill_switch_training_plan_override'
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
 * Canonical taxonomy from legal worktree (confident-lamarr)
 * `types/index.ts` — array form. Strings are UI-safe (no clinical terms,
 * §8.4 METODOLOGIA). Typed loosely here so this file doesn't hard-depend
 * on the legal branch until it lands in main.
 */
export type MedicalFlagsShape =
  | Array<'pregnancy_lactation' | 'eating_sensitive' | 'diabetes' | 'kidney_disease' | string>
  | undefined;

function hasFlag(flags: MedicalFlagsShape, flag: string): boolean {
  return Array.isArray(flags) && flags.includes(flag);
}

/**
 * Returns a non-null flag if the user must NOT be rebalanced (safety).
 * When set, the caller should use the static target instead.
 *
 * Order matters: vulnerable-population checks go FIRST so they are never
 * shadowed by anthropometric ones (e.g. a low-BMI pregnant user should see
 * the pregnancy flag, not the BMI flag).
 */
export function checkKillSwitch(
  profile: UserProfile,
  baseGoals: UserGoals,
  medicalFlags?: MedicalFlagsShape
): RebalanceFlag | null {
  // R3 vulnerable populations — canonical strings from legal worktree.
  if (hasFlag(medicalFlags, 'pregnancy_lactation')) return 'kill_switch_pregnancy';
  if (hasFlag(medicalFlags, 'eating_sensitive')) return 'kill_switch_eating_disorder';
  if (
    hasFlag(medicalFlags, 'diabetes') ||
    hasFlag(medicalFlags, 'kidney_disease')
  ) {
    return 'kill_switch_clinical_condition';
  }

  const bmr = calculateBMR(profile);

  if (profile.age < 18) return 'kill_switch_age';
  if (bmi(profile) < 18.5) return 'kill_switch_bmi';
  if (baseGoals.calories > 0 && baseGoals.calories < bmr * 1.2) {
    return 'kill_switch_target_below_bmr';
  }

  return null;
}

/**
 * Training Plan day types that OVERRIDE the rebalance. When the plan dictates
 * a refeed or competition day, we must respect its macros verbatim (nutrition
 * agent R9). The rebalance is silent on these days — caller should show the
 * plan's target instead.
 */
export type TrainingDayOverride = 'refeed' | 'competicion';

/**
 * Compute today's rebalanced target given the week's dailyEntries.
 *
 * @param profile         User anthropometrics
 * @param baseGoals       Static user goals (calories + macros) the user accepted
 * @param goalType        Internal rebalance goal type (prefer goalTypeFromUser)
 * @param entries         Rolling 7-day entries (ordered oldest→newest, includes today)
 * @param medicalFlags    Optional — vulnerable-population flags from onboarding screening
 * @param trainingDay     Optional — if today is a plan day that overrides rebalance, skip
 * @returns               Today's target or null if rebalance must be skipped
 */
export function computeTodayTarget(
  profile: UserProfile,
  baseGoals: UserGoals,
  goalType: GoalType,
  entries: DailyEntry[],
  medicalFlags?: MedicalFlagsShape,
  trainingDay?: TrainingDayOverride | null
): TodayTarget | null {
  // R9: Training plan refeed/competicion days dictate their own macros.
  if (trainingDay === 'refeed' || trainingDay === 'competicion') return null;

  const kill = checkKillSwitch(profile, baseGoals, medicalFlags);
  if (kill) return null;

  if (entries.length === 0) return null;

  const todayIdx = entries.findIndex((e) => e.isToday);
  if (todayIdx === -1) return null;

  const pastEntries = entries.slice(0, todayIdx);
  const daysRemaining = entries.length - todayIdx; // includes today

  // Weekly kcal budget = Σ (tdeeDynamic * goalFactor) per day
  const goalFactor = GOAL_TDEE_FACTOR[goalType];
  const weeklyBudget = entries.reduce(
    (sum, e) => sum + e.tdeeDynamic * goalFactor,
    0
  );

  const consumedKcal = pastEntries.reduce((sum, e) => sum + e.consumedKcal, 0);
  const remainingKcal = weeklyBudget - consumedKcal;
  const rawDailyKcal = remainingKcal / daysRemaining;

  // Base single-day target for comparison + band reference
  const baseDaily = entries[todayIdx].tdeeDynamic * goalFactor;

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
