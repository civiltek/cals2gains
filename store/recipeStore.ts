// ============================================
// Cals2Gains - Recipe Store (Zustand)
// ============================================

import { create } from 'zustand';
import { Recipe, Nutrition } from '../types';
import {
  saveRecipe,
  getRecipes,
  deleteRecipe,
  updateRecipe,
  updateRecipeFavorite,
  logRecipeAsMealFb,
} from '../services/firebase';
import { addNutrition, emptyNutrition } from '../utils/nutrition';
import { useMealStore } from './mealStore';

interface RecipeState {
  recipes: Recipe[];
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  loadRecipes: (userId: string) => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'userId'>, userId: string) => Promise<string>;
  updateRecipeData: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipeData: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  logRecipeAsMeal: (
    recipeId: string,
    servings: number,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ) => Promise<string>;

  // Computed
  getFavorites: () => Recipe[];
  getByTag: (tag: string) => Recipe[];
  searchRecipes: (query: string) => Recipe[];
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  isLoading: false,
  isSaving: false,

  loadRecipes: async (userId: string) => {
    set({ isLoading: true });
    try {
      const recipes = await getRecipes(userId);
      set({ recipes });
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addRecipe: async (recipe: Omit<Recipe, 'id' | 'userId'>, userId: string) => {
    set({ isSaving: true });
    try {
      const recipeWithUser: Omit<Recipe, 'id'> = {
        ...recipe,
        userId,
      };
      const recipeId = await saveRecipe(recipeWithUser);
      const newRecipe = { ...recipeWithUser, id: recipeId } as Recipe;

      const { recipes } = get();
      set({ recipes: [newRecipe, ...recipes] });

      return recipeId;
    } catch (error) {
      console.error('Failed to save recipe:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  updateRecipeData: async (id: string, updates: Partial<Recipe>) => {
    set({ isSaving: true });
    try {
      await updateRecipe(id, updates);
      const { recipes } = get();
      set({
        recipes: recipes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      });
    } catch (error) {
      console.error('Failed to update recipe:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  deleteRecipeData: async (id: string) => {
    try {
      await deleteRecipe(id);
      const { recipes } = get();
      set({ recipes: recipes.filter((r) => r.id !== id) });
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      throw error;
    }
  },

  toggleFavorite: async (id: string) => {
    const { recipes } = get();
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;

    const newFavoriteState = !recipe.isFavorite;

    try {
      await updateRecipeFavorite(id, newFavoriteState);
      set({
        recipes: recipes.map((r) =>
          r.id === id ? { ...r, isFavorite: newFavoriteState } : r
        ),
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  },

  logRecipeAsMeal: async (
    recipeId: string,
    servings: number,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ) => {
    const { recipes } = get();
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) throw new Error('Recipe not found');

    try {
      // Calculate nutrition for the given servings
      // Support both nutritionPerServing and nutrition (legacy/imported recipes)
      const nps = recipe.nutritionPerServing || (recipe as any).nutrition || {
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      };
      const mealNutrition: Nutrition = {
        calories: ((nps.calories ?? 0) * servings) || 0,
        protein: ((nps.protein ?? 0) * servings) || 0,
        carbs: ((nps.carbs ?? 0) * servings) || 0,
        fat: ((nps.fat ?? 0) * servings) || 0,
        fiber: ((nps.fiber ?? 0) * servings) || 0,
        sugar: ((nps.sugar ?? 0) * servings),
        saturatedFat: ((nps.saturatedFat ?? 0) * servings),
        sodium: ((nps.sodium ?? 0) * servings),
      };

      const mealId = await logRecipeAsMealFb(
        recipe.userId,
        recipeId,
        servings,
        mealType,
        mealNutrition,
        recipe.name
      );

      // Refresh today's meals so the new recipe-meal appears immediately
      const mealStoreState = useMealStore.getState();
      await mealStoreState.loadTodayMeals(recipe.userId);

      // Update timesUsed count
      const updatedTimesUsed = recipe.timesUsed + 1;
      await updateRecipe(recipeId, { timesUsed: updatedTimesUsed });

      set({
        recipes: recipes.map((r) =>
          r.id === recipeId ? { ...r, timesUsed: updatedTimesUsed } : r
        ),
      });

      return mealId;
    } catch (error) {
      console.error('Failed to log recipe as meal:', error);
      throw error;
    }
  },

  getFavorites: () => {
    return get().recipes.filter((r) => r.isFavorite);
  },

  getByTag: (tag: string) => {
    return get().recipes.filter((r) =>
      r.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  },

  searchRecipes: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return get().recipes.filter((r) =>
      [r.name, r.nameEs, r.nameEn, r.description || '']
        .join(' ')
        .toLowerCase()
        .includes(lowerQuery)
    );
  },
}));
