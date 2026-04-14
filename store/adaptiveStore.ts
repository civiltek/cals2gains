// ============================================
// Cals2Gains - Adaptive Engine Store (Zustand)
// Persists weekly check state, recommendations,
// and engine outputs across sessions
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdaptiveMacroEngine,
  AdherenceScore,
  GoalAdjustment,
  GoalMode,
} from '../services/adaptiveMacroEngine';
import {
  PersonalEngine,
  AutoAdjustment,
  Suggestion as PersonalSuggestion,
  QuickAction,
} from '../services/personalEngine';
import {
  MemoryEngine,
  EatingPatterns,
  Suggestion as MemorySuggestion,
  FoodSuggestion,
} from '../services/memoryEngine';
import { differenceInDays, format } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export interface AdaptiveRecommendation {
  id: string;
  type: 'macro_adjustment' | 'auto_adjustment' | 'focus_consistency';
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
  adjustment?: GoalAdjustment;
  autoAdjustment?: AutoAdjustment;
  confidence: number;
  createdAt: string; // ISO date
  status: 'pending' | 'accepted' | 'dismissed';
}

interface AdaptiveState {
  // Weekly check state
  lastWeeklyCheck: string | null; // ISO date
  lastAdherenceScore: AdherenceScore | null;
  currentRecommendation: AdaptiveRecommendation | null;

  // Memory engine patterns
  eatingPatterns: EatingPatterns | null;
  memorySuggestions: MemorySuggestion[];

  // Personal engine
  gymFlowActions: QuickAction[];

  // Status
  isAnalyzing: boolean;
  engineError: string | null;

  // Actions
  runWeeklyCheck: (params: {
    meals: any[];
    weights: any[];
    goals: any;
    goalMode: string;
  }) => void;

  runMemoryAnalysis: (meals: any[]) => void;
  runGymFlow: (dayType: 'training' | 'rest' | 'light') => void;

  acceptRecommendation: () => { calories: number; protein: number; carbs: number; fat: number } | null;
  dismissRecommendation: () => void;
  clearError: () => void;

  shouldRunWeeklyCheck: () => boolean;
}

// ============================================================================
// Store
// ============================================================================

