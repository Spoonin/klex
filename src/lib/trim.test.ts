import { describe, expect, it } from 'vitest';
import { clampTrimWindow, defaultTrimWindow, isInTrimWindow } from './trim';

describe('Trim Window', () => {
  it('defaults long videos to their first 120 seconds', () => {
    expect(defaultTrimWindow(180)).toEqual({ trimIn: 0, trimOut: 120 });
  });

  it('keeps every selected interval within 120 seconds and the source duration', () => {
    expect(clampTrimWindow({ trimIn: 100, trimOut: 280 }, 180)).toEqual({ trimIn: 100, trimOut: 180 });
    expect(clampTrimWindow({ trimIn: 80, trimOut: 250 }, 300)).toEqual({ trimIn: 80, trimOut: 200 });
  });

  it('uses a half-open interval when filtering packets and frames', () => {
    const window = { trimIn: 10, trimOut: 20 };
    expect(isInTrimWindow(10, window)).toBe(true);
    expect(isInTrimWindow(20, window)).toBe(false);
  });
});
