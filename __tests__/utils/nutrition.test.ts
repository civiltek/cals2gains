import {
  calculateBMR,
  calculateTDEE,
  calculateRecommendedGoals,
  addNutrition,
  emptyNutrition,
  calculatePercentage,
  formatMacro,
  getRemainingNutrition,
} from '../../utils/nutrition';
import { UserProfile, Nutrition, UserGoals } from '../../types';

// ============================================================================
// Test helpers
// ============================================================================

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    age: 30,
    weight: 75, // kg
    height: 175, // cm
    gender: 'male',
    activityLevel: 'moderately_active',
    goal: 'maintain_weight',
    ...overrides,
  };
}

function makeNutrition(overrides: Partial<Nutrition> = {}): Nutrition {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    ...overrides,
  };
}

// ============================================================================
// calculateBMR
// ============================================================================

describe('calculateBMR', () => {
  it('calculates BMR for a male using Mifflin-St Jeor', () => {
    const profile = makeProfile({ gender: 'male', weight: 75, height: 175, age: 30 });
    // Formula: 10 * 75 + 6.25 * 175 - 5 * 30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    expect(calculateBMR(profile)).toBeCloseTo(1698.75);
  });

  it('calculates BMR for a female using Mifflin-St Jeor', () => {
    const profile = makeProfile({ gender: 'female', weight: 60, height: 165, age: 25 });
    // Formula: 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(calculateBMR(profile)).toBeCloseTo(1345.25);
  });

  it('returns higher BMR for heavier individuals', () => {
    const light = makeProfile({ weight: 55 });
    const heavy = makeProfile({ weight: 95 });
    expect(calculateBMR(heavy)).toBeGreaterThan(calculateBMR(light));
  });

  it('returns lower BMR for older individuals', () => {
    const young = makeProfile({ age: 20 });
    const old = makeProfile({ age: 60 });
    expect(calculateBMR(young)).toBeGreaterThan(calculateBMR(old));
  });
});

// ============================================================================
// calculateTDEE
// ============================================================================

describe('calculateTDEE', () => {
  it('applies sedentary multiplier (1.2)', () => {
    const profile = makeProfile({ activityLevel: 'sedentary' });
    const bmr = calculateBMR(profile);
    expect(calculateTDEE(profile)).toBe(Math.round(bmr * 1.2));
  });

  it('applies moderately_active multiplier (1.55)', () => {
    const profile = makeProfile({ activityLevel: 'moderately_active' });
    const bmr = calculateBMR(profile);
    expect(calculateTDEE(profile)).toBe(Math.round(bmr * 1.55));
  });

  it('applies extremely_active multiplier (1.9)', () => {
    const profile = makeProfile({ activityLevel: 'extremely_active' });
    const bmr = calculateBMR(profile);
    expect(calculateTDEE(profile)).toBe(Math.round(bmr * 1.9));
  });

  it('returns a rounded integer', () => {
    const profile = makeProfile();
    expect(Number.isInteger(calculateTDEE(profile))).toBe(true);
  });
});

// ============================================================================
// calculateRecommendedGoals
// ============================================================================

describe('calculateRecommendedGoals', () => {
  it('creates a 20% deficit for lose_weight goal', () => {
    const profile = makeProfile({ goal: 'lose_weight' });
    const tdee = calculateTDEE(profile);
    const goals = calculateRecommendedGoals(profile);
    expect(goals.calories).toBe(Math.round(tdee * 0.8));
  });

  it('creates a 10% surplus for gain_muscle goal', () => {
    const profile = makeProfile({ goal: 'gain_muscle' });
    const tdee = calculateTDEE(profile);
    const goals = calculateRecommendedGoals(profile);
    expect(goals.calories).toBe(Math.round(tdee * 1.1));
  });

  it('uses maintenance calories for maintain_weight', () => {
    const profile = makeProfile({ goal: 'maintain_weight' });
    const tdee = calculateTDEE(profile);
    const goals = calculateRecommendedGoals(profile);
    expect(goals.calories).toBe(tdee);
  });

  it('sets higher fiber goal for males', () => {
    const male = calculateRecommendedGoals(makeProfile({ gender: 'male' }));
    const female = calculateRecommendedGoals(makeProfile({ gender: 'female' }));
    expect(male.fiber).toBe(38);
    expect(female.fiber).toBe(25);
  });

  it('macro grams are derived from calorie ratios', () => {
    const profile = makeProfile({ goal: 'lose_weight' });
    const goals = calculateRecommendedGoals(profile);
    // lose_weight ratios: protein 35%, carbs 35%, fat 30%
    const expectedProtein = Math.round((goals.calories * 0.35) / 4);
    const expectedCarbs = Math.round((goals.calories * 0.35) / 4);
    const expectedFat = Math.round((goals.calories * 0.30) / 9);
    expect(goals.protein).toBe(expectedProtein);
    expect(goals.carbs).toBe(expectedCarbs);
    expect(goals.fat).toBe(expectedFat);
  });
});

