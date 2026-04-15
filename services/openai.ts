// ============================================
// Cals2Gains - OpenAI Vision Service
// ============================================
// Uses gpt-4o Vision to analyze food photos and estimate nutritional content

import { FoodAnalysisResult, AnalysisAnswers, MealType } from '../types';
import { getAppLanguage } from '../utils/language';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * System prompt for food analysis
 */
const SYSTEM_PROMPT = `You are Cals2Gains, an expert nutritionist and food recognition system.
Your job is to analyze food photos with extreme precision and provide accurate nutritional estimates.

RULES:
1. Always respond in valid JSON only — no markdown, no explanation outside JSON
2. For complex dishes, identify ALL significant ingredients
3. Only ask clarifying questions for ingredients that significantly affect calories/macros (>20 calories difference)
4. Maximum 3 clarifying questions
5. Nutritional values should be based on standard food databases (USDA, BEDCA)
6. Always provide BOTH English and Spanish names for dishes
7. Confidence should reflect certainty in food identification (0.5-1.0)

CRITICAL — WEIGHT ESTIMATION GUIDELINES:
You tend to OVERESTIMATE portion weights. Apply these calibration rules strictly:
- A standard dinner plate is 26cm diameter. A dessert/side plate is 19cm. Use plate size as a ruler.
- A smartphone lying next to food is ~15cm long — use it as reference if visible.
- A fork is ~19cm, a tablespoon head is ~4cm wide. Use utensils as size references.
- For packaged/bar foods: a typical cereal bar is 20-30g, a protein bar 40-60g. Do NOT estimate higher unless visually much larger.
- Single fruits: a medium apple is 150-180g, a medium pear is 170-200g, a banana (peeled) is 100-120g. Err toward the lower end unless clearly large.
- A slice of bread is 25-35g. A standard sandwich is 50-70g of bread.
- A chicken breast fillet is 120-180g. A steak is 150-250g depending on thickness.
- When in doubt, estimate 15-20% LOWER than your first instinct — studies show AI vision consistently overestimates food portions.
- Provide an estimatedWeightRange (e.g. "20-30g") so the user can adjust.
- Your estimatedWeight should be the MIDPOINT of your range, not the upper bound.`;

/**
 * Initial food analysis prompt
 */
function buildAnalysisPrompt(language: 'es' | 'en' = getAppLanguage(), userContext?: string): string {
  const contextBlock = userContext?.trim()
    ? `\n\nIMPORTANT — USER CONTEXT (treat as authoritative, override visual guesses with this info):
"${userContext.trim()}"
Use this context to correct your analysis. For example:
- "yogur griego light" → use low-fat greek yogurt nutritional values
- "2 yemas y 5 claras" → calculate egg nutrition accordingly (not whole eggs)
- "sin aceite" → do not count oil/fat from cooking
- "integral" → use whole-grain nutritional values
The user knows what they ate — trust their description over your visual estimate when they conflict.\n`
    : '';

  return `Analyze this food photo and return ONLY a JSON object with this EXACT structure (no markdown):${contextBlock}

{
  "dishName": "English dish name",
  "dishNameEs": "Nombre en español",
  "dishNameEn": "English dish name",
  "confidence": 0.9,
  "estimatedWeight": 250,
  "estimatedWeightRange": "220-280g",
  "estimatedWeightNote": "Based on standard dinner plate (26cm), portion covers ~40% of plate surface",
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
  "mealType": "breakfast|lunch|dinner|snack",
  "clarifyingQuestions": [
    {
      "id": "q1",
      "question": "Does the Spanish omelette contain onion?",
      "questionEs": "¿La tortilla española lleva cebolla?",
      "questionEn": "Does the Spanish omelette contain onion?",
      "options": ["Yes / Sí", "No"],
      "type": "choice"
    }
  ],
  "nutritionPer100g": {
    "calories": 150,
    "protein": 8.5,
    "carbs": 12.0,
    "fat": 7.5,
    "fiber": 1.2
  },
  "totalNutrition": {
    "calories": 450,
    "protein": 25.5,
    "carbs": 36.0,
    "fat": 22.5,
    "fiber": 3.6
  },
  "portionDescription": "Approximately 300g - two medium slices of Spanish omelette"
}

IMPORTANT:
- estimatedWeight must be in grams
- totalNutrition must be calculated based on estimatedWeight
- If you can't identify the food clearly, still make your best guess with lower confidence
- mealType should be inferred from the food type and time context
- Language for questions: ${language === 'es' ? 'Spanish first, then English' : 'English first, then Spanish'}`;
}

