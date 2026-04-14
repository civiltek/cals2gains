// ============================================
// Cals2Gains - Reminder Store (Zustand + Persist)
// Persists reminder preferences (enabled, times,
// notification IDs) across sessions via AsyncStorage.
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReminderKey,
  ReminderConfig,
  requestNotificationPermissions,
  getNotificationPermissions,
  scheduleDailyReminder,
  cancelReminder,
  getReminderContent,
} from '../services/reminderService';

// ---- State shape ----

interface ReminderState {
  /** Per-key config: enabled, time, and the scheduled notification ID */
  reminders: Record<ReminderKey, ReminderConfig>;

  /** Whether we have already been granted notification permissions */
  permissionGranted: boolean;

  // ---- Actions ----

  /**
   * Toggle a reminder on/off.
   * - On first enable: requests permissions if needed.
   * - Schedules or cancels the daily notification.
   * @param key   which reminder
   * @param t     i18n t() function for localised notification text
   */
  toggleReminder: (key: ReminderKey, t: (k: string) => string) => Promise<boolean>;

  /**
   * Update the time for a reminder.
   * If the reminder is currently enabled, reschedules the notification.
   */
  setReminderTime: (key: ReminderKey, time: string, t: (k: string) => string) => Promise<void>;

  /**
   * Re-schedule all enabled reminders.
   * Call this on app startup so reminders survive app restarts.
   */
  rehydrateReminders: (t: (k: string) => string) => Promise<void>;
}

// ---- Default configs ----

const DEFAULT_REMINDERS: Record<ReminderKey, ReminderConfig> = {
  meals: { key: 'meals', enabled: false, time: '08:00' },
  water: { key: 'water', enabled: false, time: '10:00' },
  weight: { key: 'weight', enabled: false, time: '07:00' },
  fasting: { key: 'fasting', enabled: false, time: '20:00' },
};

// ---- Store ----

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: { ...DEFAULT_REMINDERS },
      permissionGranted: false,

      toggleReminder: async (key, t) => {
        const state = get();
        const current = state.reminders[key];
        const newEnabled = !current.enabled;

        if (newEnabled) {
          // ---- Enabling ----
          // 1. Check / request permissions
          let granted = state.permissionGranted;
          if (!granted) {
            granted = await requestNotificationPermissions();
            set({ permissionGranted: granted });
            if (!granted) return false; // user denied
          }

          // 2. Schedule the daily notification
          const { title, body } = getReminderContent(key, t);
          const notificationId = await scheduleDailyReminder(key, current.time, title, body);

          set({
            reminders: {
              ...state.reminders,
              [key]: { ...current, enabled: true, notificationId },
            },
          });
          return true;
        } else {
          // ---- Disabling ----
          if (current.notificationId) {
            await cancelReminder(current.notificationId);
          }
          set({
            reminders: {
              ...state.reminders,
              [key]: { ...current, enabled: false, notificationId: undefined },
            },
          });
          return true;
        }
      },

      setReminderTime: async (key, time, t) => {
        const state = get();
        const current = state.reminders[key];

        // Cancel old notification if active
        if (current.enabled && current.notificationId) {
          await cancelReminder(current.notificationId);
        }

        let notificationId: string | undefined;

        // Re-schedule with new time if enabled
        if (current.enabled) {
          const { title, body } = getReminderContent(key, t);
          notificationId = await scheduleDailyReminder(key, time, title, body);
        }

        set({
          reminders: {
            ...state.reminders,
            [key]: { ...current, time, notificationId },
          },
        });
      },

      rehydrateReminders: async (t) => {
        const state = get();

        // Check permissions first
        const granted = await getNotificationPermissions();
        set({ permissionGranted: granted });
        if (!granted) return;

        // Re-schedule every enabled reminder
        const updated = { ...state.reminders };
        for (const key of Object.keys(updated) as ReminderKey[]) {
          const cfg = updated[key];
          if (!cfg.enabled) continue;

          // Cancel stale ID if any
          if (cfg.notificationId) {
            await cancelReminder(cfg.notificationId).catch(() => {});
          }

          const { title, body } = getReminderContent(key, t);
          const notificationId = await scheduleDailyReminder(key, cfg.time, title, body);
          updated[key] = { ...cfg, notificationId };
        }

        set({ reminders: updated });
      },
    }),
    {
      name: 'c2g-reminders',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist preferences, not transient IDs
      partialize: (state) => ({
        reminders: Object.fromEntries(
          Object.entries(state.reminders).map(([k, v]) => [
            k,
            { key: v.key, enabled: v.enabled, time: v.time },
          ]),
        ),
        permissionGranted: state.permissionGranted,
      }),
    },
  ),
);
