import {
  MACRO_PRESETS,
  calculateGoalsFromPreset,
  getPresetById,
} from '../../constants/macroPresets';

// ============================================================================
// MACRO_PRESETS data integrity
// ============================================================================

describe('MACRO_PRESETS', () => {
  it('contains 5 presets', () => {
    expect(MACRO_PRESETS).toHaveLength(5);
  });

  it('has unique IDs', () => {
    const ids = MACRO_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(MACRO_PRESETS)('preset "$id" has valid macro percentages summing to ~1', (preset) => {
    const sum = preset.proteinPct + preset.carbsPct + preset.fatPct;
    expect(sum).toBeCloseTo(1.0, 1);
  });

  it.each(MACRO_PRESETS)('preset "$id" has both Spanish and English names', (preset) => {
    expect(preset.nameEs).toBeTruthy();
    expect(preset.nameEn).toBeTruthy();
    expect(preset.descriptionEs).toBeTruthy();
    expect(preset.descriptionEn).toBeTruthy();
  });

  it.each(MACRO_PRESETS)('preset "$id" has an icon', (preset) => {
    expect(preset.icon).toBeTruthy();
  });

  it('keto has very low carbs and very high fat', () => {
    const keto = MACRO_PRESETS.find((p) => p.id === 'keto')!;
    expect(keto.carbsPct).toBeLessThan(0.1);
    expect(keto.fatPct).toBeGreaterThan(0.5);
  });

  it('high_protein has the highest protein percentage', () => {
    const highProtein = MACRO_PRESETS.find((p) => p.id === 'high_protein')!;
    const otherMaxProtein = Math.max(
      ...MACRO_PRESETS.filter((p) => p.id !== 'high_protein').map((p) => p.proteinPct),
    );
    expect(highProtein.proteinPct).toBeGreaterThanOrEqual(otherMaxProtein);
  });
});

// ============================================================================
// calculateGoalsFromPreset
// ============================================================================

describe('calculateGoalsFromPreset', () => {
  const balanced = MACRO_PRESETS.find((p) => p.id === 'balanced')!;
  const keto = MACRO_PRESETS.find((p) => p.id === 'keto')!;

  it('calculates correct macro grams for balanced at 2000 kcal', () => {
    const goals = calculateGoalsFromPreset(balanced, 2000);
    expect(goals.calories).toBe(2000);
    // protein: 2000 * 0.30 / 4 = 150g
    expect(goals.protein).toBe(150);
    // carbs: 2000 * 0.40 / 4 = 200g
    expect(goals.carbs).toBe(200);
    // fat: 2000 * 0.30 / 9 = 66.67 -> 67g
    expect(goals.fat).toBe(67);
  });

  it('calculates correct macro grams for keto at 1800 kcal', () => {
    const goals = calculateGoalsFromPreset(keto, 1800);
    expect(goals.calories).toBe(1800);
    // protein: 1800 * 0.25 / 4 = 112.5 -> 113g
    expect(goals.protein).toBe(113);
    // carbs: 1800 * 0.05 / 4 = 22.5 -> 23g
    expect(goals.carbs).toBe(23);
    // fat: 1800 * 0.70 / 9 = 140g
    expect(goals.fat).toBe(140);
  });

  it('returns rounded integers', () => {
    const goals = calculateGoalsFromPreset(balanced, 2345);
    expect(Number.isInteger(goals.protein)).toBe(true);
    expect(Number.isInteger(goals.carbs)).toBe(true);
    expect(Number.isInteger(goals.fat)).toBe(true);
  });

  it('preserves the calorie input', () => {
    const goals = calculateGoalsFromPreset(balanced, 3000);
    expect(goals.calories).toBe(3000);
  });

  it('handles low calorie targets', () => {
    const goals = calculateGoalsFromPreset(balanced, 800);
    expect(goals.protein).toBeGreaterThan(0);
    expect(goals.carbs).toBeGreaterThan(0);
    expect(goals.fat).toBeGreaterThan(0);
  });
});

// ============================================================================
// getPresetById
// ============================================================================

describe('getPresetById', () => {
  it('returns the correct preset for valid IDs', () => {
    const balanced = getPresetById('balanced');
    expect(balanced).toBeDefined();
    expect(balanced!.id).toBe('balanced');
  });

  it('returns undefined for unknown IDs', () => {
    expect(getPresetById('nonexistent')).toBeUndefined();
  });

  it.each(['balanced', 'high_protein', 'keto', 'low_fat', 'custom'])(
    'finds preset "%s"',
    (id) => {
      const preset = getPresetById(id);
      expect(preset).toBeDefined();
      expect(preset!.id).toBe(id);
    },
  );
});