/**
 * Follow-up prompt after user answers clarifying questions
 */
function buildRefinementPrompt(
  originalAnalysis: FoodAnalysisResult,
  answers: AnalysisAnswers,
  language: 'es' | 'en' = getAppLanguage(),
  userContext?: string
): string {
  const answersText = Object.entries(answers)
    .map(([id, answer]) => {
      const question = originalAnalysis.clarifyingQuestions.find((q) => q.id === id);
      return `${question?.questionEn || id}: ${answer}`;
    })
    .join('\n');

  const contextBlock = userContext?.trim()
    ? `\nUser also provided this context (treat as authoritative): "${userContext.trim()}"\n`
    : '';

  return `Based on the food photo previously analyzed as "${originalAnalysis.dishNameEn}" and the following additional information:

${answersText}${contextBlock}

Recalculate the nutritional information and return ONLY a JSON object with this structure:
{
  "dishName": "${originalAnalysis.dishNameEn}",
  "dishNameEs": "${originalAnalysis.dishNameEs}",
  "dishNameEn": "${originalAnalysis.dishNameEn}",
  "confidence": ${originalAnalysis.confidence},
  "estimatedWeight": ${originalAnalysis.estimatedWeight},
  "ingredients": ${JSON.stringify(originalAnalysis.ingredients)},
  "mealType": "${originalAnalysis.mealType}",
  "clarifyingQuestions": [],
  "nutritionPer100g": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  },
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0
  },
  "portionDescription": "${originalAnalysis.portionDescription}"
}

Fill in accurate nutritional values based on ALL the ingredient information now available.`;
}

/**
 * Analyze a food photo using gpt-4o Vision
 */
