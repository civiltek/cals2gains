import { useWeightStore, weightStore } from '../../store/weightStore';
import {
  saveWeightEntry,
  getWeightHistory,
  deleteWeightEntry,
} from '../../services/firebase';
import { WeightEntry } from '../../types';

const mockSave = saveWeightEntry as jest.Mock;
const mockGetHistory = getWeightHistory as jest.Mock;
const mockDelete = deleteWeightEntry as jest.Mock;

function makeEntry(weight: number, daysAgo: number = 0, id?: string): WeightEntry {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { id: id || `w-${daysAgo}`, userId: 'u1', weight, date: d };
}

beforeEach(() => {
  useWeightStore.setState({ entries: [], isLoading: false });
  jest.clearAllMocks();
});

describe('weightStore', () => {
  describe('loadHistory', () => {
    it('loads entries from Firebase', async () => {
      const entries = [makeEntry(75, 0), makeEntry(76, 7)];
      mockGetHistory.mockResolvedValueOnce(entries);

      await useWeightStore.getState().loadHistory('u1');

      expect(useWeightStore.getState().entries).toHaveLength(2);
      expect(useWeightStore.getState().isLoading).toBe(false);
    });

    it('skips when userId is empty', async () => {
      await useWeightStore.getState().loadHistory('');
      expect(mockGetHistory).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockGetHistory.mockRejectedValueOnce(new Error('fail'));
      await useWeightStore.getState().loadHistory('u1');
      expect(useWeightStore.getState().isLoading).toBe(false);
    });
  });

  describe('addEntry', () => {
    it('saves and adds entry to local state sorted by date', async () => {
      const existing = makeEntry(75, 3, 'old');
      useWeightStore.setState({ entries: [existing] });
      mockSave.mockResolvedValueOnce('new-id');

      await useWeightStore.getState().addEntry({ userId: 'u1', weight: 74.5, date: new Date() });

      const entries = useWeightStore.getState().entries;
      expect(entries).toHaveLength(2);
      // Most recent first
      expect(entries[0].weight).toBe(74.5);
    });

    it('throws on Firebase error', async () => {
      mockSave.mockRejectedValueOnce(new Error('save fail'));
      await expect(
        useWeightStore.getState().addEntry({ userId: 'u1', weight: 74, date: new Date() }),
      ).rejects.toThrow('save fail');
    });
  });

  describe('removeEntry', () => {
    it('removes entry from Firebase and local state', async () => {
      useWeightStore.setState({
        entries: [makeEntry(75, 0, 'w1'), makeEntry(76, 1, 'w2')],
      });
      mockDelete.mockResolvedValueOnce(undefined);

      await useWeightStore.getState().removeEntry('w1');

      expect(useWeightStore.getState().entries).toHaveLength(1);
      expect(useWeightStore.getState().entries[0].id).toBe('w2');
    });
  });

  describe('getLatestWeight', () => {
    it('returns first entry weight (most recent)', () => {
      useWeightStore.setState({
        entries: [makeEntry(74, 0), makeEntry(75, 1), makeEntry(76, 2)],
      });
      expect(useWeightStore.getState().getLatestWeight()).toBe(74);
    });

    it('returns null when no entries', () => {
      expect(useWeightStore.getState().getLatestWeight()).toBeNull();
    });
  });

  describe('getWeightChange', () => {
    it('returns difference between latest and older entry', () => {
      useWeightStore.setState({
        entries: [makeEntry(74, 0), makeEntry(76, 30)],
      });
      // 74 - 76 = -2
      expect(useWeightStore.getState().getWeightChange(30)).toBe(-2);
    });

    it('returns null when less than 2 entries', () => {
      useWeightStore.setState({ entries: [makeEntry(75, 0)] });
      expect(useWeightStore.getState().getWeightChange(30)).toBeNull();
    });

    it('returns null when no entry older than cutoff', () => {
      // Both entries are within 2 days, cutoff is 7 days ago — no entry at or before cutoff
      useWeightStore.setState({
        entries: [makeEntry(74, 0), makeEntry(75, 2)],
      });
      expect(useWeightStore.getState().getWeightChange(7)).toBeNull();
    });
  });

  describe('getTrend', () => {
    it('returns "down" when recent weight is lower', () => {
      useWeightStore.setState({
        entries: [
          makeEntry(73, 0), makeEntry(73.5, 1), makeEntry(74, 2),
          makeEntry(75, 3), makeEntry(75.5, 4), makeEntry(76, 5),
        ],
      });
      // Recent avg: (73+73.5+74)/3 = 73.5, Older avg: (75+75.5+76)/3 = 75.5
      // diff = -2 < -0.3 -> 'down'
      expect(useWeightStore.getState().getTrend()).toBe('down');
    });

    it('returns "up" when recent weight is higher', () => {
      useWeightStore.setState({
        entries: [
          makeEntry(76, 0), makeEntry(75.5, 1), makeEntry(75, 2),
          makeEntry(73, 3), makeEntry(73.5, 4), makeEntry(74, 5),
        ],
      });
      expect(useWeightStore.getState().getTrend()).toBe('up');
    });

    it('returns "stable" when difference is small', () => {
      useWeightStore.setState({
        entries: [
          makeEntry(75.1, 0), makeEntry(75, 1), makeEntry(75.2, 2),
          makeEntry(75, 3), makeEntry(75.1, 4), makeEntry(75, 5),
        ],
      });
      expect(useWeightStore.getState().getTrend()).toBe('stable');
    });

    it('returns null when fewer than 3 entries', () => {
      useWeightStore.setState({ entries: [makeEntry(75, 0), makeEntry(76, 1)] });
      expect(useWeightStore.getState().getTrend()).toBeNull();
    });

    it('returns null when no older comparison group exists', () => {
      useWeightStore.setState({
        entries: [makeEntry(75, 0), makeEntry(76, 1), makeEntry(77, 2)],
      });
      // 3 entries: recent = first 3, older = entries[3..6] = empty -> null
      expect(useWeightStore.getState().getTrend()).toBeNull();
    });
  });

  describe('weightStore accessor', () => {
    it('getWeights returns entries array', () => {
      const entries = [makeEntry(75, 0)];
      useWeightStore.setState({ entries });
      expect(weightStore.getWeights()).toEqual(entries);
    });
  });
});
