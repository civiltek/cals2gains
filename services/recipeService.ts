// ============================================
// Cals2Gains - Recipe Service
// ============================================
// Handles recipe operations: URL import, scaling, nutrition calculation, grocery generation

import { Recipe, RecipeIngredient, Nutrition, GroceryItem, GroceryCategory } from '../types';
import { getAppLanguage } from '../utils/language';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * System prompt for recipe extraction from URL — language-aware
 */
function getRecipeExtractionSystem(language: 'es' | 'en'): string {
  if (language === 'es') {
    return `Eres un experto culinario con IA que extrae información de recetas de páginas web.
Tu trabajo es parsear el contenido de la receta y extraer datos estructurados con precisión.

REGLAS:
1. Responde SIEMPRE en JSON válido — sin markdown, sin explicaciones fuera del JSON
2. TODOS los textos deben estar en ESPAÑOL: nombre de la receta, descripción, nombres de ingredientes, instrucciones, unidades
3. Si la página está en otro idioma, TRADUCE todo al español
4. Extrae TODOS los ingredientes con cantidades y unidades
5. Estima los valores nutricionales basándote en bases de datos USDA e internacionales
6. Para ingredientes desconocidos, haz estimaciones conservadoras
7. Extrae tiempos de cocción en minutos`;
  }

  return `You are an expert culinary AI that extracts recipe information from web pages.
Your job is to parse recipe content and extract structured data with precision.

RULES:
1. Always respond in valid JSON only — no markdown, no explanation outside JSON
2. Extract ALL ingredients with quantities and units
3. Estimate nutritional values based on USDA and international food databases
4. For unknown ingredients, make conservative estimates
5. Always provide both English and Spanish names
6. Extract cooking times in minutes`;
}

/**
 * Build extraction prompt for recipe URL
 */
function buildRecipeExtractionPrompt(
  pageContent: string,
  language: 'es' | 'en' = getAppLanguage()
): string {
  if (language === 'es') {
    return `Extrae la receta del siguiente contenido web y devuelve ÚNICAMENTE un objeto JSON con esta estructura EXACTA (sin markdown):

{
  "name": "Nombre de la receta en español",
  "nameEs": "Nombre de la receta en español",
  "nameEn": "Recipe name in English",
  "description": "Breve descripción en español",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "instructions": [
    "Paso 1 en español",
    "Paso 2 en español",
    "Paso 3 en español"
  ],
  "ingredients": [
    {
      "name": "nombre del ingrediente en español",
      "quantity": 100,
      "unit": "gramos",
      "nutrition": {
        "calories": 150,
        "protein": 5.0,
        "carbs": 20.0,
        "fat": 7.0,
        "fiber": 1.0
      },
      "isOptional": false
    }
  ],
  "totalNutrition": {
    "calories": 600,
    "protein": 20.0,
    "carbs": 80.0,
    "fat": 28.0,
    "fiber": 4.0
  },
  "nutritionPerServing": {
    "calories": 150,
    "protein": 5.0,
    "carbs": 20.0,
    "fat": 7.0,
    "fiber": 1.0
  }
}

IMPORTANTE:
- TODOS los textos (name, nameEs, description, ingredients[].name, instructions[], unit) DEBEN estar en ESPAÑOL
- Si la página original está en inglés u otro idioma, TRADUCE todo al español
- Las unidades deben estar en español: gramos, ml, tazas, cucharadas, cucharaditas, unidades, etc.
- servings debe ser un número (típicamente 2-8)
- prepTime y cookTime en minutos
- Cada ingrediente DEBE tener quantity, unit y nutrition estimada basada en esa cantidad
- totalNutrition = suma de todos los valores nutricionales de ingredientes
- nutritionPerServing = totalNutrition / servings (usa al menos 1 decimal)
- Si la página no tiene receta, extrae lo que puedas

CONTENIDO DE LA PÁGINA WEB:
${pageContent}`;
  }

  return `Extract the recipe from this web page content and return ONLY a JSON object with this EXACT structure (no markdown):

{
  "name": "Recipe name in English",
  "nameEs": "Nombre de la receta en español",
  "nameEn": "Recipe name in English",
  "description": "Brief description",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "instructions": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": 100,
      "unit": "grams",
      "nutrition": {
        "calories": 150,
        "protein": 5.0,
        "carbs": 20.0,
        "fat": 7.0,
        "fiber": 1.0
      },
      "isOptional": false
    }
  ],
  "totalNutrition": {
    "calories": 600,
    "protein": 20.0,
    "carbs": 80.0,
    "fat": 28.0,
    "fiber": 4.0
  },
  "nutritionPerServing": {
    "calories": 150,
    "protein": 5.0,
    "carbs": 20.0,
    "fat": 7.0,
    "fiber": 1.0
  }
}

IMPORTANT:
- servings must be a number (typically 2-8)
- prepTime and cookTime in minutes
- Each ingredient MUST have quantity, unit, and estimated nutrition based on that quantity
- totalNutrition = sum of all ingredient nutrition values
- nutritionPerServing = totalNutrition / servings (use at least 1 decimal place)
- units should be: grams, ml, cups, tablespoons, teaspoons, pieces, or other standard units
- If the page doesn't have a recipe, still extract what you can and set confidence low

WEB PAGE CONTENT:
${pageContent}`;
}

