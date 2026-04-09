// ============================================
// Cals2Gains - Water Tracking Store (Zustand)
// ============================================

import { create } from 'zustand';
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
  setGoal: (goal: number) => void;

  // Computed
  getProgress: () => number;
  getMl: () => number;
}

export const useWaterStore = create<WaterState>((set, get) => ({
  todayGlasses: 0,
  goal: 8,
  isLoading: false,

  loadToday: async (userId: string) => {
    set({ isLoading: true });
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const log = await getWaterLog(userId, today);
      if (log) {
        set({ todayGlasses: log.glasses, goal: log.goal });
      }
    } catch (error) {
      console.error('Failed to load water log:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addGlass: async (userId: string) => {
    const { todayGlasses, goal } = get();
    const newGlasses = todayGlasses + 1;
    set({ todayGlasses: newGlasses });

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await saveWaterLog({ userId, date: today, glasses: newGlasses, goal });
    } catch (error) {
      set({ todayGlasses: todayGlasses }); // revert
      console.error('Failed to save water log:', error);
    }
  },

  removeGlass: async (userId: string) => {
    const { todayGlasses, goal } = get();
    if (todayGlasses <= 0) return;

    const newGlasses = todayGlasses - 1;
    set({ todayGlasses: newGlasses });

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await saveWaterLog({ userId, date: today, glasses: newGlasses, goal });
    } catch (error) {
      set({ todayGlasses: todayGlasses }); // revert
    }
  },

  setGoal: (goal: number) => set({ goal }),

  getProgress: () => {
    const { todayGlasses, goal } = get();
    return Math.min(todayGlasses / goal, 1);
  },

  getMl: () => {
    return get().todayGlasses * 250;
  },
}))