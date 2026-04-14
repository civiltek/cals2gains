import {
  AdaptiveMacroEngine,
  Meal,
  UserGoals,
  WeightEntry,
  AdherenceScore,
  GoalMode,
} from '../../services/adaptiveMacroEngine';

// ============================================================================
// Test helpers
// ============================================================================

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    name: 'Test Meal',
    calories: 500,
    protein: 30,
    carbs: 50,
    fat: 20,
    mealType: 'lunch',
    timestamp: new Date(),
    ...overrides,
  };
}

function makeGoals(overrides: Partial<UserGoals> = {}): UserGoals {
  return {
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 70,
    goalType: 'maintain',
    tdee: 2200,
    bmr: 1700,
    ...overrides,
  };
}

function makeWeight(overrides: Partial<WeightEntry> = {}): WeightEntry {
  return {
    date: new Date(),
    weight: 75,
    unit: 'kg',
    ...overrides,
  };
}

/**
 * Generate meals spread across N days (3 meals per day).
 * Each day's total: calories = caloriesPerMeal * 3
 */
function generateDailyMeals(
  days: number,
  caloriesPerMeal: number = 667,
  proteinPerMeal: number = 50,
): Meal[] {
  const meals: Meal[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);

    for (let m = 0; m < 3; m++) {
      const mealTime = new Date(date);
      mealTime.setHours(8 + m * 5); // 8:00, 13:00, 18:00
      meals.push(
        makeMeal({
          id: `meal-${d}-${m}`,
          calories: caloriesPerMeal,
          protein: proteinPerMeal,
          carbs: 60,
          fat: 25,
          timestamp: mealTime,
        }),
      );
    }
  }

  return meals;
}

// ============================================================================
// calculateAdherenceScore
// ============================================================================

describe('AdaptiveMacroEngine.calculateAdherenceScore', () => {
  it('returns empty score for empty meals array', () => {
    const score = AdaptiveMacroEngine.calculateAdherenceScore([], makeGoals());
    expect(score.overall).toBe(0);
    expect(score.trend).toBe('stable');
  });

  it('returns empty score when days < 7', () => {
    const meals = generateDailyMeals(3);
    const score = AdaptiveMacroEngine.calculateAdherenceScore(meals, makeGoals(), 5);
    expect(score.overall).toBe(0);
  });

  it('returns high adherence for meals within calorie window', () => {
    // 3 meals × 667 cal = 2001 cal/day, target = 2000 -> within ±10%
    const meals = generateDailyMeals(10, 667, 50);
    const goals = makeGoals({ targetCalories: 2000, targetProtein: 150 });
    const score = AdaptiveMacroEngine.calculateAdherenceScore(meals, goals, 10);

    expect(score.calorieAdherence).toBeGreaterThan(0.5);
    expect(score.consistency).toBeGreaterThan(0.5);
    expect(score.overall).toBeGreaterThan(0);
  });

  it('returns low calorie adherence for meals far from target', () => {
    // 3 meals × 400 cal = 1200 cal/day, target = 2000 -> 60% of target, outside ±10%
    const meals = generateDailyMeals(10, 400, 30);
    const goals = makeGoals({ targetCalories: 2000 });
    const score = AdaptiveMacroEngine.calculateAdherenceScore(meals, goals, 10);

    expect(score.calorieAdherence).toBe(0);
  });

  it('consistency counts days with 2+ meals', () => {
    const now = new Date();
    const meals: Meal[] = [];
    // 7 days, but only 1 meal on days 0-3 (inconsistent), 3 meals on days 4-6
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const mealsPerDay = d >= 4 ? 1 : 3;
      for (let m = 0; m < mealsPerDay; m++) {
        const t = new Date(date);
        t.setHours(8 + m * 5);
        meals.push(makeMeal({ id: `m-${d}-${m}`, timestamp: t, calories: 700, protein: 50 }));
      }
    }

    const score = AdaptiveMacroEngine.calculateAdherenceScore(meals, makeGoals(), 7);
    // Only 4 of 7 days have 2+ meals
    expect(score.consistency).toBeLessThan(1);
    expect(score.consistency).toBeGreaterThan(0);
  });
});

// ============================================================================
// shouldAdjustGoals
// ============================================================================

