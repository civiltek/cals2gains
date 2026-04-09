// ============================================
// Cals2Gains - OpenAI Vision Service
// ============================================
// Uses GPT-4o Vision to analyze food photos and estimate nutritional content

import { FoodAnalysisResult, AnalysisAnswers, MealType } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * System prompt for food analysis
 */
const SYSTEM_PROMPT = `You are Cals2Gains, an expert nutritionist and food recognition system.
Your job is to analyze food photos with extreme precision and provide accurate nutritional estimates.

RULES:
1. Always respond in valid JSON only — no markdown, no explanation outside JSON
2. Estimate portion sizes based on visual cues: plate size, utensils, hand/finger references if visible, typical serving sizes
3. Be conservative with estimates — it's better to slightly underestimate than overestimate
4. For complex dishes, identify ALL significant ingredients
5. Only ask clarifying questions for ingredients that significantly affect calories/macros (>20 calories difference)
6. Maximum 3 clarifying questions
7. Nutritional values should be based on standard food databases (USDA, BEDCA)
8. Always provide BOTH English and Spanish names for dishes
9. Confidence should reflect certainty in food identification (0.5-1.0)`;

/**
 * Initial food analysis prompt
 */
function buildAnalysisPrompt(language: 'es' | 'en' = 'es'): string {
  return `Analyze this food photo and return ONLY a JSON object with this EXACT structure (no markdown):

{
  "dishName": "English dish name",
  "dishNameEs": "Nombre en español",
  "dishNameEn": "English dish name",
  "confidence": 0.9,
  "estimatedWeight": 300,
  "estimatedWeightNote": "Based on standard dinner plate, approximately 300g",
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
  language: 'es' | 'en' = 'es'
): string {
  const answersText = Object.entries(answers)
    .map(([id, answer]) => {
      const question = originalAnalysis.clarifyingQuestions.find((q) => q.id === id);
      return `${question?.questionEn || id}: ${answer}`;
    })
    .join('\n');

  return `Based on the food photo previously analyzed as "${originalAnalysis.dishNameEn}" and the following additional information:

${answersText}

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
 * Analyze a food photo using GPT-4o Vision
 */
export async function analyzeFoodPhoto(
  imageBase64: string,
  language: 'es' | 'en' = 'es'
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
              text: buildAnalysisPrompt(language),
            },
          ],
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
  language: 'es' | 'en' = 'es'
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
              text: buildRefinementPrompt(originalAnalysis, answers, language),
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
