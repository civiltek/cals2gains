// ============================================
// Cals2Gains - User Store (Zustand)
// ============================================

import { create } from 'zustand';
import { Platform } from 'react-native';
import { DayType, DayTypeGoals, GoalMode, NutritionMode, User, UserGoals, UserProfile } from '../types';
import {
  getUserData,
  updateUserProfile,
  updateUserLanguage,
  updateUserGoalsAndMode,
  onAuthStateChange,
  signOut as firebaseSignOut,
  deleteUserAccount,
} from '../services/firebase';
import { loginRevenueCat, logoutRevenueCat } from '../services/revenuecat';
import { calculateTDEE, calculateBMR } from '../utils/nutrition';
import { differenceInDays } from 'date-fns';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authInitialized: boolean;
  dayTypeGoals: DayTypeGoals | null;
  todayDayType: DayType;

  // Convenience getters
  userId: string | null;
  nutritionMode: NutritionMode;

  // Actions
  setUser: (user: User | null) => void;
  loadUserData: (uid: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>, goals: Partial<UserGoals>) => Promise<void>;
  updateLanguage: (language: 'es' | 'en') => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  initAuth: () => () => void; // Returns unsubscribe function
  setDayTypeGoals: (goals: DayTypeGoals) => Promise<void>;
  setTodayDayType: (type: DayType) => void;
  getActiveGoals: () => UserGoals;

  // Goal mode actions (NEW)
  setNutritionMode: (mode: NutritionMode) => Promise<void>;
  updateUserGoals: (data: {
    goalMode: GoalMode;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
  }) => Promise<void>;
  toggleAdaptiveMode: (enabled: boolean) => Promise<void>;

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

  // Convenience — derived at read time (not reactive, use user?.uid in components)
  userId: null as string | null,
  nutritionMode: 'simple' as NutritionMode,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      userId: user?.uid || null,
      nutritionMode: user?.nutritionMode || 'simple',
    });
  },

  loadUserData: async (uid: string) => {
    set({ isLoading: true });
    try {
      const userData = await getUserData(uid);

      // Compute TDEE and BMR if profile exists but values are missing
      if (userData?.profile && (!userData.tdee || !userData.bmr)) {
        userData.tdee = calculateTDEE(userData.profile);
        userData.bmr = calculateBMR(userData.profile);
        userData.weight = userData.profile.weight;
      }

      set({
        user: userData,
        isAuthenticated: true,
        userId: userData?.uid || null,
        nutritionMode: userData?.nutritionMode || 'simple',
      });

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

    // Recalculate TDEE/BMR if profile changed
    const tdee = calculateTDEE(newProfile);
    const bmr = calculateBMR(newProfile);

    // Optimistic update
    set({
      user: {
        ...user,
        profile: newProfile,
        goals: newGoals,
        tdee,
        bmr,
        weight: newProfile.weight,
      },
    });

    try {
      await updateUserProfile(user.uid, newProfile, newGoals);
      // Also persist TDEE/BMR
      await updateUserGoalsAndMode(user.uid, { tdee, bmr, weight: newProfile.weight });
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

  deleteAccount: async () => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');
    try {
      await logoutRevenueCat();
      await deleteUserAccount(user.uid);
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Delete account error:', error);
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

  // =========================================================================
  // GOAL MODE ACTIONS (NEW)
  // =========================================================================

  setNutritionMode: async (mode: NutritionMode) => {
    const { user } = get();
    if (!user) return;

    // Optimistic update — both user object and convenience field
    set({ user: { ...user, nutritionMode: mode }, nutritionMode: mode });

    try {
      await updateUserGoalsAndMode(user.uid, { nutritionMode: mode });
    } catch (error) {
      // Revert
      set({ user: { ...user, nutritionMode: user.nutritionMode } });
      console.error('Failed to set nutrition mode:', error);
      throw error;
    }
  },

  updateUserGoals: async ({ goalMode, targetCalories, targetProtein, targetCarbs, targetFat }) => {
    const { user } = get();
    if (!user) return;

    const newGoals: UserGoals = {
      calories: targetCalories,
      protein: targetProtein,
      carbs: targetCarbs,
      fat: targetFat,
      fiber: user.goals.fiber, // Keep existing fiber goal
    };

    // Optimistic update — immediately update user.goals AND user.goalMode
    const updatedUser = {
      ...user,
      goals: newGoals,
      goalMode: goalMode as GoalMode,
    };
    set({ user: updatedUser });

    try {
      await updateUserGoalsAndMode(user.uid, {
        goals: newGoals,
        goalMode,
      });
    } catch (error) {
      // Revert on error
      set({ user });
      console.error('Failed to update user goals:', error);
      throw error;
    }
  },

  toggleAdaptiveMode: async (enabled: boolean) => {
    const { user } = get();
    if (!user) return;

    // Optimistic update
    set({ user: { ...user, adaptiveMode: enabled } });

    try {
      await updateUserGoalsAndMode(user.uid, { adaptiveMode: enabled });
    } catch (error) {
      // Revert
      set({ user: { ...user, adaptiveMode: user.adaptiveMode } });
      console.error('Failed to toggle adaptive mode:', error);
      throw error;
    }
  },

  // =========================================================================
  // COMPUTED GETTERS
  // =========================================================================

  // Computed: check if subscription is active (trial or paid)
  isSubscriptionActive: () => {
    // Web demo mode: always active
    if (Platform.OS === 'web') return true;

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
