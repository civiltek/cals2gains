// ============================================
// Cals2Gains - InBody Integration Service
// ============================================
// Connects to InBody API for advanced body composition analysis
// InBody devices measure: body fat %, muscle mass, water %, BMI, visceral fat
// Uses InBody API v2 for data retrieval

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export interface InBodyMeasurement {
  date: Date;
  weight: number; // kg
  bodyFatPercent: number; // %
  bodyFatMass: number; // kg
  skeletalMuscleMass: number; // kg
  totalBodyWater: number; // L
  waterPercent: number; // %
  bmi: number;
  visceralFatLevel: number; // 1-20
  basalMetabolicRate: number; // kcal/day
  segmentalLeanMass?: {
    rightArm: number;
    leftArm: number;
    trunk: number;
    rightLeg: number;
    leftLeg: number;
  };
  bodyCompositionScore?: number; // 0-100
}

export interface InBodyProfile {
  userId: string;
  name: string;
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  lastMeasurement: Date | null;
  measurementCount: number;
}

export interface InBodyConnectionStatus {
  connected: boolean;
  profile: InBodyProfile | null;
  lastSync: Date | null;
}

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  INBODY_TOKEN: '@c2g_inbody_token',
  INBODY_USER_ID: '@c2g_inbody_user_id',
  INBODY_MEASUREMENTS: '@c2g_inbody_measurements',
  INBODY_PROFILE: '@c2g_inbody_profile',
};

// ============================================
// InBody API CONFIG
// ============================================

const INBODY_API_BASE = 'https://api.inbody.com/v2';

// ============================================
// INBODY SERVICE CLASS
// ============================================

class InBodyService {
  private token: string | null = null;
  private userId: string | null = null;
  private cachedMeasurements: InBodyMeasurement[] = [];

  /**
   * Initialize service - load saved credentials
   */
  async initialize(): Promise<void> {
    try {
      this.token = await AsyncStorage.getItem(STORAGE_KEYS.INBODY_TOKEN);
      this.userId = await AsyncStorage.getItem(STORAGE_KEYS.INBODY_USER_ID);

      const savedMeasurements = await AsyncStorage.getItem(STORAGE_KEYS.INBODY_MEASUREMENTS);
      if (savedMeasurements) {
        this.cachedMeasurements = JSON.parse(savedMeasurements).map((m: any) => ({
          ...m,
          date: new Date(m.date),
        }));
      }
    } catch (error) {
      console.error('InBody initialization error:', error);
    }
  }

  /**
   * Check if connected to InBody
   */
  isConnected(): boolean {
    return !!this.token && !!this.userId;
  }

  /**
   * Get connection status
   */
  async getStatus(): Promise<InBodyConnectionStatus> {
    const savedProfile = await AsyncStorage.getItem(STORAGE_KEYS.INBODY_PROFILE);

    return {
      connected: this.isConnected(),
      profile: savedProfile ? JSON.parse(savedProfile) : null,
      lastSync: this.cachedMeasurements.length > 0
        ? this.cachedMeasurements[0].date
        : null,
    };
  }

  /**
   * Authenticate with InBody account
   * In production: uses OAuth2 flow via InBody's partner portal
   * Returns URL to open in WebView for user authentication
   */
  async generateAuthUrl(): Promise<string> {
    const clientId = process.env.EXPO_PUBLIC_INBODY_CLIENT_ID || '';
    const redirectUri = 'cals2gains://inbody-callback';

    return `${INBODY_API_BASE}/oauth/authorize?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=measurements profile` +
      `&lang=es`;
  }

