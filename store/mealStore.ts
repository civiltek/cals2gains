// ============================================
// Cals2Gains - Meal Store (Zustand)
// ============================================

import { create } from 'zustand';
import { Meal, MealType, Nutrition, UserGoals } from '../types';
import {
  getMealsForDate,
  saveMeal,
  deleteMeal,
  updateMeal as firebaseUpdateMeal,
  getRecentMeals,
  saveMealPhotoBase64,
} from '../services/firebase';
import { addNutrition, emptyNutrition } from '../utils/nutrition';
import { format, isToday } from 'date-fns';

interface MealState {
  todayMeals: Meal[];
  recentMeals: Meal[];
  todayNutrition: Nutrition;
  selectedDate: Date;
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  loadTodayMeals: (userId: string) => Promise<void>;
  loadMealsForDate: (userId: string, date: Date) => Promise<void>;
  loadRecentMeals: (userId: string) => Promise<void>;
  addMeal: (meal: Omit<Meal, 'id'>) => Promise<string>;
  updateMeal: (mealId: string, updates: Partial<Omit<Meal, 'id'>>) => Promise<void>;
  removeMeal: (mealId: string) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  refreshToday: (userId: string) => Promise<void>;
  copyMealsToDate: (userId: string, fromDate: Date, toDate: Date, mealTypes?: MealType[]) => Promise<void>;
  duplicateMeal: (meal: Meal, targetDate: Date) => Promise<string>;

  // Computed
  getTodayCalories: () => number;
  getMealsByType: () => Record<string, Meal[]>;
  getMeals: () => Meal[];
}

function safeMealNutrition(meal: any): Nutrition {
  const n = meal?.nutrition;
  return {
    calories: n?.calories ?? meal?.calories ?? 0,
    protein: n?.protein ?? meal?.protein ?? 0,
    carbs: n?.carbs ?? meal?.carbs ?? 0,
    fat: n?.fat ?? meal?.fat ?? 0,
    fiber: n?.fiber ?? 0,
    sugar: n?.sugar,
    saturatedFat: n?.saturatedFat,
    sodium: n?.sodium,
  };
}

function calculateTotalNutrition(meals: Meal[]): Nutrition {
  return meals.reduce(
    (total, meal) => addNutrition(total, safeMealNutrition(meal)),
    emptyNutrition()
  );
}

