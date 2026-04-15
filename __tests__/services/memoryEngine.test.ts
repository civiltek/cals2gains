import {
  MemoryEngine,
  Meal,
  MealType,
  UserGoals,
  MealTemplate,
  Nutrition,
  EatingPatterns,
} from '../../services/memoryEngine';

// ============================================================================
// Helpers
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
    targetCarbs: 250,
    targetFat: 70,
    goalType: 'maintain',
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<MealTemplate> = {}): MealTemplate {
  return {
    id: 'tpl-1',
    name: 'Chicken & Rice',
    nutrition: { calories: 500, protein: 40, carbs: 50, fat: 12 },
    mealType: 'lunch',
    difficulty: 'easy',
    ...overrides,
  };
}

/** Generate N meals spread across recent days with 3 meals/day */
function generateMeals(days: number, mealsPerDay: number = 3): Meal[] {
  const meals: Meal[] = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    for (let m = 0; m < mealsPerDay; m++) {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - d);
      ts.setHours(8 + m * 5, 0, 0, 0); // 8:00, 13:00, 18:00
      const types: MealType[] = ['breakfast', 'lunch', 'dinner'];
      meals.push(
        makeMeal({
          id: `meal-${d}-${m}`,
          name: `Food ${m}`,
          mealType: types[m] || 'snack',
          calories: 500 + m * 100,
          protein: 30 + m * 5,
          timestamp: ts,
        }),
      );
    }
  }
  return meals;
}

// ============================================================================
// analyzeEatingPatterns
// ============================================================================

describe('MemoryEngine.analyzeEatingPatterns', () => {
  it('returns empty patterns for empty meals', () => {
    const result = MemoryEngine.analyzeEatingPatterns([]);
    expect(result.frequentFoods).toEqual([]);
    expect(result.topPairings).toEqual([]);
    expect(result.averageMealsPerDay).toBe(3); // default
  });

  it('returns empty patterns when all meals are older than window', () => {
    const oldMeal = makeMeal({
      timestamp: new Date('2020-01-01'),
    });
    const result = MemoryEngine.analyzeEatingPatterns([oldMeal], 30);
    expect(result.frequentFoods).toEqual([]);
  });

  it('extracts frequent foods (threshold >= 3)', () => {
    const now = new Date();
    const meals: Meal[] = [];
    // "Pollo" appears 5 times, "Arroz" 3 times, "Pizza" 1 time
    for (let i = 0; i < 5; i++) {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - i);
      meals.push(makeMeal({ id: `pollo-${i}`, name: 'Pollo', timestamp: ts }));
    }
    for (let i = 0; i < 3; i++) {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - i);
      ts.setHours(19);
      meals.push(makeMeal({ id: `arroz-${i}`, name: 'Arroz', timestamp: ts }));
    }
    meals.push(makeMeal({ id: 'pizza-0', name: 'Pizza', timestamp: now }));

    const result = MemoryEngine.analyzeEatingPatterns(meals, 30);
    expect(result.frequentFoods.length).toBe(2); // Pollo and Arroz
    expect(result.frequentFoods[0].name).toBe('Pollo');
    expect(result.frequentFoods[0].count).toBe(5);
    expect(result.frequentFoods[1].name).toBe('Arroz');
    expect(result.frequentFoods[1].count).toBe(3);
  });

  it('calculates average calories per meal type', () => {
    const now = new Date();
    const meals = [
      makeMeal({ id: 'b1', mealType: 'breakfast', calories: 300, timestamp: now }),
      makeMeal({ id: 'b2', mealType: 'breakfast', calories: 400, timestamp: new Date(now.getTime() - 86400000) }),
      makeMeal({ id: 'l1', mealType: 'lunch', calories: 700, timestamp: now }),
    ];

    const result = MemoryEngine.analyzeEatingPatterns(meals, 30);
    expect(result.avgCaloriesPerMeal.breakfast).toBe(350); // (300+400)/2
    expect(result.avgCaloriesPerMeal.lunch).toBe(700);
  });

  it('calculates average meals per day', () => {
    const meals = generateMeals(10, 3); // 30 meals over 10 days
    const result = MemoryEngine.analyzeEatingPatterns(meals, 30);
    expect(result.averageMealsPerDay).toBe(1); // 30 / 30 days window = 1.0
  });

  it('extracts meal times as average hour per meal type', () => {
    const now = new Date();
    const meals = [
      makeMeal({ id: 'b1', mealType: 'breakfast', timestamp: (() => { const d = new Date(now); d.setHours(7, 0, 0, 0); return d; })() }),
      makeMeal({ id: 'b2', mealType: 'breakfast', timestamp: (() => { const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(9, 0, 0, 0); return d; })() }),
    ];

    const result = MemoryEngine.analyzeEatingPatterns(meals, 30);
    // Average of 7 and 9 = 8
    expect(result.mealTimes.breakfast).toMatch(/^08:/);
  });

  it('extracts top food pairings eaten on the same day', () => {
    const now = new Date();
    const meals: Meal[] = [];
    // Pair "Pollo" + "Arroz" on 3 different days (sorted by time)
    for (let d = 0; d < 3; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() - d);
      const t1 = new Date(day); t1.setHours(12, 0, 0, 0);
      const t2 = new Date(day); t2.setHours(13, 0, 0, 0);
      meals.push(makeMeal({ id: `pollo-${d}`, name: 'Pollo', timestamp: t1 }));
      meals.push(makeMeal({ id: `arroz-${d}`, name: 'Arroz', timestamp: t2 }));
    }

    const result = MemoryEngine.analyzeEatingPatterns(meals, 30);
    expect(result.topPairings.length).toBeGreaterThanOrEqual(1);
    const pairingNames = result.topPairings[0].sort();
    expect(pairingNames).toEqual(['Arroz', 'Pollo']);
  });
});