  /**
   * Handle OAuth callback - exchange code for token
   */
  async handleAuthCallback(authCode: string): Promise<boolean> {
    try {
      const response = await fetch(`${INBODY_API_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: authCode,
          client_id: process.env.EXPO_PUBLIC_INBODY_CLIENT_ID || '',
          client_secret: process.env.EXPO_PUBLIC_INBODY_CLIENT_SECRET || '',
          redirect_uri: 'cals2gains://inbody-callback',
        }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.token = data.access_token;
      this.userId = data.user_id;

      await AsyncStorage.setItem(STORAGE_KEYS.INBODY_TOKEN, this.token!);
      await AsyncStorage.setItem(STORAGE_KEYS.INBODY_USER_ID, this.userId!);

      // Fetch profile and initial measurements
      await this.fetchProfile();
      await this.syncMeasurements();

      return true;
    } catch (error) {
      console.error('InBody auth callback error:', error);
      return false;
    }
  }

  /** Returns true if there is at least one stored measurement (manual or synced). */
  hasData(): boolean {
    return this.cachedMeasurements.length > 0;
  }

  /** Most recent measurement, or null. */
  getLastMeasurement(): InBodyMeasurement | null {
    return this.cachedMeasurements.length > 0 ? this.cachedMeasurements[0] : null;
  }

  /**
   * Save a manually entered InBody measurement.
   * Only bodyFatPercent and skeletalMuscleMass are required;
   * the rest default to 0 and can be filled in later.
   */
  async saveManualMeasurement(data: {
    bodyFatPercent: number;
    skeletalMuscleMass: number;
    waterPercent?: number;
    visceralFatLevel?: number;
    weight?: number;
  }): Promise<void> {
    const measurement: InBodyMeasurement = {
      date: new Date(),
      weight: data.weight ?? 0,
      bodyFatPercent: data.bodyFatPercent,
      bodyFatMass: 0,
      skeletalMuscleMass: data.skeletalMuscleMass,
      totalBodyWater: 0,
      waterPercent: data.waterPercent ?? 0,
      bmi: 0,
      visceralFatLevel: data.visceralFatLevel ?? 0,
      basalMetabolicRate: 0,
    };
    this.cachedMeasurements = [measurement, ...this.cachedMeasurements];
    await AsyncStorage.setItem(
      STORAGE_KEYS.INBODY_MEASUREMENTS,
      JSON.stringify(this.cachedMeasurements)
    );
  }

  /**
   * Disconnect from InBody
   */
  async disconnect(): Promise<void> {
    this.token = null;
    this.userId = null;
    this.cachedMeasurements = [];

    await AsyncStorage.multiRemove([
      STORAGE_KEYS.INBODY_TOKEN,
      STORAGE_KEYS.INBODY_USER_ID,
      STORAGE_KEYS.INBODY_MEASUREMENTS,
      STORAGE_KEYS.INBODY_PROFILE,
    ]);
  }

  /**
   * Fetch user profile from InBody
   */
  async fetchProfile(): Promise<InBodyProfile | null> {
    if (!this.token || !this.userId) return null;

    try {
      const response = await fetch(`${INBODY_API_BASE}/users/${this.userId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const profile: InBodyProfile = {
        userId: data.id,
        name: data.name || '',
        height: data.height || 0,
        age: data.age || 0,
        gender: data.gender || 'male',
        lastMeasurement: data.last_measurement ? new Date(data.last_measurement) : null,
        measurementCount: data.measurement_count || 0,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.INBODY_PROFILE, JSON.stringify(profile));
      return profile;
    } catch (error) {
      console.error('InBody profile fetch error:', error);
      return null;
    }
  }

  /**
   * Sync measurements from InBody
   */
  async syncMeasurements(limit: number = 20): Promise<InBodyMeasurement[]> {
    if (!this.token || !this.userId) return [];

    try {
      const response = await fetch(
        `${INBODY_API_BASE}/users/${this.userId}/measurements?limit=${limit}&sort=desc`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return this.cachedMeasurements;

      const data = await response.json();
      this.cachedMeasurements = (data.measurements || []).map((m: any) => ({
        date: new Date(m.measured_at),
        weight: m.weight || 0,
        bodyFatPercent: m.body_fat_percent || 0,
        bodyFatMass: m.body_fat_mass || 0,
        skeletalMuscleMass: m.skeletal_muscle_mass || 0,
        totalBodyWater: m.total_body_water || 0,
        waterPercent: m.water_percent || 0,
        bmi: m.bmi || 0,
        visceralFatLevel: m.visceral_fat_level || 0,
        basalMetabolicRate: m.basal_metabolic_rate || 0,
        segmentalLeanMass: m.segmental_lean ? {
          rightArm: m.segmental_lean.right_arm || 0,
          leftArm: m.segmental_lean.left_arm || 0,
          trunk: m.segmental_lean.trunk || 0,
          rightLeg: m.segmental_lean.right_leg || 0,
          leftLeg: m.segmental_lean.left_leg || 0,
        } : undefined,
        bodyCompositionScore: m.body_composition_score,
      }));

      await AsyncStorage.setItem(
        STORAGE_KEYS.INBODY_MEASUREMENTS,
        JSON.stringify(this.cachedMeasurements)
      );

      return this.cachedMeasurements;
    } catch (error) {
      console.error('InBody sync error:', error);
      return this.cachedMeasurements;
    }
  }

  /**
   * Get latest measurement
   */
  getLatestMeasurement(): InBodyMeasurement | null {
    return this.cachedMeasurements.length > 0 ? this.cachedMeasurements[0] : null;
  }

  /**
   * Get measurement history
   */
  getMeasurements(): InBodyMeasurement[] {
    return [...this.cachedMeasurements];
  }

  /**
   * Get body composition summary for macro coach integration
   */
  getCompositionForCoach(): {
    bodyFatPercent: number;
    muscleMass: number;
    bmr: number;
    visceralFat: number;
  } | null {
    const latest = this.getLatestMeasurement();
    if (!latest) return null;

    return {
      bodyFatPercent: latest.bodyFatPercent,
      muscleMass: latest.skeletalMuscleMass,
      bmr: latest.basalMetabolicRate,
      visceralFat: latest.visceralFatLevel,
    };
  }
}

// Singleton
export const inBodyService = new InBodyService();
