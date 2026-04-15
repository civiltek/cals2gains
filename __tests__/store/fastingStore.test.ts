import { useFastingStore } from '../../store/fastingStore';
import {
  saveFastingConfig,
  getFastingConfig,
  saveFastingSession,
  getFastingSessions,
} from '../../services/firebase';

const mockGetConfig = getFastingConfig as jest.Mock;
const mockSaveConfig = saveFastingConfig as jest.Mock;
const mockSaveSession = saveFastingSession as jest.Mock;
const mockGetSessions = getFastingSessions as jest.Mock;

beforeEach(() => {
  useFastingStore.setState({
    config: null,
    currentSession: null,
    history: [],
    isLoading: false,
  });
  jest.clearAllMocks();
});

describe('fastingStore', () => {
  describe('loadConfig', () => {
    it('loads config from Firebase', async () => {
      const config = { enabled: true, protocol: '16:8' as const, eatingWindowStart: '12:00', eatingWindowEnd: '20:00' };
      mockGetConfig.mockResolvedValueOnce(config);

      await useFastingStore.getState().loadConfig('u1');

      expect(useFastingStore.getState().config).toEqual(config);
      expect(useFastingStore.getState().isLoading).toBe(false);
    });

    it('handles error gracefully', async () => {
      mockGetConfig.mockRejectedValueOnce(new Error('fail'));
      await useFastingStore.getState().loadConfig('u1');
      expect(useFastingStore.getState().isLoading).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('merges config update and saves to Firebase', async () => {
      useFastingStore.setState({
        config: { enabled: true, protocol: '16:8', eatingWindowStart: '12:00', eatingWindowEnd: '20:00' },
      });
      mockSaveConfig.mockResolvedValueOnce(undefined);

      await useFastingStore.getState().updateConfig('u1', { protocol: '18:6' });

      expect(useFastingStore.getState().config!.protocol).toBe('18:6');
      expect(useFastingStore.getState().config!.enabled).toBe(true);
    });
  });

  describe('startFast', () => {
    it('creates a new fasting session with correct target hours', async () => {
      useFastingStore.setState({
        config: { enabled: true, protocol: '18:6', eatingWindowStart: '12:00', eatingWindowEnd: '18:00' },
      });
      mockSaveSession.mockResolvedValueOnce('session-1');

      await useFastingStore.getState().startFast('u1');

      const session = useFastingStore.getState().currentSession;
      expect(session).not.toBeNull();
      expect(session!.targetHours).toBe(18);
      expect(session!.completed).toBe(false);
    });

    it('defaults to 16:8 when no config', async () => {
      mockSaveSession.mockResolvedValueOnce('session-2');

      await useFastingStore.getState().startFast('u1');

      expect(useFastingStore.getState().currentSession!.targetHours).toBe(16);
    });

    it('handles custom protocol', async () => {
      useFastingStore.setState({
        config: { enabled: true, protocol: 'custom', eatingWindowStart: '10:00', eatingWindowEnd: '18:00' },
      });
      mockSaveSession.mockResolvedValueOnce('session-3');

      await useFastingStore.getState().startFast('u1');

      // 10:00 to 18:00 = 8 hour eating window -> 16 hour fast
      expect(useFastingStore.getState().currentSession!.targetHours).toBe(16);
    });
  });

  describe('endFast', () => {
    it('marks session as completed', async () => {
      const session = {
        id: 's1',
        userId: 'u1',
        startTime: new Date(Date.now() - 16 * 3600000),
        targetHours: 16,
        completed: false,
        date: '2026-04-14',
      };
      useFastingStore.setState({ currentSession: session });
      mockSaveSession.mockResolvedValueOnce(undefined);

      await useFastingStore.getState().endFast('u1');

      const updated = useFastingStore.getState().currentSession;
      expect(updated!.completed).toBe(true);
      expect(updated!.endTime).toBeDefined();
    });

    it('throws when no active session', async () => {
      await expect(useFastingStore.getState().endFast('u1')).rejects.toThrow('No active fasting session');
    });
  });

  describe('isCurrentlyFasting', () => {
    it('returns true when session exists and not completed', () => {
      useFastingStore.setState({
        currentSession: {
          id: 's1', userId: 'u1', startTime: new Date(), targetHours: 16, completed: false, date: '2026-04-14',
        },
      });
      expect(useFastingStore.getState().isCurrentlyFasting()).toBe(true);
    });

    it('returns false when session is completed', () => {
      useFastingStore.setState({
        currentSession: {
          id: 's1', userId: 'u1', startTime: new Date(), endTime: new Date(), targetHours: 16, completed: true, date: '2026-04-14',
        },
      });
      expect(useFastingStore.getState().isCurrentlyFasting()).toBe(false);
    });

    it('returns false when no session', () => {
      expect(useFastingStore.getState().isCurrentlyFasting()).toBe(false);
    });
  });

  describe('getElapsedHours', () => {
    it('calculates hours since session start', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
      useFastingStore.setState({
        currentSession: {
          id: 's1', userId: 'u1', startTime: twoHoursAgo, targetHours: 16, completed: false, date: '2026-04-14',
        },
      });
      const elapsed = useFastingStore.getState().getElapsedHours();
      expect(elapsed).toBeCloseTo(2, 0);
    });

    it('returns 0 when no session', () => {
      expect(useFastingStore.getState().getElapsedHours()).toBe(0);
    });
  });

  describe('getRemainingHours', () => {
    it('returns target minus elapsed, clamped to 0', () => {
      const fourteenHoursAgo = new Date(Date.now() - 14 * 3600000);
      useFastingStore.setState({
        currentSession: {
          id: 's1', userId: 'u1', startTime: fourteenHoursAgo, targetHours: 16, completed: false, date: '2026-04-14',
        },
      });
      const remaining = useFastingStore.getState().getRemainingHours();
      expect(remaining).toBeCloseTo(2, 0);
    });

    it('returns 0 when elapsed exceeds target', () => {
      const twentyHoursAgo = new Date(Date.now() - 20 * 3600000);
      useFastingStore.setState({
        currentSession: {
          id: 's1', userId: 'u1', startTime: twentyHoursAgo, targetHours: 16, completed: false, date: '2026-04-14',
        },
      });
      expect(useFastingStore.getState().getRemainingHours()).toBe(0);
    });
  });

  describe('getProgress', () => {
    it('returns ratio of elapsed to target, capped at 1', () => {
      const eightHoursAgo = new Date(Date.now() - 8 * 3600000);
      useFastingStore.setState({
        currentSession: {
          id: 's1', userId: 'u1', startTime: eightHoursAgo, targetHours: 16, completed: false, date: '2026-04-14',
        },
      });
      expect(useFastingStore.getState().getProgress()).toBeCloseTo(0.5, 1);
    });

    it('caps at 1 when exceeding target', () => {
      const twentyHoursAgo = new Date(Date.now() - 20 * 3600000);
      useFastingStore.setState({
        currentSession: {
          id: 's1', userId: 'u1', startTime: twentyHoursAgo, targetHours: 16, completed: false, date: '2026-04-14',
        },
      });
      expect(useFastingStore.getState().getProgress()).toBe(1);
    });

    it('returns 0 when no session', () => {
      expect(useFastingStore.getState().getProgress()).toBe(0);
    });
  });

  describe('loadHistory', () => {
    it('loads session history from Firebase', async () => {
      const sessions = [
        { id: 's1', userId: 'u1', startTime: new Date(), endTime: new Date(), targetHours: 16, completed: true, date: '2026-04-13' },
      ];
      mockGetSessions.mockResolvedValueOnce(sessions);

      await useFastingStore.getState().loadHistory('u1');

      expect(useFastingStore.getState().history).toHaveLength(1);
    });
  });
});