/**
 * Allergen keyword map: allergen ID → ingredient keywords to match
 */
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten:    ['gluten', 'wheat', 'flour', 'harina', 'trigo', 'bread', 'pan', 'pasta', 'barley', 'cebada', 'rye', 'centeno', 'oat', 'avena'],
  lactose:   ['milk', 'leche', 'dairy', 'cheese', 'queso', 'butter', 'mantequilla', 'cream', 'nata', 'yogurt', 'yogur', 'lactose', 'lactosa'],
  nuts:      ['almond', 'almendra', 'walnut', 'nuez', 'cashew', 'anacardo', 'pistachio', 'pistacho', 'hazelnut', 'avellana', 'pecan', 'macadamia', 'frutos secos'],
  peanuts:   ['peanut', 'cacahuete', 'cacahuate', 'groundnut', 'maní'],
  shellfish: ['shrimp', 'gamba', 'prawn', 'langostino', 'crab', 'cangrejo', 'lobster', 'langosta', 'crayfish', 'marisco'],
  fish:      ['fish', 'pescado', 'salmon', 'salmón', 'tuna', 'atún', 'cod', 'bacalao', 'anchovy', 'anchoa', 'sardine', 'sardina'],
  egg:       ['egg', 'huevo', 'yolk', 'yema', 'mayonnaise', 'mayonesa'],
  soy:       ['soy', 'soja', 'tofu', 'edamame', 'tempeh', 'miso'],
  sesame:    ['sesame', 'sésamo', 'tahini'],
  mustard:   ['mustard', 'mostaza'],
  celery:    ['celery', 'apio'],
  molluscs:  ['squid', 'calamar', 'octopus', 'pulpo', 'mussel', 'mejillón', 'clam', 'almeja', 'oyster', 'ostra', 'scallop', 'vieira'],
  lupin:     ['lupin', 'altramuz', 'lupini'],
  sulphites: ['wine', 'vino', 'vinegar', 'vinagre', 'dried fruit', 'fruta seca'],
  fructose:  ['apple', 'manzana', 'honey', 'miel', 'fructose', 'fructosa', 'pear', 'pera', 'mango'],
  sorbitol:  ['sorbitol', 'sorbitol', 'plum', 'ciruela', 'peach', 'melocotón', 'cherry', 'cereza'],
  histamine: ['wine', 'vino', 'fermented', 'fermentado', 'cheese', 'queso', 'spinach', 'espinaca', 'tomato', 'tomate', 'chocolate'],
  fodmap:    ['onion', 'cebolla', 'garlic', 'ajo', 'wheat', 'trigo', 'apple', 'manzana', 'legume', 'legumbre'],
};

/**
 * Detect which user allergens are present in a recipe's ingredients
 */
export function detectRecipeAllergens(
  ingredientNames: string[],
  userAllergies: string[],
  userIntolerances: string[] = []
): string[] {
  const allUserAllergens = [...userAllergies, ...userIntolerances];
  if (allUserAllergens.length === 0) return [];

  const ingredientsLower = ingredientNames.map(n => n.toLowerCase());
  const found: string[] = [];

  for (const allergenId of allUserAllergens) {
    const keywords = ALLERGEN_KEYWORDS[allergenId] || [allergenId];
    const matched = ingredientsLower.some(ing =>
      keywords.some(kw => ing.includes(kw))
    );
    if (matched && !found.includes(allergenId)) {
      found.push(allergenId);
    }
  }

  return found;
}

