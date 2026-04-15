import { useMealStore, mealStore } from '../../store/mealStore';
import {
  getMealsForDate,
  saveMeal,
  deleteMeal,
  updateMeal as firebaseUpdateMeal,
  getRecentMeals,
} from '../../services/firebase';
import { Meal, Nutrition } from '../../types';

const mockGetMeals = getMealsForDate as jest.Mock;
const mockSaveMeal = saveMeal as jest.Mock;
const mockDeleteMeal = deleteMeal as jest.Mock;
const mockUpdateMeal = firebaseUpdateMeal as jest.Mock;
const mockGetRecent = getRecentMeals as jest.Mock;

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    userId: 'user-1',
    timestamp: new Date(),
    photoUri: '',
    dishName: 'Pollo',
    dishNameEs: 'Pollo',
    dishNameEn: 'Chicken',
    ingredients: ['chicken'],
    portionDescription: '150g',
    estimatedWeight: 150,
    nutrition: { calories: 300, protein: 40, carbs: 0, fat: 8, fiber: 0 },
    mealType: 'lunch',
    aiConfidence: 0.9,
    ...overrides,
  };
}

beforeEach(() => {
  useMealStore.setState({
    todayMeals: [],
    recentMeals: [],
    todayNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    selectedDate: new Date(),
    isLoading: false,
    isSaving: false,
  });
  jest.clearAllMocks();
});

describe('mealStore', () => {
  describe('loadTodayMeals', () => {
    it('loads meals from Firebase and calculates nutrition', async () => {
      const meals = [
        makeMeal({ id: 'm1', nutrition: { calories: 400, protein: 30, carbs: 20, fat: 15, fiber: 2 } }),
        makeMeal({ id: 'm2', nutrition: { calories: 300, protein: 25, carbs: 10, fat: 10, fiber: 1 } }),
      ];
      mockGetMeals.mockResolvedValueOnce(meals);

      await useMealStore.getState().loadTodayMeals('user-1');

      const state = useMealStore.getState();
      expect(state.todayMeals).toHaveLength(2);
      expect(state.todayNutrition.calories).toBe(700);
      expect(state.todayNutrition.protein).toBe(55);
      expect(state.isLoading).toBe(false);
    });

    it('handles Firebase error gracefully', async () => {
      mockGetMeals.mockRejectedValueOnce(new Error('Network error'));

      await useMealStore.getState().loadTodayMeals('user-1');

      const state = useMealStore.getState();
      expect(state.todayMeals).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('addMeal', () => {
    it('saves meal to Firebase and updates local state', async () => {
      mockSaveMeal.mockResolvedValueOnce('new-meal-id');

      const newMeal = makeMeal({ id: undefined as any, timestamp: new Date() });
      const { id, ...mealWithoutId } = newMeal;

      const mealId = await useMealStore.getState().addMeal(mealWithoutId);

      expect(mealId).toBe('new-meal-id');
      expect(mockSaveMeal).toHaveBeenCalledTimes(1);
      expect(useMealStore.getState().isSaving).toBe(false);
    });
  });

  describe('removeMeal', () => {
    it('removes meal from Firebase and local state', async () => {
      useMealStore.setState({
        todayMeals: [
          makeMeal({ id: 'm1', nutrition: { calories: 300, protein: 20, carbs: 10, fat: 8, fiber: 0 } }),
          makeMeal({ id: 'm2', nutrition: { calories: 500, protein: 40, carbs: 30, fat: 15, fiber: 2 } }),
        ],
        todayNutrition: { calories: 800, protein: 60, carbs: 40, fat: 23, fiber: 2 },
      });

      mockDeleteMeal.mockResolvedValueOnce(undefined);

      await useMealStore.getState().removeMeal('m1');

      const state = useMealStore.getState();
      expect(state.todayMeals).toHaveLength(1);
      expect(state.todayMeals[0].id).toBe('m2');
      expect(state.todayNutrition.calories).toBe(500);
    });

    it('does nothing when mealId is empty', async () => {
      await useMealStore.getState().removeMeal('');
      expect(mockDeleteMeal).not.toHaveBeenCalled();
    });
  });

  describe('updateMeal', () => {
    it('updates meal in Firebase and local state', async () => {
      useMealStore.setState({
        todayMeals: [makeMeal({ id: 'm1' })],
        recentMeals: [makeMeal({ id: 'm1' })],
      });

      mockUpdateMeal.mockResolvedValueOnce(undefined);

      await useMealStore.getState().updateMeal('m1', { dishName: 'Pollo asado' });

      expect(mockUpdateMeal).toHaveBeenCalledWith('m1', { dishName: 'Pollo asado' });
      expect(useMealStore.getState().todayMeals[0].dishName).toBe('Pollo asado');
      expect(useMealStore.getState().recentMeals[0].dishName).toBe('Pollo asado');
    });

    it('does nothing when mealId is empty', async () => {
      await useMealStore.getState().updateMeal('', {});
      expect(mockUpdateMeal).not.toHaveBeenCalled();
    });
  });

  describe('getTodayCalories', () => {
    it('returns total calories from todayNutrition', () => {
      useMealStore.setState({
        todayNutrition: { calories: 1500, protein: 100, carbs: 150, fat: 50, fiber: 20 },
      });
      expect(useMealStore.getState().getTodayCalories()).toBe(1500);
    });
  });

  describe('getMealsByType', () => {
    it('groups today meals by type', () => {
      useMealStore.setState({
        todayMeals: [
          makeMeal({ id: 'm1', mealType: 'breakfast' }),
          makeMeal({ id: 'm2', mealType: 'lunch' }),
          makeMeal({ id: 'm3', mealType: 'lunch' }),
          makeMeal({ id: 'm4', mealType: 'dinner' }),
        ],
      });

      const groups = useMealStore.getState().getMealsByType();
      expect(groups.breakfast).toHaveLength(1);
      expect(groups.lunch).toHaveLength(2);
      expect(groups.dinner).toHaveLength(1);
    });
  });

  describe('getMeals', () => {
    it('deduplicates meals from today and recent', () => {
      const shared = makeMeal({ id: 'shared-1' });
      useMealStore.setState({
        todayMeals: [shared, makeMeal({ id: 'today-only' })],
        recentMeals: [shared, makeMeal({ id: 'recent-only' })],
      });

      const all = useMealStore.getState().getMeals();
      expect(all).toHaveLength(3);
      const ids = all.map((m) => m.id);
      expect(ids).toContain('shared-1');
      expect(ids).toContain('today-only');
      expect(ids).toContain('recent-only');
    });
  });

  describe('mealStore accessor', () => {
    it('getMeals returns same as useMealStore.getState().getMeals()', () => {
      useMealStore.setState({
        todayMeals: [makeMeal({ id: 't1' })],
        recentMeals: [makeMeal({ id: 'r1' })],
      });

      const fromAccessor = mealStore.getMeals();
      const fromStore = useMealStore.getState().getMeals();
      expect(fromAccessor).toEqual(fromStore);
    });
  });
});