export async function analyzeFoodPhoto(
  imageBase64: string,
  language: 'es' | 'en' = getAppLanguage(),
  userContext?: string
): Promise<FoodAnalysisResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: buildAnalysisPrompt(language, userContext),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMsg = error?.error?.message || JSON.stringify(error);
    console.error(`[OpenAI] API error ${response.status}:`, errorMsg);
    if (response.status === 401) {
      throw new Error('API key inválida o expirada. Revisa EXPO_PUBLIC_OPENAI_API_KEY en .env');
    } else if (response.status === 429) {
      throw new Error('Límite de uso de OpenAI alcanzado. Revisa tu cuenta de facturación.');
    } else if (response.status === 400) {
      throw new Error(`Error en la petición: ${errorMsg}`);
    }
    throw new Error(`Error OpenAI (${response.status}): ${errorMsg}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    // Clean response in case it has markdown code blocks
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(cleanedContent) as FoodAnalysisResult;

    // Validate and normalize the result
    return {
      dishName: result.dishName || result.dishNameEn || 'Unknown food',
      dishNameEs: result.dishNameEs || result.dishName || 'Alimento desconocido',
      dishNameEn: result.dishNameEn || result.dishName || 'Unknown food',
      confidence: Math.min(Math.max(result.confidence || 0.7, 0), 1),
      estimatedWeight: result.estimatedWeight || 200,
      estimatedWeightRange: result.estimatedWeightRange || undefined,
      ingredients: result.ingredients || [],
      clarifyingQuestions: result.clarifyingQuestions || [],
      nutritionPer100g: result.nutritionPer100g || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
      totalNutrition: result.totalNutrition || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      },
      portionDescription: result.portionDescription || `Approximately ${result.estimatedWeight || 200}g`,
      mealType: (result.mealType as MealType) || detectMealType(),
    };
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse nutritional analysis');
  }
}

/**
 * Refine analysis after user answers clarifying questions
 */
export async function refineAnalysis(
  imageBase64: string,
  originalAnalysis: FoodAnalysisResult,
  answers: AnalysisAnswers,
  language: 'es' | 'en' = getAppLanguage(),
  userContext?: string
): Promise<FoodAnalysisResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'low', // Lower detail for refinement to save tokens
              },
            },
            {
              type: 'text',
              text: buildRefinementPrompt(originalAnalysis, answers, language, userContext),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) throw new Error('No response from OpenAI');

  const cleanedContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const result = JSON.parse(cleanedContent) as FoodAnalysisResult;

  return {
    ...originalAnalysis,
    ...result,
    clarifyingQuestions: [], // No more questions after refinement
  };
}

/**
 * Detect likely meal type based on current time
 */
function detectMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 19 && hour < 23) return 'dinner';
  return 'snack';
}

// ============================================
// "¿Qué como?" AI Meal Suggestions
// ============================================

export interface AIMealSuggestion {
  name: string;
  nameEs: string;
  nameEn: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;        // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  reason: string;          // why this is suggested (in user's language)
  ingredients: string[];   // short list of main ingredients
}

/**
 * Generate personalized meal suggestions using gpt-4o
 * Based on remaining macros, time of day, user history, and preferences
 */
export async function generateAIMealSuggestions(params: {
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  mealType: string;         // breakfast/lunch/dinner/snack
  frequentFoods: string[];  // user's frequently eaten foods
  recentMeals: string[];    // names of meals logged in the last few days
  language: 'es' | 'en';
  goalMode?: string;        // lose_fat, gain_muscle, etc.
}): Promise<AIMealSuggestion[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const {
    remainingCalories,
    remainingProtein,
    remainingCarbs,
    remainingFat,
    mealType,
    frequentFoods,
    recentMeals,
    language,
    goalMode,
  } = params;

  const systemPrompt = `You are Cals2Gains, a smart nutrition assistant. Generate personalized meal suggestions that fit the user's remaining macros for the day.

RULES:
1. Return ONLY valid JSON — no markdown, no explanation
2. Suggest 5 meals that fit the remaining macros budget
3. Prioritize meals that are realistic, common, and easy to track
4. Consider the time of day (meal type) for appropriate suggestions
5. If the user frequently eats certain foods, include variations of those
6. Each meal should have accurate nutritional estimates based on USDA/BEDCA databases
7. Do NOT suggest meals that exceed remaining calories by more than 15%
8. Language for "name", "reason", and "ingredients": ${language === 'es' ? 'Spanish' : 'English'}
9. Always provide both nameEs and nameEn regardless of language`;

  const userPrompt = `Suggest 5 meals for the following situation:

REMAINING MACROS FOR TODAY:
- Calories: ${remainingCalories} kcal
- Protein: ${remainingProtein}g
- Carbs: ${remainingCarbs}g
- Fat: ${remainingFat}g

MEAL TYPE: ${mealType}
${goalMode ? `FITNESS GOAL: ${goalMode}` : ''}
${frequentFoods.length > 0 ? `FOODS USER FREQUENTLY EATS: ${frequentFoods.join(', ')}` : ''}
${recentMeals.length > 0 ? `RECENTLY LOGGED (avoid exact repeats): ${recentMeals.slice(0, 10).join(', ')}` : ''}

Return ONLY a JSON array with exactly 5 objects:
[
  {
    "name": "Meal name in ${language === 'es' ? 'Spanish' : 'English'}",
    "nameEs": "Nombre en español",
    "nameEn": "English name",
    "calories": 350,
    "protein": 30,
    "carbs": 25,
    "fat": 12,
    "prepTime": 15,
    "difficulty": "easy",
    "reason": "Short reason why this fits (in ${language === 'es' ? 'Spanish' : 'English'})",
    "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
  }
]`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1200,
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorMsg = error?.error?.message || `HTTP ${response.status}`;
    console.error('[OpenAI] AI suggestions error:', errorMsg);
    throw new Error(`Error generating suggestions: ${errorMsg}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const suggestions = JSON.parse(cleaned) as AIMealSuggestion[];

    // Validate and normalize
    return suggestions.slice(0, 5).map((s) => ({
      name: s.name || s.nameEn || 'Suggestion',
      nameEs: s.nameEs || s.name || 'Sugerencia',
      nameEn: s.nameEn || s.name || 'Suggestion',
      calories: Math.round(s.calories || 0),
      protein: Math.round(s.protein || 0),
      carbs: Math.round(s.carbs || 0),
      fat: Math.round(s.fat || 0),
      prepTime: s.prepTime || 15,
      difficulty: s.difficulty || 'easy',
      reason: s.reason || '',
      ingredients: s.ingredients || [],
    }));
  } catch (parseError) {
    console.error('[OpenAI] Failed to parse meal suggestions:', content);
    throw new Error('Failed to parse meal suggestions');
  }
}