/**
 * Import a recipe from a URL
 */
export async function importRecipeFromUrl(
  url: string,
  language: 'es' | 'en' = getAppLanguage(),
  userAllergies: string[] = [],
  userIntolerances: string[] = []
): Promise<Recipe> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Fetch the webpage content
  let pageContent: string;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    // Extract text content (remove HTML tags)
    pageContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000); // Limit to avoid token overflow
  } catch (error) {
    console.error('Failed to fetch recipe URL:', error);
    throw new Error('Failed to fetch recipe from URL');
  }

  // Call OpenAI to extract recipe
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: getRecipeExtractionSystem(language),
          },
          {
            role: 'user',
            content: buildRecipeExtractionPrompt(pageContent, language),
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate response
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const recipeData = JSON.parse(cleanedContent);

    // Validate ingredients and nutrition
    const validatedIngredients: RecipeIngredient[] = (recipeData.ingredients || []).map(
      (ing: any) => ({
        name: ing.name || 'Unknown',
        quantity: Number(ing.quantity) || 0,
        unit: ing.unit || 'grams',
        nutrition: {
          calories: Number(ing.nutrition?.calories) || 0,
          protein: Number(ing.nutrition?.protein) || 0,
          carbs: Number(ing.nutrition?.carbs) || 0,
          fat: Number(ing.nutrition?.fat) || 0,
          fiber: Number(ing.nutrition?.fiber) || 0,
        },
        isOptional: Boolean(ing.isOptional),
      })
    );

    const recipe: Recipe = {
      id: '', // Will be assigned by store
      userId: '', // Will be assigned by store
      name: recipeData.name || 'Imported Recipe',
      nameEs: recipeData.nameEs || 'Receta Importada',
      nameEn: recipeData.nameEn || recipeData.name || 'Imported Recipe',
      description: recipeData.description,
      ingredients: validatedIngredients,
      servings: Number(recipeData.servings) || 4,
      prepTime: Number(recipeData.prepTime) || undefined,
      cookTime: Number(recipeData.cookTime) || undefined,
      instructions: recipeData.instructions || [],
      totalNutrition: {
        calories: Number(recipeData.totalNutrition?.calories) || 0,
        protein: Number(recipeData.totalNutrition?.protein) || 0,
        carbs: Number(recipeData.totalNutrition?.carbs) || 0,
        fat: Number(recipeData.totalNutrition?.fat) || 0,
        fiber: Number(recipeData.totalNutrition?.fiber) || 0,
      },
      nutritionPerServing: {
        calories: Number(recipeData.nutritionPerServing?.calories) || 0,
        protein: Number(recipeData.nutritionPerServing?.protein) || 0,
        carbs: Number(recipeData.nutritionPerServing?.carbs) || 0,
        fat: Number(recipeData.nutritionPerServing?.fat) || 0,
        fiber: Number(recipeData.nutritionPerServing?.fiber) || 0,
      },
      tags: ['imported'],
      source: 'url_import',
      sourceUrl: url,
      isFavorite: false,
      timesUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      allergenWarnings: detectRecipeAllergens(
        (recipeData.ingredients || []).map((i: any) => i.name || ''),
        userAllergies,
        userIntolerances
      ),
    };

    return recipe;
  } catch (error) {
    console.error('Failed to extract recipe from URL:', error);
    throw error;
  }
}

/**
 * Scale a recipe to different servings
 */
