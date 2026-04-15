// ============================================
// Cals2Gains - Water Tracking Store (Zustand)
// ============================================

import { create } from 'zustand';
import { Platform } from 'react-native';
import { WaterLog } from '../types';
import { saveWaterLog, getWaterLog } from '../services/firebase';
import { format } from 'date-fns';

interface WaterState {
  todayGlasses: number;
  goal: number;
  isLoading: boolean;

  // Actions
  loadToday: (userId: string) => Promise<void>;
  addGlass: (userId: string) => Promise<void>;
  removeGlass: (userId: string) => Promise<void>;
  setGoal: (goal: number, userId?: string) => void;

  // Computed
  getProgress: () => number;
  getMl: () => number;
}

export const useWaterStore = create<WaterState>((set, get) => ({
  todayGlasses: 0,
  goal: 8,
  isLoading: false,

  loadToday: async (userId: string) => {
    if (Platform.OS === 'web') return; // Skip Firebase on web demo
    set({ isLoading: true });
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const log = await getWaterLog(userId, today);
      if (log) {
        set({ todayGlasses: log.glasses, goal: log.goal });
      }
    } catch (error: any) {
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        console.warn('[Water] Firebase permissions not configured — using local state');
      } else {
        console.error('Failed to load water log:', error);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addGlass: async (userId: string) => {
    const { todayGlasses, goal } = get();
    const newGlasses = todayGlasses + 1;
    set({ todayGlasses: newGlasses });

    if (Platform.OS === 'web') return; // Local-only on web demo
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await saveWaterLog({ userId, date: today, glasses: newGlasses, goal });
    } catch (error: any) {
      if (!error?.message?.includes('permissions')) {
        set({ todayGlasses: todayGlasses }); // revert only on non-permission errors
      }
      console.warn('Failed to save water log:', error?.message || error);
    }
  },

  removeGlass: async (userId: string) => {
    const { todayGlasses, goal } = get();
    if (todayGlasses <= 0) return;

    const newGlasses = todayGlasses - 1;
    set({ todayGlasses: newGlasses });

    if (Platform.OS === 'web') return; // Local-only on web demo
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await saveWaterLog({ userId, date: today, glasses: newGlasses, goal });
    } catch (error: any) {
      if (!error?.message?.includes('permissions')) {
        set({ todayGlasses: todayGlasses }); // revert only on non-permission errors
      }
      console.warn('Failed to save water log:', error?.message || error);
    }
  },

  setGoal: (goal: number, userId?: string) => {
    set({ goal });
    if (!userId || Platform.OS === 'web') return;
    const { todayGlasses } = get();
    const today = format(new Date(), 'yyyy-MM-dd');
    saveWaterLog({ userId, date: today, glasses: todayGlasses, goal }).catch((err: any) => {
      console.warn('Failed to persist water goal:', err?.message || err);
    });
  },

  getProgress: () => {
    const { todayGlasses, goal } = get();
    return Math.min(todayGlasses / goal, 1);
  },

  getMl: () => {
    return get().todayGlasses * 250;
  },
}));

// Non-React accessor for screens that use waterStore directly
// getWater() returns an array (analytics/export-data call .filter() on it)
export const waterStore = {
  getWater: (): Array<{ date: string; amount: number; glasses: number; goal: number }> => {
    const state = useWaterStore.getState();
    // Return today's record as a single-element array
    // (full history would require a Firestore range query — not yet implemented)
    if (state.todayGlasses > 0) {
      const today = new Date().toISOString().split('T')[0];
      return [{
        date: today,
        amount: state.todayGlasses * 250,
        glasses: state.todayGlasses,
        goal: state.goal,
      }];
    }
    return [];
  },
  getState: () => useWaterStore.getState(),
};