// ============================================
// Cals2Gains - useHealthSync Hook
// ============================================
// Syncs HealthKit / Health Connect data into the store:
//   · On app open (mount)
//   · Every 30 minutes while the app is open
// If dynamicTDEE is enabled, also recalculates TDEE and goals
// from the 7-day moving average of active calories.

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { healthService } from '../services/healthKit';
import { calculateDynamicTDEE, calculateBMR } from '../utils/nutrition';
import { useUserStore } from '../store/userStore';

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useHealthSync() {
  const user = useUserStore((s) => s.user);
  const updateHealthData = useUserStore((s) => s.updateHealthData);
  const setHealthEnabled = useUserStore((s) => s.setHealthEnabled);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef<Date | null>(null);

  const sync = useCallback(async () => {
    if (!user?.healthEnabled) return;
    if (!healthService.getIsAuthorized()) return;

    try {
      // Fetch today's summary
      const summary = await healthService.getTodaySummary();
      if (summary) {
        updateHealthData(summary);
      }

      // If dynamic TDEE enabled, recalculate from 7-day average
      if (user.dynamicTDEEEnabled && user.profile) {
        const { avgCalories, daysWithData } = await healthService.get7DayCalorieAverage(7);
        const bmr = calculateBMR(user.profile);
        const dynamicTDEE = calculateDynamicTDEE(bmr, avgCalories, daysWithData);

        if (dynamicTDEE !== null) {
          // Persist updated TDEE — imported lazily to avoid circular deps
          const { updateUserGoalsAndMode } = await import('../services/firebase');
          await updateUserGoalsAndMode(user.uid, { tdee: dynamicTDEE, bmr });
          // Optimistic update in store
          useUserStore.setState((s) => ({
            user: s.user ? { ...s.user, tdee: dynamicTDEE, bmr } : s.user,
          }));
        }
      }

      lastSyncRef.current = new Date();
    } catch (error) {
      console.warn('[useHealthSync] Sync failed:', error);
    }
  }, [user?.healthEnabled, user?.dynamicTDEEEnabled, user?.uid, user?.profile, updateHealthData]);

  // Re-authorize if health was just enabled (user toggled it on)
  const authorizeAndSync = useCallback(async () => {
    if (!user?.healthEnabled) return;

    const alreadyAuthorized = healthService.getIsAuthorized();
    if (!alreadyAuthorized) {
      const granted = await healthService.requestAuthorization();
      if (!granted) {
        // User denied — flip the flag back off
        await setHealthEnabled(false);
        return;
      }
    }

    await sync();
  }, [user?.healthEnabled, sync, setHealthEnabled]);

  // Sync on mount and when health permission changes
  useEffect(() => {
    authorizeAndSync();
  }, [authorizeAndSync]);

  // Periodic sync every 30 minutes while app is in foreground
  useEffect(() => {
    if (!user?.healthEnabled) return;

    intervalRef.current = setInterval(() => {
      sync();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.healthEnabled, sync]);

  // Also sync when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // Only re-sync if more than 5 minutes have passed
        const now = new Date();
        const msSinceLastSync = lastSyncRef.current
          ? now.getTime() - lastSyncRef.current.getTime()
          : Infinity;

        if (msSinceLastSync > 5 * 60 * 1000) {
          sync();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [sync]);

  return { lastSynced: lastSyncRef.current };
}
