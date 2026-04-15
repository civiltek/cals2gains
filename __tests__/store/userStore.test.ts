import { useUserStore } from '../../store/userStore';
import {
  getUserData,
  updateUserProfile,
  updateUserLanguage,
  updateUserGoalsAndMode,
  signOut as firebaseSignOut,
} from '../../services/firebase';
import { loginRevenueCat, logoutRevenueCat } from '../../services/revenuecat';
import { Platform } from 'react-native';
import { User } from '../../types';

const mockGetUser = getUserData as jest.Mock;
const mockUpdateProfile = updateUserProfile as jest.Mock;
const mockUpdateLang = updateUserLanguage as jest.Mock;
const mockUpdateGoals = updateUserGoalsAndMode as jest.Mock;
const mockSignOut = firebaseSignOut as jest.Mock;
const mockLoginRC = loginRevenueCat as jest.Mock;
const mockLogoutRC = logoutRevenueCat as jest.Mock;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'u1',
    email: 'test@test.com',
    displayName: 'Test',
    photoURL: null,
    createdAt: new Date(),
    trialStartDate: new Date(),
    isSubscribed: false,
    subscriptionType: 'trial',
    subscriptionExpiresAt: new Date(Date.now() + 7 * 86400000),
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 30 },
    profile: { age: 30, weight: 75, height: 175, gender: 'male', activityLevel: 'moderately_active', goal: 'maintain_weight' },
    language: 'es',
    ...overrides,
  };
}

beforeEach(() => {
  useUserStore.setState({
    user: null, isLoading: false, isAuthenticated: false,
    authInitialized: false, dayTypeGoals: null, todayDayType: 'rest',
    userId: null, nutritionMode: 'simple',
  });
  (Platform as any).OS = 'ios';
  jest.clearAllMocks();
});

