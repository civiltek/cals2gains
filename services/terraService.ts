// ============================================
// Cals2Gains - Terra API Integration
// ============================================
// Connects to third-party wearables: Garmin, Fitbit, Samsung Health, Wear OS
// Terra acts as a universal API layer for wearable data
// Docs: https://docs.tryterra.co/

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export type TerraProvider =
  | 'GARMIN'
  | 'FITBIT'
  | 'SAMSUNG'
  | 'GOOGLE'
  | 'APPLE'
  | 'WEAR_OS'
  | 'INBODY';

export interface TerraConnection {
  provider: TerraProvider;
  userId: string;
  connected: boolean;
  lastSync: Date | null;
  displayName: string;
  icon: string; // Ionicons name
  color: string;
}

export interface TerraActivityData {
  steps: number;
  activeCalories: number;
  totalCalories: number;
  exerciseMinutes: number;
  distanceMeters: number;
  averageHeartRate?: number;
  date: string;
}

export interface TerraBodyData {
  weight?: number; // kg
  bodyFatPercent?: number;
  muscleMass?: number; // kg
  bmi?: number;
  waterPercent?: number;
  date: string;
}

export interface TerraSleepData {
  durationMinutes: number;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
  awakeMinutes: number;
  sleepScore?: number;
  date: string;
}

// ============================================
// TERRA API CONFIG
// ============================================

const TERRA_API_BASE = 'https://api.tryterra.co/v2';
const TERRA_WIDGET_URL = 'https://widget.tryterra.co';

// Keys stored securely - in production these come from your backend
const STORAGE_KEYS = {
  TERRA_TOKEN: '@c2g_terra_token',
  TERRA_CONNECTIONS: '@c2g_terra_connections',
};

// ============================================
// PROVIDER DEFINITIONS
// ============================================

export const TERRA_PROVIDERS: Record<TerraProvider, Omit<TerraConnection, 'userId' | 'connected' | 'lastSync'>> = {
  GARMIN: {
    provider: 'GARMIN',
    displayName: 'Garmin',
    icon: 'watch-outline',
    color: '#007DC3',
  },
  FITBIT: {
    provider: 'FITBIT',
    displayName: 'Fitbit',
    icon: 'pulse-outline',
    color: '#00B0B9',
  },
  SAMSUNG: {
    provider: 'SAMSUNG',
    displayName: 'Samsung Health',
    icon: 'heart-circle-outline',
    color: '#1428A0',
  },
  GOOGLE: {
    provider: 'GOOGLE',
    displayName: 'Google Fit',
    icon: 'logo-google',
    color: '#4285F4',
  },
  APPLE: {
    provider: 'APPLE',
    displayName: 'Apple Health',
    icon: 'logo-apple',
    color: '#FF2D55',
  },
  WEAR_OS: {
    provider: 'WEAR_OS',
    displayName: 'Wear OS',
    icon: 'watch-outline',
    color: '#4285F4',
  },
  INBODY: {
    provider: 'INBODY',
    displayName: 'InBody',
    icon: 'body-outline',
    color: '#E8383D',
  },
};

// ============================================
// TERRA SERVICE CLASS
// ============================================

class TerraService {
  private connections: Map<TerraProvider, TerraConnection> = new Map();
  private apiToken: string | null = null;

  /**
   * Initialize Terra service - load saved connections
   */
  async initialize(): Promise<void> {
    try {
      const savedConnections = await AsyncStorage.getItem(STORAGE_KEYS.TERRA_CONNECTIONS);
      if (savedConnections) {
        const parsed: TerraConnection[] = JSON.parse(savedConnections);
        parsed.forEach(conn => {
          this.connections.set(conn.provider, {
            ...conn,
            lastSync: conn.lastSync ? new Date(conn.lastSync) : null,
          });
        });
      }

      this.apiToken = await AsyncStorage.getItem(STORAGE_KEYS.TERRA_TOKEN);
    } catch (error) {
      console.error('Terra initialization error:', error);
    }
  }

  /**
   * Get all available providers for the current platform
   */
  getAvailableProviders(): TerraConnection[] {
    const providers: TerraProvider[] = Platform.OS === 'ios'
      ? ['APPLE', 'GARMIN', 'FITBIT', 'SAMSUNG', 'INBODY']
      : ['GOOGLE', 'GARMIN', 'FITBIT', 'SAMSUNG', 'WEAR_OS', 'INBODY'];

    return providers.map(p => ({
      ...TERRA_PROVIDERS[p],
      userId: this.connections.get(p)?.userId || '',
      connected: this.connections.get(p)?.connected || false,
      lastSync: this.connections.get(p)?.lastSync || null,
    }));
  }

