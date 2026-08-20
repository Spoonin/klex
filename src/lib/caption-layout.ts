export const CAPTION_MAX_WIDTH_FRACTION = 0.78;
export const CAPTION_TOOLS_OFFSET = 38;
const CARET_ALLOWANCE = 2;

type Point = { x: number; y: number };
type FrameBounds = { left: number; top: number; width: number; height: number };

/** Fits actual rendered glyphs until the caption reaches its frame-width limit. */
export function captionEditorWidth(textWidth: number, minimumTextWidth: number, stageWidth: number, horizontalPadding: number) {
  const contentWidth = Math.max(textWidth, minimumTextWidth) + horizontalPadding + CARET_ALLOWANCE;
  return Math.min(stageWidth * CAPTION_MAX_WIDTH_FRACTION, contentWidth);
}

export function captionToolsPlacement(leftSpace: number, rightSpace: number) {
  const side = rightSpace < CAPTION_TOOLS_OFFSET && leftSpace > rightSpace ? 'left' : 'right';
  const availableSpace = side === 'left' ? leftSpace : rightSpace;
  return { side, offset: Math.max(0, Math.min(CAPTION_TOOLS_OFFSET, availableSpace)) } as const;
}

/** Maps the pointer to the caption centre without losing where the drag began. */
export function captionDragPosition(pointer: Point, grabOffset: Point, frame: FrameBounds, inset: Point) {
  return {
    x: clamp((pointer.x - grabOffset.x - frame.left) / frame.width, inset.x),
    y: clamp((pointer.y - grabOffset.y - frame.top) / frame.height, inset.y),
  };
}

function clamp(value: number, inset: number) {
  return Math.min(1 - inset, Math.max(inset, value));
}