export const useMealStore = create<MealState>((set, get) => ({
  todayMeals: [],
  recentMeals: [],
  todayNutrition: emptyNutrition(),
  selectedDate: new Date(),
  isLoading: false,
  isSaving: false,

  loadTodayMeals: async (userId: string) => {
    set({ isLoading: true });
    try {
      const meals = await getMealsForDate(userId, new Date());
      const todayNutrition = calculateTotalNutrition(meals);
      set({ todayMeals: meals, todayNutrition });
    } catch (error) {
      console.error('Failed to load today meals:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMealsForDate: async (userId: string, date: Date) => {
    set({ isLoading: true, selectedDate: date });
    try {
      const meals = await getMealsForDate(userId, date);
      const nutrition = calculateTotalNutrition(meals);

      // Always update todayMeals/todayNutrition — home dashboard reads these
      // for whichever date is being viewed, not just calendar today.
      set({ todayMeals: meals, todayNutrition: nutrition });
    } catch (error) {
      console.error('Failed to load meals for date:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadRecentMeals: async (userId: string) => {
    try {
      const meals = await getRecentMeals(userId, 30);
      set({ recentMeals: meals });
    } catch (error) {
      console.error('Failed to load recent meals:', error);
    }
  },

  addMeal: async (meal: Omit<Meal, 'id'>, photoBase64?: string) => {
    set({ isSaving: true });
    try {
      const mealId = await saveMeal(meal);
      const newMeal = { ...meal, id: mealId } as Meal;

      const { todayMeals, recentMeals } = get();

      // Always add to recentMeals so it appears in history
      const updatedRecent = [newMeal, ...recentMeals].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Update today's meals if this meal is for today
      if (isToday(meal.timestamp)) {
        const updatedMeals = [...todayMeals, newMeal].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );
        const todayNutrition = calculateTotalNutrition(updatedMeals);
        set({ todayMeals: updatedMeals, todayNutrition, recentMeals: updatedRecent });
      } else {
        set({ recentMeals: updatedRecent });
      }

      // Save photo as base64 in Firestore (non-blocking)
      if (meal.photoUri && meal.userId) {
        const source = photoBase64
          ? { base64: photoBase64 }
          : { uri: meal.photoUri };
        saveMealPhotoBase64(mealId, source)
          .then((photoUrl) => {
            if (!photoUrl) return;
            // Update local state with the data URI
            const updatePhoto = (m: Meal) =>
              m.id === mealId ? { ...m, photoUrl } : m;
            const state = get();
            set({
              todayMeals: state.todayMeals.map(updatePhoto),
              recentMeals: state.recentMeals.map(updatePhoto),
            });
          })
          .catch(() => {}); // Silent fail — local photo still works
      }

      return mealId;
    } finally {
      set({ isSaving: false });
    }
  },

  updateMeal: async (mealId: string, updates: Partial<Omit<Meal, 'id'>>) => {
    if (!mealId) {
      console.warn('updateMeal: no mealId provided');
      return;
    }
    try {
      await firebaseUpdateMeal(mealId, updates);

      // Update local state — both todayMeals AND recentMeals
      const { todayMeals, recentMeals } = get();
      const applyUpdate = (meals: Meal[]) =>
        meals.map((m) => (m.id === mealId ? { ...m, ...updates } : m));

      const updatedToday = applyUpdate(todayMeals);
      const updatedRecent = applyUpdate(recentMeals);
      const todayNutrition = calculateTotalNutrition(updatedToday);
      set({ todayMeals: updatedToday, recentMeals: updatedRecent, todayNutrition });
    } catch (error) {
      console.error('Failed to update meal:', error);
      throw error;
    }
  },

  removeMeal: async (mealId: string) => {
    if (!mealId) {
      console.warn('removeMeal: no mealId provided');
      return;
    }
    try {
      await deleteMeal(mealId);

      const { todayMeals, recentMeals } = get();
      const updatedTodayMeals = todayMeals.filter((m) => m.id !== mealId);
      const updatedRecentMeals = recentMeals.filter((m) => m.id !== mealId);
      const todayNutrition = calculateTotalNutrition(updatedTodayMeals);
      set({
        todayMeals: updatedTodayMeals,
        recentMeals: updatedRecentMeals,
        todayNutrition,
      });
    } catch (error) {
      console.error('Failed to delete meal:', error);
      throw error;
    }
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  refreshToday: async (userId: string) => {
    await get().loadTodayMeals(userId);
  },

  getTodayCalories: () => {
    return get().todayNutrition.calories;
  },

  getMealsByType: () => {
    const { todayMeals } = get();
    return todayMeals.reduce((groups, meal) => {
      const type = meal.mealType || 'snack';
      return {
        ...groups,
        [type]: [...(groups[type] || []), meal],
      };
    }, {} as Record<string, Meal[]>);
  },

  getMeals: () => {
    const { todayMeals, recentMeals } = get();
    // Combine today + recent, deduplicate by id
    const allMeals = [...todayMeals, ...recentMeals];
    const seen = new Set<string>();
    return allMeals.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  },

  copyMealsToDate: async (userId: string, fromDate: Date, toDate: Date, mealTypes?: MealType[]) => {
    set({ isLoading: true });
    try {
      const meals = await getMealsForDate(userId, fromDate);
      const mealsToClone = mealTypes
        ? meals.filter((m) => mealTypes.includes(m.mealType))
        : meals;

      const newMealIds: string[] = [];
      for (const meal of mealsToClone) {
        const newMeal: Omit<Meal, 'id'> = {
          userId: meal.userId,
          timestamp: new Date(
            toDate.getFullYear(),
            toDate.getMonth(),
            toDate.getDate(),
            meal.timestamp.getHours(),
            meal.timestamp.getMinutes(),
            meal.timestamp.getSeconds()
          ),
          photoUri: meal.photoUri,
          dishName: meal.dishName,
          dishNameEs: meal.dishNameEs,
          dishNameEn: meal.dishNameEn,
          ingredients: [...meal.ingredients],
          portionDescription: meal.portionDescription,
          estimatedWeight: meal.estimatedWeight,
          nutrition: { ...meal.nutrition },
          notes: meal.notes,
          mealType: meal.mealType,
          aiConfidence: meal.aiConfidence,
        };
        const mealId = await saveMeal(newMeal);
        newMealIds.push(mealId);
      }
    } catch (error) {
      console.error('Failed to copy meals to date:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  duplicateMeal: async (meal: Meal, targetDate: Date) => {
    set({ isSaving: true });
    try {
      const newMeal: Omit<Meal, 'id'> = {
        userId: meal.userId,
        timestamp: new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          meal.timestamp.getHours(),
          meal.timestamp.getMinutes(),
          meal.timestamp.getSeconds()
        ),
        photoUri: meal.photoUri,
        dishName: meal.dishName,
        dishNameEs: meal.dishNameEs,
        dishNameEn: meal.dishNameEn,
        ingredients: [...meal.ingredients],
        portionDescription: meal.portionDescription,
        estimatedWeight: meal.estimatedWeight,
        nutrition: { ...meal.nutrition },
        notes: meal.notes,
        mealType: meal.mealType,
        aiConfidence: meal.aiConfidence,
      };

      const mealId = await saveMeal(newMeal);
      return mealId;
    } catch (error) {
      console.error('Failed to duplicate meal:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },
}));

// Non-React accessor for screens that use mealStore directly
export const mealStore = {
  getMeals: () => useMealStore.getState().getMeals(),
  getState: () => useMealStore.getState(),
};