  /**
   * Get connection status for a specific provider
   */
  getConnection(provider: TerraProvider): TerraConnection | null {
    return this.connections.get(provider) || null;
  }

  /**
   * Check if any wearable is connected
   */
  hasAnyConnection(): boolean {
    return Array.from(this.connections.values()).some(c => c.connected);
  }

  /**
   * Connect to a wearable provider via Terra widget
   * Returns the authentication URL to open in a WebView
   */
  async generateAuthUrl(provider: TerraProvider): Promise<string | null> {
    try {
      // In production, this call goes through YOUR backend to Terra API
      // The backend generates a widget session and returns the URL
      // For now, we construct the widget URL directly
      const response = await fetch(`${TERRA_API_BASE}/auth/generateWidgetSession`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_TERRA_API_KEY || '',
          'dev-id': process.env.EXPO_PUBLIC_TERRA_DEV_ID || '',
        },
        body: JSON.stringify({
          providers: provider.toLowerCase(),
          language: 'es',
          auth_success_redirect_url: 'cals2gains://terra-callback',
          auth_failure_redirect_url: 'cals2gains://terra-callback?error=true',
        }),
      });

      if (!response.ok) {
        console.error('Terra auth URL generation failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.url || null;
    } catch (error) {
      console.error('Terra auth error:', error);
      return null;
    }
  }

  /**
   * Handle authentication callback from Terra widget
   */
  async handleAuthCallback(
    provider: TerraProvider,
    terraUserId: string
  ): Promise<boolean> {
    try {
      const connection: TerraConnection = {
        ...TERRA_PROVIDERS[provider],
        userId: terraUserId,
        connected: true,
        lastSync: null,
      };

      this.connections.set(provider, connection);
      await this.saveConnections();

      return true;
    } catch (error) {
      console.error('Terra callback error:', error);
      return false;
    }
  }

  /**
   * Disconnect a provider
   */
  async disconnect(provider: TerraProvider): Promise<boolean> {
    try {
      const connection = this.connections.get(provider);
      if (!connection) return false;

      // Deregister user from Terra
      if (connection.userId) {
        await fetch(`${TERRA_API_BASE}/auth/deregisterUser`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.EXPO_PUBLIC_TERRA_API_KEY || '',
            'dev-id': process.env.EXPO_PUBLIC_TERRA_DEV_ID || '',
          },
          body: JSON.stringify({ user_id: connection.userId }),
        }).catch(() => {}); // Best effort
      }

      this.connections.delete(provider);
      await this.saveConnections();

