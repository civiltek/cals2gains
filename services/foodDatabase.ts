// ============================================
// Cals2Gains - Food Database Service
// ============================================
// Barcode scanning via Open Food Facts API
// Text search via Open Food Facts + USDA FoodData Central

import { FoodItem, Nutrition } from '../types';

const OFF_API = 'https://world.openfoodfacts.org';
const OFF_SEARCH = `${OFF_API}/cgi/search.pl`;

// ============================================
// BARCODE LOOKUP (Open Food Facts)
// ============================================

/**
 * Look up a food product by barcode using Open Food Facts
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const response = await fetch(
      `${OFF_API}/api/v2/product/${barcode}.json?fields=product_name,product_name_es,product_name_en,brands,nutriments,serving_size,serving_quantity,image_url`,
      {
        headers: { 'User-Agent': 'Cals2Gains/1.0 (info@civiltek.es)' },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments || {};

    const nutritionPer100g: Nutrition = {
      calories: n['energy-kcal_100g'] || n['energy_100g'] / 4.184 || 0,
      protein: n.proteins_100g || 0,
      carbs: n.carbohydrates_100g || 0,
      fat: n.fat_100g || 0,
      fiber: n.fiber_100g || 0,
      sugar: n.sugars_100g,
      saturatedFat: n['saturated-fat_100g'],
      sodium: n.sodium_100g ? n.sodium_100g * 1000 : undefined, // convert g to mg
    };

    const servingGrams = parseServingSize(p.serving_size) || p.serving_quantity || 100;
    const factor = servingGrams / 100;

    const nutritionPerServing: Nutrition = {
      calories: Math.round(nutritionPer100g.calories * factor),
      protein: round1(nutritionPer100g.protein * factor),
      carbs: round1(nutritionPer100g.carbs * factor),
      fat: round1(nutritionPer100g.fat * factor),
      fiber: round1(nutritionPer100g.fiber * factor),
      sugar: nutritionPer100g.sugar != null ? round1(nutritionPer100g.sugar * factor) : undefined,
      saturatedFat: nutritionPer100g.saturatedFat != null ? round1(nutritionPer100g.saturatedFat * factor) : undefined,
      sodium: nutritionPer100g.sodium != null ? Math.round(nutritionPer100g.sodium * factor) : undefined,
    };

    return {
      id: `off_${barcode}`,
      barcode,
      name: p.product_name || p.product_name_en || 'Unknown',
      nameEs: p.product_name_es || p.product_name,
      nameEn: p.product_name_en || p.product_name,
      brand: p.brands,
      servingSize: servingGrams,
      servingUnit: 'g',
      nutritionPer100g,
      nutritionPerServing,
      source: 'openfoodfacts',
      verified: true,
    };
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return null;
  }
}

// ============================================
// TEXT SEARCH (Open Food Facts)
// ============================================

/**
 * Search foods by text query
 */
export async function searchFoods(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: FoodItem[]; total: number }> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page: String(page),
      page_size: String(pageSize),
      fields: 'code,product_name,product_name_es,product_name_en,brands,nutriments,serving_size,serving_quantity,image_url',
    });

    const response = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: { 'User-Agent': 'Cals2Gains/1.0 (info@civiltek.es)' },
    });

    if (!response.ok) return { items: [], total: 0 };

    const data = await response.json();
    const products = data.products || [];

    const items: FoodItem[] = products
      .filter((p: any) => p.product_name && p.nutriments)
      .map((p: any) => {
        const n = p.nutriments || {};
        const nutritionPer100g: Nutrition = {
          calories: n['energy-kcal_100g'] || 0,
          protein: n.proteins_100g || 0,
          carbs: n.carbohydrates_100g || 0,
          fat: n.fat_100g || 0,
          fiber: n.fiber_100g || 0,
        };

        const servingGrams = parseServingSize(p.serving_size) || p.serving_quantity || 100;
        const factor = servingGrams / 100;

        return {
          id: `off_${p.code}`,
          barcode: p.code,
          name: p.product_name || 'Unknown',
          nameEs: p.product_name_es || p.product_name,
          nameEn: p.product_name_en || p.product_name,
          brand: p.brands,
          servingSize: servingGrams,
          servingUnit: 'g',
          nutritionPer100g,
          nutritionPerServing: {
            calories: Math.round(nutritionPer100g.calories * factor),
            protein: round1(nutritionPer100g.protein * factor),
            carbs: round1(nutritionPer100g.carbs * factor),
            fat: round1(nutritionPer100g.fat * factor),
            fiber: round1(nutritionPer100g.fiber * factor),
          },
          source: 'openfoodfacts' as const,
          verified: true,
        };
      });

    return { items, total: data.count || items.length };
  } catch (error) {
    console.error('Food search error:', error);
    return { items: [], total: 0 };
  }
}

// ============================================
// AI TEXT ANALYSIS (for generic food names)
// ============================================

/**
 * Use OpenAI to estimate nutrition for a text food description
 * (e.g., "2 scrambled eggs with toast")
 */
export async function analyzeTextFood(
  description: string,
  language: 'es' | 'en' = 'es'
): Promise<FoodItem | null> {
  const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert. Given a food description, estimate its nutritional content per 100g and total. Respond ONLY in valid JSON with this structure:
{
  "name": "English name",
  "nameEs": "Spanish name",
  "nameEn": "English name",
  "estimatedWeight": 200,
  "nutritionPer100g": { "calories": 150, "protein": 8, "carbs": 12, "fat": 7, "fiber": 1 },
  "totalNutrition": { "calories": 300, "protein": 16, "carbs": 24, "fat": 14, "fiber": 2 }
}`,
          },
          {
            role: 'user',
            content: `Estimate nutrition for: "${description}" (user language: ${language})`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) return null;

    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    return {
      id: `ai_${Date.now()}`,
      name: result.name || description,
      nameEs: result.nameEs || description,
      nameEn: result.nameEn || description,
      servingSize: result.estimatedWeight || 200,
      servingUnit: 'g',
      nutritionPer100g: result.nutritionPer100g,
      nutritionPerServing: result.totalNutrition,
      source: 'ai',
      verified: false,
    };
  } catch (error) {
    console.error('AI text analysis error:', error);
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

function parseServingSize(serving: string | undefined): number | null {
  if (!serving) return null;
  const match = serving.match(/(\d+(?:\.\d+)?)\s*g/i);
  return match ? parseFloat(match[1]) : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}