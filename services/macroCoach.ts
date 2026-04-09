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
  C'J}`  return parts.join('\n');
}