      return true;
    } catch (error) {
      console.error('Terra disconnect error:', error);
      return false;
    }
  }

  /**
   * Fetch activity data for a connected provider
   */
  async getActivityData(
    provider: TerraProvider,
    startDate: Date,
    endDate: Date
  ): Promise<TerraActivityData[]> {
    const connection = this.connections.get(provider);
    if (!connection?.connected || !connection.userId) return [];

    try {
      const params = new URLSearchParams({
        user_id: connection.userId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        to_webhook: 'false',
      });

      const response = await fetch(`${TERRA_API_BASE}/activity?${params}`, {
        headers: {
          'x-api-key': process.env.EXPO_PUBLIC_TERRA_API_KEY || '',
          'dev-id': process.env.EXPO_PUBLIC_TERRA_DEV_ID || '',
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      const activities = data.data || [];

      // Update last sync time
      connection.lastSync = new Date();
      this.connections.set(provider, connection);
      await this.saveConnections();

      return activities.map((a: any) => ({
        steps: a.distance_data?.steps || 0,
        activeCalories: a.calories_data?.net_activity_calories || 0,
        totalCalories: a.calories_data?.total_burned_calories || 0,
        exerciseMinutes: Math.round((a.active_durations_data?.activity_seconds || 0) / 60),
        distanceMeters: a.distance_data?.distance_meters || 0,
        averageHeartRate: a.heart_rate_data?.summary?.avg_hr_bpm,
        date: a.metadata?.start_time?.split('T')[0] || '',
      }));
    } catch (error) {
      console.error(`Terra activity fetch error (${provider}):`, error);
      return [];
    }
  }

  /**
   * Fetch body/composition data (weight, body fat, etc.)
   */
  async getBodyData(
    provider: TerraProvider,
    startDate: Date,
    endDate: Date
  ): Promise<TerraBodyData[]> {
    const connection = this.connections.get(provider);
    if (!connection?.connected || !connection.userId) return [];

    try {
      const params = new URLSearchParams({
        user_id: connection.userId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        to_webhook: 'false',
      });

      const response = await fetch(`${TERRA_API_BASE}/body?${params}`, {
        headers: {
          'x-api-key': process.env.EXPO_PUBLIC_TERRA_API_KEY || '',
          'dev-id': process.env.EXPO_PUBLIC_TERRA_DEV_ID || '',
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.data || []).map((b: any) => ({
        weight: b.measurements_data?.weight_kg,
        bodyFatPercent: b.measurements_data?.body_fat_percentage,
        muscleMass: b.measurements_data?.muscle_mass_kg,
        bmi: b.measurements_data?.bmi,
        waterPercent: b.measurements_data?.water_percentage,
        date: b.metadata?.start_time?.split('T')[0] || '',
      }));
    } catch (error) {
      console.error(`Terra body fetch error (${provider}):`, error);
      return [];
    }
  }

  /**
   * Fetch sleep data
   */
  async getSleepData(
    provider: TerraProvider,
    startDate: Date,
    endDate: Date
  ): Promise<TerraSleepData[]> {
    const connection = this.connections.get(provider);
    if (!connection?.connected || !connection.userId) return [];

    try {
      const params = new URLSearchParams({
        user_id: connection.userId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        to_webhook: 'false',
      });

      const response = await fetch(`${TERRA_API_BASE}/sleep?${params}`, {
        headers: {
          'x-api-key': process.env.EXPO_PUBLIC_TERRA_API_KEY || '',
          'dev-id': process.env.EXPO_PUBLIC_TERRA_DEV_ID || '',
        },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.data || []).map((s: any) => ({
        durationMinutes: Math.round((s.sleep_durations_data?.asleep?.duration_asleep_state_seconds || 0) / 60),
        deepSleepMinutes: Math.round((s.sleep_durations_data?.asleep?.duration_deep_sleep_state_seconds || 0) / 60),
        remSleepMinutes: Math.round((s.sleep_durations_data?.asleep?.duration_REM_sleep_state_seconds || 0) / 60),
        lightSleepMinutes: Math.round((s.sleep_durations_data?.asleep?.duration_light_sleep_state_seconds || 0) / 60),
        awakeMinutes: Math.round((s.sleep_durations_data?.awake?.duration_awake_state_seconds || 0) / 60),
        sleepScore: s.metadata?.sleep_score,
        date: s.metadata?.start_time?.split('T')[0] || '',
      }));
    } catch (error) {
      console.error(`Terra sleep fetch error (${provider}):`, error);
      return [];
    }
  }

  /**
   * Get aggregated data from ALL connected providers for today
   */
  async getAggregatedToday(): Promise<TerraActivityData> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const allData: TerraActivityData[] = [];

    for (const [provider, connection] of this.connections) {
      if (connection.connected) {
        const data = await this.getActivityData(provider, startOfDay, today);
        allData.push(...data);
      }
    }

    // Merge: take max values (avoid double-counting from overlapping sources)
    return {
      steps: Math.max(0, ...allData.map(d => d.steps)),
      activeCalories: Math.max(0, ...allData.map(d => d.activeCalories)),
      totalCalories: Math.max(0, ...allData.map(d => d.totalCalories)),
      exerciseMinutes: Math.max(0, ...allData.map(d => d.exerciseMinutes)),
      distanceMeters: Math.max(0, ...allData.map(d => d.distanceMeters)),
      averageHeartRate: allData.find(d => d.averageHeartRate)?.averageHeartRate,
      date: today.toISOString().split('T')[0],
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async saveConnections(): Promise<void> {
    try {
      const data = Array.from(this.connections.values());
      await AsyncStorage.setItem(STORAGE_KEYS.TERRA_CONNECTIONS, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save Terra connections:', error);
    }
  }
}

// Singleton instance
export const terraService = new TerraService();
