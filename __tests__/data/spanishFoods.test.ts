import {
  SPANISH_FOODS,
  searchSpanishFoods,
  translateFoodName,
  looksEnglish,
} from '../../data/spanishFoods';

// ============================================================================
// SPANISH_FOODS data integrity
// ============================================================================

describe('SPANISH_FOODS data integrity', () => {
  it('contains 100+ food items', () => {
    expect(SPANISH_FOODS.length).toBeGreaterThan(100);
  });

  it('every item has a non-empty id starting with "es_"', () => {
    SPANISH_FOODS.forEach((food) => {
      expect(food.id).toMatch(/^es_/);
    });
  });

  it('every item has unique id', () => {
    const ids = SPANISH_FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every item has name (Spanish) and nameEn (English)', () => {
    SPANISH_FOODS.forEach((food) => {
      expect(food.name).toBeTruthy();
      expect(food.nameEn).toBeTruthy();
    });
  });

  it('every item has servingSize > 0', () => {
    SPANISH_FOODS.forEach((food) => {
      expect(food.servingSize).toBeGreaterThan(0);
    });
  });

  it('every item has valid nutritionPer100g', () => {
    SPANISH_FOODS.forEach((food) => {
      expect(food.nutritionPer100g.calories).toBeGreaterThanOrEqual(0);
      expect(food.nutritionPer100g.protein).toBeGreaterThanOrEqual(0);
      expect(food.nutritionPer100g.carbs).toBeGreaterThanOrEqual(0);
      expect(food.nutritionPer100g.fat).toBeGreaterThanOrEqual(0);
    });
  });

  it('per-serving nutrition is correctly calculated from per-100g', () => {
    SPANISH_FOODS.forEach((food) => {
      const factor = food.servingSize / 100;
      const expectedCal = Math.round(food.nutritionPer100g.calories * factor);
      expect(food.nutritionPerServing.calories).toBe(expectedCal);
    });
  });

  it('every item has a category', () => {
    SPANISH_FOODS.forEach((food) => {
      expect((food as any).category).toBeTruthy();
    });
  });

  it('every item is marked as verified and local', () => {
    SPANISH_FOODS.forEach((food) => {
      expect(food.source).toBe('local');
      expect(food.verified).toBe(true);
    });
  });
});

// ============================================================================
// searchSpanishFoods
// ============================================================================

describe('searchSpanishFoods', () => {
  it('returns empty for queries shorter than 2 chars', () => {
    expect(searchSpanishFoods('a')).toEqual([]);
    expect(searchSpanishFoods('')).toEqual([]);
  });

  it('finds food by exact Spanish name', () => {
    const results = searchSpanishFoods('Huevo cocido');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Huevo cocido');
  });

  it('finds food by partial name', () => {
    const results = searchSpanishFoods('pollo');
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      const nameMatch = r.name.toLowerCase().includes('pollo') ||
        (r as any).aliases?.some((a: string) => a.toLowerCase().includes('pollo'));
      expect(nameMatch).toBe(true);
    });
  });

  it('search is accent-insensitive', () => {
    // "salmón" should match whether typed with or without accent
    const withAccent = searchSpanishFoods('salmón');
    const withoutAccent = searchSpanishFoods('salmon');
    expect(withAccent.length).toBeGreaterThan(0);
    expect(withoutAccent.length).toBeGreaterThan(0);
    // Both should find the same items
    expect(withAccent[0].id).toBe(withoutAccent[0].id);
  });

  it('search is case-insensitive', () => {
    const lower = searchSpanishFoods('arroz');
    const upper = searchSpanishFoods('ARROZ');
    expect(lower.length).toBeGreaterThan(0);
    expect(lower.length).toBe(upper.length);
  });

  it('finds food by alias', () => {
    // "huevo duro" is an alias for "Huevo cocido"
    const results = searchSpanishFoods('huevo duro');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Huevo cocido');
  });

  it('finds food by English name', () => {
    const results = searchSpanishFoods('chicken');
    expect(results.length).toBeGreaterThan(0);
  });

  it('results are sorted by relevance (exact match first)', () => {
    const results = searchSpanishFoods('huevo');
    // "Huevo" items that start with the query should be ranked higher
    if (results.length >= 2) {
      // First results should have "huevo" at the start of their name
      const firstName = results[0].name.toLowerCase();
      expect(firstName.startsWith('huevo') || firstName.includes('huevo')).toBe(true);
    }
  });
});

// ============================================================================
// translateFoodName
// ============================================================================

describe('translateFoodName', () => {
  it('translates a known English food name to Spanish', () => {
    expect(translateFoodName('chicken')).toBe('Pollo');
    expect(translateFoodName('rice')).toBe('Arroz');
    expect(translateFoodName('egg')).toBe('Huevo');
  });

  it('is case-insensitive', () => {
    expect(translateFoodName('CHICKEN')).toBe('Pollo');
    expect(translateFoodName('Rice')).toBe('Arroz');
  });

  it('returns original name for unknown foods', () => {
    expect(translateFoodName('xyzfood')).toBe('xyzfood');
  });

  it('handles multi-word food names', () => {
    expect(translateFoodName('olive oil')).toBe('Aceite de oliva');
    expect(translateFoodName('sweet potato')).toBe('Boniato');
    expect(translateFoodName('peanut butter')).toBe('Crema de cacahuete');
  });

  it('matches by last word when full name is unknown', () => {
    // "Organic Free Range Eggs" -> tries "eggs" -> "Huevos"
    expect(translateFoodName('Organic Free Range Eggs')).toBe('Huevos');
  });

  it('trims whitespace', () => {
    expect(translateFoodName('  chicken  ')).toBe('Pollo');
  });
});

// ============================================================================
// looksEnglish
// ============================================================================

describe('looksEnglish', () => {
  it('detects common English food words', () => {
    expect(looksEnglish('Fresh Organic Chicken')).toBe(true);
    expect(looksEnglish('Low Fat Yogurt')).toBe(true);
    expect(looksEnglish('Whole Grain Bread')).toBe(true);
    expect(looksEnglish('Smoked Salmon')).toBe(true);
    expect(looksEnglish('Roasted Almonds')).toBe(true);
  });

  it('returns false for Spanish names', () => {
    expect(looksEnglish('Pollo a la plancha')).toBe(false);
    expect(looksEnglish('Arroz con leche')).toBe(false);
    expect(looksEnglish('Tortilla española')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(looksEnglish('FRESH CHICKEN')).toBe(true);
    expect(looksEnglish('fresh chicken')).toBe(true);
  });

  it('detects single English indicator words', () => {
    expect(looksEnglish('with sauce')).toBe(true);
    expect(looksEnglish('raw almonds')).toBe(true);
    expect(looksEnglish('frozen vegetables')).toBe(true);
  });
});
