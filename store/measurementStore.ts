// ============================================
// Cals2Gains - Measurement Store (Zustand)
// ============================================

import { create } from 'zustand';
import { BodyMeasurement } from '../types';
import {
  saveMeasurement,
  getMeasurements,
  deleteMeasurement as deleteMeasurementFromFirebase,
} from '../services/firebase';

interface MeasurementState {
  measurements: BodyMeasurement[];
  isLoading: boolean;

  // Actions
  loadMeasurements: (userId: string) => Promise<void>;
  addMeasurement: (measurement: Omit<BodyMeasurement, 'id'>) => Promise<string>;
  deleteMeasurement: (id: string) => Promise<void>;

  // Computed
  getLatest: () => BodyMeasurement | null;
  getHistory: (limit?: number) => BodyMeasurement[];
  getChanges: (field: keyof BodyMeasurement, days?: number) => number | null;
}

export const useMeasurementStore = create<MeasurementState>((set, get) => ({
  measurements: [],
  isLoading: false,

  loadMeasurements: async (userId: string) => {
    set({ isLoading: true });
    try {
      const measurements = await getMeasurements(userId);
      // Sort by date descending (most recent first)
      const sorted = measurements.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      set({ measurements: sorted });
    } catch (error) {
      console.error('Failed to load measurements:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addMeasurement: async (measurement: Omit<BodyMeasurement, 'id'>) => {
    set({ isLoading: true });
    try {
      const id = await saveMeasurement(measurement);
      const newMeasurement = { ...measurement, id } as BodyMeasurement;

      const { measurements } = get();
      const updated = [newMeasurement, ...measurements].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      set({ measurements: updated });

      return id;
    } catch (error) {
      console.error('Failed to add measurement:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteMeasurement: async (id: string) => {
    try {
      await deleteMeasurementFromFirebase(id);

      const { measurements } = get();
      const updated = measurements.filter((m) => m.id !== id);
      set({ measurements: updated });
    } catch (error) {
      console.error('Failed to delete measurement:', error);
      throw error;
    }
  },

  getLatest: () => {
    const { measurements } = get();
    return measurements.length > 0 ? measurements[0] : null;
  },

  getHistory: (limit = 30) => {
    const { measurements } = get();
    return measurements.slice(0, limit);
  },

  getChanges: (field: keyof BodyMeasurement, days = 30) => {
    const { measurements } = get();
    if (measurements.length < 2) return null;

    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recent = measurements.filter(m => new Date(m.date) >= cutoff);
    if (recent.length < 2) return null;

    const latest = recent[0];
    const oldest = recent[recent.length - 1];

    const latestValue = latest[field];
    const oldestValue = oldest[field];

    if (typeof latestValue !== 'number' || typeof oldestValue !== 'number') {
      return null;
    }

    return latestValue - oldestValue;
  },
}));
