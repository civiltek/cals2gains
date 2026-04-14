import {
  PersonalEngine,
  FoodEntry,
  WeightEntry,
  AdherenceScore,
  UserGoals,
  GoalMode,
  DayType,
} from '../../services/personalEngine';

// ============================================================================
// Helpers
// ============================================================================

function makeGoals(overrides: Partial<UserGoals> = {}): UserGoals {
  return {
    dailyCalories: 2000,
    proteinGrams: 150,
    carbsGrams: 200,
    fatGrams: 70,
    ...overrides,
  };
}

function makeAdherence(overrides: Partial<AdherenceScore> = {}): AdherenceScore {
  return {
    weeklyAdherence: 90,
    macroAdherence: 85,
    consistency: 80,
    ...overrides,
  };
}

function makeWeights(values: number[]): WeightEntry[] {
  return values.map((w, i) => ({
    date: new Date(Date.now() - (values.length - 1 - i) * 86400000),
    weight: w,
  }));
}

function makeHistory(count: number): FoodEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `food-${i}`,
    name: `Food ${i}`,
    calories: 400 + i * 10,
    protein: 30 + i,
    carbs: 40,
    fat: 15,
    timestamp: new Date(),
    frequency: count - i, // first item = most frequent
  }));
}

// ============================================================================
// getPersonalizedSuggestions
// ============================================================================

describe('PersonalEngine.getPersonalizedSuggestions', () => {
  it('returns 5 suggestions (2 history + 2 AI + 1 challenge)', () => {
    const history = makeHistory(5);
    const suggestions = PersonalEngine.getPersonalizedSuggestions(
      'user1', history, makeGoals(), 'lunch', 'training',
    );
    expect(suggestions).toHaveLength(5);
  });

  it('includes history-based suggestions from most frequent foods', () => {
    const history = makeHistory(5);
    const suggestions = PersonalEngine.getPersonalizedSuggestions(
      'user1', history, makeGoals(), 'lunch', 'training',
    );
    const historySuggs = suggestions.filter((s) => s.source === 'history');
    expect(historySuggs).toHaveLength(2);
    // Should pick the top 2 by frequency
    expect(historySuggs[0].name).toBe('Food 0');
    expect(historySuggs[1].name).toBe('Food 1');
  });

  it('includes AI-generated suggestions', () => {
    const suggestions = PersonalEngine.getPersonalizedSuggestions(
      'user1', makeHistory(3), makeGoals(), 'dinner', 'rest',
    );
    const aiSuggs = suggestions.filter((s) => s.source === 'ai_generated');
    expect(aiSuggs).toHaveLength(2);
  });

  it('includes exactly one challenge suggestion', () => {
    const suggestions = PersonalEngine.getPersonalizedSuggestions(
      'user1', makeHistory(3), makeGoals(), 'breakfast', 'light',
    );
    const challenges = suggestions.filter((s) => s.source === 'challenge');
    expect(challenges).toHaveLength(1);
  });

  it('works with empty history', () => {
    const suggestions = PersonalEngine.getPersonalizedSuggestions(
      'user1', [], makeGoals(), 'lunch', 'training',
    );
    // 0 history + 2 AI + 1 challenge = 3
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// generateAutoAdjustments
// ============================================================================

describe('PersonalEngine.generateAutoAdjustments', () => {
  it('returns no change when weight is on track (diff < 0.25)', () => {
    // maintain expects 0. Weights flat: trend = 0, diff = 0 - 0 = 0 (< 0.25)
    const weights = makeWeights([75, 75, 75, 75, 75, 75, 75]);
    const goals = makeGoals({ dailyCalories: 2000 });

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence(), goals, 'maintain',
    );
    expect(result.newCalories).toBe(2000); // no change
    expect(result.changePercentage).toBe(0);
    expect(result.confidence).toBe(0.9);
  });

  it('reduces 150 cal with high adherence when not losing enough', () => {
    // gain_muscle expects +0.5. Weights flat: trend = first - last = 0.
    // trendDifference = 0.5 - 0 = 0.5 (> 0.25) -> not gaining enough
    // adherence > 85 -> -150 cal
    const weights = makeWeights([75, 75, 75, 75, 75, 75, 75]);
    const goals = makeGoals({ dailyCalories: 2000 });

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence({ weeklyAdherence: 90 }), goals, 'gain_muscle',
    );
    expect(result.newCalories).toBe(1850); // 2000 - 150
    expect(result.confidence).toBe(0.85);
  });

  it('reduces 75 cal with low adherence when not losing enough', () => {
    // gain_muscle expects +0.5. Weights flat: trend = 0.
    // trendDifference = 0.5 - 0 = 0.5 (> 0.25) -> not gaining enough
    // adherence <= 85 -> -75 cal
    const weights = makeWeights([75, 75, 75, 75, 75, 75, 75]);
    const goals = makeGoals({ dailyCalories: 2000 });

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence({ weeklyAdherence: 60 }), goals, 'gain_muscle',
    );
    expect(result.newCalories).toBe(1925); // 2000 - 75
    expect(result.confidence).toBe(0.7);
  });

  it('increases 100 cal when losing/gaining too fast', () => {
    // lose_fat expects -0.75. Weights: 76 -> 73 = -3.0 trend. diff = -0.75 - (-3.0) = 2.25 (but negative check)
    // Actually: trend = firstWeight - lastWeight = 76 - 73 = 3.0 (positive = lost weight)
    // expected = -0.75. trendDifference = expected - trend = -0.75 - 3.0 = -3.75 (< -0.25 => gaining too fast / losing too fast)
    const weights = makeWeights([76, 75.5, 75, 74.5, 74, 73.5, 73]);
    const goals = makeGoals({ dailyCalories: 1800 });

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence(), goals, 'lose_fat',
    );
    expect(result.newCalories).toBe(1900); // 1800 + 100
    expect(result.confidence).toBe(0.8);
  });

  it('preserves macro ratios when adjusting', () => {
    const goals = makeGoals({
      dailyCalories: 2000,
      proteinGrams: 150, // 0.075 per cal
      carbsGrams: 200,   // 0.1 per cal
      fatGrams: 70,       // 0.035 per cal
    });
    const weights = makeWeights([75, 75, 75, 75, 75, 75, 75]);

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence(), goals, 'lose_fat',
    );
    // Ratios should be preserved
    const proteinRatio = goals.proteinGrams / goals.dailyCalories;
    const expectedProtein = Math.round(result.newCalories * proteinRatio / 4);
    expect(result.newProtein).toBe(expectedProtein);
  });

  it('never drops below 1200 calories', () => {
    const goals = makeGoals({ dailyCalories: 1250 });
    const weights = makeWeights([75, 75, 75, 75, 75, 75, 75]);

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence(), goals, 'lose_fat',
    );
    expect(result.newCalories).toBeGreaterThanOrEqual(1200);
  });

  it('handles single weight entry (trend = 0)', () => {
    const weights = makeWeights([75]);

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence(), makeGoals(), 'maintain',
    );
    // maintain expects 0, trend = 0, diff = 0 => no change
    expect(result.newCalories).toBe(2000);
  });

  it('returns correct changePercentage', () => {
    const goals = makeGoals({ dailyCalories: 2000 });
    const weights = makeWeights([75, 75, 75, 75, 75, 75, 75]);

    const result = PersonalEngine.generateAutoAdjustments(
      weights, makeAdherence(), goals, 'gain_muscle',
    );
    // -150 cal adjustment for high adherence / not gaining enough
    expect(result.changePercentage).toBeCloseTo(-150 / 2000 * 100, 1);
  });
});

