import { getAppLanguage } from '../../utils/language';
import i18n from '../../i18n';

// Mock i18n module
jest.mock('../../i18n', () => ({
  language: 'es',
}));

describe('getAppLanguage', () => {
  it('returns "es" when i18n language is "es"', () => {
    (i18n as any).language = 'es';
    expect(getAppLanguage()).toBe('es');
  });

  it('returns "en" when i18n language is "en"', () => {
    (i18n as any).language = 'en';
    expect(getAppLanguage()).toBe('en');
  });

  it('defaults to "es" for unknown languages', () => {
    (i18n as any).language = 'fr';
    expect(getAppLanguage()).toBe('es');
  });

  it('defaults to "es" for undefined language', () => {
    (i18n as any).language = undefined;
    expect(getAppLanguage()).toBe('es');
  });

  it('defaults to "es" for empty string language', () => {
    (i18n as any).language = '';
    expect(getAppLanguage()).toBe('es');
  });
});