export function scaleRecipe(recipe: Recipe, newServings: number): Recipe {
  if (newServings <= 0) {
    throw new Error('Servings must be greater than 0');
  }

  const scale = newServings / recipe.servings;

  // Scale all ingredients
  const scaledIngredients: RecipeIngredient[] = recipe.ingredients.map((ing) => ({
    ...ing,
    quantity: ing.quantity * scale,
    nutrition: {
      calories: ing.nutrition.calories * scale,
      protein: ing.nutrition.protein * scale,
      carbs: ing.nutrition.carbs * scale,
      fat: ing.nutrition.fat * scale,
      fiber: ing.nutrition.fiber * scale,
      sugar: (ing.nutrition.sugar || 0) * scale,
      saturatedFat: (ing.nutrition.saturatedFat || 0) * scale,
      sodium: (ing.nutrition.sodium || 0) * scale,
    },
  }));

  // Recalculate total nutrition
  const totalNutrition = calculateRecipeNutrition(scaledIngredients).totalNutrition;

  // Calculate per-serving nutrition
  const nutritionPerServing: Nutrition = {
    calories: totalNutrition.calories / newServings,
    protein: totalNutrition.protein / newServings,
    carbs: totalNutrition.carbs / newServings,
    fat: totalNutrition.fat / newServings,
    fiber: totalNutrition.fiber / newServings,
    sugar: (totalNutrition.sugar || 0) / newServings,
    saturatedFat: (totalNutrition.saturatedFat || 0) / newServings,
    sodium: (totalNutrition.sodium || 0) / newServings,
  };

  return {
    ...recipe,
    servings: newServings,
    ingredients: scaledIngredients,
    totalNutrition,
    nutritionPerServing,
    updatedAt: new Date(),
  };
}

/**
 * Calculate total nutrition from ingredients
 */
export function calculateRecipeNutrition(ingredients: RecipeIngredient[]): {
  totalNutrition: Nutrition;
  nutritionPerServing: Nutrition;
} {
  const totalNutrition: Nutrition = ingredients.reduce(
    (total, ing) => ({
      calories: total.calories + (ing.nutrition.calories || 0),
      protein: total.protein + (ing.nutrition.protein || 0),
      carbs: total.carbs + (ing.nutrition.carbs || 0),
      fat: total.fat + (ing.nutrition.fat || 0),
      fiber: total.fiber + (ing.nutrition.fiber || 0),
      sugar: (total.sugar || 0) + (ing.nutrition.sugar || 0),
      saturatedFat: (total.saturatedFat || 0) + (ing.nutrition.saturatedFat || 0),
      sodium: (total.sodium || 0) + (ing.nutrition.sodium || 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      saturatedFat: 0,
      sodium: 0,
    }
  );

  return {
    totalNutrition,
    nutritionPerServing: totalNutrition, // Will be divided by servings in store
  };
}

/**
 * Map ingredient to grocery category
 */
function getGroceryCategory(ingredientName: string): GroceryCategory {
  const name = ingredientName.toLowerCase();

  const categories: Record<GroceryCategory, string[]> = {
    produce: [
      'apple', 'banana', 'carrot', 'tomato', 'lettuce', 'onion', 'garlic', 'potato', 'broccoli',
      'spinach', 'pepper', 'cucumber', 'lemon', 'orange', 'grape', 'pear', 'avocado', 'celery',
    ],
    protein: [
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'lamb', 'shrimp', 'egg', 'tofu',
      'meat', 'steak', 'breast', 'ground',
    ],
    dairy: [
      'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'mozzarella', 'cheddar',
      'feta', 'ricotta',
    ],
    grains: ['rice', 'bread', 'pasta', 'flour', 'oats', 'cereal', 'wheat', 'barley', 'quinoa'],
    canned: [
      'beans', 'tomato sauce', 'broth', 'soup', 'canned', 'coconut milk', 'chickpeas',
      'black beans',
    ],
    frozen: ['frozen', 'ice', 'peas', 'corn', 'vegetables'],
    snacks: ['chips', 'nuts', 'crackers', 'popcorn', 'granola', 'bar'],
    beverages: [
      'juice', 'coffee', 'tea', 'wine', 'beer', 'soda', 'water', 'milk', 'beverage', 'drink',
    ],
    condiments: [
      'salt', 'pepper', 'spice', 'oil', 'vinegar', 'sauce', 'mustard', 'mayo', 'ketchup',
      'soy sauce', 'herbs',
    ],
    other: [],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => name.includes(keyword))) {
      return category as GroceryCategory;
    }
  }

  return 'other';
}

/**
 * Generate grocery list from recipe
 */
export function generateGroceryFromRecipe(recipe: Recipe, servings: number): GroceryItem[] {
  const scale = servings / recipe.servings;

  return recipe.ingredients.map((ing, index) => ({
    id: `${recipe.id}-${index}`,
    name: ing.name,
    quantity: ing.quantity * scale,
    unit: ing.unit,
    category: getGroceryCategory(ing.name),
    checked: false,
    recipeId: recipe.id,
  }));
}
