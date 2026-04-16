// ============================================
// Cals2Gains - Streak & Achievements Store
// ============================================

import { create } from 'zustand';
import { format, subDays, startOfDay } from 'date-fns';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getRecentMeals } from '../services/firebase';

// ── Types ─────────────────────────────────────────────────

export interface Achievement {
  id: string;
  unlockedAt: string; // ISO date string
}

export interface AchievementStats {
  totalMeals: number;
  currentStreak: number;
  longestStreak: number;
  hasPhoto: boolean;
  hasRecipe: boolean;
  proteinGoalDays: number;   // consecutive days meeting protein goal
  waterGoalDays: number;     // consecutive days meeting water goal
  mealPlanCompleted: boolean;
}

export interface AchievementDef {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: string;
  milestoneStreak?: number; // for celebration animation
  check: (stats: AchievementStats) => boolean;
}

// ── Achievement Definitions ───────────────────────────────

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_meal',
    nameEs: 'Primera comida',
    nameEn: 'First meal logged',
    descriptionEs: 'Registraste tu primera comida. ¡Bienvenido!',
    descriptionEn: 'You logged your first meal. Welcome!',
    icon: '🍽️',
    check: (s) => s.totalMeals >= 1,
  },
  {
    id: 'streak_7',
    nameEs: '7 días seguidos',
    nameEn: '7-day streak',
    descriptionEs: '7 días consecutivos registrando comidas',
    descriptionEn: '7 consecutive days logging meals',
    icon: '🔥',
    milestoneStreak: 7,
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak_14',
    nameEs: '14 días seguidos',
    nameEn: '14-day streak',
    descriptionEs: '14 días consecutivos. ¡Vas muy bien!',
    descriptionEn: '14 consecutive days. Great going!',
    icon: '🔥',
    milestoneStreak: 14,
    check: (s) => s.currentStreak >= 14,
  },
  {
    id: 'streak_30',
    nameEs: '30 días seguidos',
    nameEn: '30-day streak',
    descriptionEs: '¡Un mes entero de constancia!',
    descriptionEn: 'A full month of consistency!',
    icon: '🏆',
    milestoneStreak: 30,
    check: (s) => s.currentStreak >= 30,
  },
  {
    id: 'streak_60',
    nameEs: '60 días seguidos',
    nameEn: '60-day streak',
    descriptionEs: '¡Dos meses! Tu hábito ya está formado.',
    descriptionEn: 'Two months! Your habit is formed.',
    icon: '⭐',
    milestoneStreak: 60,
    check: (s) => s.currentStreak >= 60,
  },
  {
    id: 'streak_90',
    nameEs: '90 días seguidos',
    nameEn: '90-day streak',
    descriptionEs: '90 días consecutivos — ¡increíble!',
    descriptionEn: '90 consecutive days — incredible!',
    icon: '👑',
    milestoneStreak: 90,
    check: (s) => s.currentStreak >= 90,
  },
  {
    id: 'streak_365',
    nameEs: '¡Un año completo!',
    nameEn: 'One full year!',
    descriptionEs: '365 días seguidos — leyenda absoluta',
    descriptionEn: '365 consecutive days — absolute legend',
    icon: '🎖️',
    milestoneStreak: 365,
    check: (s) => s.currentStreak >= 365,
  },
  {
    id: 'first_photo',
    nameEs: 'Primera foto de comida',
    nameEn: 'First food photo',
    descriptionEs: 'Subiste tu primera foto de comida',
    descriptionEn: 'You uploaded your first food photo',
    icon: '📸',
    check: (s) => s.hasPhoto,
  },
  {
    id: 'first_recipe',
    nameEs: 'Chef en casa',
    nameEn: 'Home chef',
    descriptionEs: 'Creaste tu primera receta personalizada',
    descriptionEn: 'You created your first custom recipe',
    icon: '👨‍🍳',
    check: (s) => s.hasRecipe,
  },
  {
    id: 'meals_100',
    nameEs: '100 comidas registradas',
    nameEn: '100 meals logged',
    descriptionEs: 'Registraste 100 comidas en total',
    descriptionEn: 'You logged 100 meals in total',
    icon: '💯',
    check: (s) => s.totalMeals >= 100,
  },
  {
    id: 'protein_5days',
    nameEs: 'Rey/Reina de la proteína',
    nameEn: 'Protein champion',
    descriptionEs: 'Objetivo de proteína cumplido 5 días seguidos',
    descriptionEn: 'Protein goal met 5 days in a row',
    icon: '💪',
    check: (s) => s.proteinGoalDays >= 5,
  },
  {
    id: 'water_7days',
    nameEs: 'Hidratación perfecta',
    nameEn: 'Perfect hydration',
    descriptionEs: 'Meta de agua cumplida 7 días seguidos',
    descriptionEn: 'Water goal met 7 days in a row',
    icon: '💧',
    check: (s) => s.waterGoalDays >= 7,
  },
  {
    id: 'meal_plan',
    nameEs: 'Planificador maestro',
    nameEn: 'Master planner',
    descriptionEs: 'Completaste tu primer plan semanal',
    descriptionEn: 'You completed your first weekly meal plan',
    icon: '📅',
    check: (s) => s.mealPlanCompleted,
  },
];

