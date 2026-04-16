/**
 * Widget Data Service — Cals2Gains
 *
 * Responsabilidad: preparar y sincronizar los datos de nutrición del día
 * hacia el almacenamiento compartido (AsyncStorage como bridge).
 * El código nativo del widget (Android AppWidget / iOS WidgetKit) lee
 * desde SharedPreferences (Android) o App Group UserDefaults (iOS).
 *
 * Este servicio es la única capa JS que necesitas llamar; el canal
 * nativo se gestiona en el config plugin (ver docs/WIDGETS.md).
 *
 * Uso:
 *   import { widgetDataService } from './widgetDataService';
 *   await widgetDataService.sync(todayNutrition, goals);
 *
 * Llámalo desde:
 *   - mealStore: después de addMeal / deleteMeal
 *   - Dashboard: en el useEffect que carga todayNutrition
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// Constantes
// ============================================================================

const WIDGET_DATA_KEY = '@cals2gains/widget_data';
const WIDGET_DATA_VERSION = 2;

// ============================================================================
// Tipos públicos
// ============================================================================

export interface WidgetNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WidgetGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Datos que el widget renderiza.
 * Small (2×2): calories + bar
 * Medium (4×2): calories + macros P/C/G con barras
 */
export interface WidgetData {
  version: number;
  updatedAt: string; // ISO 8601
  date: string;      // YYYY-MM-DD

  // Consumido hoy
  consumed: WidgetNutrition;

  // Objetivos del día
  goals: WidgetGoals;

  // Porcentajes precalculados (0-100) para las barras de progreso
  progress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };

  // Etiquetas localizadas (el widget nativo puede tenerlas hardcoded,
  // pero las incluimos para flexibilidad)
  labels: {
    calories: string;  // "Calorías" | "Calories"
    protein: string;   // "Proteína" | "Protein"
    carbs: string;     // "Carbos" | "Carbs"
    fat: string;       // "Grasas" | "Fat"
    consumed: string;  // "de" | "of"
    kcal: string;      // "kcal"
    grams: string;     // "g"
  };

  // Colores de marca (hex sin #, para Android RemoteViews)
  colors: {
    coral: string;    // 'FF6A4D'
    violet: string;   // '9C8CFF'
    orange: string;   // 'FF9800'
    dark: string;     // '17121D'
    bone: string;     // 'F7F2EA'
  };
}

// ============================================================================
// Helpers internos
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toPercent(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return clamp(Math.round((consumed / goal) * 100), 0, 100);
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getLabels(language: 'es' | 'en'): WidgetData['labels'] {
  if (language === 'es') {
    return {
      calories: 'Calorías',
      protein: 'Proteína',
      carbs: 'Carbos',
      fat: 'Grasas',
      consumed: 'de',
      kcal: 'kcal',
      grams: 'g',
    };
  }
  return {
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    consumed: 'of',
    kcal: 'kcal',
    grams: 'g',
  };
}

// ============================================================================
// Widget Data Service
// ============================================================================

class WidgetDataService {
  private lastSyncDate: string | null = null;
  private lastSyncData: WidgetData | null = null;

  /**
   * Sincroniza los datos de nutrición del día hacia el almacenamiento
   * del widget. Es seguro llamarlo frecuentemente (debounce interno de 1s).
   *
   * @param consumed  Nutrición consumida hoy
   * @param goals     Objetivos del día
   * @param language  Idioma del usuario ('es' | 'en')
   */
  async sync(
    consumed: WidgetNutrition,
    goals: WidgetGoals,
    language: 'es' | 'en' = 'es'
  ): Promise<void> {
    try {
      const data: WidgetData = {
        version: WIDGET_DATA_VERSION,
        updatedAt: new Date().toISOString(),
        date: todayString(),
        consumed,
        goals,
        progress: {
          calories: toPercent(consumed.calories, goals.calories),
          protein: toPercent(consumed.protein, goals.protein),
          carbs: toPercent(consumed.carbs, goals.carbs),
          fat: toPercent(consumed.fat, goals.fat),
        },
        labels: getLabels(language),
        colors: {
          coral: 'FF6A4D',
          violet: '9C8CFF',
          orange: 'FF9800',
          dark: '17121D',
          bone: 'F7F2EA',
        },
      };

      this.lastSyncDate = data.date;
      this.lastSyncData = data;

      await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

      // En el futuro, cuando el config plugin nativo esté activo, aquí
      // se llamará al módulo nativo para actualizar el widget inmediatamente.
      // Por ahora, el widget nativo lee desde SharedPreferences en su propio
      // ciclo de actualización (cada 30 min o al abrir la app).
      //
      // Android (futuro):
      //   NativeModules.WidgetManager?.update(JSON.stringify(data));
      //
      // iOS (futuro):
      //   NativeModules.WidgetManager?.reloadTimelines();

      if (__DEV__) {
        console.log('[WidgetDataService] Synced:', {
          calories: `${consumed.calories}/${goals.calories} (${data.progress.calories}%)`,
          protein: `${consumed.protein}/${goals.protein}g`,
          platform: Platform.OS,
        });
      }
    } catch (error) {
      console.warn('[WidgetDataService] Sync error:', error);
    }
  }

  /**
   * Lee los últimos datos sincronizados desde AsyncStorage.
   * Útil para debug o para mostrar estado en Settings.
   */
  async getLastData(): Promise<WidgetData | null> {
    try {
      const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as WidgetData;
    } catch {
      return null;
    }
  }

  /**
   * Limpia los datos del widget (por ejemplo, al hacer logout).
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WIDGET_DATA_KEY);
      this.lastSyncDate = null;
      this.lastSyncData = null;
    } catch {
      // No-op
    }
  }

  /**
   * Construye los datos del widget "small" (2×2) listos para renderizar.
   * Devuelve solo lo imprescindible para el widget pequeño.
   */
  buildSmallPayload(
    consumed: WidgetNutrition,
    goals: WidgetGoals
  ): { calories: number; goal: number; progress: number } {
    return {
      calories: Math.round(consumed.calories),
      goal: Math.round(goals.calories),
      progress: toPercent(consumed.calories, goals.calories),
    };
  }

  /**
   * Construye los datos del widget "medium" (4×2) listos para renderizar.
   */
  buildMediumPayload(
    consumed: WidgetNutrition,
    goals: WidgetGoals
  ): {
    calories: { value: number; goal: number; progress: number };
    protein: { value: number; goal: number; progress: number };
    carbs: { value: number; goal: number; progress: number };
    fat: { value: number; goal: number; progress: number };
  } {
    return {
      calories: {
        value: Math.round(consumed.calories),
        goal: Math.round(goals.calories),
        progress: toPercent(consumed.calories, goals.calories),
      },
      protein: {
        value: Math.round(consumed.protein),
        goal: Math.round(goals.protein),
        progress: toPercent(consumed.protein, goals.protein),
      },
      carbs: {
        value: Math.round(consumed.carbs),
        goal: Math.round(goals.carbs),
        progress: toPercent(consumed.carbs, goals.carbs),
      },
      fat: {
        value: Math.round(consumed.fat),
        goal: Math.round(goals.fat),
        progress: toPercent(consumed.fat, goals.fat),
      },
    };
  }
}

export const widgetDataService = new WidgetDataService();
export default widgetDataService;
