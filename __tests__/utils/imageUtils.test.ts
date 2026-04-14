import { Platform } from 'react-native';
import { canDisplayUri } from '../../utils/imageUtils';

// ============================================================================
// canDisplayUri
// ============================================================================

describe('canDisplayUri', () => {
  describe('on native (iOS/Android)', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('returns true for file:// URIs', () => {
      expect(canDisplayUri('file:///var/photos/img.jpg')).toBe(true);
    });

    it('returns true for data: URIs', () => {
      expect(canDisplayUri('data:image/png;base64,abc123')).toBe(true);
    });

    it('returns true for https:// URIs', () => {
      expect(canDisplayUri('https://example.com/photo.jpg')).toBe(true);
    });

    it('returns false for null', () => {
      expect(canDisplayUri(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(canDisplayUri(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(canDisplayUri('')).toBe(false);
    });
  });

  describe('on web', () => {
    beforeEach(() => {
      (Platform as any).OS = 'web';
    });

    it('returns true for data: URIs', () => {
      expect(canDisplayUri('data:image/jpeg;base64,abc123')).toBe(true);
    });

    it('returns true for https:// URIs', () => {
      expect(canDisplayUri('https://firebasestorage.googleapis.com/photo.jpg')).toBe(true);
    });

    it('returns true for http:// URIs', () => {
      expect(canDisplayUri('http://example.com/photo.jpg')).toBe(true);
    });

    it('returns false for file:// URIs on web', () => {
      expect(canDisplayUri('file:///var/photos/img.jpg')).toBe(false);
    });

    it('returns false for content:// URIs on web', () => {
      expect(canDisplayUri('content://media/photo/123')).toBe(false);
    });

    it('returns false for null', () => {
      expect(canDisplayUri(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(canDisplayUri('')).toBe(false);
    });
  });
});
