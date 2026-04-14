// ============================================
// Cals2Gains - Reminder Service
// Safe wrapper: works even if expo-notifications
// is not yet installed (graceful fallback).
// ============================================

import { Platform } from 'react-native';

// ---- Dynamic import with fallback ----
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  console.warn('[ReminderService] expo-notifications not installed — reminders disabled');
}

// Configure notification behavior (only if available)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ---- Types ----

export type ReminderKey = 'meals' | 'water' | 'weight' | 'fasting';

export interface ReminderConfig {
  key: ReminderKey;
  enabled: boolean;
  time: string; // "HH:mm"
  notificationId?: string;
}

// ---- Permissions ----

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Recordatorios',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[ReminderService] Permission request failed:', error);
    return false;
  }
}

export async function getNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted;
  } catch {
    return false;
  }
}

// ---- Schedule / Cancel ----

export async function scheduleDailyReminder(
  key: ReminderKey,
  time: string,
  title: string,
  body: string,
): Promise<string> {
  if (!Notifications) {
    console.warn('[ReminderService] Cannot schedule — expo-notifications not installed');
    return `mock-${key}-${Date.now()}`;
  }

  const [hour, minute] = time.split(':').map(Number);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { reminderKey: key },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return notificationId;
}

export async function cancelReminder(notificationId: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelNotificationAsync(notificationId);
  } catch (error) {
    console.error('[ReminderService] Cancel failed:', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllNotificationsAsync();
  } catch (error) {
    console.error('[ReminderService] Cancel all failed:', error);
  }
}

export async function getScheduledNotifications() {
  if (!Notifications) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}

// ---- Notification content helpers ----

interface NotificationContent {
  title: string;
  body: string;
}

export function getReminderContent(
  key: ReminderKey,
  t: (k: string) => string,
): NotificationContent {
  switch (key) {
    case 'meals':
      return { title: t('reminders.mealsTitle'), body: t('reminders.mealsBody') };
    case 'water':
      return { title: t('reminders.waterTitle'), body: t('reminders.waterBody') };
    case 'weight':
      return { title: t('reminders.weightTitle'), body: t('reminders.weightBody') };
    case 'fasting':
      return { title: t('reminders.fastingTitle'), body: t('reminders.fastingBody') };
    default:
      return { title: 'Cals2Gains', body: '' };
  }
}
