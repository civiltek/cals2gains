import { useAdaptiveStore } from '../../store/adaptiveStore';

beforeEach(() => {
  useAdaptiveStore.setState({
    lastWeeklyCheck: null,
    lastAdherenceScore: null,
    currentRecommendation: null,
    eatingPatterns: null,
    memorySuggestions: [],
    gymFlowActions: [],
    isAnalyzing: false,
    engineError: null,
  });
});

describe('adaptiveStore', () => {
  describe('shouldRunWeeklyCheck', () => {
    it('returns true when never run before', () => {
      expect(useAdaptiveStore.getState().shouldRunWeeklyCheck()).toBe(true);
    });

    it('returns false when run less than 7 days ago', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      useAdaptiveStore.setState({ lastWeeklyCheck: yesterday.toISOString() });

      expect(useAdaptiveStore.getState().shouldRunWeeklyCheck()).toBe(false);
    });

    it('returns true when run 7+ days ago', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      useAdaptiveStore.setState({ lastWeeklyCheck: eightDaysAgo.toISOString() });

      expect(useAdaptiveStore.getState().shouldRunWeeklyCheck()).toBe(true);
    });
  });

  describe('runWeeklyCheck', () => {
    it('updates lastWeeklyCheck and lastAdherenceScore', () => {
      const meals = Array.from({ length: 21 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(i / 3));
        d.setHours(8 + (i % 3) * 5);
        return {
          id: `m-${i}`,
          dishName: 'Test',
          nutrition: { calories: 667, protein: 50, carbs: 60, fat: 25 },
          mealType: 'lunch',
          timestamp: d,
        };
      });

      useAdaptiveStore.getState().runWeeklyCheck({
        meals,
        weights: [{ date: new Date(), weight: 75 }],
        goals: { calories: 2000, protein: 150, carbs: 250, fat: 65 },
        goalMode: 'maintain',
      });

      const state = useAdaptiveStore.getState();
      expect(state.lastWeeklyCheck).not.toBeNull();
      expect(state.lastAdherenceScore).not.toBeNull();
      expect(state.isAnalyzing).toBe(false);
    });

    it('sets engineError on exception', () => {
      // Pass invalid data that will cause a calculation error
      useAdaptiveStore.getState().runWeeklyCheck({
        meals: null as any,
        weights: [],
        goals: {},
        goalMode: 'maintain',
      });

      const state = useAdaptiveStore.getState();
      expect(state.engineError).toBeTruthy();
      expect(state.isAnalyzing).toBe(false);
    });
  });

  describe('runMemoryAnalysis', () => {
    it('updates eatingPatterns', () => {
      const meals = Array.from({ length: 10 }, (_, i) => ({
        id: `m-${i}`,
        dishName: 'Pollo',
        nutrition: { calories: 500, protein: 40, carbs: 30, fat: 15 },
        mealType: 'lunch',
        timestamp: new Date(),
      }));

      useAdaptiveStore.getState().runMemoryAnalysis(meals);

      expect(useAdaptiveStore.getState().eatingPatterns).not.toBeNull();
    });
  });

  describe('runGymFlow', () => {
    it('populates gymFlowActions', () => {
      useAdaptiveStore.getState().runGymFlow('training');

      const actions = useAdaptiveStore.getState().gymFlowActions;
      expect(actions.length).toBeGreaterThan(0);
      // Always includes water reminder
      expect(actions.some((a) => a.context === 'water_reminder')).toBe(true);
    });

    it('only returns water on rest days', () => {
      useAdaptiveStore.getState().runGymFlow('rest');

      const actions = useAdaptiveStore.getState().gymFlowActions;
      const nonWater = actions.filter((a) => a.context !== 'water_reminder');
      expect(nonWater).toHaveLength(0);
    });
  });

  describe('acceptRecommendation', () => {
    it('returns new goals from autoAdjustment', () => {
      useAdaptiveStore.setState({
        currentRecommendation: {
          id: 'r1',
          type: 'auto_adjustment',
          title: 'test',
          titleEs: 'test',
          description: 'test',
          descriptionEs: 'test',
          autoAdjustment: {
            newCalories: 1850,
            newProtein: 140,
            newCarbs: 185,
            newFat: 60,
            reasoning: 'test',
            confidence: 0.85,
            changePercentage: -7.5,
          },
          confidence: 0.85,
          createdAt: new Date().toISOString(),
          status: 'pending',
        },
      });

      const result = useAdaptiveStore.getState().acceptRecommendation();

      expect(result).toEqual({
        calories: 1850,
        protein: 140,
        carbs: 185,
        fat: 60,
      });
      expect(useAdaptiveStore.getState().currentRecommendation!.status).toBe('accepted');
    });

    it('returns null when no recommendation', () => {
      expect(useAdaptiveStore.getState().acceptRecommendation()).toBeNull();
    });

    it('returns null when no autoAdjustment', () => {
      useAdaptiveStore.setState({
        currentRecommendation: {
          id: 'r1', type: 'focus_consistency', title: 'test', titleEs: 'test',
          description: 'test', descriptionEs: 'test',
          confidence: 0.9, createdAt: new Date().toISOString(), status: 'pending',
        },
      });

      expect(useAdaptiveStore.getState().acceptRecommendation()).toBeNull();
    });
  });

  describe('dismissRecommendation', () => {
    it('sets status to dismissed', () => {
      useAdaptiveStore.setState({
        currentRecommendation: {
          id: 'r1', type: 'auto_adjustment', title: 'test', titleEs: 'test',
          description: 'test', descriptionEs: 'test',
          confidence: 0.8, createdAt: new Date().toISOString(), status: 'pending',
        },
      });

      useAdaptiveStore.getState().dismissRecommendation();

      expect(useAdaptiveStore.getState().currentRecommendation!.status).toBe('dismissed');
    });
  });

  describe('clearError', () => {
    it('clears engineError', () => {
      useAdaptiveStore.setState({ engineError: 'something went wrong' });
      useAdaptiveStore.getState().clearError();
      expect(useAdaptiveStore.getState().engineError).toBeNull();
    });
  });
});
