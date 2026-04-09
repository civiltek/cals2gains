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

// ============================================
// HEALTH SERVICE (Platform-agnostic interface)
// ============================================

class HealthService {
  private isAvailable: boolean = false;
  private isAuthorized: boolean = false;

  /**
   * Check if health data is available on this device
   */
  async checkAvailability(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // HealthKit is available on all iPhones
        this.isAvailable = true;
      } else if (Platform.OS === 'android') {
        // Health Connect requires Android 14+ or the app installed
        this.isAvailable = true;
      }
      return this.isAvailable;
    } catch {
      return false;
    }
  }

  /**
   * Request authorization to read health data
   * Returns true if user granted permissions
   */
  async requestAuthorization(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // Request HealthKit permissions
        // Types: steps, active energy, resting energy, workouts, weight, heart rate
        // Note: actual HealthKit integration requires react-native-health package
        // This is the interface - native module will be linked at build time
        const AppleHealthKit = await getAppleHealthKit();
        if (!AppleHealthKit) return false;

        const permissions = {
          permissions: {
            read: [
              'StepCount',
              'ActiveEnergyBurned',
              'BasalEnergyBurned',
              'Workout',
              'Weight',
              'HeartRate',
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
        // Android Health Connect
        const HealthConnect = await getHealthConnect();
        if (!HealthConnect) return false;

        const granted = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'BasalMetabolicRate' },
          { accessType: 'read', recordType: 'ExerciseSession' },
          { accessType: 'read', recordType: 'Weight' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'write', recordType: 'Weight' },
        ]);

        this.isAuthorized = granted.length > 0;
        return this.isAuthorized;
      }
    } catch (error) {
      console.error('Health authorization error:', error);
      return false;
    }
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
    const HealthConnect = await getHealthConnect();
    if (!HealthConnect) {
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