describe('userStore', () => {
  describe('setUser', () => {
    it('sets user and authentication state', () => {
      const user = makeUser();
      useUserStore.getState().setUser(user);
      const s = useUserStore.getState();
      expect(s.isAuthenticated).toBe(true);
      expect(s.userId).toBe('u1');
    });

    it('clears state on null', () => {
      useUserStore.getState().setUser(makeUser());
      useUserStore.getState().setUser(null);
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(useUserStore.getState().userId).toBeNull();
    });
  });

  describe('loadUserData', () => {
    it('loads user from Firebase and connects RevenueCat', async () => {
      const user = makeUser();
      mockGetUser.mockResolvedValueOnce(user);

      await useUserStore.getState().loadUserData('u1');

      expect(useUserStore.getState().user).toBeTruthy();
      expect(useUserStore.getState().isAuthenticated).toBe(true);
      expect(mockLoginRC).toHaveBeenCalledWith('u1');
    });

    it('computes TDEE/BMR if missing', async () => {
      const user = makeUser({ tdee: undefined, bmr: undefined });
      mockGetUser.mockResolvedValueOnce(user);

      await useUserStore.getState().loadUserData('u1');

      const u = useUserStore.getState().user!;
      expect(u.tdee).toBeGreaterThan(0);
      expect(u.bmr).toBeGreaterThan(0);
    });

    it('handles error gracefully', async () => {
      mockGetUser.mockRejectedValueOnce(new Error('fail'));
      await useUserStore.getState().loadUserData('u1');
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('optimistically updates and persists to Firebase', async () => {
      useUserStore.setState({ user: makeUser() });
      mockUpdateProfile.mockResolvedValueOnce(undefined);
      mockUpdateGoals.mockResolvedValueOnce(undefined);

      await useUserStore.getState().updateProfile({ weight: 80 }, { calories: 2200 });

      expect(useUserStore.getState().user!.profile.weight).toBe(80);
      expect(useUserStore.getState().user!.goals.calories).toBe(2200);
    });

    it('reverts on Firebase error', async () => {
      useUserStore.setState({ user: makeUser() });
      mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));

      await expect(
        useUserStore.getState().updateProfile({ weight: 80 }, {}),
      ).rejects.toThrow('fail');

      expect(useUserStore.getState().user!.profile.weight).toBe(75);
    });

    it('does nothing when no user', async () => {
      await useUserStore.getState().updateProfile({ weight: 80 }, {});
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  describe('updateLanguage', () => {
    it('updates language locally and on Firebase', async () => {
      useUserStore.setState({ user: makeUser() });
      mockUpdateLang.mockResolvedValueOnce(undefined);

      await useUserStore.getState().updateLanguage('en');

      expect(useUserStore.getState().user!.language).toBe('en');
      expect(mockUpdateLang).toHaveBeenCalledWith('u1', 'en');
    });
  });

  describe('signOut', () => {
    it('clears user and calls Firebase + RevenueCat signout', async () => {
      useUserStore.setState({ user: makeUser(), isAuthenticated: true });

      await useUserStore.getState().signOut();

      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().isAuthenticated).toBe(false);
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockLogoutRC).toHaveBeenCalled();
    });
  });

  describe('setTodayDayType', () => {
    it('sets day type', () => {
      useUserStore.getState().setTodayDayType('training');
      expect(useUserStore.getState().todayDayType).toBe('training');
    });
  });

  describe('getActiveGoals', () => {
    it('returns regular goals when dayTypeGoals not enabled', () => {
      useUserStore.setState({ user: makeUser() });
      const goals = useUserStore.getState().getActiveGoals();
      expect(goals.calories).toBe(2000);
    });

    it('returns day-specific goals when enabled', () => {
      useUserStore.setState({
        user: makeUser(),
        dayTypeGoals: {
          enabled: true,
          training: { calories: 2500, protein: 180, carbs: 280, fat: 80, fiber: 35 },
          rest: { calories: 1800, protein: 140, carbs: 170, fat: 65, fiber: 25 },
        },
        todayDayType: 'training',
      });
      expect(useUserStore.getState().getActiveGoals().calories).toBe(2500);
    });

    it('returns zeros when no user', () => {
      expect(useUserStore.getState().getActiveGoals().calories).toBe(0);
    });
  });

  describe('setNutritionMode', () => {
    it('updates mode optimistically', async () => {
      useUserStore.setState({ user: makeUser() });
      mockUpdateGoals.mockResolvedValueOnce(undefined);

      await useUserStore.getState().setNutritionMode('advanced');

      expect(useUserStore.getState().nutritionMode).toBe('advanced');
      expect(useUserStore.getState().user!.nutritionMode).toBe('advanced');
    });
  });

  describe('updateUserGoals', () => {
    it('updates goals and goalMode', async () => {
      useUserStore.setState({ user: makeUser() });
      mockUpdateGoals.mockResolvedValueOnce(undefined);

      await useUserStore.getState().updateUserGoals({
        goalMode: 'lose_fat',
        targetCalories: 1800,
        targetProtein: 160,
        targetCarbs: 150,
        targetFat: 60,
      });

      const u = useUserStore.getState().user!;
      expect(u.goalMode).toBe('lose_fat');
      expect(u.goals.calories).toBe(1800);
    });
  });

  describe('isSubscriptionActive', () => {
    it('returns true on web', () => {
      (Platform as any).OS = 'web';
      expect(useUserStore.getState().isSubscriptionActive()).toBe(true);
    });

    it('returns false when no user', () => {
      expect(useUserStore.getState().isSubscriptionActive()).toBe(false);
    });

    it('returns true when subscription not expired', () => {
      useUserStore.setState({
        user: makeUser({
          subscriptionType: 'monthly',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000),
        }),
      });
      expect(useUserStore.getState().isSubscriptionActive()).toBe(true);
    });

    it('returns false when expired', () => {
      useUserStore.setState({
        user: makeUser({
          subscriptionType: 'monthly',
          subscriptionExpiresAt: new Date(Date.now() - 86400000),
        }),
      });
      expect(useUserStore.getState().isSubscriptionActive()).toBe(false);
    });
  });

  describe('trialDaysRemaining', () => {
    it('returns days remaining for trial', () => {
      useUserStore.setState({
        user: makeUser({
          subscriptionType: 'trial',
          subscriptionExpiresAt: new Date(Date.now() + 5 * 86400000),
        }),
      });
      const remaining = useUserStore.getState().trialDaysRemaining();
      // differenceInDays can be 4 or 5 depending on time of day
      expect(remaining).toBeGreaterThanOrEqual(4);
      expect(remaining).toBeLessThanOrEqual(5);
    });

    it('returns 0 for non-trial', () => {
      useUserStore.setState({ user: makeUser({ subscriptionType: 'monthly' }) });
      expect(useUserStore.getState().trialDaysRemaining()).toBe(0);
    });
  });
});
