/**
 * Tests for reminderService.ts pure functions.
 * The actual notification scheduling is tested via the reminderStore mock.
 * Here we test getReminderContent which is a pure function.
 */

// Import the real getReminderContent — we need to bypass the global mock for this test
const actualModule = jest.requireActual('../../services/reminderService');
const { getReminderContent } = actualModule;

describe('reminderService', () => {
  const mockT = (key: string) => `i18n:${key}`;

  describe('getReminderContent', () => {
    it('returns meals content', () => {
      const result = getReminderContent('meals', mockT);
      expect(result.title).toBe('i18n:reminders.mealsTitle');
      expect(result.body).toBe('i18n:reminders.mealsBody');
    });

    it('returns water content', () => {
      const result = getReminderContent('water', mockT);
      expect(result.title).toBe('i18n:reminders.waterTitle');
      expect(result.body).toBe('i18n:reminders.waterBody');
    });

    it('returns weight content', () => {
      const result = getReminderContent('weight', mockT);
      expect(result.title).toBe('i18n:reminders.weightTitle');
      expect(result.body).toBe('i18n:reminders.weightBody');
    });

    it('returns fasting content', () => {
      const result = getReminderContent('fasting', mockT);
      expect(result.title).toBe('i18n:reminders.fastingTitle');
      expect(result.body).toBe('i18n:reminders.fastingBody');
    });

    it('returns default for unknown key', () => {
      const result = getReminderContent('unknown' as any, mockT);
      expect(result.title).toBe('Cals2Gains');
    });
  });
});
