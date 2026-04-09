// ============================================
// Cals2Gains - Meal Store (Zustand)
// ============================================

import { create } from 'zustand';
import { Meal, Nutrition, UserGoals } from '../types';
import {
  getMealsForDate,
  saveMeal,
  deleteMeal,
  getRecentMeals,
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
  removeMeal: (mealId: string) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  refreshToday: (userId: string) => Promise<void>;

  // Computed
  getTodayCalories: () => number;
  getMealsByType: () => Record<string, Meal[]>;
}

function calculateTotalNutrition(meals: Meal[]): Nutrition {
  return meals.reduce(
    (total, meal) => addNutrition(total, meal.nutrition),
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

      if (isToday(date)) {
        set({ todayMeals: meals, todayNutrition: nutrition });
      } else {
        set({ recentMeals: meals });
      }
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

  addMeal: async (meal: Omit<Meal, 'id'>) => {
    set({ isSaving: true });
    try {
      const mealId = await saveMeal(meal);
      const newMeal = { ...meal, id: mealId } as Meal;

      // Update today's meals if this meal is for today
      if (isToday(meal.timestamp)) {
        const { todayMeals } = get();
        const updatedMeals = [...todayMeals, newMeal].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );
        const todayNutrition = calculateTotalNutrition(updatedMeals);
        set({ todayMeals: updatedMeals, todayNutrition });
      }

      return mealId;
    } finally {
      set({ isSaving: false });
    }
  },

  removeMeal: async (mealId: string) => {
    try {
      await deleteMeal(mealId);

      const { todayMeals } = get();
      const updatedMeals = todayMeals.filter((m) => m.id !== mealId);
      const todayNutrition = calculateTotalNutrition(updatedMeals);
      set({ todayMeals: updatedMeals, todayNutrition });
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
}));
