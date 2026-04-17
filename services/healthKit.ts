// ============================================
// Cals2Gains - Apple Health / Google Fit Integration
// ============================================
// Provides wearable sync: steps, active energy, workouts, weight
// Uses expo-health-connect for Android (Google Health Connect)
// Uses react-native-health for iOS (HealthKit)

import { Platform } from 'react-native';

// ============================================
// TYPES
// ============================================

export interface HealthData {
  steps: number;
  activeCalories: number; // kcal burned from activity
  restingCalories: number; // BMR/resting energy
  totalCalories: number;
  exerciseMinutes: number;
  heartRate?: number; // latest BPM
  weight?: number; // kg, latest
  lastSynced: Date;
}

export interface WorkoutSummary {
  type: string;
  duration: number; // minutes
  calories: number;
  date: Date;
}

export interface BodyCompositionData {
  bodyFatPercent: number | null;
  leanBodyMass: number | null; // kg
  weight: number | null; // kg
  bmr: number | null; // kcal/day
  measuredAt: Date;
}

// ============================================
// HEALTH SERVICE (Platform-agnostic interface)
// ============================================

// Health Connect SDK status constants (from react-native-health-connect)
const SDK_AVAILABLE = 3;

class HealthService {
  private isAvailable: boolean = false;
  private isAuthorized: boolean = false;
  private isInitialized: boolean = false;