// ── Firestore document shape ──────────────────────────────

interface GameProgressDoc {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  achievements: Achievement[];
  lastUpdated: string;
}

// ── Store ─────────────────────────────────────────────────

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  achievements: Achievement[];
  newlyUnlocked: Achievement[]; // queued for celebration UI
  isLoaded: boolean;

  // Actions
  loadGameProgress: (userId: string) => Promise<void>;
  refreshStreak: (userId: string) => Promise<void>;
  checkAchievements: (userId: string, stats: AchievementStats) => Promise<void>;
  clearNewlyUnlocked: () => void;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  currentStreak: 0,
  longestStreak: 0,
  lastStreakDate: null,
  achievements: [],
  newlyUnlocked: [],
  isLoaded: false,

  loadGameProgress: async (userId: string) => {
    try {
      const docRef = doc(db, 'users', userId, 'gameProgress', 'main');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as GameProgressDoc;
        set({
          currentStreak: data.currentStreak ?? 0,
          longestStreak: data.longestStreak ?? 0,
          lastStreakDate: data.lastStreakDate ?? null,
          achievements: data.achievements ?? [],
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('[StreakStore] Error loading game progress:', error);
      set({ isLoaded: true });
    }
  },

  refreshStreak: async (userId: string) => {
    try {
      // Fetch last 90 days of meals to compute streak
      const meals = await getRecentMeals(userId, 90);

      // Group meals by day, count per day
      const byDay = new Map<string, number>();
      for (const meal of meals) {
        const key = format(meal.timestamp, 'yyyy-MM-dd');
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }

      // Streak = consecutive days (from today or yesterday) with ≥2 meals
      const today = startOfDay(new Date());
      const todayKey = format(today, 'yyyy-MM-dd');
      const todayCount = byDay.get(todayKey) ?? 0;

      // Start from today if today qualifies, else from yesterday
      const startOffset = todayCount >= 2 ? 0 : 1;
      let streak = 0;

      for (let i = startOffset; i < 90; i++) {
        const d = subDays(today, i);
        const key = format(d, 'yyyy-MM-dd');
        if ((byDay.get(key) ?? 0) >= 2) {
          streak++;
        } else {
          break;
        }
      }

      const prevState = get();
      const newLongest = Math.max(streak, prevState.longestStreak);
      const lastStreakDate = streak > 0
        ? format(subDays(today, startOffset), 'yyyy-MM-dd')
        : null;

      set({
        currentStreak: streak,
        longestStreak: newLongest,
        lastStreakDate,
      });

      // Persist to Firestore
      const docRef = doc(db, 'users', userId, 'gameProgress', 'main');
      await setDoc(docRef, {
        currentStreak: streak,
        longestStreak: newLongest,
        lastStreakDate,
        achievements: prevState.achievements,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('[StreakStore] Error refreshing streak:', error);
    }
  },

  checkAchievements: async (userId: string, stats: AchievementStats) => {
    const { achievements } = get();
    const unlockedIds = new Set(achievements.map((a) => a.id));

    const newlyUnlocked: Achievement[] = [];

    for (const def of ACHIEVEMENT_DEFS) {
      if (!unlockedIds.has(def.id) && def.check(stats)) {
        newlyUnlocked.push({
          id: def.id,
          unlockedAt: new Date().toISOString(),
        });
      }
    }

    if (newlyUnlocked.length > 0) {
      const allAchievements = [...achievements, ...newlyUnlocked];
      set({ achievements: allAchievements, newlyUnlocked });

      try {
        const docRef = doc(db, 'users', userId, 'gameProgress', 'main');
        await setDoc(docRef, { achievements: allAchievements }, { merge: true });
      } catch (error) {
        console.error('[StreakStore] Error saving achievements:', error);
      }
    }
  },

  clearNewlyUnlocked: () => set({ newlyUnlocked: [] }),
}));
