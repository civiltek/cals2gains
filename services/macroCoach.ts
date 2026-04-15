// ============================================
// Cals2Gains - AI Predictive Macro Coaching
// ============================================
// Integrates: weight trends, health/wearable data, activity,
// meal history, and user goals to provide weekly macro adjustments.
// Future: InBody body composition integration.

import { User, UserGoals, Nutrition, WeightEntry, Meal } from '../types';
import { healthService, HealthData, WorkoutSummary } from './healthKit';
import { calculateTDEE, calculateBMR } from '../utils/nutrition';
import { callOpenAIChat } from './apiProxy';

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
    const response = await callOpenAIChat({
      model: 'gpt-5.4',
      max_tokens: 1200,
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
    });

    const content = response.content;
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

const COACHING_SYSTEM_PROMPT = `You are Cals2Gains AI Macro Coach. You analyze a user's weekly data (nutrition, weight, activity, body composition) and provide personalized macro adjustments.

RULES:
1. Respond ONLY in valid JSON
2. Never change calories by more than ±200 kcal per week
3. Never drop protein below 1.6g/kg of body weight for muscle-building goals
4. Factor in activity level from wearable data (steps, active calories, workouts)
5. Adjust for metabolic adaptation if weight has stalled for 2+ weeks
6. Provide bilingual (ES/EN) summaries and insights

Response format:
{
  "recommendedCalories": 2100,
  "recommendedProtein": 160,
  "recommendedCarbs": 210,
  "recommendedFat": 70,
  "confidence": 0.85,
  "summaryEs": "Spanish summary of recommendation",
  "summaryEn": "English summary of recommendation",
  "insights": [
    {
      "type": "weight|activity|nutrition|recommendation",
      "titleEs": "Title in Spanish",
      "titleEn": "Title in English",
      "messageEs": "Message in Spanish",
      "messageEn": "Message in English",
      "icon": "emoji",
      "severity": "info|warning|success"
    }
  ]
}`;

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

  parts.push(`User Profile: ${user.gender || 'unknown'}, ${user.age || '?'}y, ${user.weight || '?'}kg, ${user.height || '?'}cm`);
  parts.push(`Goal: ${user.goal || 'maintain_weight'}`);
  parts.push(`Current macros: ${user.goals?.calories ?? '?'} kcal, P:${user.goals?.protein ?? '?'}g, C:${user.goals?.carbs ?? '?'}g, F:${user.goals?.fat ?? '?'}g`);

  parts.push(`\nWeek Summary (${weekSummary.daysLogged} days logged):`);
  parts.push(`Avg: ${weekSummary.avgCalories} kcal, P:${weekSummary.avgProtein}g, C:${weekSummary.avgCarbs}g, F:${weekSummary.avgFat}g`);
  parts.push(`Adherence: ${weekSummary.adherenceScore}%`);

  if (weekSummary.weightChange !== null) {
    parts.push(`Weight change: ${weekSummary.weightChange > 0 ? '+' : ''}${weekSummary.weightChange.toFixed(1)} kg`);
  }

  if (healthData) {
    parts.push(`\nHealth data: ${healthData.steps} steps, ${healthData.activeCalories} active kcal`);
  }

  if (workouts.length > 0) {
    parts.push(`Workouts this week: ${workouts.length}`);
    workouts.forEach((w) => {
      parts.push(`- ${w.type}: ${w.duration}min, ${w.caloriesBurned} kcal`);
    });
  }

  if (bodyComp) {
    parts.push(`\nBody composition (${bodyComp.source}): ${bodyComp.bodyFatPct}% BF, ${bodyComp.muscleMass}kg muscle, BMR: ${bodyComp.bmr}`);
  }

  return parts.join('\n');
}