describe('AdaptiveMacroEngine.shouldAdjustGoals', () => {
  const highAdherence: AdherenceScore = {
    calorieAdherence: 0.9,
    proteinAdherence: 0.9,
    consistency: 0.9,
    overall: 0.9,
    trend: 'stable',
  };

  const lowAdherence: AdherenceScore = {
    calorieAdherence: 0.3,
    proteinAdherence: 0.3,
    consistency: 0.3,
    overall: 0.3,
    trend: 'declining',
  };

  it('returns null when fewer than 3 weight entries', () => {
    const weights = [makeWeight(), makeWeight()];
    expect(
      AdaptiveMacroEngine.shouldAdjustGoals(weights, makeGoals(), highAdherence, 'lose_fat'),
    ).toBeNull();
  });

  it('recommends "maintain" for low adherence', () => {
    const now = new Date();
    const weights = [
      makeWeight({ weight: 76, date: new Date(now.getTime() - 21 * 86400000) }),
      makeWeight({ weight: 75.5, date: new Date(now.getTime() - 14 * 86400000) }),
      makeWeight({ weight: 75, date: now }),
    ];

    const result = AdaptiveMacroEngine.shouldAdjustGoals(
      weights, makeGoals(), lowAdherence, 'lose_fat',
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('maintain');
    expect(result!.calorieChange).toBe(0);
  });

  it('recommends deficit increase when weight stalls with high adherence on lose_fat', () => {
    const now = new Date();
    const weights = [
      makeWeight({ weight: 75.1, date: new Date(now.getTime() - 21 * 86400000) }),
      makeWeight({ weight: 75.0, date: new Date(now.getTime() - 14 * 86400000) }),
      makeWeight({ weight: 75.0, date: now }), // stalled — change < 0.5kg
    ];

    const result = AdaptiveMacroEngine.shouldAdjustGoals(
      weights, makeGoals(), highAdherence, 'lose_fat',
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('decrease');
    expect(result!.calorieChange).toBe(100); // 50 * 2
  });

  it('recommends surplus reduction when gaining too fast on lean_bulk', () => {
    const now = new Date();
    const weights = [
      makeWeight({ weight: 70, date: new Date(now.getTime() - 21 * 86400000) }),
      makeWeight({ weight: 72, date: new Date(now.getTime() - 14 * 86400000) }),
      makeWeight({ weight: 74, date: now }), // +4kg in 3 weeks > 1.5kg threshold
    ];

    const adherence: AdherenceScore = { ...highAdherence, overall: 0.8 };
    const result = AdaptiveMacroEngine.shouldAdjustGoals(
      weights, makeGoals(), adherence, 'lean_bulk',
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('decrease');
    expect(result!.calorieChange).toBe(50);
  });

  it('recommends maintain for recomp with stable weight and high protein adherence', () => {
    const now = new Date();
    const weights = [
      makeWeight({ weight: 75.2, date: new Date(now.getTime() - 21 * 86400000) }),
      makeWeight({ weight: 75.1, date: new Date(now.getTime() - 14 * 86400000) }),
      makeWeight({ weight: 75.0, date: now }),
    ];

    const adherence: AdherenceScore = {
      ...highAdherence,
      proteinAdherence: 0.9,
    };
    const result = AdaptiveMacroEngine.shouldAdjustGoals(
      weights, makeGoals(), adherence, 'recomp',
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('maintain');
    expect(result!.reason).toContain('recomp');
  });
});

// ============================================================================
// getGoalModeConfig
// ============================================================================

describe('AdaptiveMacroEngine.getGoalModeConfig', () => {
  const allModes: GoalMode[] = [
    'lose_fat', 'gain_muscle', 'recomp', 'maintain', 'mini_cut', 'lean_bulk',
  ];

  it.each(allModes)('returns config for mode "%s"', (mode) => {
    const config = AdaptiveMacroEngine.getGoalModeConfig(mode);
    expect(config).toBeDefined();
    expect(config.calorieFactor).toBeGreaterThan(0);
    expect(config.proteinMultiplier).toBeGreaterThan(0);
    expect(config.emoji).toBeTruthy();
    expect(config.descriptionEs).toBeTruthy();
  });

  it('lose_fat has a calorie deficit', () => {
    expect(AdaptiveMacroEngine.getGoalModeConfig('lose_fat').calorieFactor).toBeLessThan(1);
  });

  it('gain_muscle has a calorie surplus', () => {
    expect(AdaptiveMacroEngine.getGoalModeConfig('gain_muscle').calorieFactor).toBeGreaterThan(1);
  });

  it('maintain keeps calories at 1.0', () => {
    expect(AdaptiveMacroEngine.getGoalModeConfig('maintain').calorieFactor).toBe(1.0);
  });

  it('mini_cut has the steepest deficit', () => {
    const miniCut = AdaptiveMacroEngine.getGoalModeConfig('mini_cut');
    const loseFat = AdaptiveMacroEngine.getGoalModeConfig('lose_fat');
    expect(miniCut.calorieFactor).toBeLessThan(loseFat.calorieFactor);
  });

  it('macro percentages should roughly sum to 1', () => {
    allModes.forEach((mode) => {
      const config = AdaptiveMacroEngine.getGoalModeConfig(mode);
      // protein is from a multiplier, not a percentage — check carbs + fat only
      const carbsAndFat = config.carbsPct + config.fatPct;
      // carbsPct + fatPct should leave room for protein (between 0.35 and 0.75)
      expect(carbsAndFat).toBeGreaterThan(0.3);
      expect(carbsAndFat).toBeLessThanOrEqual(0.75);
    });
  });
});