export const useAdaptiveStore = create<AdaptiveState>()(
  persist(
    (set, get) => ({
      lastWeeklyCheck: null,
      lastAdherenceScore: null,
      currentRecommendation: null,
      eatingPatterns: null,
      memorySuggestions: [],
      gymFlowActions: [],
      isAnalyzing: false,
      engineError: null,

      shouldRunWeeklyCheck: () => {
        const { lastWeeklyCheck } = get();
        if (!lastWeeklyCheck) return true;
        const daysSince = differenceInDays(new Date(), new Date(lastWeeklyCheck));
        return daysSince >= 7;
      },

      runWeeklyCheck: ({ meals, weights, goals, goalMode }) => {
        set({ isAnalyzing: true, engineError: null });

        try {
          // 1. Calculate adherence score using AdaptiveMacroEngine
          const engineMeals = meals.map((m: any) => ({
            id: m.id || String(Math.random()),
            name: m.dishName || m.name || 'Unknown',
            calories: m.nutrition?.calories || m.calories || 0,
            protein: m.nutrition?.protein || m.protein || 0,
            carbs: m.nutrition?.carbs || m.carbs || 0,
            fat: m.nutrition?.fat || m.fat || 0,
            mealType: m.mealType || 'lunch',
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));

          const engineGoals = {
            targetCalories: goals.calories || 2000,
            targetProtein: goals.protein || 120,
            targetCarbs: goals.carbs || 250,
            targetFat: goals.fat || 65,
            goalType: goalMode || 'maintain',
            tdee: goals.calories || 2000,
            bmr: Math.round((goals.calories || 2000) * 0.7),
          };

          const adherenceScore = AdaptiveMacroEngine.calculateAdherenceScore(
            engineMeals,
            engineGoals,
            7
          );

          // 2. Check if goals should be adjusted
          const engineWeights = weights.map((w: any) => ({
            date: w.date ? new Date(w.date) : new Date(),
            weight: w.weight || 0,
            unit: (w.unit || 'kg') as 'kg' | 'lbs',
          }));

          const goalAdjustment = AdaptiveMacroEngine.shouldAdjustGoals(
            engineWeights,
            engineGoals,
            adherenceScore,
            goalMode || 'maintain'
          );

          // 3. Also run PersonalEngine auto-adjustments if we have enough weight data
          let autoAdjustment: AutoAdjustment | undefined;
          if (weights.length >= 2) {
            const personalWeights = weights.map((w: any) => ({
              date: w.date ? new Date(w.date) : new Date(),
              weight: w.weight || 0,
            }));

            const personalAdherence = {
              weeklyAdherence: Math.round(adherenceScore.consistency * 100),
              macroAdherence: Math.round(
                (adherenceScore.calorieAdherence + adherenceScore.proteinAdherence) / 2 * 100
              ),
              consistency: Math.round(adherenceScore.consistency * 100),
            };

            const personalGoals = {
              dailyCalories: goals.calories || 2000,
              proteinGrams: goals.protein || 120,
              carbsGrams: goals.carbs || 250,
              fatGrams: goals.fat || 65,
            };

            autoAdjustment = PersonalEngine.generateAutoAdjustments(
              personalWeights,
              personalAdherence,
              personalGoals,
              (goalMode as any) || 'maintain'
            );
          }

          // 4. Build recommendation
          let recommendation: AdaptiveRecommendation | null = null;

          if (goalAdjustment) {
            recommendation = {
              id: `rec_${Date.now()}`,
              type: goalAdjustment.type === 'maintain' ? 'focus_consistency' : 'macro_adjustment',
              title: goalAdjustment.reason,
              titleEs: goalAdjustment.reasonEs,
              description: goalAdjustment.reason,
              descriptionEs: goalAdjustment.reasonEs,
              adjustment: goalAdjustment,
              autoAdjustment,
              confidence: goalAdjustment.confidence,
              createdAt: new Date().toISOString(),
              status: 'pending',
            };
          } else if (autoAdjustment && autoAdjustment.changePercentage !== 0) {
            recommendation = {
              id: `rec_${Date.now()}`,
              type: 'auto_adjustment',
              title: `Weekly adjustment: ${autoAdjustment.changePercentage > 0 ? '+' : ''}${Math.round(autoAdjustment.changePercentage)}% calories`,
              titleEs: autoAdjustment.reasoning,
              description: `New suggested targets: ${autoAdjustment.newCalories} cal, ${autoAdjustment.newProtein}g protein`,
              descriptionEs: autoAdjustment.reasoning,
              autoAdjustment,
              confidence: autoAdjustment.confidence,
              createdAt: new Date().toISOString(),
              status: 'pending',
            };
          }

          set({
            lastWeeklyCheck: new Date().toISOString(),
            lastAdherenceScore: adherenceScore,
            currentRecommendation: recommendation,
            isAnalyzing: false,
          });
        } catch (error: any) {
          console.error('[AdaptiveStore] Weekly check error:', error);
          set({
            isAnalyzing: false,
            engineError: error?.message || 'Engine analysis failed',
            lastWeeklyCheck: new Date().toISOString(),
          });
        }
      },

      runMemoryAnalysis: (meals) => {
        try {
          const engineMeals = meals.map((m: any) => ({
            id: m.id || String(Math.random()),
            name: m.dishName || m.name || 'Unknown',
            calories: m.nutrition?.calories || m.calories || 0,
            protein: m.nutrition?.protein || m.protein || 0,
            carbs: m.nutrition?.carbs || m.carbs || 0,
            fat: m.nutrition?.fat || m.fat || 0,
            mealType: (m.mealType || 'lunch') as any,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));

          const patterns = MemoryEngine.analyzeEatingPatterns(engineMeals);
          set({ eatingPatterns: patterns });
        } catch (error) {
          console.warn('[AdaptiveStore] Memory analysis error:', error);
        }
      },

      runGymFlow: (dayType) => {
        try {
          const now = new Date();
          const timeStr = format(now, 'HH:mm');
          const actions = PersonalEngine.getGymFlowSuggestions(dayType, timeStr);
          set({ gymFlowActions: actions });
        } catch (error) {
          console.warn('[AdaptiveStore] Gym flow error:', error);
        }
      },

      acceptRecommendation: () => {
        const { currentRecommendation } = get();
        if (!currentRecommendation) return null;

        const autoAdj = currentRecommendation.autoAdjustment;
        set({
          currentRecommendation: {
            ...currentRecommendation,
            status: 'accepted',
          },
        });

        if (autoAdj) {
          return {
            calories: autoAdj.newCalories,
            protein: autoAdj.newProtein,
            carbs: autoAdj.newCarbs,
            fat: autoAdj.newFat,
          };
        }

        return null;
      },

      dismissRecommendation: () => {
        const { currentRecommendation } = get();
        if (!currentRecommendation) return;
        set({
          currentRecommendation: {
            ...currentRecommendation,
            status: 'dismissed',
          },
        });
      },

      clearError: () => set({ engineError: null }),
    }),
    {
      name: 'cals2gains-adaptive-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastWeeklyCheck: state.lastWeeklyCheck,
        lastAdherenceScore: state.lastAdherenceScore,
        currentRecommendation: state.currentRecommendation,
        eatingPatterns: state.eatingPatterns,
      }),
    }
  )
);
