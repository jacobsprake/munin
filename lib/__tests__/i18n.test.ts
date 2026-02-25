import { i18n, useTranslation } from '../i18n';

describe('Internationalization (i18n)', () => {
  it('defaults to English', () => {
    expect(i18n.getLanguage()).toBe('en');
  });

  it('can set language', () => {
    i18n.setLanguage('de');
    expect(i18n.getLanguage()).toBe('de');
    i18n.setLanguage('en');
  });

  it('translates known keys', () => {
    const text = i18n.t('app_title');
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('returns key for unknown translations', () => {
    const text = i18n.t('nonexistent_key');
    expect(text).toBe('nonexistent_key');
  });

  it('useTranslation returns t function', () => {
    const { t } = useTranslation();
    expect(typeof t).toBe('function');
  });
});
