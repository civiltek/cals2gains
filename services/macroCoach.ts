// ============================================
// Cals2Gains - AI Predictive Macro Coaching
// ============================================
// Integrates: weight trends, health/wearable data, activity,
// meal history, and user goals to provide weekly macro adjustments.
// Future: InBody body composition integration.

import { User, UserGoals, Nutrition, WeightEntry, Meal } from '../types';
import { healthService, HealthData, WorkoutSummary } from './healthKit';
import { calculateTDEE, calculateBMR } from '../utils/nutrition';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// ============================================
// TYPES
// ============================================

export interface MacroRecommendation {
  newGoals: UserGoals;
  previousGoals: UserGoals;
  reason: string;
  reasonEs: string;
  reasonEn: string;
  adjustments: {
    calories: number; // delta from current
    protein: number;
    carbs: number;
    fat: number;
  };
  confidence: number; // 0-1
  insights: CoachInsight[];
  weekSummary: WeekSummary;
}

export interface CoachInsight {
  type: 'weight' | 'activity' | 'nutrition' | 'recommendation';
  titleEs: string;
  titleEn: string;
  messageEs: string;
  messageEn: string;
  icon: string;
  severity: 'info' | 'warning' | 'success';
}

export interface WeekSummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgSteps: number;
  avgActiveCalories: number;
  weightChange: number | null;
  daysLogged: number;
  adherenceScore: number; // 0-100
}

// ============================================
// Body Composition (InBody / future integration)
// ============================================

export interface BodyComposition {
  source: 'inbody' | 'manual' | 'estimate';
  bodyFatPct: number;
  muscleMass: number; // kg
  bmr: number;
  viscFat: number;
  bodyWater: number;
  date: Date;
}

/**
 * Estimate body composition from basic profile data
 * (Until InBody integration is available)
 */
export function estimateBodyComposition(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female' | 'other'
): BodyComposition {
  // Navy method estimation (simplified)
  let bodyFatPct: number;
  if (gender === 'male') {
    bodyFatPct = Math.max(5, 86.010 * Math.log10(weight * 0.7) - 70.041 * Math.log10(height) + 36.76);
  } else {
    bodyFatPct = Math.max(10, 163.205 * Math.log10(weight * 0.75) - 97.684 * Math.log10(height) - 78.387);
  }
  bodyFatPct = Math.min(bodyFatPct, 50);

  const fatMass = weight * (bodyFatPct / 100);
  const leanMass = weight - fatMass;
  const muscleMass = leanMass * 0.85;

  return {
    source: 'estimate',
    bodyFatPct: Math.round(bodyFatPct * 10) / 10,
    muscleMass: Math.round(muscleMass * 10) / 10,
    bmr: calculateBMR({ weight, height, age, gender, activityLevel: 'sedentary', goal: 'maintain_weight' }),
    viscFat: 0,
    bodyWater: Math.round(leanMass * 0.73 * 10) / 10,
    date: new Date(),
  };
}

// ============================================
// WEEKLY MACRO COACHING
// ============================================

/**
 * Generate weekly macro recommendation using AI + health data
 */
export async function generateWeeklyRecommendation(
  user: User,
  recentMeals: Meal[],
  weightHistory: WeightEntry[],
  bodyComp?: BodyComposition
): Promise<MacroRecommendation | null> {
  if (!OPENAI_API_KEY) return null;

  // Collect data
  const healthData = await healthService.getTodaySummary();
  const workouts = await healthService.getRecentWorkouts(7);

  // Calculate week summary
  const weekSummary = calculateWeekSummary(
    user,
    recentMeals,
    weightHistory,
    healthData,
    workouts
  );

  // Build context for AI
  const context = buildCoachingContext(user, weekSummary, bodyComp, healthData, workouts);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 800,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: COACHING_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: context,
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
      newGoals: {
        calories: result.recommendedCalories || user.goals.calories,
        protein: result.recommendedProtein || user.goals.protein,
        carbs: result.recommendedCarbs || user.goals.carbs,
        fat: result.recommendedFat || user.goals.fat,
        fiber: user.goals.fiber,
      },
      previousGoals: user.goals,
      reason: result.summary || '',
      reasonEs: result.summaryEs || result.summary || '',
      reasonEn: result.summaryEn || result.summary || '',
      adjustments: {
        calories: (result.recommendedCalories || user.goals.calories) - user.goals.calories,
        protein: (result.recommendedProtein || user.goals.protein) - user.goals.protein,
        carbs: (result.recommendedCarbs || user.goals.carbs) - user.goals.carbs,
        fat: (result.recommendedFat || user.goals.fat) - user.goals.fat,
      },
      confidence: result.confidence || 0.7,
      insights: result.insights || [],
      weekSummary,
    };
  } catch (error) {
    console.error('Macro coaching error:', error);
    return null;
  }
}

// ============================================
// INTERNAL HELPERS
// ============================================

const COACHING_SYSTEM_PROMPT = `AI Macro Coach. Analyze weekly nutrition/weight/activity data, provide personalized macro adjustments. JSON only. Rules: max ±200 kcal/week change, protein ≥1.6g/kg for muscle goals, factor wearable data, adjust for metabolic adaptation if stalled 2+ weeks. Bilingual ES/EN.
Format: {"recommendedCalories":N,"recommendedProtein":N,"recommendedCarbs":N,"recommendedFat":N,"confidence":0-1,"summaryEs":"...","summaryEn":"...","insights":[{"type":"weight|activity|nutrition|recommendation","titleEs":"","titleEn":"","messageEs":"","messageEn":"","icon":"emoji","severity":"info|warning|success"}]}`;

