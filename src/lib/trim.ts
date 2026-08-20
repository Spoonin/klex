export const MAX_TRIM_DURATION = 120;
export const MIN_TRIM_DURATION = 0.5;

export type TrimWindow = { trimIn: number; trimOut: number };

export function defaultTrimWindow(duration: number): TrimWindow {
  return { trimIn: 0, trimOut: Math.min(duration, MAX_TRIM_DURATION) };
}

export function clampTrimWindow(window: TrimWindow, duration: number): TrimWindow {
  const trimIn = Math.max(0, Math.min(window.trimIn, duration));
  const trimOut = Math.max(trimIn, Math.min(window.trimOut, duration, trimIn + MAX_TRIM_DURATION));
  return { trimIn, trimOut };
}

export function moveTrimBoundary(
  window: TrimWindow,
  boundary: keyof TrimWindow,
  value: number,
  duration: number,
): TrimWindow {
  const sourceDuration = Math.max(0, duration);
  const minimum = Math.min(MIN_TRIM_DURATION, sourceDuration);
  let trimIn = clamp(window.trimIn, 0, sourceDuration);
  let trimOut = clamp(window.trimOut, 0, sourceDuration);

  if (boundary === 'trimIn') {
    trimIn = clamp(value, 0, sourceDuration);
    if (trimOut < trimIn + minimum) {
      trimOut = Math.min(sourceDuration, trimIn + minimum);
      trimIn = Math.max(0, trimOut - minimum);
    }
    if (trimOut > trimIn + MAX_TRIM_DURATION) trimOut = trimIn + MAX_TRIM_DURATION;
  } else {
    trimOut = clamp(value, 0, sourceDuration);
    if (trimOut < trimIn + minimum) {
      trimIn = Math.max(0, trimOut - minimum);
      trimOut = Math.min(sourceDuration, trimIn + minimum);
    }
    if (trimOut > trimIn + MAX_TRIM_DURATION) trimIn = trimOut - MAX_TRIM_DURATION;
  }

  return { trimIn, trimOut };
}

export function isInTrimWindow(timestamp: number, window: TrimWindow): boolean {
  return timestamp >= window.trimIn && timestamp < window.trimOut;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
