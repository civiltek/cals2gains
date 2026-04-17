// Cals2Gains - Unified Macro Targets
//
// Canonical source for the macronutrient target calculation.
// See `_project-hub/METODOLOGIA_NUTRICIONAL.md` §1-§3, §8 for the scientific
// basis of every constant in this file.

import { GoalMode, UserProfile } from '../types';
import { calculateBMR, calculateTDEE } from './nutrition';

// ============================================================================
// TYPES
// ============================================================================

export interface MacroTargets {
  calories: number;
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
  fiber: number;   // g
  flags: {
    calorieCapApplied: boolean;
    fatFloorApplied: boolean;
  };
}

// ============================================================================
// CONSTANTS (§3.1 & §8)
// ============================================================================

/**
 * Caloric factor applied to TDEE per goal mode.
 * Source: METODOLOGIA_NUTRICIONAL.md §3.1 (table based on Helms et al. 2014,
 * Iraki et al. 2019, Barakat et al. 2020).
 */
const CALORIE_FACTOR: Record<GoalMode, number> = {
  lose_fat:     0.80,
  mini_cut:     0.75,
  recomp:       1.00,
  maintain:     1.00,
  lean_bulk:    1.05,
  gain_muscle:  1.10,
};

/**
 * Target protein per kg of body weight (g/kg) — centre of the §3.2 range for
 * each mode. Source: ISSN Position Stand 2017 (Jäger et al.) and Helms 2014.
 */
const PROTEIN_G_PER_KG: Record<GoalMode, number> = {
  lose_fat:     2.1,
  mini_cut:     2.4,
  recomp:       2.3,
  maintain:     1.7,
  lean_bulk:    1.9,
  gain_muscle:  1.9,
};

/**
 * Hard calorie floor — §8.1. Never recommend below these thresholds.
 * WHO, ACSM, Manore 2015.
 */
const CALORIE_FLOOR_FEMALE = 1200;
const CALORIE_FLOOR_MALE   = 1500;

/**
 * Hormonal fat floor (g/kg) — §8.2. Below this, risk of hypogonadism
 * (male) and hypothalamic amenorrhea (female).
 * Fahrenholtz et al. 2018; Loucks 2003.
 */
const FAT_FLOOR_G_PER_KG = 0.5;

/**
 * Carbohydrate floor (g/day). If the remainder would be negative after cap,
 * protein shrinks first (0.1 g/kg steps) until carbs are >= 50 g/day.
 */
const CARBS_FLOOR_G = 50;

/**
 * Minimum BF% where Katch-McArdle is trusted over Mifflin-St Jeor.
 * Below 5% is physiologically implausible, above 55% crushes lean mass
 * estimation.
 */
const BODY_FAT_MIN_VALID = 5;
const BODY_FAT_MAX_VALID = 55;

// ============================================================================
// BMR — Katch-McArdle when body fat is known (§1.3)
// ============================================================================

function calculateKatchMcArdleBMR(weightKg: number, bodyFatPct: number): number {
  const leanMassKg = weightKg * (1 - bodyFatPct / 100);
  return 370 + 21.6 * leanMassKg;
}

// ============================================================================
// CANONICAL ENTRY POINT
// ============================================================================

/**
 * Compute the full macro target object for a user profile and goal mode.
 *
 * Order of operations (§3.3):
 *   1. BMR (Mifflin-St Jeor, or Katch-McArdle when %BF is reliable).
 *   2. TDEE = BMR × activity multiplier (static, no HealthKit).
 *   3. Calorie target = TDEE × goal factor, then hard-capped to §8.1 floors.
 *   4. Protein (g) = weight × protein_g_per_kg[mode] — constant regardless of
 *      calorie deficit/surplus.
 *   5. Fat (g) = 25% of calories, then raised to §8.2 floor of 0.5 g/kg if
 *      needed.
 *   6. Carbs (g) = remainder / 4. Never negative; if it would be, shrink
 *      protein in 0.1 g/kg increments until carbs >= 50 g.
 *   7. Fiber: 38 g male / 25 g female (IOM 2005).
 */
