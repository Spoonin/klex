export const MAX_TRIM_DURATION = 120;

export type TrimWindow = { trimIn: number; trimOut: number };

export function defaultTrimWindow(duration: number): TrimWindow {
  return { trimIn: 0, trimOut: Math.min(duration, MAX_TRIM_DURATION) };
}

export function clampTrimWindow(window: TrimWindow, duration: number): TrimWindow {
  const trimIn = Math.max(0, Math.min(window.trimIn, duration));
  const trimOut = Math.max(trimIn, Math.min(window.trimOut, duration, trimIn + MAX_TRIM_DURATION));
  return { trimIn, trimOut };
}

export function isInTrimWindow(timestamp: number, window: TrimWindow): boolean {
  return timestamp >= window.trimIn && timestamp < window.trimOut;
}
