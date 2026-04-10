// ============================================
// Cals2Gains - Fasting Store (Zustand)
// ============================================

import { create } from 'zustand';
import { FastingConfig, FastingSession, FastingProtocol } from '../types';
import {
  saveFastingConfig,
  getFastingConfig,
  saveFastingSession,
  getFastingSessions,
} from '../services/firebase';

interface FastingState {
  config: FastingConfig | null;
  currentSession: FastingSession | null;
  history: FastingSession[];
  isLoading: boolean;

  // Actions
  loadConfig: (userId: string) => Promise<void>;
  updateConfig: (userId: string, config: Partial<FastingConfig>) => Promise<void>;
  startFast: (userId: string) => Promise<void>;
  endFast: (userId: string) => Promise<void>;
  loadHistory: (userId: string, limit?: number) => Promise<void>;

  // Computed
  isCurrentlyFasting: () => boolean;
  getElapsedHours: () => number;
  getRemainingHours: () => number;
  getProgress: () => number; // 0-1
}

function getProtocolHours(protocol: FastingProtocol, config?: FastingConfig): number {
  switch (protocol) {
    case '16:8':
      return 16;
    case '18:6':
      return 18;
    case '20:4':
      return 20;
    case '5:2':
      return 16;
    case 'custom':
      if (!config) return 16;
      // Parse eatingWindowStart and eatingWindowEnd to calculate fasting hours
      const [startHour] = config.eatingWindowStart.split(':').map(Number);
      const [endHour] = config.eatingWindowEnd.split(':').map(Number);
      return startHour >= endHour ? 24 - (startHour - endHour) : 24 - (endHour - startHour);
    default:
      return 16;
  }
}

export const useFastingStore = create<FastingState>((set, get) => ({
  config: null,
  currentSession: null,
  history: [],
  isLoading: false,

  loadConfig: async (userId: string) => {
    set({ isLoading: true });
    try {
      const config = await getFastingConfig(userId);
      set({ config });
    } catch (error) {
      console.error('Failed to load fasting config:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateConfig: async (userId: string, configUpdate: Partial<FastingConfig>) => {
    set({ isLoading: true });
    try {
      const { config } = get();
      const updated = { ...config, ...configUpdate } as FastingConfig;
      await saveFastingConfig(userId, updated);
      set({ config: updated });
    } catch (error) {
      console.error('Failed to update fasting config:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  startFast: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { config } = get();
      const protocol = config?.protocol || '16:8';
      const targetHours = getProtocolHours(protocol, config);

      const session: Omit<FastingSession, 'id'> = {
        userId,
        startTime: new Date(),
        targetHours,
        completed: false,
        date: new Date().toISOString().split('T')[0],
      };

      const sessionId = await saveFastingSession(session);
      const newSession = { ...session, id: sessionId } as FastingSession;
      set({ currentSession: newSession });
    } catch (error) {
      console.error('Failed to start fast:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  endFast: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { currentSession } = get();
      if (!currentSession) {
        throw new Error('No active fasting session');
      }

      const updated = {
        ...currentSession,
        endTime: new Date(),
        completed: true,
      };

      await saveFastingSession(updated);
      set({ currentSession: updated });
    } catch (error) {
      console.error('Failed to end fast:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadHistory: async (userId: string, limit = 30) => {
    set({ isLoading: true });
    try {
      const sessions = await getFastingSessions(userId, limit);
      set({ history: sessions });
    } catch (error) {
      console.error('Failed to load fasting history:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  isCurrentlyFasting: () => {
    const { currentSession } = get();
    return currentSession !== null && !currentSession.completed;
  },

  getElapsedHours: () => {
    const { currentSession } = get();
    if (!currentSession) return 0;

    const elapsed = new Date().getTime() - currentSession.startTime.getTime();
    return elapsed / (1000 * 60 * 60);
  },

  getRemainingHours: () => {
    const { currentSession } = get();
    if (!currentSession) return 0;

    const remaining = currentSession.targetHours - get().getElapsedHours();
    return Math.max(0, remaining);
  },

  getProgress: () => {
    const { currentSession } = get();
    if (!currentSession) return 0;

    const elapsed = get().getElapsedHours();
    const progress = elapsed / currentSession.targetHours;
    return Math.min(1, progress);
  },
}));
