// ============================================
// Cals2Gains - useAdaptiveEngines Hook
// Orchestrates all 3 engines on app open:
// - AdaptiveMacroEngine (weekly adherence + goal adjustment)
// - PersonalEngine (auto adjustments, gym flow)
// - MemoryEngine (eating patterns, contextual suggestions)
// ============================================

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useUserStore } from '../store/userStore';
import { useMealStore } from '../store/mealStore';
import { useAdaptiveStore } from '../store/adaptiveStore';

/**
 * Call this hook ONCE in the home screen (or root layout).
 * It runs the weekly check + memory analysis when the user opens the app.
 */
export function useAdaptiveEngines() {
  const hasRun = useRef(false);

  const user = useUserStore((s) => s.user);
  const getActiveGoals = useUserStore((s) => s.getActiveGoals);
  const recentMeals = useMealStore((s) => s.recentMeals);
  const todayMeals = useMealStore((s) => s.todayMeals);

  const shouldRunWeeklyCheck = useAdaptiveStore((s) => s.shouldRunWeeklyCheck);
  const runWeeklyCheck = useAdaptiveStore((s) => s.runWeeklyCheck);
  const runMemoryAnalysis = useAdaptiveStore((s) => s.runMemoryAnalysis);
  const isAnalyzing = useAdaptiveStore((s) => s.isAnalyzing);

  useEffect(() => {
    // Only run once per mount, and only when we have user data + meals
    if (hasRun.current) return;
    if (!user?.uid) return;
    if (!recentMeals || recentMeals.length === 0) return;

    hasRun.current = true;

    const goals = getActiveGoals();
    const goalMode = user.goalMode || 'maintain';

    // 1. Run weekly adherence check if 7+ days since last
    if (shouldRunWeeklyCheck()) {
      // Collect weight entries from user profile (simplified: use current weight)
      // In production, this would come from a weight history store
      const weights = user.weight
        ? [
            { date: new Date(), weight: user.weight, unit: 'kg' },
          ]
        : [];

      runWeeklyCheck({
        meals: recentMeals,
        weights,
        goals,
        goalMode,
      });
    }

    // 2. Always refresh eating patterns (lightweight)
    const allMeals = [...todayMeals, ...recentMeals];
    const uniqueMeals = allMeals.filter(
      (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
    );
    if (uniqueMeals.length > 0) {
      runMemoryAnalysis(uniqueMeals);
    }
  }, [user?.uid, recentMeals?.length]);

  return {
    isAnalyzing,
  };
}