// ============================================================================
// getGymFlowSuggestions
// ============================================================================

describe('PersonalEngine.getGymFlowSuggestions', () => {
  it('always includes water reminder', () => {
    const actions = PersonalEngine.getGymFlowSuggestions('training', '14:00');
    const water = actions.find((a) => a.context === 'water_reminder');
    expect(water).toBeDefined();
    expect(water!.label).toContain('agua');
  });

  it('suggests pre-workout food at morning training times', () => {
    const actions = PersonalEngine.getGymFlowSuggestions('training', '09:00');
    const pre = actions.find((a) => a.context === 'pre_workout');
    expect(pre).toBeDefined();
    expect(pre!.suggestedCalories).toBe(200);
  });

  it('suggests post-workout food at midday/evening training times', () => {
    const actions = PersonalEngine.getGymFlowSuggestions('training', '18:00');
    const post = actions.find((a) => a.context === 'post_workout');
    expect(post).toBeDefined();
    expect(post!.suggestedCalories).toBe(250);
  });

  it('does NOT suggest pre/post workout on rest days', () => {
    const actions = PersonalEngine.getGymFlowSuggestions('rest', '09:00');
    const workout = actions.filter(
      (a) => a.context === 'pre_workout' || a.context === 'post_workout',
    );
    expect(workout).toHaveLength(0);
  });

  it('does NOT suggest pre-workout at non-morning times', () => {
    const actions = PersonalEngine.getGymFlowSuggestions('training', '15:00');
    const pre = actions.find((a) => a.context === 'pre_workout');
    expect(pre).toBeUndefined();
  });
});
