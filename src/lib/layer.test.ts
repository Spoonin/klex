import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYER, layerOpacity, strokeWidthPixels } from './layer';

describe('Layer timing and size', () => {
  it('uses a one-second fade-in when enabled and fades at the finite end boundary', () => {
    const layer = { ...DEFAULT_LAYER, startTime: 2, endTime: 8 };

    expect(layerOpacity(layer, 1.99)).toBe(0);
    expect(layerOpacity(layer, 2.5)).toBe(0.5);
    expect(layerOpacity(layer, 5)).toBe(1);
    expect(layerOpacity(layer, 7.75)).toBe(0.25);
    expect(layerOpacity(layer, 8.01)).toBe(0);
  });

  it('can disable fade-in without disabling fade-out', () => {
    const layer = { ...DEFAULT_LAYER, fadeIn: false, startTime: 2, endTime: 8 };

    expect(layerOpacity(layer, 2)).toBe(1);
    expect(layerOpacity(layer, 2.25)).toBe(1);
    expect(layerOpacity(layer, 7.75)).toBe(0.25);
  });

  it('can disable fade-out without disabling fade-in', () => {
    const layer = { ...DEFAULT_LAYER, fadeOut: false, startTime: 2, endTime: 8 };

    expect(layerOpacity(layer, 2.25)).toBe(0.25);
    expect(layerOpacity(layer, 7.75)).toBe(1);
    expect(layerOpacity(layer, 8.01)).toBe(0);
  });

  it('expresses Stroke width as a fraction of frame height', () => {
    expect(strokeWidthPixels({ fontSizeFraction: 0.05, strokeWidth: 'thick' }, 1080)).toBeCloseTo(7.56);
  });
});