  /**
   * Check if health data is available on this device.
   * On iOS calls AppleHealthKit.isAvailable() (wraps HKHealthStore.isHealthDataAvailable()).
   * On Android checks Health Connect SDK status.
   */
  async checkAvailability(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const AppleHealthKit = await getAppleHealthKit();
        if (!AppleHealthKit) {
          this.isAvailable = false;
          return false;
        }
        // react-native-health exposes isAvailable() which calls
        // HKHealthStore.isHealthDataAvailable() under the hood.
        const available: boolean = await new Promise((resolve) => {
          if (typeof AppleHealthKit.isAvailable === 'function') {
            AppleHealthKit.isAvailable((err: any, result: boolean) => {
              resolve(err ? false : !!result);
            });
          } else {
            // Fallback: HealthKit is available on all iPhones running iOS 8+
            resolve(true);
          }
        });
        this.isAvailable = available;
      } else if (Platform.OS === 'android') {
        // Health Connect requires Android 14+ or the Health Connect APK installed.
        // getSdkStatus returns 3 = SDK_AVAILABLE, 2 = UPDATE_REQUIRED, 1 = UNAVAILABLE
        const HealthConnect = await getHealthConnect();
        if (!HealthConnect) {
          this.isAvailable = false;
          return false;
        }
        try {
          const status = await HealthConnect.getSdkStatus();
          this.isAvailable = status === SDK_AVAILABLE;
        } catch {
          this.isAvailable = false;
        }
      }
      return this.isAvailable;
    } catch {
      return false;
    }
  }

  /**
   * Ensure Health Connect SDK is initialized (Android only). Idempotent.
   */
  private async ensureAndroidInitialized(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (this.isInitialized) return true;

    const HealthConnect = await getHealthConnect();
    if (!HealthConnect) return false;

    try {
      const status = await HealthConnect.getSdkStatus();
      if (status !== SDK_AVAILABLE) {
        console.warn('[HealthService] Health Connect not available, sdkStatus:', status);
        return false;
      }
      const ok = await HealthConnect.initialize();
      this.isInitialized = !!ok;
      return this.isInitialized;
    } catch (error) {
      console.error('[HealthService] initialize error:', error);
      return false;
    }
  }

  /**
   * Request authorization to read health data.
   * On iOS: checks isHealthDataAvailable() first (Apple requirement),
   * then calls initHealthKit which triggers the system permission dialog.
   * Returns true if user granted permissions.
   */
  async requestAuthorization(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const AppleHealthKit = await getAppleHealthKit();
        if (!AppleHealthKit) return false;

        // Apple docs: you MUST call isHealthDataAvailable() before requesting
        // authorization. If HealthKit is not available, do not attempt to use it.
        const available = await this.checkAvailability();
        if (!available) {
          console.warn('[HealthService] HealthKit not available on this device');
          return false;
        }

        const permissions = {
          permissions: {
            read: [
              'StepCount',
              'ActiveEnergyBurned',
              'BasalEnergyBurned',
              'Workout',
              'Weight',
              'HeartRate',
              'BodyFatPercentage',
              'LeanBodyMass',
            ],
            write: ['Weight'],
          },
        };

        return new Promise((resolve) => {
          AppleHealthKit.initHealthKit(permissions, (err: any) => {
            if (err) {
              console.error('HealthKit auth error:', err);
              resolve(false);
            } else {
              this.isAuthorized = true;
              resolve(true);
            }
          });
        });
      } else {
        // Android Health Connect — MUST initialize before requestPermission,
        // otherwise the call fails silently on testers' devices.
        const ready = await this.ensureAndroidInitialized();
        if (!ready) return false;

        const HealthConnect = await getHealthConnect();
        if (!HealthConnect) return false;

        const granted = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'BasalMetabolicRate' },
          { accessType: 'read', recordType: 'ExerciseSession' },
          { accessType: 'read', recordType: 'Weight' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'BodyFat' },
          { accessType: 'read', recordType: 'LeanBodyMass' },
          { accessType: 'write', recordType: 'Weight' },
        ]);

        this.isAuthorized = Array.isArray(granted) && granted.length > 0;
        return this.isAuthorized;
      }
    } catch (error) {
      console.error('Health authorization error:', error);
      return false;
    }
  }

  // Deprecated no-op. Antes hacía un initHealthKit(StepCount) en boot para
  // registrar la app en Ajustes>Salud, pero Apple recomienda petición bajo
  // demanda y el prime podía contaminar el estado de permisos. Se mantiene
  // como stub para no romper callers.
  async primeHealthKitRegistration(): Promise<void> {
    return;
  }

  /**
   * Get today's health summary
   */
  async getTodaySummary(): Promise<HealthData | null> {
    if (!this.isAuthorized) return null;

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const now = new Date();

      if (Platform.OS === 'ios') {
        return await this.getIOSSummary(startOfDay, now);
      } else {
        return await this.getAndroidSummary(startOfDay, now);
      }
    } catch (error) {
      console.error('Health data fetch error:', error);
      return null;
    }
  }

  /**
   * Write weight to health platform
   */
  async saveWeight(weightKg: number): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const AppleHealthKit = await getAppleHealthKit();
        if (!AppleHealthKit) return false;

        return new Promise((resolve) => {
          AppleHealthKit.saveWeight(
            { value: weightKg * 2.20462 }, // Convert kg to lbs (HealthKit default)
            (err: any) => resolve(!err)
          );
        });
      } else {
        const ready = await this.ensureAndroidInitialized();
        if (!ready) return false;

        const HealthConnect = await getHealthConnect();
        if (!HealthConnect) return false;

        await HealthConnect.insertRecords([
          {
            recordType: 'Weight',
            weight: { inKilograms: weightKg },
            time: new Date().toISOString(),
          },
        ]);
        return true;
      }
    } catch {
      return false;
    }
  }

  /** Whether the user has granted health permissions in this session */
  getIsAuthorized(): boolean {
    return this.isAuthorized;
  }

  /**
   * Request body composition permissions specifically (can be called without full health setup).
   * Useful for the InBody import flow when the user hasn't enabled full health sync.
   */
  async requestBodyCompositionPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const AppleHealthKit = await getAppleHealthKit();
        if (!AppleHealthKit) return false;
        const available = await this.checkAvailability();
        if (!available) return false;
        return new Promise((resolve) => {
          AppleHealthKit.initHealthKit(
            {
              permissions: {
                read: ['BodyFatPercentage', 'LeanBodyMass', 'Weight', 'BasalEnergyBurned'],
                write: [],
              },
            },
            (err: any) => {
              if (!err) this.isAuthorized = true;
              resolve(!err);
            }
          );
        });
      } else {
        const ready = await this.ensureAndroidInitialized();
        if (!ready) return false;
        const HealthConnect = await getHealthConnect();
        if (!HealthConnect) return false;
        const granted = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'BodyFat' },
          { accessType: 'read', recordType: 'LeanBodyMass' },
          { accessType: 'read', recordType: 'Weight' },
          { accessType: 'read', recordType: 'BasalMetabolicRate' },
        ]);
        const ok = Array.isArray(granted) && granted.length > 0;
        if (ok) this.isAuthorized = true;
        return ok;
      }
    } catch {
      return false;
    }
  }

  /**
   * Read the most recent body composition measurement from HealthKit / Health Connect.
   * Returns null if no data is available or permissions not granted.
   * Reads: body fat %, lean body mass, weight, BMR.
   * InBody writes these when the user syncs via the InBody app.
   */
  async getBodyComposition(): Promise<BodyCompositionData | null> {
    try {
      if (Platform.OS === 'ios') {
        return await this.getIOSBodyComposition();
      } else {
        return await this.getAndroidBodyComposition();
      }
    } catch {
      return null;
    }
  }

  private async getIOSBodyComposition(): Promise<BodyCompositionData | null> {
    const AppleHealthKit = await getAppleHealthKit();
    if (!AppleHealthKit) return null;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const opts = { startDate: oneYearAgo.toISOString(), limit: 1, ascending: false };

    const readSample = (method: string): Promise<number | null> =>
      new Promise((resolve) => {
        if (typeof AppleHealthKit[method] !== 'function') return resolve(null);
        AppleHealthKit[method](opts, (err: any, results: any[]) => {
          if (err || !results || results.length === 0) return resolve(null);
          resolve(results[0]?.value ?? null);
        });
      });

    const [bodyFatRaw, leanBodyMassKg, weightLbs, bmrKcal] = await Promise.all([
      readSample('getBodyFatPercentageSamples'),
      readSample('getLeanBodyMassSamples'),
      readSample('getWeightSamples'),
      readSample('getBasalEnergyBurned'),
    ]);

    // HealthKit returns body fat as 0–1 (fraction) or 0–100 depending on SDK version
    const bodyFatPercent = bodyFatRaw !== null
      ? (bodyFatRaw <= 1 ? bodyFatRaw * 100 : bodyFatRaw)
      : null;

    // HealthKit weight is in lbs by default (from saveWeight we convert kg→lbs)
    const weightKg = weightLbs !== null ? weightLbs / 2.20462 : null;

    if (bodyFatPercent === null && leanBodyMassKg === null) return null;

    return {
      bodyFatPercent: bodyFatPercent !== null ? Math.round(bodyFatPercent * 10) / 10 : null,
      leanBodyMass: leanBodyMassKg !== null ? Math.round(leanBodyMassKg * 10) / 10 : null,
      weight: weightKg !== null ? Math.round(weightKg * 10) / 10 : null,
      bmr: bmrKcal !== null ? Math.round(bmrKcal) : null,
      measuredAt: new Date(),
    };
  }

  private async getAndroidBodyComposition(): Promise<BodyCompositionData | null> {
    const ready = await this.ensureAndroidInitialized();
    if (!ready) return null;
    const HealthConnect = await getHealthConnect();
    if (!HealthConnect) return null;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const timeFilter = {
      timeRangeFilter: {
        operator: 'between' as const,
        startTime: oneYearAgo.toISOString(),
        endTime: new Date().toISOString(),
      },
    };

    const readLatest = async (recordType: string): Promise<any | null> => {
      try {
        const res = await HealthConnect.readRecords(recordType, timeFilter);
        const records = res?.records ?? [];
        if (records.length === 0) return null;
        // Sort desc by time and take the last one
        return records.sort((a: any, b: any) =>
          new Date(b.time ?? b.startTime).getTime() - new Date(a.time ?? a.startTime).getTime()
        )[0];
      } catch {
        return null;
      }
    };

    const [fatRecord, leanRecord, weightRecord, bmrRecord] = await Promise.all([
      readLatest('BodyFat'),
      readLatest('LeanBodyMass'),
      readLatest('Weight'),
      readLatest('BasalMetabolicRate'),
    ]);

    const bodyFatPercent = fatRecord?.percentage ?? null;
    const leanBodyMass = leanRecord?.mass?.inKilograms ?? null;

    if (bodyFatPercent === null && leanBodyMass === null) return null;

    return {
      bodyFatPercent: bodyFatPercent !== null ? Math.round(bodyFatPercent * 10) / 10 : null,
      leanBodyMass: leanBodyMass !== null ? Math.round(leanBodyMass * 10) / 10 : null,
      weight: weightRecord?.weight?.inKilograms
        ? Math.round(weightRecord.weight.inKilograms * 10) / 10
        : null,
      bmr: bmrRecord?.basalMetabolicRate?.inKilocaloriesPerDay
        ? Math.round(bmrRecord.basalMetabolicRate.inKilocaloriesPerDay)
        : null,
      measuredAt: new Date(),
    };
  }

  /**
   * Fetch average active calories per day over the last `days` days.
   * Returns { avgCalories, daysWithData } so callers can decide whether
   * the sample is large enough to trust.
   */
  async get7DayCalorieAverage(days: number = 7): Promise<{ avgCalories: number; daysWithData: number }> {
    if (!this.isAuthorized) return { avgCalories: 0, daysWithData: 0 };

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      if (Platform.OS === 'ios') {
        return await this.getIOS7DayCalorieAverage(startDate, endDate, days);
      } else {
        return await this.getAndroid7DayCalorieAverage(startDate, endDate, days);
      }
    } catch {
      return { avgCalories: 0, daysWithData: 0 };
    }
  }

  /**
   * Get recent workouts
   */
  async getRecentWorkouts(days: number = 7): Promise<WorkoutSummary[]> {
    if (!this.isAuthorized) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      if (Platform.OS === 'ios') {
        const AppleHealthKit = await getAppleHealthKit();
        if (!AppleHealthKit) return [];

        return new Promise((resolve) => {
          AppleHealthKit.getSamples(
            {
              typeIdentifier: 'HKWorkoutTypeIdentifier',
              startDate: startDate.toISOString(),
              endDate: new Date().toISOString(),
            },
            (err: any, results: any[]) => {
              if (err || !results) return resolve([]);
              resolve(
                results.map((w) => ({
                  type: w.activityName || 'Workout',
                  duration: (w.duration || 0) / 60, // seconds to minutes
                  calories: w.calories || 0,
                  date: new Date(w.startDate),
                }))
              );
            }
          );
        });
      } else {
        const ready = await this.ensureAndroidInitialized();
        if (!ready) return [];

        const HealthConnect = await getHealthConnect();
        if (!HealthConnect) return [];

        const sessions = await HealthConnect.readRecords('ExerciseSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: new Date().toISOString(),
          },
        });

        return (sessions.records || []).map((s: any) => ({
          type: s.exerciseType || 'Workout',
          duration: s.endTime && s.startTime
            ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000
            : 0,
          calories: s.energy?.inKilocalories || 0,
          date: new Date(s.startTime),
        }));
      }
    } catch {
      return [];
    }
  }

  // ============================================
  // PRIVATE PLATFORM-SPECIFIC METHODS
  // ============================================

  private async getIOS7DayCalorieAverage(
    start: Date,
    end: Date,
    days: number
  ): Promise<{ avgCalories: number; daysWithData: number }> {
    const AppleHealthKit = await getAppleHealthKit();
    if (!AppleHealthKit) return { avgCalories: 0, daysWithData: 0 };

    return new Promise((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(
        { startDate: start.toISOString(), endDate: end.toISOString() },
        (err: any, results: any[]) => {
          if (err || !results || results.length === 0) {
            return resolve({ avgCalories: 0, daysWithData: 0 });
          }

          // Group by day and sum
          const byDay: Record<string, number> = {};
          results.forEach((r) => {
            const day = new Date(r.startDate || r.startDate).toISOString().split('T')[0];
            byDay[day] = (byDay[day] ?? 0) + (r.value || 0);
          });

          const daysWithData = Object.keys(byDay).length;
          const total = Object.values(byDay).reduce((s, v) => s + v, 0);
          resolve({
            avgCalories: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
            daysWithData,
          });
        }
      );
    });
  }

  private async getAndroid7DayCalorieAverage(
    start: Date,
    end: Date,
    days: number
  ): Promise<{ avgCalories: number; daysWithData: number }> {
    const ready = await this.ensureAndroidInitialized();
    if (!ready) return { avgCalories: 0, daysWithData: 0 };

    const HealthConnect = await getHealthConnect();
    if (!HealthConnect) return { avgCalories: 0, daysWithData: 0 };

    const caloriesData = await HealthConnect.readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: {
        operator: 'between' as const,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    const records = caloriesData.records || [];
    if (records.length === 0) return { avgCalories: 0, daysWithData: 0 };

    // Group by day
    const byDay: Record<string, number> = {};
    records.forEach((r: any) => {
      const day = new Date(r.startTime || r.time).toISOString().split('T')[0];
      byDay[day] = (byDay[day] ?? 0) + (r.energy?.inKilocalories || 0);
    });

    const daysWithData = Object.keys(byDay).length;
    const total = Object.values(byDay).reduce((s, v) => s + v, 0);
    return {
      avgCalories: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
      daysWithData,
    };
  }

  private async getIOSSummary(start: Date, end: Date): Promise<HealthData> {
    const AppleHealthKit = await getAppleHealthKit();

    const getSteps = (): Promise<number> =>
      new Promise((resolve) => {
        AppleHealthKit?.getStepCount(
          { startDate: start.toISOString(), endDate: end.toISOString() },
          (err: any, result: any) => resolve(err ? 0 : result?.value || 0)
        );
      });

    const getActiveCalories = (): Promise<number> =>
      new Promise((resolve) => {
        AppleHealthKit?.getActiveEnergyBurned(
          { startDate: start.toISOString(), endDate: end.toISOString() },
          (err: any, results: any[]) => {
            if (err || !results) return resolve(0);
            resolve(results.reduce((sum, r) => sum + (r.value || 0), 0));
          }
        );
      });

    const getRestingCalories = (): Promise<number> =>
      new Promise((resolve) => {
        AppleHealthKit?.getBasalEnergyBurned(
          { startDate: start.toISOString(), endDate: end.toISOString() },
          (err: any, results: any[]) => {
            if (err || !results) return resolve(0);
            resolve(results.reduce((sum, r) => sum + (r.value || 0), 0));
          }
        );
      });

    const [steps, activeCalories, restingCalories] = await Promise.all([
      getSteps(),
      getActiveCalories(),
      getRestingCalories(),
    ]);

    return {
      steps: Math.round(steps),
      activeCalories: Math.round(activeCalories),
      restingCalories: Math.round(restingCalories),
      totalCalories: Math.round(activeCalories + restingCalories),
      exerciseMinutes: Math.round(activeCalories / 8), // rough estimate
      lastSynced: new Date(),
    };
  }

  private async getAndroidSummary(start: Date, end: Date): Promise<HealthData> {
    const ready = await this.ensureAndroidInitialized();
    const HealthConnect = await getHealthConnect();
    if (!ready || !HealthConnect) {
      return {
        steps: 0, activeCalories: 0, restingCalories: 0,
        totalCalories: 0, exerciseMinutes: 0, lastSynced: new Date(),
      };
    }

    const timeFilter = {
      timeRangeFilter: {
        operator: 'between' as const,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    };

    try {
      const [stepsData, caloriesData] = await Promise.all([
        HealthConnect.readRecords('Steps', timeFilter),
        HealthConnect.readRecords('ActiveCaloriesBurned', timeFilter),
      ]);

      const steps = (stepsData.records || []).reduce(
        (sum: number, r: any) => sum + (r.count || 0), 0
      );
      const activeCalories = (caloriesData.records || []).reduce(
        (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0
      );

      return {
        steps: Math.round(steps),
        activeCalories: Math.round(activeCalories),
        restingCalories: 0,
        totalCalories: Math.round(activeCalories),
        exerciseMinutes: Math.round(activeCalories / 8),
        lastSynced: new Date(),
      };
    } catch {
      return {
        steps: 0, activeCalories: 0, restingCalories: 0,
        totalCalories: 0, exerciseMinutes: 0, lastSynced: new Date(),
      };
    }
  }
}

// ============================================
// LAZY MODULE LOADING (to avoid crash if not installed)
// ============================================

async function getAppleHealthKit(): Promise<any | null> {
  try {
    const mod = require('react-native-health');
    return mod.default || mod;
  } catch {
    console.warn('react-native-health not available');
    return null;
  }
}

async function getHealthConnect(): Promise<any | null> {
  try {
    const mod = require('react-native-health-connect');
    return mod;
  } catch {
    console.warn('react-native-health-connect not available');
    return null;
  }
}

// Singleton instance
export const healthService = new HealthService();
