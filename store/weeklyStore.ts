// ============================================
// Cals2Gains — Weekly store (Zustand)
// ============================================
// Holds the rolling 7-day log of {consumed macros per day, dynamic TDEE per
// day}. Used by the home screen to render the rebalanced "today target"
// when dynamicTDEEEnabled is on.
//
// Design: dailyEntries[0] is the oldest day, dailyEntries[6] is today.
// The store lazy-loads on first call and refreshes every 6h (cheap — 7
// Firebase reads for meals + 7 health fetches, typically <1s total).
// ============================================

import { create } from 'zustand';
import { healthService } from '../services/healthKit';
import { getMealsForDate } from '../services/firebase';
import { Meal, UserGoals, UserProfile } from '../types';
import { addNutrition, calculateBMR, emptyNutrition } from '../utils/nutrition';
import { calculateDynamicTDEE } from '../utils/nutrition';
import {
  DailyEntry,
  TodayTarget,
  computeTodayTarget,
  goalTypeFromFitnessGoal,
  getActivityMultiplier,
} from '../utils/weeklyRebalance';

const WINDOW_DAYS = 7;
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

function ymd(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function mealNutrition(meal: any) {
  const n = meal?.nutrition;
  return {
    calories: n?.calories ?? meal?.calories ?? 0,
    protein: n?.protein ?? meal?.protein ?? 0,
    carbs: n?.carbs ?? meal?.carbs ?? 0,
    fat: n?.fat ?? meal?.fat ?? 0,
    fiber: n?.fiber ?? 0,
  };
}

interface WeeklyState {
  entries: DailyEntry[];
  lastLoadedAt: number | null;
  isLoading: boolean;

  /** Load/refresh the 7-day window. No-op if recently loaded. */
  loadWeek: (userId: string, profile: UserProfile, force?: boolean) => Promise<void>;

  /** Compute today's rebalanced target. Returns null if rebalance not applicable. */
  getTodayTarget: (profile: UserProfile, baseGoals: UserGoals) => TodayTarget | null;

  /** Clear state (on logout). */
  reset: () => void;
}

export const useWeeklyStore = create<WeeklyState>((set, get) => ({
  entries: [],
  lastLoadedAt: null,
  isLoading: false,

  loadWeek: async (userId, profile, force = false) => {
    const now = Date.now();
    const { lastLoadedAt, isLoading } = get();

    if (isLoading) return;
    if (!force && lastLoadedAt && now - lastLoadedAt < REFRESH_INTERVAL_MS) return;

    set({ isLoading: true });

    try {
      const bmr = calculateBMR(profile);
      const pal = getActivityMultiplier(profile.activityLevel);
      const baseTdee = Math.round(bmr * pal);
      const todayStr = ymd(new Date());

      // Gather the 7 days in parallel (Firebase + Health)
      const days: Date[] = [];
      for (let i = WINDOW_DAYS - 1; i >= 0; i--) days.push(daysAgo(i));

      const mealsPerDay = await Promise.all(
        days.map((d) => getMealsForDate(userId, d).catch(() => [] as Meal[]))
      );

      const healthPerDay = await Promise.all(
        days.map((d) => healthService.getDaySummary(d).catch(() => null))
      );

      // Compute 7-day moving avg of active kcal for dynamic TDEE (single number per window)
      const activeKcalValues = healthPerDay
        .map((h) => h?.activeCalories ?? 0)
        .filter((v) => v > 0);
      const daysWithData = activeKcalValues.length;
      const avgActiveKcal = daysWithData > 0
        ? activeKcalValues.reduce((a, b) => a + b, 0) / daysWithData
        : 0;
      const tdeeDynamicWindow = calculateDynamicTDEE(
        bmr,
        pal,
        avgActiveKcal,
        daysWithData
      );

      const entries: DailyEntry[] = days.map((d, i) => {
        const meals = mealsPerDay[i] ?? [];
        const totals = meals.reduce(
          (acc, m) => addNutrition(acc, mealNutrition(m)),
          emptyNutrition()
        );
        // Per-day TDEE: if health data exists use dynamic (smoothed) value;
        // otherwise fall back to static base. We use the window avg for all
        // days so the weekly budget is stable, not jittery.
        const tdeeForDay = tdeeDynamicWindow ?? baseTdee;
        return {
          date: ymd(d),
          tdeeDynamic: tdeeForDay,
          consumedKcal: Math.round(totals.calories),
          consumedProtein: Math.round(totals.protein),
          consumedCarbs: Math.round(totals.carbs),
          consumedFat: Math.round(totals.fat),
          consumedFiber: Math.round(totals.fiber),
          isToday: ymd(d) === todayStr,
        };
      });

      set({ entries, lastLoadedAt: now, isLoading: false });
    } catch (err) {
      console.error('[weeklyStore] loadWeek failed:', err);
      set({ isLoading: false });
    }
  },

  getTodayTarget: (profile, baseGoals) => {
    const { entries } = get();
    if (entries.length === 0) return null;
    const goalType = goalTypeFromFitnessGoal(profile.goal);
    return computeTodayTarget(profile, baseGoals, goalType, entries);
  },

  reset: () => set({ entries: [], lastLoadedAt: null, isLoading: false }),
}));
