import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { detectLocale, languages, setLocale, t } from './i18n';

describe('i18n', () => {
  it('offers exactly 15 languages including Polish', () => {
    expect(languages).toHaveLength(15);
    expect(languages).toContainEqual({ code: 'pl', name: 'Polski' });
  });

  it('detects supported regional locales and falls back to English', () => {
    expect(detectLocale(['pl-PL', 'en-US'])).toBe('pl');
    expect(detectLocale(['ko-KR'])).toBe('en');
  });

  it('uses the locale plural rules and interpolates values', () => {
    setLocale('pl');
    const translate = get(t);

    expect(translate('layer.count', { count: 1 })).toBe('1 warstwa');
    expect(translate('layer.count', { count: 2 })).toBe('2 warstwy');
    expect(translate('layer.count', { count: 5 })).toBe('5 warstw');
  });

  it('localises the workflow chooser in every supported language', () => {
    for (const language of languages) {
      setLocale(language.code);
      const translate = get(t);

      expect(translate('scenario.title')).not.toHaveLength(0);
      expect(translate('scenario.text.title')).not.toHaveLength(0);
      expect(translate('scenario.logo.title')).not.toHaveLength(0);
      expect(translate('steps.files')).not.toHaveLength(0);
      expect(translate('steps.position')).not.toHaveLength(0);
      expect(translate('error.storage')).not.toHaveLength(0);
    }

    setLocale('ru');
    expect(get(t)('scenario.title')).toBe('Что вы хотите добавить?');
  });
});
