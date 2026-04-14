import {
  scaleRecipe,
  calculateRecipeNutrition,
  generateGroceryFromRecipe,
} from '../../services/recipeService';
import { Recipe, RecipeIngredient, Nutrition } from '../../types';

// ============================================================================
// Helpers
// ============================================================================

function makeIngredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    name: 'Chicken breast',
    quantity: 200,
    unit: 'grams',
    nutrition: {
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7.2,
      fiber: 0,
    },
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    userId: 'user-1',
    name: 'Chicken & Rice',
    nameEs: 'Pollo con arroz',
    nameEn: 'Chicken & Rice',
    ingredients: [
      makeIngredient({ name: 'Chicken breast', quantity: 200, unit: 'grams', nutrition: { calories: 330, protein: 62, carbs: 0, fat: 7.2, fiber: 0 } }),
      makeIngredient({ name: 'Rice', quantity: 150, unit: 'grams', nutrition: { calories: 195, protein: 4, carbs: 43, fat: 0.4, fiber: 0.6 } }),
      makeIngredient({ name: 'Olive oil', quantity: 15, unit: 'ml', nutrition: { calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0 } }),
    ],
    servings: 2,
    prepTime: 10,
    cookTime: 25,
    instructions: ['Cook rice', 'Grill chicken', 'Combine'],
    totalNutrition: { calories: 645, protein: 66, carbs: 43, fat: 21.6, fiber: 0.6 },
    nutritionPerServing: { calories: 322.5, protein: 33, carbs: 21.5, fat: 10.8, fiber: 0.3 },
    tags: ['high-protein'],
    source: 'manual',
    isFavorite: false,
    timesUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// scaleRecipe
// ============================================================================

describe('scaleRecipe', () => {
  it('doubles ingredient quantities when scaling 2 -> 4 servings', () => {
    const recipe = makeRecipe({ servings: 2 });
    const scaled = scaleRecipe(recipe, 4);

    expect(scaled.servings).toBe(4);
    expect(scaled.ingredients[0].quantity).toBe(400); // 200 * 2
    expect(scaled.ingredients[1].quantity).toBe(300); // 150 * 2
    expect(scaled.ingredients[2].quantity).toBe(30);  // 15 * 2
  });

  it('halves ingredient quantities when scaling 2 -> 1 serving', () => {
    const recipe = makeRecipe({ servings: 2 });
    const scaled = scaleRecipe(recipe, 1);

    expect(scaled.servings).toBe(1);
    expect(scaled.ingredients[0].quantity).toBe(100);
    expect(scaled.ingredients[1].quantity).toBe(75);
  });

  it('scales ingredient nutrition proportionally', () => {
    const recipe = makeRecipe({ servings: 2 });
    const scaled = scaleRecipe(recipe, 4);

    // Chicken: 330 cal for 2 servings -> 660 cal for 4 servings
    expect(scaled.ingredients[0].nutrition.calories).toBe(660);
    expect(scaled.ingredients[0].nutrition.protein).toBe(124);
  });

  it('recalculates totalNutrition from scaled ingredients', () => {
    const recipe = makeRecipe({ servings: 2 });
    const scaled = scaleRecipe(recipe, 4);

    // Total should be sum of all scaled ingredient nutritions
    const expectedCals = 660 + 390 + 240; // chicken + rice + oil doubled
    expect(scaled.totalNutrition.calories).toBe(expectedCals);
  });

  it('calculates per-serving nutrition from new total', () => {
    const recipe = makeRecipe({ servings: 2 });
    const scaled = scaleRecipe(recipe, 4);

    // Per-serving should equal total / newServings
    expect(scaled.nutritionPerServing.calories).toBe(
      scaled.totalNutrition.calories / 4,
    );
    expect(scaled.nutritionPerServing.protein).toBe(
      scaled.totalNutrition.protein / 4,
    );
  });

  it('scales optional micronutrients (sugar, saturatedFat, sodium)', () => {
    const recipe = makeRecipe();
    recipe.ingredients = [
      makeIngredient({
        name: 'Cheese',
        quantity: 100,
        nutrition: {
          calories: 400,
          protein: 25,
          carbs: 1,
          fat: 33,
          fiber: 0,
          sugar: 0.5,
          saturatedFat: 21,
          sodium: 620,
        },
      }),
    ];
    recipe.servings = 1;

    const scaled = scaleRecipe(recipe, 3);
    expect(scaled.ingredients[0].nutrition.sugar).toBe(1.5);
    expect(scaled.ingredients[0].nutrition.saturatedFat).toBe(63);
    expect(scaled.ingredients[0].nutrition.sodium).toBe(1860);
  });

  it('throws error for 0 servings', () => {
    expect(() => scaleRecipe(makeRecipe(), 0)).toThrow('Servings must be greater than 0');
  });

  it('throws error for negative servings', () => {
    expect(() => scaleRecipe(makeRecipe(), -1)).toThrow('Servings must be greater than 0');
  });

  it('preserves non-nutrition fields', () => {
    const recipe = makeRecipe();
    const scaled = scaleRecipe(recipe, 6);

    expect(scaled.id).toBe(recipe.id);
    expect(scaled.name).toBe(recipe.name);
    expect(scaled.instructions).toEqual(recipe.instructions);
    expect(scaled.tags).toEqual(recipe.tags);
  });

  it('handles scaling to same servings (identity)', () => {
    const recipe = makeRecipe({ servings: 2 });
    const scaled = scaleRecipe(recipe, 2);

    expect(scaled.ingredients[0].quantity).toBe(200);
    expect(scaled.totalNutrition.calories).toBe(recipe.totalNutrition.calories);
  });
});