// ============================================================================
// addNutrition
// ============================================================================

describe('addNutrition', () => {
  it('adds two nutrition objects', () => {
    const a = makeNutrition({ calories: 500, protein: 30, carbs: 50, fat: 20, fiber: 5 });
    const b = makeNutrition({ calories: 300, protein: 20, carbs: 40, fat: 10, fiber: 3 });
    const result = addNutrition(a, b);
    expect(result.calories).toBe(800);
    expect(result.protein).toBe(50);
    expect(result.carbs).toBe(90);
    expect(result.fat).toBe(30);
    expect(result.fiber).toBe(8);
  });

  it('handles zero values correctly', () => {
    const a = makeNutrition({ calories: 200 });
    const result = addNutrition(a, emptyNutrition());
    expect(result.calories).toBe(200);
    expect(result.protein).toBe(0);
  });

  it('rounds to one decimal place', () => {
    const a = makeNutrition({ calories: 100.15 });
    const b = makeNutrition({ calories: 200.19 });
    const result = addNutrition(a, b);
    expect(result.calories).toBe(300.3);
  });

  it('handles missing fiber gracefully', () => {
    const a = { calories: 100, protein: 10, carbs: 10, fat: 5 } as Nutrition;
    const b = makeNutrition({ calories: 200, fiber: 3 });
    const result = addNutrition(a, b);
    expect(result.fiber).toBe(3);
  });
});

// ============================================================================
// emptyNutrition
// ============================================================================

describe('emptyNutrition', () => {
  it('returns all zeros', () => {
    const empty = emptyNutrition();
    expect(empty.calories).toBe(0);
    expect(empty.protein).toBe(0);
    expect(empty.carbs).toBe(0);
    expect(empty.fat).toBe(0);
    expect(empty.fiber).toBe(0);
  });

  it('returns a new object each time', () => {
    const a = emptyNutrition();
    const b = emptyNutrition();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ============================================================================
// calculatePercentage
// ============================================================================

describe('calculatePercentage', () => {
  it('calculates correct percentage', () => {
    expect(calculatePercentage(50, 200)).toBe(25);
  });

  it('caps at 100%', () => {
    expect(calculatePercentage(250, 200)).toBe(100);
  });

  it('returns 0 for zero goal', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
  });

  it('returns 0 for negative goal', () => {
    expect(calculatePercentage(50, -10)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33); // 33.33... -> 33
  });
});

// ============================================================================
// formatMacro
// ============================================================================

describe('formatMacro', () => {
  it('formats large values as integers', () => {
    expect(formatMacro(150)).toBe('150');
    expect(formatMacro(100)).toBe('100');
  });

  it('formats small values to one decimal', () => {
    expect(formatMacro(3.14)).toBe('3.1');
    expect(formatMacro(99.95)).toBe('100'); // rounds to 100 -> integer branch
  });

  it('formats zero', () => {
    expect(formatMacro(0)).toBe('0');
  });
});

// ============================================================================
// getRemainingNutrition
// ============================================================================

describe('getRemainingNutrition', () => {
  it('calculates remaining macro budget', () => {
    const current = makeNutrition({ calories: 1500, protein: 100, carbs: 150, fat: 50, fiber: 20 });
    const goals: UserGoals = { calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 30 };
    const remaining = getRemainingNutrition(current, goals);
    expect(remaining.calories).toBe(500);
    expect(remaining.protein).toBe(50);
    expect(remaining.carbs).toBe(50);
    expect(remaining.fat).toBe(20);
    expect(remaining.fiber).toBe(10);
  });

  it('never returns negative values', () => {
    const current = makeNutrition({ calories: 2500, protein: 200 });
    const goals: UserGoals = { calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 30 };
    const remaining = getRemainingNutrition(current, goals);
    expect(remaining.calories).toBe(0);
    expect(remaining.protein).toBe(0);
  });
});
