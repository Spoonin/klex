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
});
