/**
 * Adaptive Coach Bridge — Cals2Gains
 *
 * Conecta AdaptiveMacroEngine (motor de ajuste) con macroCoach (IA explicativa).
 *
 * Cuando el motor detecta que hay que ajustar macros, este servicio genera
 * una explicación en lenguaje natural para el usuario:
 *
 *   "He ajustado tus carbohidratos de 200g a 220g porque llevas 5 días
 *    cumpliendo tu objetivo y tu peso se mantiene estable."
 *
 * Flujo:
 *   1. Llamar a `checkAndExplainAdjustment(...)` periódicamente (ej. al abrir app).
 *   2. Si hay ajuste pendiente, se guarda en AsyncStorage.
 *   3. Componentes leen con `getPendingMessage()` y lo muestran.
 *   4. Al mostrar, llamar `clearPendingMessage()`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdaptiveMacroEngine,
  GoalAdjustment,
  Meal,
  UserGoals,
  WeightEntry,
} from './adaptiveMacroEngine';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const PENDING_MESSAGE_KEY = '@cals2gains/coach_pending_message';

// ============================================================================
// Tipos públicos
// ============================================================================

export interface CoachAdjustmentMessage {
  adjustmentType: 'increase' | 'decrease' | 'maintain';
  calorieChange: number;
  proteinChange: number;
  carbsChange: number;
  explanationEs: string;
  explanationEn: string;
  newGoals: Partial<UserGoals>;
  createdAt: string; // ISO
  confidence: number;
}

// ============================================================================
// Generación de explicación con IA (con fallback sin IA)
// ============================================================================

async function buildExplanationWithAI(
  adjustment: GoalAdjustment,
  currentGoals: UserGoals,
  language: 'es' | 'en'
): Promise<{ es: string; en: string }> {
  if (!OPENAI_API_KEY) {
    return buildFallbackExplanation(adjustment, currentGoals);
  }

  const prompt = buildExplanationPrompt(adjustment, currentGoals);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'Eres un coach nutricional amigable y motivador. Explica los ajustes de macros de forma clara, breve (máx 2 frases) y en primera persona ("He ajustado..."). Devuelve JSON con campos "es" y "en".',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error('OpenAI error');

    const data = await response.json();
    const content = data.choices[0]?.message?.content ?? '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      es: parsed.es ?? adjustment.reasonEs,
      en: parsed.en ?? adjustment.reason,
    };
  } catch {
    return buildFallbackExplanation(adjustment, currentGoals);
  }
}

function buildExplanationPrompt(
  adjustment: GoalAdjustment,
  goals: UserGoals
): string {
  const direction = adjustment.type === 'increase' ? 'aumentar' : adjustment.type === 'decrease' ? 'reducir' : 'mantener';
  const calChange = Math.abs(adjustment.calorieChange);

  return `El motor de ajuste adaptativo ha decidido ${direction} las calorías del usuario en ${calChange} kcal.
Razón técnica: "${adjustment.reasonEs}" / "${adjustment.reason}"
Objetivos actuales: ${goals.targetCalories} kcal, P:${goals.targetProtein}g, C:${goals.targetCarbs}g, G:${goals.targetFat}g
Cambio proteína: ${adjustment.proteinChange ?? 0}g

Genera una explicación motivadora, breve (2 frases máx), en primera persona del coach.
Devuelve SOLO JSON: {"es": "...", "en": "..."}`;
}

function buildFallbackExplanation(
  adjustment: GoalAdjustment,
  goals: UserGoals
): { es: string; en: string } {
  const calChange = adjustment.calorieChange;
  const absChange = Math.abs(calChange);

  if (adjustment.type === 'maintain') {
    return {
      es: adjustment.reasonEs,
      en: adjustment.reason,
    };
  }

  if (adjustment.type === 'decrease') {
    return {
      es: `He reducido tu objetivo calórico en ${absChange} kcal porque ${adjustment.reasonEs.toLowerCase()}. Mantén el rumbo, ¡lo estás haciendo genial!`,
      en: `I've reduced your calorie target by ${absChange} kcal because ${adjustment.reason.toLowerCase()}. Keep it up, you're doing great!`,
    };
  }

  // increase
  return {
    es: `He aumentado tu objetivo calórico en ${absChange} kcal porque ${adjustment.reasonEs.toLowerCase()}. ¡Tu constancia está dando frutos!`,
    en: `I've increased your calorie target by ${absChange} kcal because ${adjustment.reason.toLowerCase()}. Your consistency is paying off!`,
  };
}

// ============================================================================
// API pública
// ============================================================================

/**
 * Analiza los datos del usuario y, si corresponde ajustar los macros,
 * genera una explicación en lenguaje natural y la persiste.
 *
 * @returns El mensaje generado, o null si no hay ajuste necesario.
 */
