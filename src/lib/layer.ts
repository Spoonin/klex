export const TEXT_COLORS = [
  '#ffffff', '#111318', '#ff4d67', '#ff9f1c',
  '#ffd60a', '#7ed957', '#00c2a8', '#38bdf8',
  '#5b8cff', '#a78bfa', '#f472b6', '#d1d5db',
] as const;

export type LayerColor = (typeof TEXT_COLORS)[number];
export type FontFamily = 'sans-serif' | 'serif' | 'monospace';
export type TextAlignment = 'left' | 'center' | 'right';
export type StrokeWidth = 'none' | 'thin' | 'medium' | 'thick';

export type LayerStyle = {
  text: string;
  fontFamily: FontFamily;
  /** Relative to the output frame height; never stored as pixels. */
  fontSizeFraction: number;
  textColor: LayerColor;
  plateColor: LayerColor;
  plateOpacity: number;
  strokeColor: LayerColor;
  strokeWidth: StrokeWidth;
  textAlign: TextAlignment;
  /** Centre of the Layer bounding box, in output-frame fractions. */
  x: number;
  y: number;
  startTime: number;
  endTime: number;
  fadeIn: boolean;
  fadeOut: boolean;
};

export const DEFAULT_LAYER: LayerStyle = {
  text: 'klex',
  fontFamily: 'sans-serif',
  fontSizeFraction: 0.05,
  textColor: '#ffffff',
  plateColor: '#111318',
  plateOpacity: 0.75,
  strokeColor: '#111318',
  strokeWidth: 'none',
  textAlign: 'center',
  x: 0.5,
  y: 0.85,
  startTime: 0,
  endTime: Number.POSITIVE_INFINITY,
  fadeIn: true,
  fadeOut: true,
};

const STROKE_FRACTIONS: Record<StrokeWidth, number> = {
  none: 0,
  thin: 0.04,
  medium: 0.08,
  thick: 0.14,
};

export function strokeWidthPixels(style: Pick<LayerStyle, 'fontSizeFraction' | 'strokeWidth'>, frameHeight: number) {
  return frameHeight * style.fontSizeFraction * STROKE_FRACTIONS[style.strokeWidth];
}

/** A Layer can fade for one second at either temporal boundary. */
export function layerOpacity(style: Pick<LayerStyle, 'startTime' | 'endTime' | 'fadeIn' | 'fadeOut'>, time: number) {
  if (time < style.startTime || time > style.endTime) return 0;
  const fadeIn = style.fadeIn ? Math.min(1, Math.max(0, time - style.startTime)) : 1;
  const fadeOut = style.fadeOut && Number.isFinite(style.endTime) ? Math.min(1, Math.max(0, style.endTime - time)) : 1;
  return Math.min(fadeIn, fadeOut);
}
