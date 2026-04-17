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
  updateUserAllergies,
  onAuthStateChange,
  signOut as firebaseSignOut,
} from '../services/firebase';
import { loginRevenueCat, logoutRevenueCat } from '../services/revenuecat';
import { calculateTDEE, calculateBMR } from '../utils/nutrition';
import { HealthData } from '../services/healthKit';
import { differenceInDays } from 'date-fns';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authInitialized: boolean;
  dayTypeGoals: DayTypeGoals | null;
  todayDayType: DayType;

  // Health integration
  healthData: HealthData | null;

  // Convenience getters
  userId: string | null;
  nutritionMode: NutritionMode;

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

  // Health actions
  updateHealthData: (data: HealthData) => void;
  setHealthEnabled: (enabled: boolean) => Promise<void>;
  setDynamicTDEEEnabled: (enabled: boolean) => Promise<void>;
  // Allergy actions
  updateAllergies: (allergies: string[], intolerances: string[]) => Promise<void>;

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
  healthData: null,

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

    // If a training plan is active, it overrides everything until the plan ends.
    // Macros are proportional to the user's personal goals, not the plan's hardcoded defaults.
    if (user.goals && user.goals.calories > 0) {
      try {
        // Lazy-require to avoid circular import at module-init time.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useTrainingPlanStore } = require('./trainingPlanStore');
        const planInfo = useTrainingPlanStore.getState().getTodayInfo(user.goals);
        if (planInfo) {
          return {
            calories: planInfo.macros.calories,
            protein: planInfo.macros.protein,
            carbs: planInfo.macros.carbs,
            fat: planInfo.macros.fat,
            fiber: user.goals.fiber,
          };
        }
      } catch {
        /* training plan store not ready — fall through */
      }
    }

    if (!dayTypeGoals || !dayTypeGoals.enabled) {
      return user.goals;
    }

    // Use specific goals if configured
    if (todayDayType === 'refeed' && dayTypeGoals.refeed) return dayTypeGoals.refeed;
    if (todayDayType === 'competition' && dayTypeGoals.competition) return dayTypeGoals.competition;

    // Derive refeed/competition from training goals when no specific goals are set
    if (todayDayType === 'refeed') {
      const base = dayTypeGoals.training;
      const extraCarbs = Math.round((base.carbs || 0) * 0.3);
      return { ...base, carbs: (base.carbs || 0) + extraCarbs, fat: Math.round((base.fat || 0) * 0.8), calories: (base.calories || 0) + extraCarbs * 4 };
    }
    if (todayDayType === 'competition') {
      const base = dayTypeGoals.training;
      const extraCarbs = Math.round((base.carbs || 0) * 0.5);
      return { ...base, carbs: (base.carbs || 0) + extraCarbs, fat: Math.round((base.fat || 0) * 0.7), calories: (base.calories || 0) + extraCarbs * 4 };
    }

    return dayTypeGoals[todayDayType];
  },

  // =========================================================================
  // HEALTH ACTIONS
  // =========================================================================

  updateHealthData: (data: HealthData) => {
    set({ healthData: data });
  },

  setHealthEnabled: async (enabled: boolean) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, healthEnabled: enabled } });
    try {
      await updateUserGoalsAndMode(user.uid, { healthEnabled: enabled });
    } catch (error) {
      set({ user: { ...user, healthEnabled: user.healthEnabled } });
      console.error('Failed to set healthEnabled:', error);
      throw error;
    }
  },

  setDynamicTDEEEnabled: async (enabled: boolean) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, dynamicTDEEEnabled: enabled } });
    try {
      await updateUserGoalsAndMode(user.uid, { dynamicTDEEEnabled: enabled });
    } catch (error) {
      set({ user: { ...user, dynamicTDEEEnabled: user.dynamicTDEEEnabled } });
      console.error('Failed to set dynamicTDEEEnabled:', error);
      throw error;
    }
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

  updateAllergies: async (allergies, intolerances) => {
    const { user } = get();
    if (!user) return;

    set({ user: { ...user, allergies, intolerances } });
    try {
      await updateUserAllergies(user.uid, allergies, intolerances);
    } catch (error) {
      set({ user: { ...user, allergies: user.allergies, intolerances: user.intolerances } });
      console.error('Failed to update allergies:', error);
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
