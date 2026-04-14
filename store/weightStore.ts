// ============================================
// Cals2Gains - Weight Tracking Store (Zustand)
// ============================================

import { create } from 'zustand';
import { WeightEntry } from '../types';
import {
  saveWeightEntry,
  getWeightHistory,
  deleteWeightEntry,
} from '../services/firebase';

interface WeightState {
  entries: WeightEntry[];
  isLoading: boolean;

  // Actions
  loadHistory: (userId: string, days?: number) => Promise<void>;
  addEntry: (entry: Omit<WeightEntry, 'id'>) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;

  // Computed
  getLatestWeight: () => number | null;
  getWeightChange: (days: number) => number | null;
  getTrend: () => 'up' | 'down' | 'stable' | null;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],
  isLoading: false,

  loadHistory: async (userId: string, days: number = 90) => {
    if (!userId) return; // Guard: avoid Firestore query with undefined userId
    set({ isLoading: true });
    try {
      const entries = await getWeightHistory(userId, days);
      set({ entries });
    } catch (error) {
      console.error('Failed to load weight history:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addEntry: async (entry: Omit<WeightEntry, 'id'>) => {
    try {
      const id = await saveWeightEntry(entry);
      const newEntry = { ...entry, id } as WeightEntry;
      const { entries } = get();
      const updated = [newEntry, ...entries].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );
      set({ entries: updated });
    } catch (error) {
      console.error('Failed to save weight entry:', error);
      throw error;
    }
  },

  removeEntry: async (entryId: string) => {
    try {
      await deleteWeightEntry(entryId);
      const { entries } = get();
      set({ entries: entries.filter((e) => e.id !== entryId) });
    } catch (error) {
      console.error('Failed to delete weight entry:', error);
      throw error;
    }
  },

  getLatestWeight: () => {
    const { entries } = get();
    return entries.length > 0 ? entries[0].weight : null;
  },

  getWeightChange: (days: number) => {
    const { entries } = get();
    if (entries.length < 2) return null;

    const latest = entries[0].weight;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const older = entries.find((e) => e.date <= cutoff);
    if (!older) return null;

    return Math.round((latest - older.weight) * 10) / 10;
  },

  getTrend: () => {
    const { entries } = get();
    if (entries.length < 3) return null;

    // Simple 7-day moving average comparison
    const recent = entries.slice(0, 3);
    const older = entries.slice(3, 6);
    if (older.length === 0) return null;

    const recentAvg = recent.reduce((s, e) => s + e.weight, 0) / recent.length;
    const olderAvg = older.reduce((s, e) => s + e.weight, 0) / older.length;
    const diff = recentAvg - olderAvg;

    if (Math.abs(diff) < 0.3) return 'stable';
    return diff > 0 ? 'up' : 'down';
  },
}));

// Non-React accessor for screens that use weightStore directly
export const weightStore = {
  getWeights: () => useWeightStore.getState().entries,
  getState: () => useWeightStore.getState(),
};