import { useMealPlanStore } from '../../store/mealPlanStore';
import { PlannedMeal, Nutrition } from '../../types';

function makePlannedMeal(overrides: Partial<PlannedMeal> = {}): PlannedMeal {
  return {
    id: 'pm-1',
    userId: 'u1',
    date: new Date().toISOString().split('T')[0],
    mealType: 'lunch',
    nutrition: { calories: 500, protein: 40, carbs: 50, fat: 15, fiber: 3 },
    servings: 1,
    completed: false,
    ...overrides,
  };
}

beforeEach(() => {
  useMealPlanStore.setState({
    currentPlan: null,
    groceryList: null,
    isLoading: false,
  });
});

describe('mealPlanStore', () => {
  describe('addPlannedMeal', () => {
    it('adds meal to current plan', () => {
      useMealPlanStore.setState({
        currentPlan: { id: 'p1', userId: 'u1', weekStartDate: new Date(), meals: [], createdAt: new Date(), updatedAt: new Date() },
      });

      useMealPlanStore.getState().addPlannedMeal(makePlannedMeal({ id: 'pm-1' }));

      expect(useMealPlanStore.getState().currentPlan!.meals).toHaveLength(1);
    });

    it('does nothing when no current plan', () => {
      useMealPlanStore.getState().addPlannedMeal(makePlannedMeal());
      expect(useMealPlanStore.getState().currentPlan).toBeNull();
    });
  });

  describe('removePlannedMeal', () => {
    it('removes meal by id', () => {
      useMealPlanStore.setState({
        currentPlan: {
          id: 'p1', userId: 'u1', weekStartDate: new Date(),
          meals: [makePlannedMeal({ id: 'pm-1' }), makePlannedMeal({ id: 'pm-2' })],
          createdAt: new Date(), updatedAt: new Date(),
        },
      });

      useMealPlanStore.getState().removePlannedMeal('pm-1');

      expect(useMealPlanStore.getState().currentPlan!.meals).toHaveLength(1);
      expect(useMealPlanStore.getState().currentPlan!.meals[0].id).toBe('pm-2');
    });
  });

  describe('toggleMealCompleted', () => {
    it('toggles completed state', () => {
      useMealPlanStore.setState({
        currentPlan: {
          id: 'p1', userId: 'u1', weekStartDate: new Date(),
          meals: [makePlannedMeal({ id: 'pm-1', completed: false })],
          createdAt: new Date(), updatedAt: new Date(),
        },
      });

      useMealPlanStore.getState().toggleMealCompleted('pm-1');

      expect(useMealPlanStore.getState().currentPlan!.meals[0].completed).toBe(true);

      useMealPlanStore.getState().toggleMealCompleted('pm-1');

      expect(useMealPlanStore.getState().currentPlan!.meals[0].completed).toBe(false);
    });
  });

  describe('getDayNutrition', () => {
    it('aggregates nutrition for meals on a specific day', () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      useMealPlanStore.setState({
        currentPlan: {
          id: 'p1', userId: 'u1', weekStartDate: new Date(),
          meals: [
            makePlannedMeal({ id: 'pm-1', date: todayStr, nutrition: { calories: 400, protein: 30, carbs: 40, fat: 10, fiber: 2 } }),
            makePlannedMeal({ id: 'pm-2', date: todayStr, nutrition: { calories: 600, protein: 45, carbs: 60, fat: 20, fiber: 5 } }),
          ],
          createdAt: new Date(), updatedAt: new Date(),
        },
      });

      const dayNutrition = useMealPlanStore.getState().getDayNutrition(today);
      expect(dayNutrition.calories).toBe(1000);
      expect(dayNutrition.protein).toBe(75);
      expect(dayNutrition.carbs).toBe(100);
      expect(dayNutrition.fat).toBe(30);
    });

    it('returns zeros when no meals for that day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      useMealPlanStore.setState({
        currentPlan: {
          id: 'p1', userId: 'u1', weekStartDate: new Date(),
          meals: [makePlannedMeal({ date: new Date().toISOString().split('T')[0] })],
          createdAt: new Date(), updatedAt: new Date(),
        },
      });

      const dayNutrition = useMealPlanStore.getState().getDayNutrition(tomorrow);
      expect(dayNutrition.calories).toBe(0);
    });
  });

  describe('getWeekNutrition', () => {
    it('sums all meals in the plan', () => {
      useMealPlanStore.setState({
        currentPlan: {
          id: 'p1', userId: 'u1', weekStartDate: new Date(),
          meals: [
            makePlannedMeal({ id: 'pm-1', nutrition: { calories: 500, protein: 30, carbs: 50, fat: 15, fiber: 3 } }),
            makePlannedMeal({ id: 'pm-2', nutrition: { calories: 700, protein: 50, carbs: 70, fat: 25, fiber: 5 } }),
            makePlannedMeal({ id: 'pm-3', nutrition: { calories: 300, protein: 20, carbs: 30, fat: 10, fiber: 2 } }),
          ],
          createdAt: new Date(), updatedAt: new Date(),
        },
      });

      const weekNutrition = useMealPlanStore.getState().getWeekNutrition();
      expect(weekNutrition.calories).toBe(1500);
      expect(weekNutrition.protein).toBe(100);
    });

    it('returns zeros when no plan', () => {
      const weekNutrition = useMealPlanStore.getState().getWeekNutrition();
      expect(weekNutrition.calories).toBe(0);
    });
  });

  describe('toggleGroceryItem', () => {
    it('toggles checked state of grocery item', () => {
      useMealPlanStore.setState({
        groceryList: {
          id: 'gl-1', userId: 'u1',
          items: [
            { id: 'gi-1', name: 'Pollo', quantity: 1, unit: 'kg', category: 'protein', checked: false },
            { id: 'gi-2', name: 'Arroz', quantity: 500, unit: 'g', category: 'grains', checked: false },
          ],
          createdAt: new Date(), updatedAt: new Date(),
        },
      });

      useMealPlanStore.getState().toggleGroceryItem('gi-1');

      const items = useMealPlanStore.getState().groceryList!.items;
      expect(items.find((i) => i.id === 'gi-1')!.checked).toBe(true);
      expect(items.find((i) => i.id === 'gi-2')!.checked).toBe(false);
    });
  });

  describe('clearCheckedItems', () => {
    it('removes checked items from grocery list', () => {
      useMealPlanStore.setState({
        groceryList: {
          id: 'gl-1', userId: 'u1',
          items: [
            { id: 'gi-1', name: 'Pollo', quantity: 1, unit: 'kg', category: 'protein', checked: true },
            { id: 'gi-2', name: 'Arroz', quantity: 500, unit: 'g', category: 'grains', checked: false },
            { id: 'gi-3', name: 'Tomate', quantity: 3, unit: 'unidades', category: 'produce', checked: true },
          ],
          createdAt: new Date(), updatedAt: new Date(),
        },
      });

      useMealPlanStore.getState().clearCheckedItems();

      const items = useMealPlanStore.getState().groceryList!.items;
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Arroz');
    });
  });
});
