import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  PlannedMeal,
  MealPlan,
  GroceryList,
  GroceryItem,
  Nutrition,
  MealType,
} from '../types';

interface MealPlanState {
  // State
  currentPlan: MealPlan | null;
  groceryList: GroceryList | null;
  isLoading: boolean;

  // Actions
  loadPlan: (userId: string, weekStartDate: Date) => Promise<void>;
  addPlannedMeal: (meal: PlannedMeal) => void;
  removePlannedMeal: (id: string) => void;
  toggleMealCompleted: (id: string) => void;
  generateGroceryList: (userId: string) => Promise<void>;
  toggleGroceryItem: (id: string) => void;
  clearCheckedItems: () => void;
  setPlan: (plan: MealPlan | null) => void;
  setGroceryList: (list: GroceryList | null) => void;

  // Computed
  getDayMeals: (date: Date) => PlannedMeal[];
  getDayNutrition: (date: Date) => Nutrition;
  getWeekNutrition: () => Nutrition;
}

export const useMealPlanStore = create<MealPlanState>()(
  devtools(
    persist(
      (set, get) => ({
        currentPlan: null,
        groceryList: null,
        isLoading: false,

        setPlan: (plan) => set({ currentPlan: plan }),
        setGroceryList: (list) => set({ groceryList: list }),

        loadPlan: async (userId: string, weekStartDate: Date) => {
          set({ isLoading: true });
          try {
            // Firebase import stub
            // const db = getFirestore();
            // const plansRef = collection(db, 'users', userId, 'mealPlans');
            // const q = query(plansRef, where('weekStart', '==', weekStartDate));
            // const snapshot = await getDocs(q);
            // const plan = snapshot.docs[0]?.data() as MealPlan;
            // set({ currentPlan: plan });

            // Stub: return empty plan
            const plan: MealPlan = {
              id: `plan-${userId}-${weekStartDate.getTime()}`,
              userId,
              weekStartDate,
              meals: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            set({ currentPlan: plan });
          } catch (error) {
            console.error('Failed to load meal plan:', error);
          } finally {
            set({ isLoading: false });
          }
        },

        addPlannedMeal: (meal: PlannedMeal) => {
          set((state) => {
            if (!state.currentPlan) return state;
            return {
              currentPlan: {
                ...state.currentPlan,
                meals: [...state.currentPlan.meals, meal],
                updatedAt: new Date(),
              },
            };
          });
        },

        removePlannedMeal: (id: string) => {
          set((state) => {
            if (!state.currentPlan) return state;
            return {
              currentPlan: {
                ...state.currentPlan,
                meals: state.currentPlan.meals.filter((m) => m.id !== id),
                updatedAt: new Date(),
              },
            };
          });
        },

        toggleMealCompleted: (id: string) => {
          set((state) => {
            if (!state.currentPlan) return state;
            return {
              currentPlan: {
                ...state.currentPlan,
                meals: state.currentPlan.meals.map((m) =>
                  m.id === id ? { ...m, completed: !m.completed } : m
                ),
                updatedAt: new Date(),
              },
            };
          });
        },

        generateGroceryList: async (userId: string) => {
          set({ isLoading: true });
          try {
            const state = get();
            if (!state.currentPlan) return;

            // Aggregate all ingredients from planned meals
            const ingredientMap = new Map<string, GroceryItem>();

            state.currentPlan.meals.forEach((meal) => {
              if (meal.ingredients) {
                meal.ingredients.forEach((ingredient) => {
                  const key = ingredient.name.toLowerCase();
                  const existing = ingredientMap.get(key);

                  if (existing) {
                    // Combine quantities (simple merge)
                    existing.quantity += ingredient.quantity;
                  } else {
                    ingredientMap.set(key, {
                      id: `item-${Date.now()}-${Math.random()}`,
                      name: ingredient.name,
                      quantity: ingredient.quantity,
                      unit: ingredient.unit,
                      category: ingredient.category || 'Otros',
                      checked: false,
                      linkedRecipes: [meal.id],
                    });
                  }
                });
              }
            });

            const groceryList: GroceryList = {
              id: `grocery-${userId}-${Date.now()}`,
              userId,
              items: Array.from(ingredientMap.values()),
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            set({ groceryList });
          } catch (error) {
            console.error('Failed to generate grocery list:', error);
          } finally {
            set({ isLoading: false });
          }
        },

        toggleGroceryItem: (id: string) => {
          set((state) => {
            if (!state.groceryList) return state;
            return {
              groceryList: {
                ...state.groceryList,
                items: state.groceryList.items.map((item) =>
                  item.id === id ? { ...item, checked: !item.checked } : item
                ),
                updatedAt: new Date(),
              },
            };
          });
        },

        clearCheckedItems: () => {
          set((state) => {
            if (!state.groceryList) return state;
            return {
              groceryList: {
                ...state.groceryList,
                items: state.groceryList.items.filter((item) => !item.checked),
                updatedAt: new Date(),
              },
            };
          });
        },

        getDayMeals: (date: Date) => {
          const state = get();
          if (!state.currentPlan) return [];

          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          return state.currentPlan.meals.filter((meal) => {
            const mealDate = new Date(meal.date);
            return mealDate >= dayStart && mealDate <= dayEnd;
          });
        },

        getDayNutrition: (date: Date) => {
          const dayMeals = get().getDayMeals(date);
          return dayMeals.reduce(
            (acc, meal) => ({
              calories: acc.calories + (meal.nutrition?.calories || 0),
              protein: acc.protein + (meal.nutrition?.protein || 0),
              carbs: acc.carbs + (meal.nutrition?.carbs || 0),
              fat: acc.fat + (meal.nutrition?.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );
        },

        getWeekNutrition: () => {
          const state = get();
          if (!state.currentPlan) {
            return { calories: 0, protein: 0, carbs: 0, fat: 0 };
          }

          return state.currentPlan.meals.reduce(
            (acc, meal) => ({
              calories: acc.calories + (meal.nutrition?.calories || 0),
              protein: acc.protein + (meal.nutrition?.protein || 0),
              carbs: acc.carbs + (meal.nutrition?.carbs || 0),
              fat: acc.fat + (meal.nutrition?.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );
        },
      }),
      {
        name: 'meal-plan-store',
      }
    )
  )
);
