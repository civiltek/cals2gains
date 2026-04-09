// ============================================
// Cals2Gains - Meal Template Store (Zustand)
// ============================================

import { create } from 'zustand';
import { MealTemplate, Meal } from '../types';
import {
  saveMealTemplate,
  getMealTemplates,
  deleteMealTemplate,
  updateTemplateUsage,
} from '../services/firebase';

interface TemplateState {
  templates: MealTemplate[];
  isLoading: boolean;

  // Actions
  loadTemplates: (userId: string) => Promise<void>;
  saveAsTemplate: (meal: Meal, name?: string) => Promise<void>;
  removeTemplate: (templateId: string) => Promise<void>;
  useTemplate: (templateId: string) => Promise<MealTemplate | null>;

  // Computed
  getFrequentTemplates: (limit?: number) => MealTemplate[];
  getRecentTemplates: (limit?: number) => MealTemplate[];
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  isLoading: false,

  loadTemplates: async (userId: string) => {
    set({ isLoading: true });
    try {
      const templates = await getMealTemplates(userId);
      set({ templates });
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveAsTemplate: async (meal: Meal, name?: string) => {
    try {
      const template: Omit<MealTemplate, 'id'> = {
        userId: meal.userId,
        name: name || meal.dishName,
        dishName: meal.dishName,
        dishNameEs: meal.dishNameEs,
        dishNameEn: meal.dishNameEn,
        nutrition: meal.nutrition,
        estimatedWeight: meal.estimatedWeight,
        mealType: meal.mealType,
        ingredients: meal.ingredients,
        portionDescription: meal.portionDescription,
        photoUri: meal.photoUri,
        timesUsed: 0,
        lastUsed: new Date(),
        createdAt: new Date(),
      };

      const id = await saveMealTemplate(template);
      const newTemplate = { ...template, id } as MealTemplate;
      const { templates } = get();
      set({ templates: [newTemplate, ...templates] });
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  },

  removeTemplate: async (templateId: string) => {
    try {
      await deleteMealTemplate(templateId);
      const { templates } = get();
      set({ templates: templates.filter((t) => t.id !== templateId) });
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  },

  useTemplate: async (templateId: string) => {
    const { templates } = get();
    const template = templates.find((t) => t.id === templateId);
    if (!template) return null;

    try {
      await updateTemplateUsage(templateId);
      // Update local state
      const updated = templates.map((t) =>
        t.id === templateId
          ? { ...t, timesUsed: t.timesUsed + 1, lastUsed: new Date() }
          : t
      );
      set({ templates: updated });
      return template;
    } catch (error) {
      console.error('Failed to update template usage:', error);
      return template;
    }
  },

  getFrequentTemplates: (limit: number = 5) => {
    return [...get().templates]
      .sort((a, b) => b.timesUsed - a.timesUsed)
      .slice(0, limit);
  },

  getRecentTemplates: (limit: number = 5) => {
    return [...get().templates]
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, limit);
  },
}))