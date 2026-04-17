// ============================================
// Cals2Gains - Free Tier Quota Store
// ============================================
// Tracks usage of limited AI features for free users (no subscription).
// Subscribers bypass quotas entirely via isSubscriptionActive().
//
// Model:
//   - photo:   1 / week   (hook demo: photo-to-macros)
//   - voice:   1 / day    (hook demo: voice logging)
//   - barcode: 3 / day    (quota to compete without burning API)
//   - label:   1 / month  (OCR hook)

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from './userStore';

export type QuotaFeature = 'photo' | 'voice' | 'barcode' | 'label';
type Period = 'day' | 'week' | 'month';

interface FeatureConfig {
  period: Period;
  limit: number;
}

export const QUOTA_LIMITS: Record<QuotaFeature, FeatureConfig> = {
  photo:   { period: 'week',  limit: 1 },
  voice:   { period: 'day',   limit: 1 },
  barcode: { period: 'day',   limit: 3 },
  label:   { period: 'month', limit: 1 },
};

/** Returns period bucket key for a given date: YYYY-MM-DD | YYYY-Www | YYYY-MM */
function bucketKey(period: Period, d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (period === 'day') {
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (period === 'month') {
    return `${y}-${String(m).padStart(2, '0')}`;
  }
  // ISO week number
  const tmp = new Date(Date.UTC(y, d.getMonth(), day));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

interface QuotaState {
  // counters[feature][bucketKey] = count
  counters: Record<QuotaFeature, Record<string, number>>;

  /** Returns remaining uses for a feature (Infinity if subscribed). */
  remaining: (feature: QuotaFeature) => number;
  /** Returns true if the user can use the feature right now. */
  canUse: (feature: QuotaFeature) => boolean;
  /** Attempts to consume 1 unit. Returns true on success, false if over limit. */
  consume: (feature: QuotaFeature) => boolean;
}

export const useQuotaStore = create<QuotaState>()(
  persist(
    (set, get) => ({
      counters: { photo: {}, voice: {}, barcode: {}, label: {} },

      remaining: (feature) => {
        // Subscribers have no limits
        if (useUserStore.getState().isSubscriptionActive()) return Infinity;
        const { period, limit } = QUOTA_LIMITS[feature];
        const key = bucketKey(period);
        const used = get().counters[feature]?.[key] ?? 0;
        return Math.max(0, limit - used);
      },

      canUse: (feature) => get().remaining(feature) > 0,

      consume: (feature) => {
        if (useUserStore.getState().isSubscriptionActive()) return true;
        const { period, limit } = QUOTA_LIMITS[feature];
        const key = bucketKey(period);
        const used = get().counters[feature]?.[key] ?? 0;
        if (used >= limit) return false;
        set((s) => ({
          counters: {
            ...s.counters,
            [feature]: { ...s.counters[feature], [key]: used + 1 },
          },
        }));
        return true;
      },
    }),
    {
      name: 'c2g-quota',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