function calculateWeekSummary(
  user: User,
  meals: Meal[],
  weights: WeightEntry[],
  healthData: HealthData | null,
  workouts: WorkoutSummary[]
): WeekSummary {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekMeals = meals.filter((m) => new Date(m.timestamp).getTime() >= weekAgo.getTime());
  const weekWeights = weights.filter((w) => new Date(w.date).getTime() >= weekAgo.getTime());

  const daysLogged = new Set(
    weekMeals.map((m) => new Date(m.timestamp).toDateString())
  ).size;

  const totalCals = weekMeals.reduce((s, m) => s + (m.nutrition?.calories ?? 0), 0);
  const totalProt = weekMeals.reduce((s, m) => s + (m.nutrition?.protein ?? 0), 0);
  const totalCarbs = weekMeals.reduce((s, m) => s + (m.nutrition?.carbs ?? 0), 0);
  const totalFat = weekMeals.reduce((s, m) => s + (m.nutrition?.fat ?? 0), 0);
  const divisor = Math.max(daysLogged, 1);

  let weightChange: number | null = null;
  if (weekWeights.length >= 2) {
    const sorted = [...weekWeights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    weightChange = sorted[sorted.length - 1].weight - sorted[0].weight;
  }

  const targetCals = user.goals?.calories ?? 2000;
  const adherenceScore = daysLogged > 0
    ? Math.min(100, Math.round((daysLogged / 7) * 100 * (1 - Math.abs(totalCals / divisor - targetCals) / targetCals)))
    : 0;

  return {
    avgCalories: Math.round(totalCals / divisor),
    avgProtein: Math.round(totalProt / divisor),
    avgCarbs: Math.round(totalCarbs / divisor),
    avgFat: Math.round(totalFat / divisor),
    avgSteps: healthData?.steps ?? 0,
    avgActiveCalories: healthData?.activeCalories ?? 0,
    weightChange,
    daysLogged,
    adherenceScore: Math.max(0, adherenceScore),
  };
}

function buildCoachingContext(
  user: User,
  weekSummary: WeekSummary,
  bodyComp: BodyComposition | undefined,
  healthData: HealthData | null,
  workouts: WorkoutSummary[]
): string {
  const parts: string[] = [];

  parts.push(`User Profile: ${user.profile?.gender || 'unknown'}, ${user.profile?.age || '?'}y, ${user.weight || '?'}kg, ${user.profile?.height || '?'}cm`);
  parts.push(`Goal: ${user.profile?.goal || 'maintain_weight'}`);
  parts.push(`Current macros: ${user.goals?.calories ?? '?'} kcal, P:${user.goals?.protein ?? '?'}g, C:${user.goals?.carbs ?? '?'}g, F:${user.goals?.fat ?? '?'}g`);

  parts.push(`\nWeek Summary (${weekSummary.daysLogged} days logged):`);
  parts.push(`Avg: ${weekSummary.avgCalories} kcal, P:${weekSummary.avgProtein}g, C:${weekSummary.avgCarbs}g, F:${weekSummary.avgFat}g`);
  parts.push(`Adherence: ${weekSummary.adherenceScore}%`);

  if (weekSummary.weightChange !== null) {
    parts.push(`Weight change: ${weekSummary.weightChange > 0 ? '+' : ''}${weekSummary.weightChange.toFixed(1)} kg`);
  }

  if (healthData) {
    const totalKcal = healthData.activeCalories + healthData.restingCalories;
    parts.push(`\nToday's health data:`);
    parts.push(`- Steps: ${healthData.steps.toLocaleString()}`);
    parts.push(`- Active calories: ${healthData.activeCalories} kcal`);
    parts.push(`- Resting calories: ${healthData.restingCalories} kcal`);
    parts.push(`- Total energy: ${totalKcal} kcal`);
    if (healthData.exerciseMinutes > 0) {
      parts.push(`- Exercise minutes: ${healthData.exerciseMinutes} min`);
    }
    if (healthData.heartRate) {
      parts.push(`- Heart rate: ${healthData.heartRate} bpm`);
    }

    // Compare active calories vs expected (from user TDEE/BMR)
    const expectedActive = user.tdee && user.bmr ? user.tdee - user.bmr : 0;
    if (expectedActive > 0) {
      const delta = healthData.activeCalories - expectedActive;
      if (Math.abs(delta) >= 150) {
        parts.push(`- Activity vs expected: ${delta > 0 ? '+' : ''}${Math.round(delta)} kcal (${delta > 0 ? 'more active than usual' : 'less active than usual'})`);
      }
    }
  }

  if (weekSummary.avgSteps > 0) {
    parts.push(`\nWeekly activity avg: ${weekSummary.avgSteps.toLocaleString()} steps/day, ${weekSummary.avgActiveCalories} active kcal/day`);
  }

  if (workouts.length > 0) {
    const totalWorkoutKcal = workouts.reduce((s, w) => s + w.calories, 0);
    parts.push(`\nWorkouts this week: ${workouts.length} sessions, ${Math.round(totalWorkoutKcal)} kcal total`);
    workouts.forEach((w) => {
      parts.push(`- ${w.type}: ${Math.round(w.duration)}min, ${w.calories} kcal`);
    });
  }

  if (bodyComp) {
    parts.push(`\nBody composition (${bodyComp.source}): ${bodyComp.bodyFatPct}% BF, ${bodyComp.muscleMass}kg muscle, BMR: ${bodyComp.bmr}`);
  }

  return parts.join('\n');
}