export async function checkAndExplainAdjustment(params: {
  meals: Meal[];
  weights: WeightEntry[];
  currentGoals: UserGoals;
  goalType: string;
  language?: 'es' | 'en';
  days?: number;
}): Promise<CoachAdjustmentMessage | null> {
  const { meals, weights, currentGoals, goalType, language = 'es', days = 10 } = params;

  // 1. Calcular adherencia
  const adherence = AdaptiveMacroEngine.calculateAdherenceScore(meals, currentGoals, days);

  // 2. Decidir si hay que ajustar
  const adjustment = AdaptiveMacroEngine.shouldAdjustGoals(
    weights,
    currentGoals,
    adherence,
    goalType
  );

  if (!adjustment) return null;

  // 3. Calcular nuevos objetivos
  const newCalories =
    adjustment.type === 'increase'
      ? currentGoals.targetCalories + adjustment.calorieChange
      : adjustment.type === 'decrease'
      ? currentGoals.targetCalories - adjustment.calorieChange
      : currentGoals.targetCalories;

  const newProtein =
    adjustment.proteinChange != null
      ? currentGoals.targetProtein + adjustment.proteinChange
      : currentGoals.targetProtein;

  // 4. Generar explicación
  const explanation = await buildExplanationWithAI(adjustment, currentGoals, language);

  const message: CoachAdjustmentMessage = {
    adjustmentType: adjustment.type,
    calorieChange:
      adjustment.type === 'increase'
        ? adjustment.calorieChange
        : adjustment.type === 'decrease'
        ? -adjustment.calorieChange
        : 0,
    proteinChange: adjustment.proteinChange ?? 0,
    carbsChange: 0,
    explanationEs: explanation.es,
    explanationEn: explanation.en,
    newGoals: {
      targetCalories: newCalories,
      targetProtein: newProtein,
      targetCarbs: currentGoals.targetCarbs,
      targetFat: currentGoals.targetFat,
    },
    createdAt: new Date().toISOString(),
    confidence: adjustment.confidence,
  };

  // 5. Persistir para que la UI lo recoja
  await persistMessage(message);

  return message;
}

/**
 * Genera solo la explicación de un ajuste ya conocido (sin recalcular).
 * Útil cuando el motor ha ajustado y solo quieres el texto para mostrar.
 */
export async function explainAdjustment(
  adjustment: GoalAdjustment,
  currentGoals: UserGoals,
  language: 'es' | 'en' = 'es'
): Promise<{ es: string; en: string }> {
  return buildExplanationWithAI(adjustment, currentGoals, language);
}

/**
 * Recupera el mensaje pendiente de mostrar al usuario (si existe).
 */
export async function getPendingMessage(): Promise<CoachAdjustmentMessage | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_MESSAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoachAdjustmentMessage;
  } catch {
    return null;
  }
}

/**
 * Marca el mensaje como visto (lo elimina del storage).
 */
export async function clearPendingMessage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_MESSAGE_KEY);
  } catch {
    // No-op
  }
}

// ============================================================================
// Helpers internos
// ============================================================================

async function persistMessage(message: CoachAdjustmentMessage): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_MESSAGE_KEY, JSON.stringify(message));
  } catch {
    // No-op
  }
}
