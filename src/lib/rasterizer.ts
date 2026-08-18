import { strokeWidthPixels, type LayerStyle } from './layer';

const EMOJI_FALLBACK = 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji';

/** Renders one Layer into a tightly-sized, transferable bitmap for WebGL. */
export function rasterizeLayer(style: LayerStyle, frameHeight: number): ImageBitmap {
  const fontSize = frameHeight * clamp(style.fontSizeFraction, 0.01, 0.5);
  const strokeWidth = strokeWidthPixels(style, frameHeight);
  const padding = fontSize * 0.3;
  const lineHeight = fontSize * 1.2;
  const font = `700 ${fontSize}px ${fontName(style.fontFamily)}, ${EMOJI_FALLBACK}`;
  const measureCanvas = new OffscreenCanvas(1, 1);
  const measure = requiredContext(measureCanvas);
  measure.font = font;
  const lines = style.text.split(/\r?\n/);
  const widths = lines.map((line) => measure.measureText(line).width);
  const maxWidth = Math.max(1, ...widths);
  const extent = padding + strokeWidth;
  const width = Math.ceil(maxWidth + 2 * extent);
  const height = Math.ceil(lines.length * lineHeight + 2 * extent);
  const canvas = new OffscreenCanvas(width, height);
  const context = requiredContext(canvas);
  context.font = font;
  context.textBaseline = 'middle';
  context.textAlign = style.textAlign;
  context.lineJoin = 'round';

  for (const [index, line] of lines.entries()) {
    const lineWidth = widths[index];
    const left = lineLeft(style.textAlign, width, lineWidth, extent);
    const x = textAnchor(style.textAlign, left, lineWidth);
    const y = extent + lineHeight * (index + 0.5);
    context.fillStyle = withOpacity(style.plateColor, style.plateOpacity);
    roundedRect(context, left - padding, y - lineHeight / 2 - padding, lineWidth + 2 * padding, lineHeight + 2 * padding, fontSize * 0.2);
    context.fill();
    if (strokeWidth > 0) {
      context.strokeStyle = style.strokeColor;
      context.lineWidth = strokeWidth * 2;
      context.strokeText(line, x, y);
    }
    context.fillStyle = style.textColor;
    context.fillText(line, x, y);
  }
  return canvas.transferToImageBitmap();
}

function requiredContext(canvas: OffscreenCanvas) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas2D недоступен.');
  return context;
}

function fontName(family: LayerStyle['fontFamily']) {
  return family === 'sans-serif' ? 'sans-serif' : family === 'serif' ? 'serif' : 'monospace';
}

function lineLeft(alignment: LayerStyle['textAlign'], canvasWidth: number, lineWidth: number, extent: number) {
  if (alignment === 'left') return extent;
  if (alignment === 'right') return canvasWidth - extent - lineWidth;
  return (canvasWidth - lineWidth) / 2;
}

function textAnchor(alignment: LayerStyle['textAlign'], left: number, lineWidth: number) {
  if (alignment === 'left') return left;
  if (alignment === 'right') return left + lineWidth;
  return left + lineWidth / 2;
}

function roundedRect(context: OffscreenCanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function withOpacity(color: string, opacity: number) {
  const alpha = Math.round(clamp(opacity, 0, 1) * 255).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
