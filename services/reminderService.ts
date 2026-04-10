// ============================================
// Cals2Gains - Reminder Service
// ============================================

import * as Notifications from 'expo-notifications';
import { Reminder } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Schedule a push notification reminder using expo-notifications
 * @param reminder The reminder configuration
 * @returns Promise resolving to the notification ID
 */
export async function scheduleReminder(reminder: Reminder): Promise<string> {
  try {
    const [hours, minutes] = reminder.time.split(':').map(Number);

    // Create a trigger for the specified time
    const trigger = new Date();
    trigger.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (trigger < new Date()) {
      trigger.setDate(trigger.getDate() + 1);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: {
          reminderId: reminder.id,
          type: reminder.type,
        },
      },
      trigger,
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule reminder:', error);
    throw error;
  }
}

/**
 * Cancel a specific reminder by its notification ID
 * @param reminderId The notification ID returned from scheduleReminder
 */
export async function cancelReminder(reminderId: string): Promise<void> {
  try {
    await Notifications.cancelNotificationAsync(reminderId);
  } catch (error) {
    console.error('Failed to cancel reminder:', error);
    throw error;
  }
}

/**
 * Cancel all scheduled reminders
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel all reminders:', error);
    throw error;
  }
}

/**
 * Get default set of reminders for a user
 * @returns Array of default reminders
 */
export function getDefaultReminders(): Reminder[] {
  return [
    {
      id: 'meal_log_breakfast',
      userId: '',
      type: 'meal_log',
      enabled: true,
      time: '08:00',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day
      title: 'Log Breakfast',
      body: 'Time to log your breakfast meal',
    },
    {
      id: 'meal_log_lunch',
      userId: '',
      type: 'meal_log',
      enabled: true,
      time: '13:00',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day
      title: 'Log Lunch',
      body: 'Time to log your lunch meal',
    },
    {
      id: 'meal_log_dinner',
      userId: '',
      type: 'meal_log',
      enabled: true,
      time: '20:00',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day
      title: 'Log Dinner',
      body: 'Time to log your dinner meal',
    },
    {
      id: 'water_reminder',
      userId: '',
      type: 'water',
      enabled: true,
      time: '10:00',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day (represents 2-hour intervals starting at 10am)
      title: 'Drink Water',
      body: 'Remember to stay hydrated',
    },
    {
      id: 'weight_check',
      userId: '',
      type: 'weight',
      enabled: true,
      time: '07:00',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day
      title: 'Log Weight',
      body: 'Time to record your weight',
    },
  ];
}

/**
 * Request notification permissions from the user
 * @returns Promise resolving to true if permissions granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Check if notifications are already enabled
 * @returns Promise resolving to the permission status
 */
export async function getNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted;
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return false;
  }
}

/**
 * Get all scheduled notifications
 * @returns Promise resolving to array of scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to get scheduled notifications:', error);
    return [];
  }
}
