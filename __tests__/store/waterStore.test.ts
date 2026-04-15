import { useWaterStore, waterStore } from '../../store/waterStore';
import { saveWaterLog, getWaterLog } from '../../services/firebase';
import { Platform } from 'react-native';

const mockSaveWater = saveWaterLog as jest.Mock;
const mockGetWater = getWaterLog as jest.Mock;

beforeEach(() => {
  useWaterStore.setState({ todayGlasses: 0, goal: 8, isLoading: false });
  (Platform as any).OS = 'ios';
  jest.clearAllMocks();
});

describe('waterStore', () => {
  describe('loadToday', () => {
    it('loads water log from Firebase', async () => {
      mockGetWater.mockResolvedValueOnce({ glasses: 5, goal: 10 });

      await useWaterStore.getState().loadToday('u1');

      expect(useWaterStore.getState().todayGlasses).toBe(5);
      expect(useWaterStore.getState().goal).toBe(10);
    });

    it('skips Firebase on web', async () => {
      (Platform as any).OS = 'web';
      await useWaterStore.getState().loadToday('u1');
      expect(mockGetWater).not.toHaveBeenCalled();
    });

    it('keeps state on permission errors', async () => {
      useWaterStore.setState({ todayGlasses: 3 });
      mockGetWater.mockRejectedValueOnce({ code: 'permission-denied' });

      await useWaterStore.getState().loadToday('u1');

      expect(useWaterStore.getState().todayGlasses).toBe(3);
      expect(useWaterStore.getState().isLoading).toBe(false);
    });
  });

  describe('addGlass', () => {
    it('increments glass count and saves to Firebase', async () => {
      useWaterStore.setState({ todayGlasses: 3 });
      mockSaveWater.mockResolvedValueOnce(undefined);

      await useWaterStore.getState().addGlass('u1');

      expect(useWaterStore.getState().todayGlasses).toBe(4);
      expect(mockSaveWater).toHaveBeenCalledTimes(1);
    });

    it('skips Firebase on web but still increments', async () => {
      (Platform as any).OS = 'web';
      useWaterStore.setState({ todayGlasses: 5 });

      await useWaterStore.getState().addGlass('u1');

      expect(useWaterStore.getState().todayGlasses).toBe(6);
      expect(mockSaveWater).not.toHaveBeenCalled();
    });
  });

  describe('removeGlass', () => {
    it('decrements glass count', async () => {
      useWaterStore.setState({ todayGlasses: 3 });
      mockSaveWater.mockResolvedValueOnce(undefined);

      await useWaterStore.getState().removeGlass('u1');

      expect(useWaterStore.getState().todayGlasses).toBe(2);
    });

    it('does not go below 0', async () => {
      useWaterStore.setState({ todayGlasses: 0 });

      await useWaterStore.getState().removeGlass('u1');

      expect(useWaterStore.getState().todayGlasses).toBe(0);
      expect(mockSaveWater).not.toHaveBeenCalled();
    });
  });

  describe('setGoal', () => {
    it('updates goal', () => {
      useWaterStore.getState().setGoal(12);
      expect(useWaterStore.getState().goal).toBe(12);
    });
  });

  describe('getProgress', () => {
    it('returns ratio capped at 1', () => {
      useWaterStore.setState({ todayGlasses: 4, goal: 8 });
      expect(useWaterStore.getState().getProgress()).toBe(0.5);
    });

    it('caps at 1 when exceeding goal', () => {
      useWaterStore.setState({ todayGlasses: 12, goal: 8 });
      expect(useWaterStore.getState().getProgress()).toBe(1);
    });
  });

  describe('getMl', () => {
    it('returns glasses * 250', () => {
      useWaterStore.setState({ todayGlasses: 6 });
      expect(useWaterStore.getState().getMl()).toBe(1500);
    });
  });

  describe('waterStore accessor', () => {
    it('returns empty array when no glasses logged', () => {
      useWaterStore.setState({ todayGlasses: 0 });
      expect(waterStore.getWater()).toEqual([]);
    });

    it('returns today record when glasses > 0', () => {
      useWaterStore.setState({ todayGlasses: 4, goal: 8 });
      const water = waterStore.getWater();
      expect(water).toHaveLength(1);
      expect(water[0].glasses).toBe(4);
      expect(water[0].amount).toBe(1000);
      expect(water[0].goal).toBe(8);
    });
  });
});
