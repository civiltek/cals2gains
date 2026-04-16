/**
 * Smart Notification Service — Cals2Gains
 *
 * Notificaciones inteligentes basadas en patrones de alimentación:
 *   - "Llevas 8h sin registrar comida, ¿necesitas ideas?"
 *   - "¡Has cumplido tus macros hoy!" (al final del día)
 *   - "Tienes 50g de proteína pendiente, es hora de la cena"
 *
 * Diseño:
 *   - Usa expo-notifications si está disponible; no-op si no lo está.
 *   - expo-notifications está instalado pero temporalmente sin FCM.
 *     Cuando se configure FCM, este servicio funcionará sin cambios.
 *   - Todas las notificaciones son locales (no requieren servidor).
 *
 * Uso:
 *   import { smartNotificationService } from './smartNotificationService';
 *
 *   // Al registrar una comida:
 *   await smartNotificationService.onMealLogged();
 *
 *   // Al abrir la app / actualizar nutrición del día:
 *   await smartNotificationService.checkDailyGoals(consumed, goals, language);
 *
 *   // Al inicializar la app:
 *   await smartNotificationService.scheduleHungerReminder();
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Tipos
// ============================================================================

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type NotifLanguage = 'es' | 'en';

// ============================================================================
// Constantes
// ============================================================================

const LAST_MEAL_KEY = '@cals2gains/last_meal_time';
const NOTIFS_ENABLED_KEY = '@cals2gains/notifs_enabled';
const GOAL_CELEBRATED_KEY = '@cals2gains/goal_celebrated_date';

const HUNGER_HOURS_THRESHOLD = 8; // horas sin registrar comida
const DINNER_HOUR = 19;            // a partir de esta hora = "cena"
const DINNER_PROTEIN_MIN = 50;     // g de proteína pendiente para notif cena

// ============================================================================
// Helpers: acceso seguro a expo-notifications
// ============================================================================

async function getNotifications() {
  try {
    // Import dinámico para no crashear si expo-notifications no está configurado
    const Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

async function areNotifsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFS_ENABLED_KEY);
    return raw !== 'false'; // enabled by default
  } catch {
    return false;
  }
}

async function requestPermissionsIfNeeded(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ============================================================================
// Textos de notificación (bilingüe)
// ============================================================================

const TEXTS = {
  hungerReminder: {
    es: {
      title: '¿Has comido algo? 🍽️',
      body: 'Llevas más de 8h sin registrar. ¿Necesitas ideas para una comida rápida?',
    },
    en: {
      title: 'Have you eaten? 🍽️',
      body: "It's been 8+ hours since your last log. Need some quick meal ideas?",
    },
  },
  goalMet: {
    es: {
      title: '¡Macros cumplidos! 🎉',
      body: '¡Lo has conseguido hoy! Tus macros del día están completados. ¡Sigue así!',
    },
    en: {
      title: 'Macros hit! 🎉',
      body: "You did it today! All your daily macros are complete. Keep it up!",
    },
  },
  dinnerProtein: {
    es: (g: number) => ({
      title: `Te faltan ${g}g de proteína 💪`,
      body: 'Es la hora de la cena. Te sugiero algo alto en proteínas para cerrar el día.',
    }),
    en: (g: number) => ({
      title: `${g}g of protein remaining 💪`,
      body: "It's dinner time. I suggest something high in protein to close out the day.",
    }),
  },
  adaptiveAdjust: {
    es: {
      title: 'Tu coach ha ajustado tus macros ⚙️',
      body: 'He actualizado tus objetivos según tu progreso. Toca para ver el motivo.',
    },
    en: {
      title: 'Your coach adjusted your macros ⚙️',
      body: "I've updated your targets based on your progress. Tap to see why.",
    },
  },
};

// ============================================================================
// Smart Notification Service
// ============================================================================

class SmartNotificationService {
  /**
   * Llama esto cada vez que el usuario registra una comida.
   * Actualiza el timestamp para el recordatorio de hambre.
   */
  async onMealLogged(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_MEAL_KEY, new Date().toISOString());
      // Cancelar el recordatorio de hambre pendiente (si existe)
      await this.cancelHungerReminder();
      // Reprogramar para dentro de 8 horas
      await this.scheduleHungerReminder();
    } catch {
      // No-op
    }
  }

  /**
   * Programa el recordatorio de hambre para dentro de HUNGER_HOURS_THRESHOLD horas.
   * Llama esto al abrir la app para recalibrar.
   */
  async scheduleHungerReminder(): Promise<void> {
    if (!(await areNotifsEnabled())) return;
    const hasPermission = await requestPermissionsIfNeeded();
    if (!hasPermission) return;

    const Notifications = await getNotifications();
    if (!Notifications) return;

    try {
      // Leer última comida
      const lastMealRaw = await AsyncStorage.getItem(LAST_MEAL_KEY);
      const lastMealTime = lastMealRaw ? new Date(lastMealRaw) : null;

      const now = new Date();
      let triggerDate: Date;

      if (lastMealTime) {
        const elapsed = (now.getTime() - lastMealTime.getTime()) / (1000 * 60 * 60);
        const remaining = HUNGER_HOURS_THRESHOLD - elapsed;

        if (remaining <= 0) {
          // Ya pasaron 8h, notificar de inmediato (diferido 5 min)
          triggerDate = new Date(now.getTime() + 5 * 60 * 1000);
        } else {
          triggerDate = new Date(now.getTime() + remaining * 60 * 60 * 1000);
        }
      } else {
        // Sin historial, programar para las próximas 8h desde ahora
        triggerDate = new Date(now.getTime() + HUNGER_HOURS_THRESHOLD * 60 * 60 * 1000);
      }

      // Cancelar anterior y programar nueva
      await this.cancelHungerReminder();

      await Notifications.scheduleNotificationAsync({
        identifier: 'hunger_reminder',
        content: {
          title: TEXTS.hungerReminder.es.title,
          body: TEXTS.hungerReminder.es.body,
          data: { type: 'hunger_reminder' },
        },
        trigger: { date: triggerDate } as any,
      });
    } catch (error) {
      if (__DEV__) console.warn('[SmartNotif] scheduleHungerReminder error:', error);
    }
  }

  /**
   * Cancela el recordatorio de hambre pendiente.
   */
  async cancelHungerReminder(): Promise<void> {
    const Notifications = await getNotifications();
    if (!Notifications) return;
    try {
      await Notifications.cancelScheduledNotificationAsync('hunger_reminder');
    } catch {
      // No-op si no existía
    }
  }

  /**
   * Verifica si el usuario ha cumplido sus macros del día y celebra.
   * Llama esto cada vez que se actualiza la nutrición del día.
   */
  async checkDailyGoals(
    consumed: DailyNutrition,
    goals: DailyGoals,
    language: NotifLanguage = 'es'
  ): Promise<void> {
    if (!(await areNotifsEnabled())) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const hour = now.getHours();

    // Solo comprobar después de las 18:00 para evitar falsos positivos a mediodía
    if (hour < 18) {
      // Pero sí verificar proteína pendiente a la hora de cenar
      if (hour >= DINNER_HOUR) {
        await this.checkDinnerProtein(consumed, goals, language);
      }
      return;
    }

    // Comprobar si ya celebramos hoy
    try {
      const celebrated = await AsyncStorage.getItem(GOAL_CELEBRATED_KEY);
      if (celebrated === todayStr) return; // Ya lo celebramos
    } catch {
      // Continuar
    }

    // ¿Macros cumplidos? (calorías ±5% y proteína ≥95%)
    const calOk =
      consumed.calories >= goals.calories * 0.9 &&
      consumed.calories <= goals.calories * 1.05;
    const proteinOk = consumed.protein >= goals.protein * 0.95;

    if (calOk && proteinOk) {
      await this.sendGoalCelebration(language);
      try {
        await AsyncStorage.setItem(GOAL_CELEBRATED_KEY, todayStr);
      } catch {
        // No-op
      }
    }
  }

  /**
   * Envía notificación de proteína pendiente si es hora de cenar.
   */
  private async checkDinnerProtein(
    consumed: DailyNutrition,
    goals: DailyGoals,
    language: NotifLanguage
  ): Promise<void> {
    const remainingProtein = Math.round(goals.protein - consumed.protein);
    if (remainingProtein < DINNER_PROTEIN_MIN) return;

    const hasPermission = await requestPermissionsIfNeeded();
    if (!hasPermission) return;

    const Notifications = await getNotifications();
    if (!Notifications) return;

    try {
      const texts =
        language === 'es'
          ? TEXTS.dinnerProtein.es(remainingProtein)
          : TEXTS.dinnerProtein.en(remainingProtein);

      await Notifications.scheduleNotificationAsync({
        identifier: 'dinner_protein',
        content: {
          title: texts.title,
          body: texts.body,
          data: { type: 'dinner_protein', remainingProtein },
        },
        trigger: null, // Inmediata
      });
    } catch (error) {
      if (__DEV__) console.warn('[SmartNotif] dinnerProtein error:', error);
    }
  }

  /**
   * Envía notificación cuando el usuario cumple sus macros del día.
   */
  private async sendGoalCelebration(language: NotifLanguage): Promise<void> {
    const hasPermission = await requestPermissionsIfNeeded();
    if (!hasPermission) return;

    const Notifications = await getNotifications();
    if (!Notifications) return;

    try {
      const texts = language === 'es' ? TEXTS.goalMet.es : TEXTS.goalMet.en;
      await Notifications.scheduleNotificationAsync({
        identifier: 'goal_met',
        content: {
          title: texts.title,
          body: texts.body,
          data: { type: 'goal_met' },
        },
        trigger: null, // Inmediata
      });
    } catch (error) {
      if (__DEV__) console.warn('[SmartNotif] goalCelebration error:', error);
    }
  }

  /**
   * Notifica al usuario que el coach adaptativo ha ajustado sus macros.
   * Llamar desde adaptiveCoachBridge después de persistir el mensaje.
   */
  async notifyAdaptiveAdjustment(language: NotifLanguage = 'es'): Promise<void> {
    if (!(await areNotifsEnabled())) return;
    const hasPermission = await requestPermissionsIfNeeded();
    if (!hasPermission) return;

    const Notifications = await getNotifications();
    if (!Notifications) return;

    try {
      const texts =
        language === 'es' ? TEXTS.adaptiveAdjust.es : TEXTS.adaptiveAdjust.en;
      await Notifications.scheduleNotificationAsync({
        identifier: 'adaptive_adjust',
        content: {
          title: texts.title,
          body: texts.body,
          data: { type: 'adaptive_adjust' },
        },
        trigger: null,
      });
    } catch (error) {
      if (__DEV__) console.warn('[SmartNotif] adaptiveAdjust error:', error);
    }
  }

  /**
   * Activa o desactiva las notificaciones inteligentes.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(NOTIFS_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      await this.cancelHungerReminder();
    }
  }

  /**
   * Devuelve si las notificaciones están activas.
   */
  async isEnabled(): Promise<boolean> {
    return areNotifsEnabled();
  }
}

export const smartNotificationService = new SmartNotificationService();
export default smartNotificationService;
