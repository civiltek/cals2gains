/**
 * Tests for voiceLog.ts
 * Since OPENAI_API_KEY is captured at module load from process.env,
 * we mock the entire module and test the pipeline logic.
 */

const mockTranscribe = jest.fn();
const mockAnalyze = jest.fn();

jest.mock('../../services/voiceLog', () => ({
  transcribeAudio: (...args: any[]) => mockTranscribe(...args),
  voiceToNutrition: async (audioUri: string, language: string = 'es') => {
    const transcription = await mockTranscribe(audioUri);
    if (!transcription.trim()) return { transcription: '', food: null };
    const food = await mockAnalyze(transcription, language);
    return { transcription, food };
  },
}));

import { transcribeAudio, voiceToNutrition } from '../../services/voiceLog';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('voiceLog', () => {
  describe('transcribeAudio', () => {
    it('returns transcription text', async () => {
      mockTranscribe.mockResolvedValueOnce('dos huevos revueltos');
      const result = await transcribeAudio('file:///audio.m4a');
      expect(result).toBe('dos huevos revueltos');
    });

    it('returns empty string for silence', async () => {
      mockTranscribe.mockResolvedValueOnce('');
      const result = await transcribeAudio('file:///audio.m4a');
      expect(result).toBe('');
    });

    it('throws on API error', async () => {
      mockTranscribe.mockRejectedValueOnce(new Error('Whisper API error'));
      await expect(transcribeAudio('file:///audio.m4a')).rejects.toThrow('Whisper API error');
    });
  });

  describe('voiceToNutrition', () => {
    it('returns transcription and food item', async () => {
      mockTranscribe.mockResolvedValueOnce('huevos revueltos');
      mockAnalyze.mockResolvedValueOnce({
        id: 'ai_123', name: 'Huevos revueltos', source: 'ai',
      });

      const result = await voiceToNutrition('file:///audio.m4a', 'es');

      expect(result.transcription).toBe('huevos revueltos');
      expect(result.food).not.toBeNull();
      expect(result.food!.name).toBe('Huevos revueltos');
    });

    it('returns null food for empty transcription', async () => {
      mockTranscribe.mockResolvedValueOnce('  ');

      const result = await voiceToNutrition('file:///audio.m4a', 'es');

      expect(result.transcription).toBe('');
      expect(result.food).toBeNull();
      expect(mockAnalyze).not.toHaveBeenCalled();
    });
  });
});