// ============================================================================
// getSuggestions
// ============================================================================

describe('MemoryEngine.getSuggestions', () => {
  const patterns: EatingPatterns = {
    frequentFoods: [{ name: 'Pollo', count: 10 }],
    mealTimes: { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snack: '16:00' },
    avgCaloriesPerMeal: { breakfast: 400, lunch: 600, dinner: 700, snack: 200 },
    topPairings: [],
    preferredCuisines: [],
    averageMealsPerDay: 3,
  };

  it('returns time-based suggestion when near a typical meal time', () => {
    const near13 = new Date();
    near13.setHours(13, 10, 0, 0);

    const suggestions = MemoryEngine.getSuggestions(near13, [], makeGoals(), patterns);
    const timeSugg = suggestions.find((s) => s.type === 'time');
    expect(timeSugg).toBeDefined();
    expect(timeSugg!.confidence).toBe(0.9);
  });

  it('returns history-based suggestion when frequent foods exist', () => {
    const time = new Date();
    time.setHours(10, 0, 0, 0); // not near any meal time

    const suggestions = MemoryEngine.getSuggestions(time, [], makeGoals(), patterns);
    const histSugg = suggestions.find((s) => s.type === 'food');
    expect(histSugg).toBeDefined();
    expect(histSugg!.message).toContain('Pollo');
  });

  it('returns macro suggestion when protein is behind target', () => {
    const time = new Date();
    time.setHours(10, 0, 0, 0);
    const todayMeals = [
      makeMeal({ calories: 800, protein: 20, carbs: 100, fat: 30 }),
    ];

    const suggestions = MemoryEngine.getSuggestions(time, todayMeals, makeGoals(), patterns);
    const macroSugg = suggestions.find((s) => s.type === 'macro');
    expect(macroSugg).toBeDefined();
    expect(macroSugg!.messageEs).toContain('proteína');
  });

  it('does NOT return macro suggestion when protein is close to target', () => {
    const time = new Date();
    time.setHours(10, 0, 0, 0);
    const todayMeals = [
      makeMeal({ protein: 140 }), // only 10g remaining, < 20 threshold
    ];

    const suggestions = MemoryEngine.getSuggestions(time, todayMeals, makeGoals(), patterns);
    const macroSugg = suggestions.find((s) => s.type === 'macro');
    expect(macroSugg).toBeUndefined();
  });

  it('suggestions are sorted by confidence descending', () => {
    const near13 = new Date();
    near13.setHours(13, 10, 0, 0);
    const todayMeals = [makeMeal({ protein: 10 })];

    const suggestions = MemoryEngine.getSuggestions(near13, todayMeals, makeGoals(), patterns);
    for (let i = 0; i < suggestions.length - 1; i++) {
      expect(suggestions[i].confidence).toBeGreaterThanOrEqual(suggestions[i + 1].confidence);
    }
  });
});

