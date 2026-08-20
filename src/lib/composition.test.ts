import { describe, expect, it } from 'vitest';
import { compositionAt, isPreviewLayerEditable, previewComposition } from './composition';
import { DEFAULT_LAYER } from './layer';

describe('video composition', () => {
  it('composites every visible Layer at its source timestamp', () => {
    const layers = [
      { ...DEFAULT_LAYER, text: 'Первый', startTime: 10, endTime: 15 },
      { ...DEFAULT_LAYER, text: 'Второй', startTime: 11, endTime: 14 },
    ];

    expect(compositionAt(layers, 12).map(({ layer }) => layer.text)).toEqual([
      'Первый',
      'Второй',
    ]);
  });

  it('keeps fade opacity as part of the render plan', () => {
    const layer = { ...DEFAULT_LAYER, startTime: 2, endTime: 8 };

    expect(compositionAt([layer], 2.25)[0]?.opacity).toBe(0.25);
    expect(compositionAt([layer], 8)).toEqual([]);
  });
});

describe('preview composition', () => {
  const layers = [
    { ...DEFAULT_LAYER, id: 'active', text: 'Активная', startTime: 2, endTime: 8 },
  ];

  it('shows the active Layer at full opacity while editing, regardless of its timing and fade', () => {
    expect(previewComposition(layers, 10, 'active', false)).toEqual([
      { layer: layers[0], opacity: 1, outsideTime: true },
    ]);
    expect(previewComposition(layers, 2.25, 'active', false)[0]?.opacity).toBe(1);
  });

  it('shows only the project composition while playing', () => {
    expect(previewComposition(layers, 10, 'active', true)).toEqual([]);
    expect(previewComposition(layers, 4, 'active', true)).toEqual([
      { layer: layers[0], opacity: 1, outsideTime: false },
    ]);
  });

  it('allows Layer tools only for the active Layer while editing', () => {
    expect(isPreviewLayerEditable('active', 'active', false)).toBe(true);
    expect(isPreviewLayerEditable('other', 'active', false)).toBe(false);
    expect(isPreviewLayerEditable('active', 'active', true)).toBe(false);
  });
});
