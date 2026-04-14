// ============================================
// Cals2Gains - Food Database Service
// ============================================
// Barcode scanning via Open Food Facts API
// Text search via Open Food Facts + USDA FoodData Central

import { FoodItem, Nutrition } from '../types';
import { getAppLanguage } from '../utils/language';
import { searchSpanishFoods, translateFoodName, looksEnglish } from '../data/spanishFoods';

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

    const lang = getAppLanguage();
    let displayName: string;
    if (lang === 'es') {
      const rawName = p.product_name_es || p.product_name || 'Desconocido';
      displayName = looksEnglish(rawName) ? translateFoodName(rawName) : rawName;
    } else {
      displayName = p.product_name_en || p.product_name || 'Unknown';
    }

    return {
      id: `off_${barcode}`,
      barcode,
      name: displayName,
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
    const lang = getAppLanguage();
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page: String(page),
      page_size: String(pageSize),
      fields: 'code,product_name,product_name_es,product_name_en,brands,nutriments,serving_size,serving_quantity,image_url',
      lc: lang, // Locale: prefer results with names in user's language
      cc: lang === 'es' ? 'es' : 'us', // Country code: prioritize local products
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

        // Prefer localized name based on app language
        let displayName: string;
        if (lang === 'es') {
          const rawName = p.product_name_es || p.product_name || 'Desconocido';
          // Translate English product names to Spanish when possible
          displayName = looksEnglish(rawName) ? translateFoodName(rawName) : rawName;
        } else {
          displayName = p.product_name_en || p.product_name || 'Unknown';
        }

        return {
          id: `off_${p.code}`,
          barcode: p.code,
          name: displayName,
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

    // Merge with local results (local first for instant recognition)
    // Use expanded Spanish database (167 foods) for Spanish users
    const localMatches = lang === 'es'
      ? searchSpanishFoodsAsFoodItems(query)
      : searchLocalFoods(query);
    const localIds = new Set(localMatches.map((f) => f.id));
    const merged = [...localMatches, ...items.filter((f) => !localIds.has(f.id))];
    return { items: merged, total: (data.count || items.length) + localMatches.length };
  } catch (error) {
    console.error('Food search error:', error);
    // Fallback to local database when API fails
    const lang = getAppLanguage();
    const localMatches = lang === 'es'
      ? searchSpanishFoodsAsFoodItems(query)
      : searchLocalFoods(query);
    return { items: localMatches, total: localMatches.length };
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
  language: 'es' | 'en' = getAppLanguage()
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
        model: 'gpt-5.4',
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
// LOCAL FOOD DATABASE (offline fallback)
// ============================================

const LOCAL_FOODS: FoodItem[] = [
  { id: 'local_huevo', name: 'Huevo cocido', nameEs: 'Huevo cocido', nameEn: 'Boiled egg', servingSize: 60, servingUnit: 'g', nutritionPer100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 }, nutritionPerServing: { calories: 93, protein: 7.8, carbs: 0.7, fat: 6.6, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_huevo_frito', name: 'Huevo frito', nameEs: 'Huevo frito', nameEn: 'Fried egg', servingSize: 60, servingUnit: 'g', nutritionPer100g: { calories: 196, protein: 14, carbs: 0.8, fat: 15, fiber: 0 }, nutritionPerServing: { calories: 118, protein: 8.4, carbs: 0.5, fat: 9, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_pollo', name: 'Pechuga de pollo', nameEs: 'Pechuga de pollo', nameEn: 'Chicken breast', servingSize: 150, servingUnit: 'g', nutritionPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 }, nutritionPerServing: { calories: 248, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_arroz', name: 'Arroz blanco cocido', nameEs: 'Arroz blanco cocido', nameEn: 'Cooked white rice', servingSize: 200, servingUnit: 'g', nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 }, nutritionPerServing: { calories: 260, protein: 5.4, carbs: 56, fat: 0.6, fiber: 0.8 }, source: 'local', verified: true },
  { id: 'local_pan', name: 'Pan blanco', nameEs: 'Pan blanco', nameEn: 'White bread', servingSize: 30, servingUnit: 'g', nutritionPer100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 }, nutritionPerServing: { calories: 80, protein: 2.7, carbs: 14.7, fat: 1, fiber: 0.8 }, source: 'local', verified: true },
  { id: 'local_platano', name: 'Plátano', nameEs: 'Plátano', nameEn: 'Banana', servingSize: 120, servingUnit: 'g', nutritionPer100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 }, nutritionPerServing: { calories: 107, protein: 1.3, carbs: 27.6, fat: 0.4, fiber: 3.1 }, source: 'local', verified: true },
  { id: 'local_manzana', name: 'Manzana', nameEs: 'Manzana', nameEn: 'Apple', servingSize: 170, servingUnit: 'g', nutritionPer100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 }, nutritionPerServing: { calories: 88, protein: 0.5, carbs: 23.8, fat: 0.3, fiber: 4.1 }, source: 'local', verified: true },
  { id: 'local_leche', name: 'Leche entera', nameEs: 'Leche entera', nameEn: 'Whole milk', servingSize: 250, servingUnit: 'ml', nutritionPer100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0 }, nutritionPerServing: { calories: 153, protein: 8, carbs: 12, fat: 8.3, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_leche_semi', name: 'Leche semidesnatada', nameEs: 'Leche semidesnatada', nameEn: 'Semi-skimmed milk', servingSize: 250, servingUnit: 'ml', nutritionPer100g: { calories: 46, protein: 3.3, carbs: 4.8, fat: 1.6, fiber: 0 }, nutritionPerServing: { calories: 115, protein: 8.3, carbs: 12, fat: 4, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_pasta', name: 'Pasta cocida', nameEs: 'Pasta cocida', nameEn: 'Cooked pasta', servingSize: 200, servingUnit: 'g', nutritionPer100g: { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8 }, nutritionPerServing: { calories: 262, protein: 10, carbs: 50, fat: 2.2, fiber: 3.6 }, source: 'local', verified: true },
  { id: 'local_atun', name: 'Atún en lata', nameEs: 'Atún en lata', nameEn: 'Canned tuna', servingSize: 80, servingUnit: 'g', nutritionPer100g: { calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0 }, nutritionPerServing: { calories: 93, protein: 20.8, carbs: 0, fat: 0.8, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_tortilla', name: 'Tortilla española', nameEs: 'Tortilla española', nameEn: 'Spanish omelette', servingSize: 150, servingUnit: 'g', nutritionPer100g: { calories: 120, protein: 7, carbs: 8, fat: 7, fiber: 0.8 }, nutritionPerServing: { calories: 180, protein: 10.5, carbs: 12, fat: 10.5, fiber: 1.2 }, source: 'local', verified: true },
  { id: 'local_yogur', name: 'Yogur natural', nameEs: 'Yogur natural', nameEn: 'Natural yogurt', servingSize: 125, servingUnit: 'g', nutritionPer100g: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0 }, nutritionPerServing: { calories: 76, protein: 4.4, carbs: 5.9, fat: 4.1, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_salmon', name: 'Salmón', nameEs: 'Salmón', nameEn: 'Salmon', servingSize: 150, servingUnit: 'g', nutritionPer100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 }, nutritionPerServing: { calories: 312, protein: 30, carbs: 0, fat: 19.5, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_aceite_oliva', name: 'Aceite de oliva', nameEs: 'Aceite de oliva', nameEn: 'Olive oil', servingSize: 10, servingUnit: 'ml', nutritionPer100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }, nutritionPerServing: { calories: 88, protein: 0, carbs: 0, fat: 10, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_aguacate', name: 'Aguacate', nameEs: 'Aguacate', nameEn: 'Avocado', servingSize: 80, servingUnit: 'g', nutritionPer100g: { calories: 160, protein: 2, carbs: 8.5, fat: 15, fiber: 6.7 }, nutritionPerServing: { calories: 128, protein: 1.6, carbs: 6.8, fat: 12, fiber: 5.4 }, source: 'local', verified: true },
  { id: 'local_tomate', name: 'Tomate', nameEs: 'Tomate', nameEn: 'Tomato', servingSize: 150, servingUnit: 'g', nutritionPer100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 }, nutritionPerServing: { calories: 27, protein: 1.4, carbs: 5.9, fat: 0.3, fiber: 1.8 }, source: 'local', verified: true },
  { id: 'local_queso', name: 'Queso manchego', nameEs: 'Queso manchego', nameEn: 'Manchego cheese', servingSize: 30, servingUnit: 'g', nutritionPer100g: { calories: 390, protein: 26, carbs: 0.5, fat: 32, fiber: 0 }, nutritionPerServing: { calories: 117, protein: 7.8, carbs: 0.2, fat: 9.6, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_jamon', name: 'Jamón serrano', nameEs: 'Jamón serrano', nameEn: 'Serrano ham', servingSize: 30, servingUnit: 'g', nutritionPer100g: { calories: 241, protein: 31, carbs: 0.1, fat: 13, fiber: 0 }, nutritionPerServing: { calories: 72, protein: 9.3, carbs: 0, fat: 3.9, fiber: 0 }, source: 'local', verified: true },
  { id: 'local_lentejas', name: 'Lentejas cocidas', nameEs: 'Lentejas cocidas', nameEn: 'Cooked lentils', servingSize: 200, servingUnit: 'g', nutritionPer100g: { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9 }, nutritionPerServing: { calories: 232, protein: 18, carbs: 40, fat: 0.8, fiber: 15.8 }, source: 'local', verified: true },
  { id: 'local_garbanzos', name: 'Garbanzos cocidos', nameEs: 'Garbanzos cocidos', nameEn: 'Cooked chickpeas', servingSize: 200, servingUnit: 'g', nutritionPer100g: { calories: 164, protein: 9, carbs: 27, fat: 2.6, fiber: 7.6 }, nutritionPerServing: { calories: 328, protein: 18, carbs: 54, fat: 5.2, fiber: 15.2 }, source: 'local', verified: true },
  { id: 'local_pera', name: 'Pera', nameEs: 'Pera', nameEn: 'Pear', servingSize: 180, servingUnit: 'g', nutritionPer100g: { calories: 57, protein: 0.4, carbs: 15, fat: 0.1, fiber: 3.1 }, nutritionPerServing: { calories: 103, protein: 0.7, carbs: 27, fat: 0.2, fiber: 5.6 }, source: 'local', verified: true },
  { id: 'local_naranja', name: 'Naranja', nameEs: 'Naranja', nameEn: 'Orange', servingSize: 170, servingUnit: 'g', nutritionPer100g: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4 }, nutritionPerServing: { calories: 80, protein: 1.5, carbs: 20.4, fat: 0.2, fiber: 4.1 }, source: 'local', verified: true },
  { id: 'local_patata', name: 'Patata cocida', nameEs: 'Patata cocida', nameEn: 'Boiled potato', servingSize: 200, servingUnit: 'g', nutritionPer100g: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 1.8 }, nutritionPerServing: { calories: 154, protein: 4, carbs: 34, fat: 0.2, fiber: 3.6 }, source: 'local', verified: true },
  { id: 'local_cafe', name: 'Café solo', nameEs: 'Café solo', nameEn: 'Black coffee', servingSize: 200, servingUnit: 'ml', nutritionPer100g: { calories: 2, protein: 0.1, carbs: 0, fat: 0, fiber: 0 }, nutritionPerServing: { calories: 4, protein: 0.2, carbs: 0, fat: 0, fiber: 0 }, source: 'local', verified: true },
];

/**
 * Search expanded Spanish food database (167 items) and convert to FoodItem format
 */
function searchSpanishFoodsAsFoodItems(query: string): FoodItem[] {
  const results = searchSpanishFoods(query);
  return results.slice(0, 15).map((sf) => ({
    id: sf.id,
    name: sf.nameEs,
    nameEs: sf.nameEs,
    nameEn: sf.nameEn,
    servingSize: sf.servingSize,
    servingUnit: 'g',
    nutritionPer100g: sf.nutritionPer100g,
    nutritionPerServing: sf.nutritionPerServing,
    source: 'local' as const,
    verified: true,
    category: sf.category,
  }));
}

/**
 * Search local food database — case-insensitive, accent-insensitive
 */
function searchLocalFoods(query: string): FoodItem[] {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const q = normalize(query);
  return LOCAL_FOODS.filter(
    (f) =>
      normalize(f.name).includes(q) ||
      normalize(f.nameEs || '').includes(q) ||
      normalize(f.nameEn || '').includes(q)
  );
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