// ============================================================================
// calculateRecipeNutrition
// ============================================================================

describe('calculateRecipeNutrition', () => {
  it('sums all ingredient nutrition', () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({ nutrition: { calories: 300, protein: 50, carbs: 10, fat: 8, fiber: 1 } }),
      makeIngredient({ nutrition: { calories: 200, protein: 5, carbs: 40, fat: 2, fiber: 3 } }),
    ];

    const result = calculateRecipeNutrition(ingredients);
    expect(result.totalNutrition.calories).toBe(500);
    expect(result.totalNutrition.protein).toBe(55);
    expect(result.totalNutrition.carbs).toBe(50);
    expect(result.totalNutrition.fat).toBe(10);
    expect(result.totalNutrition.fiber).toBe(4);
  });

  it('handles empty ingredients', () => {
    const result = calculateRecipeNutrition([]);
    expect(result.totalNutrition.calories).toBe(0);
    expect(result.totalNutrition.protein).toBe(0);
  });

  it('sums optional micronutrients (sugar, saturatedFat, sodium)', () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 3, fiber: 1, sugar: 5, saturatedFat: 1.5, sodium: 200 },
      }),
      makeIngredient({
        nutrition: { calories: 200, protein: 10, carbs: 20, fat: 6, fiber: 2, sugar: 3, saturatedFat: 2.5, sodium: 100 },
      }),
    ];

    const result = calculateRecipeNutrition(ingredients);
    expect(result.totalNutrition.sugar).toBe(8);
    expect(result.totalNutrition.saturatedFat).toBe(4);
    expect(result.totalNutrition.sodium).toBe(300);
  });

  it('handles ingredients without optional fields', () => {
    const ingredients: RecipeIngredient[] = [
      makeIngredient({ nutrition: { calories: 100, protein: 5, carbs: 10, fat: 3, fiber: 1 } }),
    ];

    const result = calculateRecipeNutrition(ingredients);
    expect(result.totalNutrition.sugar).toBe(0);
    expect(result.totalNutrition.saturatedFat).toBe(0);
  });
});

// ============================================================================
// generateGroceryFromRecipe
// ============================================================================

describe('generateGroceryFromRecipe', () => {
  it('creates one grocery item per ingredient', () => {
    const recipe = makeRecipe(); // 3 ingredients
    const items = generateGroceryFromRecipe(recipe, 2);
    expect(items).toHaveLength(3);
  });

  it('scales quantities to target servings', () => {
    const recipe = makeRecipe({ servings: 2 });
    const items = generateGroceryFromRecipe(recipe, 4);

    // Chicken: 200g base for 2 servings -> 400g for 4 servings
    expect(items[0].quantity).toBe(400);
    expect(items[1].quantity).toBe(300); // rice: 150 * 2
  });

  it('assigns category based on ingredient name', () => {
    const recipe = makeRecipe();
    const items = generateGroceryFromRecipe(recipe, 2);

    const chicken = items.find((i) => i.name === 'Chicken breast');
    expect(chicken!.category).toBe('protein'); // contains "breast" keyword

    const oil = items.find((i) => i.name === 'Olive oil');
    expect(oil!.category).toBe('condiments'); // contains "oil" keyword

    const rice = items.find((i) => i.name === 'Rice');
    expect(rice!.category).toBe('grains'); // contains "rice" keyword
  });

  it('sets all items as unchecked', () => {
    const items = generateGroceryFromRecipe(makeRecipe(), 2);
    items.forEach((item) => {
      expect(item.checked).toBe(false);
    });
  });

  it('assigns recipeId to each item', () => {
    const recipe = makeRecipe();
    const items = generateGroceryFromRecipe(recipe, 2);
    items.forEach((item) => {
      expect(item.recipeId).toBe('recipe-1');
    });
  });

  it('preserves unit from ingredient', () => {
    const recipe = makeRecipe();
    const items = generateGroceryFromRecipe(recipe, 2);
    expect(items[0].unit).toBe('grams');
    expect(items[2].unit).toBe('ml');
  });

  it('falls back to "other" category for unknown ingredients', () => {
    const recipe = makeRecipe();
    recipe.ingredients = [
      makeIngredient({ name: 'Xanthan gum' }),
    ];
    const items = generateGroceryFromRecipe(recipe, 2);
    expect(items[0].category).toBe('other');
  });
});