// ============================================================================
// getWhatToEatNext
// ============================================================================

describe('MemoryEngine.getWhatToEatNext', () => {
  const patterns: EatingPatterns = {
    frequentFoods: [],
    mealTimes: { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snack: '16:00' },
    avgCaloriesPerMeal: { breakfast: 400, lunch: 600, dinner: 700, snack: 200 },
    topPairings: [],
    averageMealsPerDay: 3,
  };

  const remaining: Nutrition = { calories: 800, protein: 60, carbs: 80, fat: 25 };

  it('scores templates by macro fit and returns top 5', () => {
    const templates: MealTemplate[] = [];
    for (let i = 0; i < 10; i++) {
      templates.push(
        makeTemplate({
          id: `tpl-${i}`,
          name: `Meal ${i}`,
          nutrition: { calories: 300 + i * 50, protein: 20 + i * 5, carbs: 30 + i * 5, fat: 10 },
        }),
      );
    }

    const suggestions = MemoryEngine.getWhatToEatNext(remaining, patterns, templates);
    expect(suggestions.length).toBeLessThanOrEqual(5);
    suggestions.forEach((s) => {
      expect(s.fitScore).toBeGreaterThan(0.5);
    });
  });

  it('returns sorted by fitScore descending', () => {
    const templates = [
      makeTemplate({ id: 'low', name: 'Low fit', nutrition: { calories: 100, protein: 5, carbs: 10, fat: 3 } }),
      makeTemplate({ id: 'high', name: 'High fit', nutrition: { calories: 700, protein: 50, carbs: 70, fat: 20 } }),
      makeTemplate({ id: 'mid', name: 'Mid fit', nutrition: { calories: 400, protein: 30, carbs: 40, fat: 12 } }),
    ];

    const suggestions = MemoryEngine.getWhatToEatNext(remaining, patterns, templates);
    for (let i = 0; i < suggestions.length - 1; i++) {
      expect(suggestions[i].fitScore).toBeGreaterThanOrEqual(suggestions[i + 1].fitScore);
    }
  });

  it('filters out templates with fitScore <= 0.5', () => {
    const templates = [
      makeTemplate({ id: 'tiny', name: 'Tiny Meal', nutrition: { calories: 50, protein: 2, carbs: 5, fat: 1 } }),
    ];

    const suggestions = MemoryEngine.getWhatToEatNext(remaining, patterns, templates);
    expect(suggestions.length).toBe(0);
  });

  it('returns empty array when no templates provided', () => {
    const suggestions = MemoryEngine.getWhatToEatNext(remaining, patterns, []);
    expect(suggestions).toEqual([]);
  });

  it('generates fit reason based on score', () => {
    const templates = [
      makeTemplate({
        id: 'perfect',
        name: 'Perfect Fit',
        nutrition: { calories: 800, protein: 60, carbs: 80, fat: 25 },
      }),
    ];

    const suggestions = MemoryEngine.getWhatToEatNext(remaining, patterns, templates);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].reason).toBeTruthy();
  });
});