export function calculateMacroTargets(
  profile: UserProfile,
  goalMode: GoalMode,
  bodyFatPct?: number,
): MacroTargets {
  // 1. BMR
  const useKatch =
    typeof bodyFatPct === 'number' &&
    bodyFatPct >= BODY_FAT_MIN_VALID &&
    bodyFatPct <= BODY_FAT_MAX_VALID;

  const bmr = useKatch
    ? calculateKatchMcArdleBMR(profile.weight, bodyFatPct as number)
    : calculateBMR(profile);

  // 2. TDEE (static). We reuse calculateTDEE for Mifflin path to share the
  //    activity map; when using Katch-McArdle, apply the same multipliers
  //    manually from the profile's activity level.
  let tdee: number;
  if (useKatch) {
    const mifflinTDEE = calculateTDEE(profile);   // BMR_mifflin * mult
    const mifflinBMR = calculateBMR(profile);
    const multiplier = mifflinBMR > 0 ? mifflinTDEE / mifflinBMR : 1.55;
    tdee = Math.round(bmr * multiplier);
  } else {
    tdee = calculateTDEE(profile);
  }

  // 3. Calorie target with hard floor
  const factor = CALORIE_FACTOR[goalMode];
  let calories = Math.round(tdee * factor);

  let calorieCapApplied = false;
  const floor = profile.gender === 'female' ? CALORIE_FLOOR_FEMALE : CALORIE_FLOOR_MALE;
  if (calories < floor) {
    calories = floor;
    calorieCapApplied = true;
  }

  // 4. Protein (g) from g/kg × weight
  let proteinPerKg = PROTEIN_G_PER_KG[goalMode];
  let proteinG = Math.round(proteinPerKg * profile.weight);

  // 5. Fat — start at 25 % of kcal, raise to §8.2 floor if needed
  let fatFloorApplied = false;
  let fatG = Math.round((calories * 0.25) / 9);
  const fatFloorG = Math.round(FAT_FLOOR_G_PER_KG * profile.weight);
  if (fatG < fatFloorG) {
    fatG = fatFloorG;
    fatFloorApplied = true;
  }

  // 6. Carbs as remainder; shrink protein (0.1 g/kg) until carbs >= floor
  const recomputeCarbs = () => {
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const remainderKcal = calories - proteinKcal - fatKcal;
    return Math.round(remainderKcal / 4);
  };

  let carbsG = recomputeCarbs();
  // If remainder is below floor, incrementally reduce protein in 0.1 g/kg
  // steps until carbs reach >= CARBS_FLOOR_G or protein hits a sane minimum.
  const MIN_PROTEIN_G_PER_KG = 1.2; // absolute floor for lean-mass preservation
  while (carbsG < CARBS_FLOOR_G && proteinPerKg > MIN_PROTEIN_G_PER_KG) {
    proteinPerKg = Math.round((proteinPerKg - 0.1) * 10) / 10;
    proteinG = Math.round(proteinPerKg * profile.weight);
    carbsG = recomputeCarbs();
  }
  // Clamp: never negative.
  if (carbsG < 0) carbsG = 0;

  // 7. Fiber per §3.4
  const fiber = profile.gender === 'male' ? 38 : 25;

  return {
    calories,
    protein: proteinG,
    carbs: carbsG,
    fat: fatG,
    fiber,
    flags: { calorieCapApplied, fatFloorApplied },
  };
}

// ============================================================================
// dev sanity checks (not executed — pure documentation of expected ranges)
// ============================================================================

// Sanity #1 — female 25yo, 60 kg, 165 cm, sedentary, mini_cut
//   BMR (Mifflin) = 10·60 + 6.25·165 - 5·25 - 161 = 600 + 1031.25 - 125 - 161
//                 = 1345.25 kcal
//   TDEE = 1345.25 × 1.2 ≈ 1614 kcal
//   Target before cap = 1614 × 0.75 ≈ 1211 kcal
//   After §8.1 female floor (1200): still 1211 (above floor) OR exactly 1200
//   depending on rounding — either way calorieCapApplied should be triggered
//   for slightly lower weights / higher ages. With these exact inputs the
//   value sits on the edge (~1211), so the flag may not fire; drop weight
//   to 55 kg or age to 30 yo and the floor kicks in. Documented intentionally.
//
// Sanity #2 — male 35yo, 80 kg, 180 cm, moderately_active, gain_muscle
//   BMR (Mifflin) = 10·80 + 6.25·180 - 5·35 + 5 = 800 + 1125 - 175 + 5
//                 = 1755 kcal
//   TDEE = 1755 × 1.55 ≈ 2720 kcal
//   Target = 2720 × 1.10 ≈ 2992 kcal
//   Protein = 80 × 1.9 = 152 g   → matches expected ~152 g
//   Fat     = 2992 × 0.25 / 9 ≈ 83 g (floor 0.5·80=40 g, not triggered)
//   Carbs   = (2992 - 608 - 747) / 4 ≈ 409 g
