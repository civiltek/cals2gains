// ============================================
// Cals2Gains - User Store (Zustand)
// ============================================

import { create } from 'zustand';
import { DayType, DayTypeGoals, User, UserGoals, UserProfile } from '../types';
import {
  getUserData,
  updateUserProfile,
  updateUserLanguage,
  onAuthStateChange,
  signOut as firebaseSignOut,
} from '../services/firebase';
import { loginRevenueCat, logoutRevenueCat } from '../services/revenuecat';
import { differenceInDays } from 'date-fns';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authInitialized: boolean;
  dayTypeGoals: DayTypeGoals | null;
  todayDayType: DayType;

  // Actions
  setUser: (user: User | null) => void;
  loadUserData: (uid: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>, goals: Partial<UserGoals>) => Promise<void>;
  updateLanguage: (language: 'es' | 'en') => Promise<void>;
  signOut: () => Promise<void>;
  initAuth: () => () => void; // Returns unsubscribe function
  setDayTypeGoals: (goals: DayTypeGoals) => Promise<void>;
  setTodayDayType: (type: DayType) => void;
  getActiveGoals: () => UserGoals;

  // Computed getters
  isSubscriptionActive: () => boolean;
  trialDaysRemaining: () => number;
  isOnTrial: () => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authInitialized: false,
  dayTypeGoals: null,
  todayDayType: 'rest',

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  loadUserData: async (uid: string) => {
    set({ isLoading: true });
    try {
      const userData = await getUserData(uid);
      set({ user: userData, isAuthenticated: true });

      // Connect RevenueCat with user ID for cross-device sync
      await loginRevenueCat(uid);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (profile, goals) => {
    const { user } = get();
    if (!user) return;

    const newProfile = { ...user.profile, ...profile };
    const newGoals = { ...user.goals, ...goals };

    // Optimistic update
    set({ user: { ...user, profile: newProfile, goals: newGoals } });

    try {
      await updateUserProfile(user.uid, newProfile, newGoals);
    } catch (error) {
      // Revert on error
      set({ user });
      throw error;
    }
  },

  updateLanguage: async (language) => {
    const { user } = get();
    if (!user) return;

    set({ user: { ...user, language } });
    try {
      await updateUserLanguage(user.uid, language);
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut();
      await logoutRevenueCat();
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  initAuth: () => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        await get().loadUserData(firebaseUser.uid);
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
      set({ authInitialized: true });
    });
    return unsubscribe;
  },

  setDayTypeGoals: async (goals: DayTypeGoals) => {
    set({ dayTypeGoals: goals });
    const { user } = get();
    if (!user) return;

    try {
      // TODO: Persist to Firebase when backend is ready
      // await updateDayTypeGoals(user.uid, goals);
    } catch (error) {
      console.error('Failed to update day type goals:', error);
      throw error;
    }
  },

  setTodayDayType: (type: DayType) => {
    set({ todayDayType: type });
  },

  getActiveGoals: () => {
    const { user, dayTypeGoals, todayDayType } = get();
    if (!user) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

    // If day type goals are not enabled or not set, return regular goals
    if (!dayTypeGoals || !dayTypeGoals.enabled) {
      return user.goals;
    }

    // Return training or rest goals based on today's day type
    return dayTypeGoals[todayDayType];
  },

  // Computed: check if subscription is active (trial or paid)
  isSubscriptionActive: () => {
    const { user } = get();
    if (!user) return false;

    if (user.subscriptionType === 'none') return false;

    if (user.subscriptionExpiresAt) {
      return new Date() < user.subscriptionExpiresAt;
    }

    return user.isSubscribed;
  },

  // Computed: days remaining in trial
  trialDaysRemaining: () => {
    const { user } = get();
    if (!user || user.subscriptionType !== 'trial') return 0;

    if (!user.subscriptionExpiresAt) return 0;
    const remaining = differenceInDays(user.subscriptionExpiresAt, new Date());
    return Math.max(0, remaining);
  },

  // Computed: is user currently on trial
  isOnTrial: () => {
    const { user } = get();
    return user?.subscriptionType === 'trial' && get().isSubscriptionActive();
  },
}));
