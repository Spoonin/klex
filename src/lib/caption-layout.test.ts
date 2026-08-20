import { describe, expect, it } from 'vitest';
import { captionDragPosition, captionEditorWidth, captionToolsPlacement } from './caption-layout';

describe('inline caption editor layout', () => {
  it('uses measured glyph width rather than a character-count threshold', () => {
    expect(captionEditorWidth(185, 60, 278, 27)).toBe(214);
  });

  it('caps long text at the available frame width', () => {
    expect(captionEditorWidth(500, 60, 300, 27)).toBe(234);
  });

  it('moves and clamps the tools toward visible frame space', () => {
    expect(captionToolsPlacement(120, 5)).toEqual({ side: 'left', offset: 38 });
    expect(captionToolsPlacement(10, 12)).toEqual({ side: 'right', offset: 12 });
  });

  it('preserves the grab offset while dragging a caption by its handles', () => {
    expect(captionDragPosition(
      { x: 242, y: 260 },
      { x: 40, y: 10 },
      { left: 100, top: 100, width: 200, height: 320 },
      { x: 0.1, y: 0.1 },
    )).toEqual({ x: 0.51, y: 0.46875 });
  });
});
