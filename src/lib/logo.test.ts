import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOGO_SETTINGS,
  LogoValidationError,
  MAX_SAFE_MARGIN,
  MAX_LOGO_BYTES,
  MIN_LOGO_OPACITY,
  MIN_LOGO_SIZE,
  canonicalLogoOffset,
  changedLogoPosition,
  fitLogoSettings,
  isLogoVideoDurationSupported,
  logoOffsetBounds,
  logoPlacement,
  logoSafeArea,
  logoSettingsAtPosition,
  maximumLogoSize,
  moveLogo,
  validateLogoFile,
} from './logo';

describe('Logo', () => {
  it.each([
    ['PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ['JPEG', [0xff, 0xd8, 0xff]],
    ['WebP', [...bytes('RIFF'), 0, 0, 0, 0, ...bytes('WEBP')]],
  ])('accepts a decoded %s within the limits', async (_format, signature) => {
    const close = vi.fn();
    const result = await validateLogoFile(file(signature), async () => ({ width: 1200, height: 800, close }));

    expect(result).toEqual({ width: 1200, height: 800 });
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects unsupported encoded formats with a concrete reason', async () => {
    await expect(validateLogoFile(file(bytes('GIF89a')), async () => ({ width: 1, height: 1, close() {} })))
      .rejects.toEqual(new LogoValidationError('logoType'));
  });

  it('rejects oversized files before decoding', async () => {
    const oversized = { size: MAX_LOGO_BYTES + 1 } as File;
    await expect(validateLogoFile(oversized)).rejects.toEqual(new LogoValidationError('logoSize'));
  });

  it('rejects decoded images over 4096 px and releases them', async () => {
    const close = vi.fn();
    await expect(validateLogoFile(file([0xff, 0xd8, 0xff]), async () => ({ width: 4097, height: 20, close })))
      .rejects.toEqual(new LogoValidationError('logoDimensions'));
    expect(close).toHaveBeenCalledOnce();
  });

  it('places the default Logo at 20% in the lower-right 5% Safe Margin', () => {
    const placement = logoPlacement(
      { width: 1000, height: 500 },
      { width: 1080, height: 1920 },
      DEFAULT_LOGO_SETTINGS,
    );

    expect(placement.left).toBeCloseTo(0.75);
    expect(placement.top).toBeCloseTo(0.915625);
    expect(placement.width).toBeCloseTo(0.2);
    expect(placement.height).toBeCloseTo(0.05625);
  });

  it.each([
    ['top-left', { offsetX: 0.05, offsetY: 0.05 }, { left: 0.05, top: 0.05 }],
    ['top-right', { offsetX: -0.05, offsetY: 0.05 }, { left: 0.75, top: 0.05 }],
    ['center', { offsetX: 0, offsetY: 0 }, { left: 0.4, top: 0.45 }],
    ['bottom-left', { offsetX: 0.05, offsetY: -0.05 }, { left: 0.05, top: 0.85 }],
    ['bottom-right', { offsetX: -0.05, offsetY: -0.05 }, { left: 0.75, top: 0.85 }],
  ] as const)('places a Logo from the %s frame Anchor', (anchor, offset, expected) => {
    const placement = logoPlacement(
      { width: 200, height: 100 },
      { width: 1000, height: 1000 },
      { anchor, size: 0.2, safeMargin: 0.05, opacity: 1, ...offset },
    );

    expect(placement.left).toBeCloseTo(expected.left);
    expect(placement.top).toBeCloseTo(expected.top);
    expect(placement.width).toBeCloseTo(0.2);
    expect(placement.height).toBeCloseTo(0.1);
  });

  it('measures signed offsets from the frame Anchor in shortest-side fractions', () => {
    const placement = logoPlacement(
      { width: 200, height: 100 },
      { width: 1000, height: 1000 },
      { anchor: 'bottom-right', size: 0.2, safeMargin: 0.05, opacity: 1, offsetX: -0.15, offsetY: -0.1 },
    );

    expect(placement.left).toBeCloseTo(0.65);
    expect(placement.top).toBeCloseTo(0.8);
    expect(placement.width).toBeCloseTo(0.2);
    expect(placement.height).toBeCloseTo(0.1);
  });

  it('keeps placement identical when export scales the video resolution', () => {
    const image = { width: 800, height: 1200 };
    const settings = {
      anchor: 'center' as const, size: 0.35, safeMargin: 0.1, opacity: 0.7, offsetX: 0.12, offsetY: -0.18,
    };

    expect(logoPlacement(image, { width: 540, height: 960 }, settings))
      .toEqual(logoPlacement(image, { width: 1080, height: 1920 }, settings));
  });

  it('transfers Batch Default geometry by shortest-side fractions across frame shapes', () => {
    const image = { width: 800, height: 400 };
    const settings = {
      anchor: 'top-left' as const, size: 0.2, safeMargin: 0.05, opacity: 0.8,
      offsetX: 0.12, offsetY: 0.18,
    };

    for (const frame of [
      { width: 1000, height: 1000 },
      { width: 1080, height: 1920 },
      { width: 1920, height: 1080 },
    ]) {
      const placement = logoPlacement(image, frame, settings);
      const shortestSide = Math.min(frame.width, frame.height);

      expect(placement.left * frame.width / shortestSide).toBeCloseTo(settings.offsetX);
      expect(placement.top * frame.height / shortestSide).toBeCloseTo(settings.offsetY);
      expect(placement.width * frame.width / shortestSide).toBeCloseTo(settings.size);
    }
  });

  it('calculates dynamic Size and Offset limits inside the Safe Margin', () => {
    const image = { width: 1000, height: 1000 };
    const frame = { width: 1000, height: 1000 };
    const settings = { anchor: 'top-left' as const, safeMargin: 0.1, offsetX: 0.2, offsetY: 0.3 };

    expect(maximumLogoSize(image, frame, settings)).toBeCloseTo(0.6);
    expect(logoOffsetBounds(image, frame, { ...settings, size: 0.5 })).toEqual({
      minX: 0.1, maxX: 0.4, minY: 0.1, maxY: 0.4,
    });
  });

  it('fits preserved settings after a Logo aspect-ratio change', () => {
    const fitted = fitLogoSettings(
      { width: 1000, height: 100 },
      { width: 1000, height: 1000 },
      { anchor: 'center', size: 0.9, safeMargin: 0.25, opacity: 0.65, offsetX: 0.4, offsetY: -2 },
    );

    expect(fitted).toEqual({
      anchor: 'center', size: 0.5, safeMargin: MAX_SAFE_MARGIN, opacity: 0.65,
      offsetX: 0, offsetY: -0.225,
    });
    expect(fitted.size).toBeGreaterThanOrEqual(MIN_LOGO_SIZE);
  });

  it('keeps every fitted Logo inside the Safe Margin across aspect ratios and Anchors', () => {
    const frames = [{ width: 1080, height: 1920 }, { width: 1920, height: 1080 }, { width: 1000, height: 1000 }];
    const images = [{ width: 1000, height: 100 }, { width: 100, height: 1000 }];
    const anchors = ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as const;

    for (const frame of frames) for (const image of images) for (const anchor of anchors) {
      const settings = fitLogoSettings(image, frame, {
        anchor, size: 2, safeMargin: 0.25, opacity: MIN_LOGO_OPACITY, offsetX: 10, offsetY: -10,
      });
      const placement = logoPlacement(image, frame, settings);
      const safeArea = logoSafeArea(frame, settings.safeMargin);

      expect(placement.left).toBeGreaterThanOrEqual(safeArea.x - 1e-10);
      expect(placement.top).toBeGreaterThanOrEqual(safeArea.y - 1e-10);
      expect(placement.left + placement.width).toBeLessThanOrEqual(1 - safeArea.x + 1e-10);
      expect(placement.top + placement.height).toBeLessThanOrEqual(1 - safeArea.y + 1e-10);
    }
  });

  it('returns canonical Anchor offsets and shortest-side Safe Margin insets', () => {
    expect(canonicalLogoOffset('bottom-right', 0.05)).toEqual({ offsetX: -0.05, offsetY: -0.05 });
    expect(canonicalLogoOffset('center', 0.2)).toEqual({ offsetX: 0, offsetY: 0 });
    expect(logoSafeArea({ width: 1920, height: 1080 }, 0.1)).toEqual({ x: 0.05625, y: 0.1 });
  });

  it('snaps Logo edges to Safe Margin lines and its centre to frame axes', () => {
    const image = { width: 1000, height: 1000 };
    const frame = { width: 1000, height: 1000 };
    const settings = { ...DEFAULT_LOGO_SETTINGS, size: 0.2 };

    const moved = moveLogo(image, frame, settings, { left: 0.059, top: 0.409 }, { x: 0.01, y: 0.01 });

    const placement = logoPlacement(image, frame, moved);
    expect(placement.left).toBeCloseTo(0.05);
    expect(placement.top).toBeCloseTo(0.4);
  });

  it('does not snap outside the supplied screen-space threshold', () => {
    const image = { width: 1000, height: 1000 };
    const frame = { width: 1000, height: 1000 };
    const settings = { ...DEFAULT_LOGO_SETTINGS, size: 0.2 };

    const moved = moveLogo(image, frame, settings, { left: 0.061, top: 0.411 }, { x: 0.01, y: 0.01 });

    const placement = logoPlacement(image, frame, moved);
    expect(placement.left).toBeCloseTo(0.061);
    expect(placement.top).toBeCloseTo(0.411);
  });

  it('keeps the entire Logo inside the Safe Margin while dragging', () => {
    const image = { width: 2000, height: 1000 };
    const frame = { width: 1920, height: 1080 };
    const settings = { ...DEFAULT_LOGO_SETTINGS, size: 0.3, safeMargin: 0.1 };

    const topLeft = logoPlacement(image, frame, moveLogo(image, frame, settings, { left: -1, top: -1 }, { x: 0, y: 0 }));
    const bottomRight = logoPlacement(image, frame, moveLogo(image, frame, settings, { left: 2, top: 2 }, { x: 0, y: 0 }));
    const safeArea = logoSafeArea(frame, settings.safeMargin);

    expect(topLeft.left).toBeCloseTo(safeArea.x);
    expect(topLeft.top).toBeCloseTo(safeArea.y);
    expect(bottomRight.left + bottomRight.width).toBeCloseTo(1 - safeArea.x);
    expect(bottomRight.top + bottomRight.height).toBeCloseTo(1 - safeArea.y);
  });

  it('chooses the nearest Logo Anchor and recalculates Offset without a visual jump', () => {
    const image = { width: 1000, height: 500 };
    const frame = { width: 1000, height: 1000 };
    const settings = { ...DEFAULT_LOGO_SETTINGS, anchor: 'top-left' as const, offsetX: 0.05, offsetY: 0.05 };
    const position = { left: 0.72, top: 0.82 };

    const anchored = logoSettingsAtPosition(image, frame, settings, position);

    expect(anchored.anchor).toBe('bottom-right');
    expect(logoPlacement(image, frame, anchored)).toMatchObject(position);
  });

  it('creates a drag patch from changed position properties only', () => {
    const previous = { anchor: 'bottom-right' as const, offsetX: -0.05, offsetY: -0.05 };

    expect(changedLogoPosition(previous, { ...previous, offsetX: -0.2 })).toEqual({ offsetX: -0.2 });
    expect(changedLogoPosition(previous, previous)).toEqual({});
  });

  it('accepts a full video only within the Logo duration limit', () => {
    expect(isLogoVideoDurationSupported(120, 120)).toBe(true);
    expect(isLogoVideoDurationSupported(120.001, 120)).toBe(false);
  });
});

function file(signature: number[]) {
  return new File([new Uint8Array(signature)], 'logo.bin');
}

function bytes(value: string) {
  return [...value].map((character) => character.charCodeAt(0));
}
